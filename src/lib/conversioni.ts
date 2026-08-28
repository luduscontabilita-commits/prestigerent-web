import { chiama } from '@/lib/regiondo-api';
import {
  emailDaScartare,
  emailPerGoogle,
  emailPerMeta,
  impronta,
  istanteDa,
  nomePerMeta,
  telefonoPerGoogle,
  telefonoPerMeta,
} from '@/lib/identita';

/* LE PRENOTAZIONI DA CARICARE, LETTE DA REGIONDO E RESE ANONIME.
 *
 * ── IL PROBLEMA CHE RISOLVE ─────────────────────────────────────────
 * Il pagamento si conclude dentro Regiondo, su un dominio che non e'
 * nostro. Safari cancella i cookie di terze parti, chi paga con 3DS esce
 * dal sito e non torna. Misurato: Regiondo registra circa 97
 * prenotazioni dirette al mese, Google Ads ne vede 1. Le campagne
 * ottimizzano su un novantasettesimo della realta'.
 *
 * Il caricamento a mano del 27 agosto (137 conversioni, 52.284 EUR,
 * tutte accettate) ha dimostrato che la strada funziona. Questo file e'
 * la stessa cosa, senza qualcuno che la lancia.
 *
 * ── COSA ESCE DA QUI ────────────────────────────────────────────────
 * Righe con dentro solo impronte SHA-256 (vedi `identita.ts`), un numero
 * d'ordine, un importo e un istante. Nessun indirizzo, nessun numero di
 * telefono. Il `dominio` c'e' solo per il rapporto -- serve a un umano
 * per accorgersi al volo se sta caricando trecento righe di un dominio
 * solo, che vorrebbe dire che qualcosa e' andato storto.
 *
 * ── SOLO LETTURE ────────────────────────────────────────────────────
 * Su Regiondo qui non si scrive niente, mai.
 */

/** Una prenotazione come arriva davvero da `supplier/bookings`, con i
 *  campi che servono a questo lavoro. `total_amount` e' una stringa
 *  ("298.0000") ed e' l'importo DELLA RIGA, non dell'ordine: un ordine
 *  con due righe da 129 e 89 vale 218, e vanno sommate. */
type Grezza = {
  order_number?: string | null;
  created_at?: string | null;
  timezone?: string | null;
  status?: string | null;
  payment_status?: { code?: string | null; label?: string | null } | null;
  total_amount?: string | number | null;
  qty?: number | string | null;
  qty_cancelled?: number | string | null;
  email?: string | null;
  phone_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  contact_data?: { email?: string | null; telephone?: string | null } | null;
  coupon_codes?: unknown[] | null;
  distribution_channel_partner?: string | null;
  product_name?: string | null;
  /** Il campo passante del widget. Oggi e' sempre vuoto: nessuno lo
   *  riempie. Vedi `sorgenteDaSubId` piu' sotto. */
  sub_id?: string | null;
};

type Busta = {
  data?: Grezza[];
  page?: { total_pages?: number; total_items?: number };
};

/** Una conversione pronta da spedire. Tutti i campi personali sono gia'
 *  impronte: da qui in poi il dato in chiaro non esiste piu'. */
export type Conversione = {
  ordine: string;
  quando: Date;
  valore: number;
  /** impronta SHA-256, normalizzata alla maniera di Google */
  emailGoogle: string | null;
  /** impronta SHA-256, normalizzata alla maniera di Meta */
  emailMeta: string | null;
  telefonoGoogle: string | null;
  telefonoMeta: string | null;
  nomeMeta: string | null;
  cognomeMeta: string | null;
  /** `gclid`/`fbclid` arrivati fin qui, se un giorno ci arriveranno */
  gclid: string | null;
  fbclid: string | null;
  prodotto: string;
  persone: number;
  /** solo per il rapporto a schermo: NON viene spedito a nessuno */
  dominio: string;
};

export type Raccolto = {
  righe: Conversione[];
  /** quante prenotazioni sono state lette in tutto */
  lette: number;
  pagine: number;
  /** perche' le altre sono state lasciate fuori, contate per motivo */
  scarti: Record<string, number>;
  /** i codici di stato del pagamento visti, per accorgersi se un giorno
   *  ne compare uno nuovo che stiamo buttando senza saperlo */
  pagamenti: Record<string, number>;
  /** righe fuse perche' portavano lo stesso numero d'ordine */
  fuse: number;
  /** quante hanno anche il telefono utilizzabile (doppio identificativo,
   *  abbinamento migliore) */
  conTelefono: number;
  /** vero se la lettura si e' fermata per non sforare il tempo massimo
   *  della funzione: mancano le prenotazioni piu' recenti */
  troncato: boolean;
  errore?: string;
};

