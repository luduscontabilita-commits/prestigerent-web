import crypto from 'node:crypto';
import type { Conversione } from '@/lib/conversioni';

/* LE VENDITE CHE IL BROWSER NON HA PORTATO AD ANALYTICS.
 *
 * ── IL PROBLEMA, MISURATO ───────────────────────────────────────────
 * Agosto 2026: la cassa di Regiondo registra 98 prenotazioni dirette
 * vere. Analytics ne ha viste 51. Mancano 47 prenotazioni e circa
 * 15.800 euro -- e le 47 mancanti sono INDISTINGUIBILI dalle 51 viste:
 * stesso mix di prodotti (43% vino in tutte e due), stesso metodo di
 * pagamento (98% carta), stesse opzioni, sparse su tutte le ore.
 *
 * Nessun difetto tecnico perde meta' delle vendite senza avere una
 * preferenza. Un blocco lato browser si': blocca-pubblicita', Safari con
 * la protezione alta, la scheda chiusa un attimo prima. Quelli non
 * guardano cosa stai comprando.
 *
 * La conferma sta nell'architettura, non in un'ipotesi. Prima di questo
 * file:
 *
 *     Google Ads   browser + server   <- non perde
 *     Meta         browser + server   <- non perde
 *     Analytics    browser            <- perde meta'
 *
 * Analytics era l'unico dei tre senza la seconda strada, ed era l'unico
 * dei tre a perdere meta' delle vendite. Questo file gliela da'.
 *
 * ── LA REGOLA CHE NON SI PUO' ROMPERE ───────────────────────────────
 * Non si mandano doppioni. Il 1 settembre e' stata passata mezza
 * giornata a togliere copie doppie di contatori: crearne uno qui
 * sarebbe la stessa malattia con un nome nuovo.
 *
 * Quindi PRIMA di spedire si chiede ad Analytics quali numeri d'ordine
 * ha gia', e si manda solo il resto. Se il browser ce l'ha fatta, dal
 * server non parte niente.
 *
 * ── COSA SI PERDE, E VA SAPUTO ──────────────────────────────────────
 * Il Measurement Protocol pretende un `client_id`, che e' l'identita'
 * del browser. Per una vendita che il browser non ci ha mai raccontato
 * quell'identita' non esiste: si costruisce una sigla stabile a partire
 * dal numero d'ordine. Conseguenza onesta: queste vendite risultano di
 * "utenti" nuovi, quindi il conteggio degli utenti si gonfia un po' e
 * il percorso (da dove venivano, che pagine avevano visto) non c'e'.
 *
 * E' un cambio voluto: meglio un fatturato giusto con un percorso
 * mancante che un fatturato dimezzato con un percorso perfetto. Per
 * poterle sempre distinguere, ogni evento porta
 * `sorgente_dato: 'server_regiondo'`.
 *
 * ── LA FINESTRA DI TRE GIORNI ───────────────────────────────────────
 * Il Measurement Protocol accetta eventi datati al massimo 72 ore
 * indietro: piu' vecchi li scarta senza dirlo. Il lavoro notturno gira
 * con `giorni=3`, quindi combacia -- ma se un giorno quella finestra si
 * allargasse, le righe vecchie vanno scartate qui e dichiarate, non
 * spedite nel vuoto.
 */

const RACCOLTA = 'https://www.google-analytics.com/mp/collect';
const RACCOLTA_PROVA = 'https://www.google-analytics.com/debug/mp/collect';
const DATI = 'https://analyticsdata.googleapis.com/v1beta';
const OAUTH = 'https://oauth2.googleapis.com/token';

/** 72 ore meno un margine: un evento datato al limite esatto arriva
 *  scaduto se la chiamata parte qualche secondo dopo. */
const FINESTRA_MS = 71 * 60 * 60 * 1000;

