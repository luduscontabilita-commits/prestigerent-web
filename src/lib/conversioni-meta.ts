import crypto from 'node:crypto';
import type { Conversione } from '@/lib/conversioni';
import type { EsitoCaricamento } from '@/lib/conversioni-google';

/* IL CARICAMENTO SU META — CONVERSIONS API.
 *
 * ── LA DIFFERENZA CHE CAMBIA TUTTO ──────────────────────────────────
 * Su Google si puo' recuperare il passato: novanta giorni di
 * prenotazioni caricate in una sera, com'e' stato fatto il 27 agosto.
 * Su Meta no. `event_time` non puo' andare indietro piu' di SETTE
 * GIORNI: oltre, l'evento viene rifiutato e non c'e' modo di
 * ripresentarlo.
 *
 * Vuol dire che qui non esiste un "lo sistemo dopo". Ogni notte che il
 * lavoro non gira e' una notte di vendite che Meta non vedra' mai. E'
 * anche il motivo per cui questo file conta e riporta le righe scartate
 * per vecchiaia invece di ignorarle in silenzio: se quel numero smette
 * di essere zero, il lavoro notturno e' fermo da piu' di una settimana.
 *
 * ── LA MODALITA' DI PROVA ───────────────────────────────────────────
 * Meta non ha un `validateOnly`. Ha `test_event_code`: gli eventi
 * arrivano nella scheda "Eventi di test" del Gestore eventi, si vedono
 * uno per uno, e NON entrano nei dati del pixel. E' l'equivalente, ma
 * il codice va preso a mano dal Gestore eventi e messo in
 * `META_TEST_EVENT_CODE`.
 *
 * Senza quel codice la prova NON chiama Meta affatto: si limita a
 * controllare la forma delle righe e lo dichiara. Mandare eventi veri
 * "tanto e' una prova" e' esattamente il modo di sporcare un pixel
 * senza potersene accorgere -- da Meta non si cancella niente.
 *
 * ── LA DEDUPLICA COL PIXEL ──────────────────────────────────────────
 * `event_id` = `booking-` + numero d'ordine di Regiondo, la stessa
 * stringa che il tag del pixel costruisce. Meta usa la coppia
 * (`event_name`, `event_id`) per capire che l'evento del browser e
 * quello del server sono la stessa vendita.
 *
 * 🔴 Perche' funzioni, il pixel deve mandare lo stesso `event_id`. Il
 * pagamento si conclude su `prestigerent.regiondo.com`, dove il nostro
 * pixel potrebbe non esserci affatto o mandare un identificativo suo. Se
 * e' cosi', la deduplica non avviene: o non c'e' doppione (perche' il
 * pixel non vede la vendita, che e' il caso probabile) oppure gli
 * acquisti si contano due volte. Va guardato nel Gestore eventi dopo la
 * prima notte vera, non si vede da qui.
 */

const V = 'v23.0';

/** Sette giorni meno un'ora di margine: una prenotazione fatta alle
 *  23:55 di sette giorni fa e mandata alle 00:05 sarebbe respinta per
 *  dieci minuti, e il rifiuto arriva come un errore generico. */
const FINESTRA_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;

/** Meta accetta fino a 1000 eventi per richiesta. */
const LOTTO = 500;

export type EsitoMeta = EsitoCaricamento & {
  /** righe lasciate fuori perche' oltre i sette giorni */
  troppoVecchie: number;
  /** vero se la prova e' stata solo formale, senza parlare con Meta */
  provaSoloLocale?: boolean;
};

function conf() {
  const token = process.env.META_SYSTEM_TOKEN;
  const pixel = process.env.META_PIXEL_ID;
  if (!token || !pixel) return null;
  return {
    token,
    pixel: pixel.replace(/\D/g, ''),
    segretoApp: process.env.META_APP_SECRET ?? null,
    codiceProva: process.env.META_TEST_EVENT_CODE ?? null,
  };
}

export function metaConfigurato(): boolean {
  return conf() !== null;
}

/** Meta rifiuta le chiamate quando sull'app e' acceso "Richiedi la prova
 *  del segreto dell'app". Calcolarla sempre costa una riga e toglie di
 *  mezzo un errore (`API calls from the server require an appsecret_proof
 *  argument`) che a leggerlo sembra un problema di permessi. */
