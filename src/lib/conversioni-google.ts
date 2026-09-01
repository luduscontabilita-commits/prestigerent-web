import type { Conversione } from '@/lib/conversioni';

/* IL CARICAMENTO SU GOOGLE — DATA MANAGER API.
 *
 * ── PERCHE' NON `uploadClickConversions` ────────────────────────────
 * Da meta' 2025 Google ha chiuso `ConversionUploadService` alle
 * integrazioni nuove. La risposta e' letterale e non lascia margini:
 *
 *     CUSTOMER_NOT_ALLOWLISTED_FOR_THIS_FEATURE
 *     "New integrations for uploading click conversions should use the
 *      Data Manager API."
 *
 * Quindi si passa da `datamanager.googleapis.com`, che vuole un permesso
 * OAuth suo (`.../auth/datamanager`, in piu' rispetto ad `adwords`) e
 * una forma diversa della richiesta.
 *
 * ── LA STRADA GIUSTA E' LA MULTI-SORGENTE ───────────────────────────
 * La Data Manager API ne offre due:
 *
 *   conversioni offline -> `productDestinationId` = azione di tipo
 *                          UPLOAD_CLICKS. Provata: risponde
 *                          "Resource not found" anche su un'azione
 *                          appena creata.
 *   multi-sorgente      -> `productDestinationId` = azione di tipo
 *                          WEBPAGE, `transactionId` obbligatorio.
 *                          Funziona.
 *
 * La seconda e' anche la scelta migliore, non solo l'unica che va: si
 * carica DENTRO l'azione "Acquisto" che il tag del sito usa gia', con il
 * numero d'ordine di Regiondo come `transactionId`. Cosi' e' Google a
 * scartare i doppioni fra quello che vede il browser e quello che
 * mandiamo noi, e non serve spostare niente da primario a secondario.
 *
 * 🔴 PERCHE' QUELLA DEDUPLICA FUNZIONI DAVVERO, il tag sul sito deve
 * mandare come `transaction_id` lo STESSO numero d'ordine di Regiondo.
 * Se manda un altro identificativo (o nessuno), Google non ha modo di
 * capire che sono la stessa vendita e la conta due volte. Va verificato
 * dentro GTM, non si vede da qui.
 *
 * ── COSA PARTE DAVVERO ──────────────────────────────────────────────
 * Nessun indirizzo email. Solo l'impronta SHA-256. Google la confronta
 * con i suoi utenti e, se trova un clic sui nostri annunci, registra la
 * conversione; se non lo trova, butta la riga. E' Google a filtrare
 * l'organico, non noi -- il caricamento non gonfia niente.
 */

const OAUTH = 'https://oauth2.googleapis.com/token';
const INGEST = 'https://datamanager.googleapis.com/v1/events:ingest';

/* L'azione "Acquisto" dell'account Prestige Rent: quella che il tag del
   sito alimenta gia'. Non e' un segreto (e' un identificativo interno di
   Google Ads, inutile senza le credenziali) ma e' sovrascrivibile
   dall'ambiente, perche' se un domani l'azione viene ricreata l'id
   cambia e non deve servire un commit per rimetterlo a posto. */
const AZIONE_ACQUISTO = '7594681615';

/* Il massimo che la Data Manager API accetta in una richiesta e' 2000.
   Si sta a 500 come nello script che ha funzionato: un lotto respinto
   costa meno da rimandare, e i tempi di risposta restano dentro il
   minuto di vita della funzione. */
const LOTTO = 500;

export type EsitoCaricamento = {
  configurato: boolean;
  inviate: number;
  /** i numeri d'ordine che il destinatario ha accettato: solo questi
   *  finiscono nella memoria */
  accettati: string[];
  rifiutati: string[];
  motivi: Record<string, number>;
  /** gli identificativi delle richieste, per ritrovarle nei registri di
   *  Google quando qualcosa non torna */
  richieste: string[];
  errore?: string;
};