/* Gli stati che dicono "questa vendita non c'e'". `rejected` era fuori
   dall'elenco dello script a mano ed e' rientrato qui: una prenotazione
   rifiutata caricata come conversione insegna alle campagne a cercare
   clienti la cui carta viene rifiutata. */
/* I domini delle agenzie che prenotano dal sito. Vedi il commento nel
   setaccio: sono clienti veri per l'azienda, ma non sono conversioni
   pubblicitarie. Elenco a mano, e va allungato quando ne spunta una. */
const AGENZIE = new Set([
  'jaywaytravel.com',
  'boutiqueescapes.com',
  'mycompasstours.com',
  'dialinv.com',
  'datasourcetech.com',
]);

const STATI_MORTI = new Set([
  'cancelled',
  'canceled',
  'refunded',
  'declined',
  'rejected',
  'expired',
  'failed',
  'pending',
]);

function numero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function conta(dove: Record<string, number>, chiave: string) {
  dove[chiave] = (dove[chiave] ?? 0) + 1;
}

/* ── IL CAMPO PASSANTE DEL WIDGET ───────────────────────────────────
 *
 * `sub_id` esiste sul modello della prenotazione ed e' l'unico campo che
 * puo' portare un valore nostro dentro l'ordine di Regiondo. Oggi e'
 * sempre `null` perche' nessuno lo riempie: sul widget manca
 * `data-sub-id`. Se e quando lo si riempira' (vedi il rapporto: e'
 * possibile, il widget lo legge dal `dataset` del div), la convenzione
 * e' un prefisso di una lettera, cosi' `gclid` e `fbclid` non si
 * confondono -- si assomigliano abbastanza da scambiarli, e uno scambio
 * qui produce attribuzioni sbagliate su tutte e due le piattaforme.
 *
 *   `g-<gclid>`   clic da Google
 *   `f-<fbclid>`  clic da Meta
 *
 * Senza prefisso non si indovina: il valore viene ignorato, e la riga
 * viaggia lo stesso con la sola impronta dell'email. Un identificativo
 * di clic attribuito alla rete sbagliata e' peggio di nessun
 * identificativo. */
function sorgenteDaSubId(sub: unknown): { gclid: string | null; fbclid: string | null } {
  const vuoto = { gclid: null, fbclid: null };
  if (typeof sub !== 'string') return vuoto;
  const s = sub.trim();
  if (s.length < 10 || s.length > 512) return vuoto;
  if (/^g-/.test(s)) return { gclid: s.slice(2), fbclid: null };
  if (/^f-/.test(s)) return { gclid: null, fbclid: s.slice(2) };
  return vuoto;
}

/* IL TEMPO CHE C'E'.
 *
 * Una pagina di Regiondo costa circa sei secondi e ne restituisce 250.
 * Misurato: tre giorni sono due pagine (12 secondi), trenta giorni sono
 * otto pagine (56 secondi) -- cioe' gia' oltre il minuto che una
 * funzione su Vercel ha di vita.
 *
 * Sforare quel minuto non da' un errore leggibile: la funzione viene
 * uccisa a meta', il rapporto non arriva, e non si sa se qualcosa era
 * partito. Meglio fermarsi da soli con quindici secondi di margine e
 * DIRLO (`troncato`), che e' l'unica differenza fra un lavoro che si e'
 * accorto di essere incompleto e uno che sembra riuscito.
 *
 * Nota su cosa si perde: Regiondo restituisce le prenotazioni dalla piu'
 * vecchia, quindi troncare significa perdere le PIU' RECENTI -- proprio
 * quelle che a Meta servono entro sette giorni. Per questo la finestra
 * predefinita e' corta: recuperare tanti giorni in una volta si fa a
 * mano, con piu' chiamate da tre giorni l'una.
 */
const BUDGET_MS = 45_000;

/** La data di partenza per Regiondo, `YYYY-MM-DD`. Niente ore: la
 *  querystring firmata non deve contenere spazi (vedi la trappola di
 *  `http_build_query` in `regiondo-api.ts`). */