function provaSegreto(token: string, segreto: string): string {
  return crypto.createHmac('sha256', segreto).update(token).digest('hex');
}

/**
 * Carica le conversioni su Meta.
 *
 * @param prova con `true` usa `test_event_code` se c'e'; se non c'e',
 *              non chiama Meta e lo dichiara.
 */
/* 🔴 IL PREFISSO E' UN PARAMETRO, PERCHE' I CANALI SONO DUE.
 *
 * Meta scarta il doppione confrontando (event_name, event_id) fra il
 * pixel del browser e questa chiamata dal server. Devono combaciare
 * carattere per carattere -- e i due canali usano due chiavi diverse:
 *
 *   Regiondo   il tag "Meta - Purchase Regiondo" manda
 *              `booking-<numero d'ordine>`
 *   /booking/  il tag "Meta - Acquisto /booking/" manda
 *              `<numero della riga di WordPress>`, senza prefisso
 *
 * Finche' questa funzione metteva `booking-` a tutti, le prenotazioni
 * di /booking/ arrivavano a Meta come `booking-482` dal server e come
 * `482` dal browser: due eventi diversi, la stessa vendita contata due
 * volte, il ritorno raddoppiato e le campagne ottimizzate su un
 * guadagno che non esiste. Non si e' mai visto perche' da /booking/ non
 * e' ancora passata una prenotazione -- verificato su Ads, zero.
 *
 * Si allinea QUESTO lato e non GTM per il motivo di sempre: il codice
 * si pubblica in due minuti, GTM va versionato e pubblicato a mano.
 *
 * Nessun rischio di scontro fra i due canali: i numeri d'ordine di
 * Regiondo sono a 12 cifre (401790450030), le righe di WordPress sono
 * a tre o quattro. */