export type EsitoGa4 = {
  configurato: boolean;
  /** quante righe sono state davvero spedite */
  inviate: number;
  accettati: string[];
  rifiutati: string[];
  /** gia' viste da Analytics grazie al browser: non si rimandano */
  gia: string[];
  /** oltre le 72 ore: il Measurement Protocol le butterebbe via */
  troppoVecchie: number;
  motivi: Record<string, number>;
  errore?: string;
};

function conf() {
  const segreto = process.env.GA4_MP_SECRET;
  const misura = process.env.GA4_MEASUREMENT_ID;
  if (!segreto || !misura) return null;
  return {
    segreto,
    misura,
    proprieta: process.env.GA4_PROPERTY_ID ?? '',
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
    refresh: process.env.GA4_OAUTH_REFRESH_TOKEN ?? '',
  };
}

export function ga4Configurato(): boolean {
  return conf() !== null;
}

/* Una sigla stabile per ordine. Stabile e non casuale apposta: se un
   giorno la stessa riga ripartisse, Analytics la vedrebbe dallo stesso
   "utente" invece che da uno nuovo. */
function siglaCliente(ordine: string): string {
  const h = crypto.createHash('sha256').update('prestigerent:' + ordine).digest('hex');
  return `${parseInt(h.slice(0, 8), 16)}.${parseInt(h.slice(8, 16), 16)}`;
}

/** I numeri d'ordine che Analytics ha gia' registrato nella finestra.
 *  Se non si riesce a chiedere si torna `null`, e chi chiama NON manda
 *  niente: meglio saltare una notte che raddoppiare le vendite. */