export function dalGiorno(giorni: number): string {
  const d = new Date(Date.now() - Math.max(1, giorni) * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Legge le prenotazioni degli ultimi `giorni` e restituisce solo quelle
 * che possono davvero venire da una campagna, gia' rese anonime.
 *
 * @param giorni quanti giorni indietro guardare
 * @param ammettiCoupon se true tiene anche gli ordini con codice sconto
 */
export async function raccogli(
  giorni: number,
  ammettiCoupon = false,
  budgetMs = BUDGET_MS,
): Promise<Raccolto> {
  const partito = Date.now();
  const dal = dalGiorno(giorni);
  const scarti: Record<string, number> = {};
  const pagamenti: Record<string, number> = {};
  const grezze: Grezza[] = [];
  let pagine = 0;
  let troncato = false;

  /* Regiondo forza il limite a 250 anche chiedendo di piu'. Il tetto di
     venti giri e' un freno, non un'aspettativa: se l'API un giorno
     restituisse sempre 250 righe non si girerebbe all'infinito dentro
     una funzione che ha sessanta secondi di vita. */
  for (let giro = 0; giro < 20; giro++) {
    if (giro > 0 && Date.now() - partito > budgetMs) {
      troncato = true;
      break;
    }
    let d: Busta | null;
    try {
      d = await chiama<Busta>(
        'supplier/bookings',
        { created_from: dal, limit: 250, offset: giro * 250 },
        0,
      );
    } catch (e) {
      return {
        righe: [],
        lette: grezze.length,
        pagine,
        scarti,
        pagamenti,
        fuse: 0,
        conTelefono: 0,
        troncato,
        errore: `Regiondo non raggiungibile: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    /* `chiama` restituisce null sia quando le chiavi mancano sia quando
       la risposta non e' 2xx: sono due guasti diversi e vanno detti
       diversi, se no si va a cercare un errore di rete quando manca una
       variabile d'ambiente. */
    if (!d) {
      return {
        righe: [],
        lette: grezze.length,
        pagine,
        scarti,
        pagamenti,
        fuse: 0,
        conTelefono: 0,
        troncato,
        errore:
          giro === 0
            ? 'Regiondo ha risposto male o le chiavi REGIONDO_API_KEY/SECRET non ci sono'
            : `Regiondo ha smesso di rispondere alla pagina ${giro + 1}`,
      };
    }
    const lista = d.data ?? [];
    pagine = giro + 1;
    grezze.push(...lista);
    if (lista.length < 250) break;
  }

  /* ── IL SETACCIO ──────────────────────────────────────────────────
     L'ordine dei controlli non e' casuale: prima quelli che dicono
     "questa vendita non esiste", poi quelli sull'identificativo. Cosi'
     il conteggio degli scarti si legge come una storia -- "di 250, 180
     erano OTA, 12 annullate, 4 senza email" -- invece che come un
     numero unico che non spiega niente. */
  const buone: Conversione[] = [];
  for (const b of grezze) {
    const canale = (b.distribution_channel_partner ?? '').trim();
    if (canale.toLowerCase() !== 'own ticketshop') {
      conta(scarti, `non diretta (${canale || 'canale vuoto'})`);
      continue;
    }

    const stato = (b.status ?? '').toLowerCase();
    if (STATI_MORTI.has(stato)) {
      conta(scarti, `stato ${stato || 'vuoto'}`);
      continue;
    }

    const pagamento = (b.payment_status?.code ?? 'senza codice').toLowerCase();
    conta(pagamenti, pagamento);

    /* Tutti i posti della riga annullati: la riga esiste ancora ma la
       vendita no. */
    if (numero(b.qty_cancelled) >= numero(b.qty) && numero(b.qty) > 0) {
      conta(scarti, 'posti tutti annullati');
      continue;
    }

    /* 🔴 LE AGENZIE NON SONO CLIENTI.
       Prenotano dal sito, quindi il canale dice "Own Ticketshop" e per
       tutto il resto del setaccio sono dirette. Ma un'agenzia non ha
       cliccato nessun annuncio: ha un accordo, e prenota dal sito perche'
       e' il modo piu' comodo. Contarla come conversione insegna a Google
       a cercare agenzie, cioe' a spendere per procurare clienti che
       arrivavano gia' da soli.

       Si riconoscono dal dominio dell'email, che e' aziendale e ricorre:
       sono sempre le stesse quattro o cinque. L'elenco si allunga a mano
       quando ne compare una nuova -- indovinare "e' un'azienda quindi e'
       un'agenzia" scarterebbe anche i viaggi d'affari veri, che sono
       clienti a tutti gli effetti. */
    const dominio =
      (b.email ?? b.contact_data?.email ?? '').trim().toLowerCase().split('@')[1] ?? '';
    if (dominio && AGENZIE.has(dominio)) {
      conta(scarti, 'agenzia');
      continue;
    }

    if (!ammettiCoupon && Array.isArray(b.coupon_codes) && b.coupon_codes.length > 0) {
      /* Il codice sconto e' quasi sempre un accordo con un partner o una
         promozione mandata via email: la vendita c'e', il clic
         sull'annuncio no. Sono un terzo delle dirette, quindi il numero
         va guardato: il giorno che si decide di tenerle basta
         `?coupon=si`. */
      conta(scarti, 'ha un codice sconto');
      continue;
    }

    const valore = Math.round(numero(b.total_amount) * 100) / 100;
    if (valore <= 0) {
      conta(scarti, 'importo zero');
      continue;
    }

    const ordine = String(b.order_number ?? '').trim();
    if (!ordine) {
      conta(scarti, 'senza numero d’ordine');
      continue;
    }

    const quando = istanteDa(b.created_at, (b.timezone ?? 'Europe/Berlin') || 'Europe/Berlin');
    if (!quando) {
      conta(scarti, 'data non leggibile');
      continue;
    }

    const grezzaMail = (b.email ?? b.contact_data?.email ?? '').trim();
    if (!grezzaMail) {
      conta(scarti, 'senza email');
      continue;
    }
    const brutta = emailDaScartare(grezzaMail);
    if (brutta) {
      conta(scarti, `email ${brutta}`);
      continue;
    }
    const perGoogle = emailPerGoogle(grezzaMail);
    const perMeta = emailPerMeta(grezzaMail);
    if (!perGoogle || !perMeta) {
      conta(scarti, 'email non valida');
      continue;
    }

    const telGrezzo = b.phone_number ?? b.contact_data?.telephone ?? null;
    const telG = telefonoPerGoogle(telGrezzo);
    const telM = telefonoPerMeta(telGrezzo);
    if (telGrezzo && !telG) conta(scarti, '(tenuta) telefono senza prefisso paese');

    const { gclid, fbclid } = sorgenteDaSubId(b.sub_id);

    buone.push({
      ordine,
      quando,
      valore,
      emailGoogle: impronta(perGoogle),
      emailMeta: impronta(perMeta),
      telefonoGoogle: telG ? impronta(telG) : null,
      telefonoMeta: telM ? impronta(telM) : null,
      nomeMeta: nomePerMeta(b.first_name) ? impronta(nomePerMeta(b.first_name)!) : null,
      cognomeMeta: nomePerMeta(b.last_name) ? impronta(nomePerMeta(b.last_name)!) : null,
      gclid,
      fbclid,
      prodotto: (b.product_name ?? '').slice(0, 120),
      persone: Math.max(0, numero(b.qty) - numero(b.qty_cancelled)),
      dominio: perGoogle.split('@')[1] ?? '',
    });
  }

  /* ── LE RIGHE DELLO STESSO ORDINE ─────────────────────────────────
     Un ordine con due righe e' una vendita sola da due voci. Caricarle
     separate conterebbe due conversioni, e su Google la seconda verrebbe
     anche buttata come doppione (stesso `transactionId`): il risultato
     e' meta' fatturato attribuito. Si sommano gli importi e si tiene
     l'istante della prima. */
  const perOrdine = new Map<string, Conversione[]>();
  for (const r of buone) {
    const g = perOrdine.get(r.ordine);
    if (g) g.push(r);
    else perOrdine.set(r.ordine, [r]);
  }
  const unite: Conversione[] = [];
  for (const gruppo of perOrdine.values()) {
    const ordinato = [...gruppo].sort((a, b) => a.quando.getTime() - b.quando.getTime());
    unite.push({
      ...ordinato[0],
      valore: Math.round(gruppo.reduce((s, x) => s + x.valore, 0) * 100) / 100,
      persone: gruppo.reduce((s, x) => s + x.persone, 0),
    });
  }
  unite.sort((a, b) => a.quando.getTime() - b.quando.getTime());

  return {
    righe: unite,
    lette: grezze.length,
    pagine,
    scarti,
    pagamenti,
    fuse: buone.length - unite.length,
    conTelefono: unite.filter((x) => x.telefonoGoogle).length,
    troncato,
  };
}