export async function caricaSuMeta(
  righe: Conversione[],
  prova: boolean,
  prefissoEvento = 'booking-',
): Promise<EsitoMeta> {
  const vuoto: EsitoMeta = {
    configurato: false,
    inviate: 0,
    accettati: [],
    rifiutati: [],
    motivi: {},
    richieste: [],
    troppoVecchie: 0,
  };
  const c = conf();
  if (!c) return { ...vuoto, errore: 'META_SYSTEM_TOKEN o META_PIXEL_ID assenti' };

  const limite = Date.now() - FINESTRA_MS;
  const fresche = righe.filter((r) => r.quando.getTime() >= limite);
  const vecchie = righe.length - fresche.length;

  if (!fresche.length) {
    return { ...vuoto, configurato: true, troppoVecchie: vecchie };
  }

  const esito: EsitoMeta = {
    ...vuoto,
    configurato: true,
    inviate: fresche.length,
    troppoVecchie: vecchie,
  };

  if (prova && !c.codiceProva) {
    /* Prova senza codice: si controlla la forma e si dichiara che Meta
       non e' stata interpellata. Meglio un "non verificato" scritto che
       un "tutto a posto" che non ha verificato niente. */
    esito.provaSoloLocale = true;
    esito.motivi['prova solo formale: manca META_TEST_EVENT_CODE'] = fresche.length;
    return esito;
  }

  const url = `https://graph.facebook.com/${V}/${c.pixel}/events`;

  for (let i = 0; i < fresche.length; i += LOTTO) {
    const pezzo = fresche.slice(i, i + LOTTO);
    const dati = pezzo.map((r) => {
      const utente: Record<string, unknown> = { em: [r.emailMeta] };
      if (r.telefonoMeta) utente.ph = [r.telefonoMeta];
      if (r.nomeMeta) utente.fn = [r.nomeMeta];
      if (r.cognomeMeta) utente.ln = [r.cognomeMeta];
      /* `fbc` e' il formato con cui Meta si aspetta il clic:
         `fb.1.<millisecondi>.<fbclid>`. Vale come identificativo esatto,
         non probabilistico. Oggi non arriva mai (vedi
         `sorgenteDaSubId`), ma quando arrivera' basta questo. */
      if (r.fbclid) utente.fbc = `fb.1.${r.quando.getTime()}.${r.fbclid}`;

      return {
        event_name: 'Purchase',
        event_time: Math.floor(r.quando.getTime() / 1000),
        /* 🔴 LA CHIAVE DELLA DEDUPLICA, E IL PREFISSO NON E' UN VEZZO.
         *
         * Meta scarta il doppione confrontando la coppia (event_name,
         * event_id) fra il pixel e questa chiamata. Devono essere
         * IDENTICHE carattere per carattere: "12345" e "booking-12345"
         * sono due eventi diversi, e la stessa vendita finisce contata
         * due volte -- il ROAS raddoppia, e le campagne vengono
         * ottimizzate su un guadagno che non esiste.
         *
         * Il tag del pixel in GTM ("Meta - Purchase Regiondo") manda
         * `eventID: 'booking-' + transaction_id`. Quel prefisso e' il
         * riferimento: si allinea QUESTO lato, non quello, perche' il
         * codice si pubblica in due minuti mentre GTM va versionato e
         * pubblicato a mano -- e finche' i due non combaciano ogni notte
         * che passa e' un giorno di dati sporchi.
         *
         * Non si e' mai visto il danno solo perche' il pixel era chiuso
         * al 62% del traffico e questo caricamento girava senza
         * `davvero=1`, cioe' a vuoto. Adesso partono tutti e due. */
        event_id: `${prefissoEvento}${r.ordine}`,
        /* La vendita nasce su un sito, anche se il pagamento si conclude
           sul dominio di Regiondo. Meta segnalera' una qualita'
           dell'abbinamento piu' bassa perche' mancano indirizzo IP e
           user agent: non li abbiamo, e inventarli sarebbe peggio. */
        action_source: 'website',
        event_source_url: 'https://prestigerent.com/',
        user_data: utente,
        custom_data: {
          currency: 'EUR',
          value: r.valore,
          order_id: r.ordine,
          content_name: r.prodotto,
          content_type: 'product',
          num_items: r.persone || 1,
        },
      };
    });

    const corpo = new URLSearchParams({
      data: JSON.stringify(dati),
      access_token: c.token,
    });
    if (c.segretoApp) corpo.set('appsecret_proof', provaSegreto(c.token, c.segretoApp));
    if (prova && c.codiceProva) corpo.set('test_event_code', c.codiceProva);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: corpo,
        cache: 'no-store',
      });
    } catch (e) {
      const m = `rete: ${e instanceof Error ? e.message : String(e)}`;
      esito.motivi[m] = (esito.motivi[m] ?? 0) + pezzo.length;
      esito.rifiutati.push(...pezzo.map((r) => r.ordine));
      continue;
    }

    const testo = await res.text();
    if (!res.ok) {
      let m = `HTTP ${res.status}: ${testo.slice(0, 300)}`;
      try {
        const er = (JSON.parse(testo) as { error?: { code?: number; message?: string } }).error;
        if (er) m = `${er.code}: ${(er.message ?? '').slice(0, 300)}`;
      } catch {}
      esito.motivi[m] = (esito.motivi[m] ?? 0) + pezzo.length;
      esito.rifiutati.push(...pezzo.map((r) => r.ordine));
      continue;
    }

    let d: { events_received?: number; messages?: unknown[]; fbtrace_id?: string } = {};
    try {
      d = JSON.parse(testo);
    } catch {}
    if (d.fbtrace_id) esito.richieste.push(d.fbtrace_id);
    for (const m of d.messages ?? []) {
      const k = typeof m === 'string' ? m.slice(0, 200) : JSON.stringify(m).slice(0, 200);
      esito.motivi[k] = (esito.motivi[k] ?? 0) + 1;
    }

    /* `events_received` e' il numero che Meta dichiara di aver preso in
       carico. Se e' piu' basso di quante ne abbiamo mandate, qualcosa e'
       stato scartato: si prende il numero di Meta e non il nostro. */
    const presi = typeof d.events_received === 'number' ? d.events_received : pezzo.length;
    if (presi < pezzo.length) {
      const m = `Meta ne ha presi ${presi} su ${pezzo.length}`;
      esito.motivi[m] = (esito.motivi[m] ?? 0) + 1;
    }

    /* "Accettati" vuol dire accettati dall'API. In modalita' di prova
       gli eventi finiscono negli Eventi di test e NON entrano nei dati
       del pixel: e' la rotta a non scrivere niente in memoria quando la
       prova e' attiva, cosi' la regola sta in un posto solo invece che
       ripetuta in ogni destinatario. */
    esito.accettati.push(...pezzo.map((r) => r.ordine));
  }

  return esito;
}