function conf() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const sviluppo = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const mcc = process.env.GOOGLE_ADS_MCC_ID;
  const cid = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!clientId || !clientSecret || !refresh || !sviluppo || !mcc || !cid) return null;
  return {
    clientId,
    clientSecret,
    refresh,
    sviluppo,
    /* Gli identificativi vanno senza trattini: `447-009-4152` non e' un
       numero di cliente valido per l'API, `4470094152` si'. Toglierli
       qui evita di dover ricordare come sono scritti nell'ambiente. */
    mcc: mcc.replace(/\D/g, ''),
    cid: cid.replace(/\D/g, ''),
    azione: (process.env.GOOGLE_ADS_AZIONE_ID ?? AZIONE_ACQUISTO).replace(/\D/g, ''),
  };
}

export function googleConfigurato(): boolean {
  return conf() !== null;
}

async function accesso(c: NonNullable<ReturnType<typeof conf>>): Promise<string> {
  const res = await fetch(OAUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: c.refresh,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const testo = await res.text();
  if (!res.ok) {
    /* Il messaggio di Google qui e' quasi sempre `invalid_grant`, che
       vuol dire una cosa sola e importante: il refresh token e' stato
       revocato (password cambiata, permesso tolto, app in prova scaduta
       dopo sette giorni). Va riportato per intero, perche' "errore di
       autenticazione" manderebbe a cercare nel posto sbagliato. */
    throw new Error(`OAuth ${res.status}: ${testo.slice(0, 300)}`);
  }
  const d = JSON.parse(testo) as { access_token?: string };
  if (!d.access_token) throw new Error('OAuth: risposta senza access_token');
  return d.access_token;
}

/**
 * Carica le conversioni su Google Ads.
 *
 * @param prova con `true` Google valida tutto e non registra niente
 *              (`validateOnly`): e' il modo di scoprire un formato
 *              sbagliato senza sporcare l'account.
 */
export async function caricaSuGoogle(
  righe: Conversione[],
  prova: boolean,
  /* L'azione di destinazione. Senza, si carica dentro "Acquisto":
     e' il comportamento di sempre e non cambia per nessuno. Serve
     perche' dal 01/09/2026 lo stesso lavoro carica anche le
     richieste dal modulo, che sono un'altra azione. */
  azione?: string,
): Promise<EsitoCaricamento> {
  const vuoto: EsitoCaricamento = {
    configurato: false,
    inviate: 0,
    accettati: [],
    rifiutati: [],
    motivi: {},
    richieste: [],
  };
  const c = conf();
  if (!c) return { ...vuoto, errore: 'credenziali Google incomplete in .env' };
  if (!righe.length) return { ...vuoto, configurato: true };

  let testa: Record<string, string>;
  try {
    testa = {
      Authorization: 'Bearer ' + (await accesso(c)),
      'developer-token': c.sviluppo,
      'login-customer-id': c.mcc,
      'Content-Type': 'application/json',
    };
  } catch (e) {
    return {
      ...vuoto,
      configurato: true,
      errore: e instanceof Error ? e.message : String(e),
    };
  }

  const destinazioni = [
    {
      reference: 'prestige-ads',
      loginAccount: { accountType: 'GOOGLE_ADS', accountId: c.mcc },
      operatingAccount: { accountType: 'GOOGLE_ADS', accountId: c.cid },
      productDestinationId: (azione ?? c.azione).replace(/\D/g, ''),
    },
  ];

  const esito: EsitoCaricamento = { ...vuoto, configurato: true, inviate: righe.length };

  for (let i = 0; i < righe.length; i += LOTTO) {
    const pezzo = righe.slice(i, i + LOTTO);
    const eventi = pezzo.map((r) => {
      /* 🔴 L'EMAIL SI METTE SOLO SE C'E'.
         Qui c'era `r.emailGoogle!` con il punto esclamativo, cioe' "fidati,
         c'e' sempre". Con le prenotazioni era vero. Con le richieste dal
         modulo no: qualcuna lascia solo il telefono, e allora partiva un
         identificativo vuoto -- che Google rifiuta con un 400 secco su
         TUTTO il lotto, non solo su quella riga. Undici richieste buttate
         per una. */
      const identificativi: Record<string, string>[] = [];
      if (r.emailGoogle) identificativi.push({ emailAddress: r.emailGoogle });
      /* Il telefono raddoppia le possibilita' di abbinamento e non costa
         niente: chi non ce l'ha in formato internazionale viaggia con la
         sola email. */
      if (r.telefonoGoogle) identificativi.push({ phoneNumber: r.telefonoGoogle });

      const evento: Record<string, unknown> = {
        transactionId: r.ordine,
        /* RFC 3339. `toISOString()` produce la forma in UTC con la Z, che
           e' valida: il fuso vero l'ha gia' applicato `istanteDa`. */
        eventTimestamp: r.quando.toISOString(),
        userData: { userIdentifiers: identificativi },
        /* 🔴 VALORE ZERO VUOL DIRE "NON LO SO", NON "VALE ZERO".
           Le richieste dal modulo arrivano con valore 0 apposta: quanto
           vale davvero un preventivo nessuno l'ha mai misurato, e i 100
           euro sull'azione erano una stima. Mandando 0 si sovrascrive
           quella stima con una cifra ancora piu' finta; non mandando
           niente, Google usa il valore impostato sull'azione e il
           giorno che si sapra' si cambia in un posto solo. */
        ...(r.valore > 0 ? { conversionValue: r.valore, currency: 'EUR' } : {}),
        /* Sulla strada multi-sorgente e' facoltativo, ma se c'e' deve
           valere WEB: la prenotazione nasce sul sito. */
        eventSource: 'WEB',
      };
      /* Se il `gclid` e' arrivato fino all'ordine, l'attribuzione smette
         di essere probabilistica e diventa esatta: Google non deve piu'
         cercare a quale utente corrisponde l'impronta, sa gia' quale
         clic e'. Oggi non arriva mai (vedi `sorgenteDaSubId`). */
      if (r.gclid) evento.adIdentifiers = { gclid: r.gclid };
      return evento;
    });

    const corpo = {
      destinations: destinazioni,
      events: eventi,
      validateOnly: prova,
      /* Le impronte le mandiamo in esadecimale, non in base64. */
      encoding: 'HEX',
    };

    let res: Response;
    try {
      res = await fetch(INGEST, {
        method: 'POST',
        headers: testa,
        body: JSON.stringify(corpo),
        cache: 'no-store',
      });
    } catch (e) {
      /* Rete caduta: il lotto NON e' partito, quindi nessuna riga va
         segnata. La notte dopo si riprova da sola. */
      const m = `rete: ${e instanceof Error ? e.message : String(e)}`;
      esito.motivi[m] = (esito.motivi[m] ?? 0) + pezzo.length;
      esito.rifiutati.push(...pezzo.map((r) => r.ordine));
      continue;
    }

    const testo = await res.text();
    if (!res.ok) {
      const m = `HTTP ${res.status}: ${testo.slice(0, 400)}`;
      esito.motivi[m] = (esito.motivi[m] ?? 0) + pezzo.length;
      esito.rifiutati.push(...pezzo.map((r) => r.ordine));
      continue;
    }

    let d: { requestId?: string; errors?: unknown[]; warnings?: unknown[] } = {};
    try {
      d = JSON.parse(testo);
    } catch {
      /* 200 con un corpo illeggibile: il caricamento e' passato, il
         corpo no. Non e' un motivo per rimandare tutto. */
    }
    if (d.requestId) esito.richieste.push(d.requestId);

    /* La risposta della Data Manager API e' un `requestId` e basta: non
       c'e' un elenco riga per riga. Quindi "accettata" qui vuol dire
       ACCETTATA DALL'API, non "attribuita a una campagna": Google
       cerchera' per ognuna un clic sui nostri annunci e buttera' quelle
       che non ne hanno. E' il comportamento giusto -- l'organico non
       gonfia niente -- ma va detto, perche' il numero nel rapporto e'
       sempre piu' alto di quello che comparira' nei rapporti di Ads.
       `errors`/`warnings` non sono documentati come presenti, si
       leggono lo stesso: se un giorno compaiono, meglio saperlo. */
    const guai = [...(d.errors ?? []), ...(d.warnings ?? [])];
    for (const g of guai) {
      const m = JSON.stringify(g).slice(0, 200);
      esito.motivi[m] = (esito.motivi[m] ?? 0) + 1;
    }
    esito.accettati.push(...pezzo.map((r) => r.ordine));
  }

  return esito;
}