async function ordiniGiaVisti(giorni: number, evento: string): Promise<Set<string> | null> {
  const c = conf();
  if (!c || !c.refresh || !c.proprieta) return null;

  try {
    const t = await fetch(OAUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        refresh_token: c.refresh,
        grant_type: 'refresh_token',
      }),
    });
    if (!t.ok) return null;
    const { access_token: accesso } = (await t.json()) as { access_token?: string };
    if (!accesso) return null;

    const r = await fetch(`${DATI}/properties/${c.proprieta}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accesso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${Math.max(1, giorni + 1)}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'transactionId' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: evento } },
        },
        limit: 5000,
      }),
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { rows?: { dimensionValues: { value: string }[] }[] };
    const fuori = new Set<string>();
    for (const riga of d.rows ?? []) {
      const v = riga.dimensionValues?.[0]?.value;
      if (v && v !== '(not set)') fuori.add(v);
    }
    return fuori;
  } catch {
    return null;
  }
}

/**
 * Manda ad Analytics le vendite che il browser non gli ha portato.
 *
 * @param prova con `true` usa l'indirizzo di convalida di Google, che
 *              dice cosa c'e' che non va e NON registra niente.
 */
export async function caricaSuGa4(
  righe: Conversione[],
  prova: boolean,
  giorni = 3,
  /* Il nome dell'evento e quello con cui Analytics lo riconosce
     gia' dal browser: devono coincidere, altrimenti nei rapporti
     risultano due cose diverse. Per gli acquisti e' `purchase`,
     per le richieste dal modulo e' `richiesta_inviata`. */
  evento = 'purchase'
): Promise<EsitoGa4> {
  const vuoto: EsitoGa4 = {
    configurato: false,
    inviate: 0,
    accettati: [],
    rifiutati: [],
    gia: [],
    troppoVecchie: 0,
    motivi: {},
  };
  const c = conf();
  if (!c) return { ...vuoto, errore: 'GA4_MP_SECRET o GA4_MEASUREMENT_ID assenti' };

  const limite = Date.now() - FINESTRA_MS;
  const fresche = righe.filter((r) => r.quando.getTime() >= limite);
  const vecchie = righe.length - fresche.length;
  if (!fresche.length) return { ...vuoto, configurato: true, troppoVecchie: vecchie };

  /* 🔴 IL CONTROLLO CHE VIENE PRIMA DI TUTTO.
     Se Analytics non risponde non si tira a indovinare: si esce senza
     mandare. Una notte saltata si recupera domani, un doppione no. */
  const gia = await ordiniGiaVisti(giorni, evento);
  if (!gia) {
    return {
      ...vuoto,
      configurato: true,
      troppoVecchie: vecchie,
      errore:
        'Analytics non risponde: non si manda niente, per non rischiare doppioni. ' +
        'Controllare GA4_OAUTH_REFRESH_TOKEN e GA4_PROPERTY_ID.',
    };
  }

  const daMandare = fresche.filter((r) => !gia.has(r.ordine));
  const esito: EsitoGa4 = {
    ...vuoto,
    configurato: true,
    troppoVecchie: vecchie,
    gia: fresche.filter((r) => gia.has(r.ordine)).map((r) => r.ordine),
  };
  if (!daMandare.length) return esito;

  const dove = prova ? RACCOLTA_PROVA : RACCOLTA;
  const url =
    `${dove}?measurement_id=${encodeURIComponent(c.misura)}` +
    `&api_secret=${encodeURIComponent(c.segreto)}`;

  for (const r of daMandare) {
    const persone = r.persone || 1;
    const corpo = {
      client_id: siglaCliente(r.ordine),
      /* In microsecondi, non millisecondi: sbagliare unita' qui fa
         arrivare l'evento nel 1970 e Analytics lo scarta in silenzio. */
      timestamp_micros: r.quando.getTime() * 1000,
      non_personalized_ads: false,
      events: [
        {
          name: evento,
          params: {
            transaction_id: r.ordine,
            /* Come per Google: valore 0 vuol dire "non lo so", e un
               fatturato finto e' peggio di un fatturato mancante. */
            ...(r.valore > 0
              ? { value: Number(r.valore.toFixed(2)), currency: 'EUR' }
              : {}),
            /* Il segno di riconoscimento: in qualsiasi rapporto si puo'
               separare quello che ha portato il browser da quello che
               abbiamo recuperato noi. Senza, fra sei mesi nessuno sa
               piu' da dove viene un numero. */
            sorgente_dato: 'server_regiondo',
            engagement_time_msec: 1,
            ...(r.valore > 0
              ? {
                  items: [
                    {
                      item_id: r.prodotto,
                      item_name: r.prodotto,
                      quantity: persone,
                      price: Number((r.valore / persone).toFixed(2)),
                    },
                  ],
                }
              : { servizio: r.prodotto }),
          },
        },
      ],
    };

    try {
      const risposta = await fetch(url, { method: 'POST', body: JSON.stringify(corpo) });
      if (prova) {
        /* L'indirizzo di convalida risponde 200 anche quando l'evento e'
           sbagliato: il verdetto sta nel corpo. */
        const d = (await risposta.json()) as {
          validationMessages?: { description?: string }[];
        };
        const guai = d.validationMessages ?? [];
        if (guai.length) {
          esito.rifiutati.push(r.ordine);
          for (const g of guai) {
            const m = g.description ?? 'non specificato';
            esito.motivi[m] = (esito.motivi[m] ?? 0) + 1;
          }
        } else {
          esito.accettati.push(r.ordine);
        }
      } else if (risposta.status === 204 || risposta.ok) {
        /* Il Measurement Protocol risponde 204 e non dice mai se
           l'evento gli e' piaciuto: per quello c'e' la modalita' di
           prova. Qui "accettato" vuol dire "consegnato". */
        esito.accettati.push(r.ordine);
      } else {
        esito.rifiutati.push(r.ordine);
        const m = `HTTP ${risposta.status}`;
        esito.motivi[m] = (esito.motivi[m] ?? 0) + 1;
      }
    } catch (e) {
      esito.rifiutati.push(r.ordine);
      const m = e instanceof Error ? e.message : 'errore di rete';
      esito.motivi[m] = (esito.motivi[m] ?? 0) + 1;
    }
  }

  esito.inviate = daMandare.length;
  return esito;
}
