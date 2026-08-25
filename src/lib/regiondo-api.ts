import crypto from 'node:crypto';

/* L'API di Regiondo (quella vera, non il widget pubblico).
 *
 * ── SOLO LATO SERVER ────────────────────────────────────────────────
 * Il segreto firma le richieste e non deve mai raggiungere il browser.
 * Per questo il file importa `node:crypto`: se qualcuno provasse a usarlo
 * da un componente client, la compilazione fallirebbe subito invece di
 * spedire la chiave a tutti. E' una difesa che si accorge dell'errore da
 * sola, non un commento che si spera qualcuno legga.
 *
 * ── LA FIRMA ────────────────────────────────────────────────────────
 * Non e' "chiave e segreto negli header": quello restituisce 401. E'
 * HMAC-SHA256 su `tempo + chiave + querystring`, e il segreto non viaggia
 * mai in rete -- viaggia solo il risultato della firma.
 *
 * Una trappola vera: la querystring va costruita come `http_build_query`
 * di PHP, cioe' con gli spazi come `+` e non come `%20`. Con `%20` la
 * firma non combacia e la risposta e' 401 senza spiegazioni. Il modo
 * sicuro di evitarla e' non mettere spazi nei parametri: le date senza
 * orario non ne hanno.
 */

const BASE = 'https://api.regiondo.com/v1/';

function chiavi() {
  const id = process.env.REGIONDO_API_KEY;
  const segreto = process.env.REGIONDO_API_SECRET;
  if (!id || !segreto) return null;
  return { id, segreto };
}

export function regiondoConfigurato() {
  return chiavi() !== null;
}

/** `http_build_query` di PHP: spazi come `+`, non `%20`. */
function query(params: Record<string, string | number>) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`)
    .join('&');
}

export async function chiama<T = unknown>(
  azione: string,
  params: Record<string, string | number> = {},
  revalidate = 900
): Promise<T | null> {
  const k = chiavi();
  if (!k) return null;

  const qs = query(params);
  const tempo = Math.floor(Date.now() / 1000).toString();
  const hash = crypto
    .createHmac('sha256', k.segreto)
    .update(tempo + k.id + qs)
    .digest('hex');

  const res = await fetch(BASE + azione + (qs ? '?' + qs : ''), {
    headers: {
      'X-API-ID': k.id,
      'X-API-TIME': tempo,
      'X-API-HASH': hash,
      'Accept-Language': 'en_US',
    },
    next: { revalidate },
  });

  if (!res.ok) return null;
  return (await res.json()) as T;
}

export type Prenotazione = {
  order_number: string;
  product_id: number;
  product_name: string;
  event_date_time: string;
  created_at: string;
  status: string;
  qty: number;
  first_name: string;
  last_name: string;
  contact_data?: { country?: string; city?: string } | null;
};

/** Le prenotazioni create da una data in poi. `created_to` e' ESCLUSIVO:
 *  from=24 & to=25 restituisce solo il 24. */
export async function prenotazioniDa(
  dal: string,
  productIds?: number[]
): Promise<Prenotazione[]> {
  const fuori: Prenotazione[] = [];
  let offset = 0;

  /* Il limite e' forzato a 250 anche chiedendo di piu': si pagina finche'
     una pagina torna meno di 250. Un tetto di 20 giri e' un freno: se
     l'API un giorno restituisse sempre 250 non si girerebbe all'infinito. */
  for (let giro = 0; giro < 20; giro++) {
    const p: Record<string, string | number> = {
      created_from: dal,
      limit: 250,
      offset,
    };
    if (productIds?.length) p.product_ids = productIds.join(',');

    /* Regiondo incarta tutto in `{ data: [...] }`. Cercavo `items`, che
       non esiste: la funzione restituiva sempre un elenco vuoto senza
       dare errore -- il tipo di guasto peggiore, perche' "zero
       prenotazioni" sembra una risposta valida. */
    const d = await chiama<{ data?: Prenotazione[]; items?: Prenotazione[] } | Prenotazione[]>(
      'supplier/bookings',
      p
    );
    const lista = Array.isArray(d) ? d : (d?.data ?? d?.items ?? []);
    if (!lista.length) break;
    fuori.push(...lista);
    if (lista.length < 250) break;
    offset += 250;
  }
  return fuori;
}

/* ─────────────────────────────────────────────────────────────────────
   AGGIUNTE PER IL RIAGGIORNAMENTO A MANO (pannello /admin/numeri/)
   ─────────────────────────────────────────────────────────────────────

   Quello che c'e' sopra resta com'era. Qui sotto ci sono tre cose che
   prima non servivano e che il pulsante "Aggiorna adesso" non puo' fare
   a meno di sapere:

   1. l'involucro vero delle risposte. Regiondo incarta tutto in
      `{ data, page }`: `page.total_pages` e' l'unico modo per dire
      all'utente "pagina 5 di 8" invece di lasciarlo davanti a una rotella
      che gira senza dire niente.

   2. il calendario del widget pubblico, che NON passa da questa API
      firmata e quindi non passa da `chiama`.

   3. richieste sempre fresche (`revalidate: 0`). Un pulsante che si preme
      apposta e restituisce dati di un quarto d'ora fa e' peggio di nessun
      pulsante: si ripreme convinti che non abbia funzionato.

   Restano tutte GET: qui non si scrive niente su Regiondo, mai. */

type Busta<T> = {
  data?: T;
  page?: { total_pages?: number; total_items?: number; current?: number };
};

export type ProdottoRegiondo = {
  product_id: string;
  sku: string;
  name: string;
  /** Da 0 a 100, non da 0 a 5: per avere il voto si divide per 20. */
  rating_summary: string | null;
  reviews_count: string | null;
};

/** Il catalogo intero. Oggi sono 85 prodotti e stanno in una pagina sola,
 *  ma il giro sulle pagine c'e' lo stesso: il giorno che diventano 301 il
 *  silenzio sarebbe totale, e mancherebbero solo le recensioni degli
 *  ultimi tour aggiunti -- cioe' proprio quelli che si stanno spingendo. */
export async function prodotti(): Promise<ProdottoRegiondo[]> {
  const fuori: ProdottoRegiondo[] = [];
  for (let pagina = 1; pagina <= 6; pagina++) {
    const d = await chiama<Busta<ProdottoRegiondo[]>>(
      'products',
      { limit: 300, offset: (pagina - 1) * 300 },
      0
    );
    const lista = d?.data ?? [];
    fuori.push(...lista);
    if (lista.length < 300) break;
  }
  return fuori;
}

/** Una prenotazione come arriva davvero: `Prenotazione` piu' i campi che
 *  servono per l'anonimizzazione e per non contare i posti annullati. */
export type PrenotazioneGrezza = {
  order_number: string;
  product_id: string;
  product_name: string;
  /** ORA LOCALE DI ROMA senza fuso ("2026-08-25 17:41:39"): va convertita
   *  prima di finire in una colonna `timestamptz`, altrimenti ogni
   *  prenotazione risulta fatta due ore nel futuro. */
  created_at: string;
  status: string;
  qty: number | string;
  qty_cancelled: number | string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  contact_data?: { telephone?: string | null } | null;
};

export type PaginaPrenotazioni = {
  righe: PrenotazioneGrezza[];
  /** quante pagine in tutto: serve alla barra di avanzamento */
  pagine: number;
  totale: number;
};

const PER_PAGINA = 250;

/** Una pagina sola di prenotazioni, numerata da 1. Chiedere le pagine una
 *  per una invece che tutte insieme e' voluto: una pagina costa sei
 *  secondi, otto pagine di fila sono cinquanta secondi dentro una sola
 *  richiesta -- oltre il tempo massimo di una funzione su Vercel. */
export async function prenotazioniPagina(
  dal: string,
  pagina: number,
  productIds?: number[]
): Promise<PaginaPrenotazioni | null> {
  const p: Record<string, string | number> = {
    created_from: dal,
    limit: PER_PAGINA,
    offset: Math.max(0, pagina - 1) * PER_PAGINA,
  };
  if (productIds?.length) p.product_ids = productIds.join(',');

  const d = await chiama<Busta<PrenotazioneGrezza[]>>('supplier/bookings', p, 0);
  if (!d) return null;
  return {
    righe: d.data ?? [],
    pagine: d.page?.total_pages ?? 1,
    totale: d.page?.total_items ?? (d.data?.length ?? 0),
  };
}

/** Un giorno del calendario, gia' ridotto ai due numeri che contano. */
export type GiornoCalendario = {
  /** "2026-08-26" */
  data: string;
  /** la capienza dichiarata della partenza piu' capiente del giorno */
  capienza: number;
  /** i posti liberi della partenza piu' libera del giorno */
  liberi: number;
};

const SHOP = process.env.NEXT_PUBLIC_REGIONDO_SHOP ?? 'https://prestigerent.regiondo.com';
const PROVIDER = process.env.NEXT_PUBLIC_REGIONDO_PROVIDER ?? 'PR193';

/** Il calendario dal widget pubblico: niente chiave, ma serve il `Referer`
 *  giusto o risponde vuoto.
 *
 *  Di ogni giorno si tiene il MASSIMO fra le partenze, non la somma. Un
 *  giorno con due partenze da 38 e 25 posti non ha "63 posti liberi": chi
 *  prenota ne sceglie una sola. Il massimo e' l'unico numero che si puo'
 *  scrivere accanto a "posti rimasti" senza mentire, e vale zero esatto
 *  quando -- e solo quando -- sono piene tutte. */
export async function calendario(sku: string): Promise<GiornoCalendario[] | null> {
  const url =
    `${SHOP}/widgets/booking/product?bookingWidgetVersion=v2&locale=en_US` +
    `&provider=${encodeURIComponent(PROVIDER)}&product=${encodeURIComponent(sku)}` +
    `&currency=EUR&nom=3&includeSoldOut=true`;

  let d: unknown;
  try {
    const res = await fetch(url, {
      headers: { Referer: 'https://prestigerent.com/' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    d = await res.json();
  } catch {
    /* un prodotto irraggiungibile non deve far fallire gli altri 86:
       torna null e chi chiama lo salta */
    return null;
  }

  const cal = (d as { calendar?: { d?: Record<string, { t?: Record<string, { cap?: number; avail?: number }> }> } })
    ?.calendar?.d;
  if (!cal) return null;

  const giorni: GiornoCalendario[] = [];
  for (const [data, voce] of Object.entries(cal)) {
    const fasce = Object.values(voce?.t ?? {});
    if (!fasce.length) continue;
    giorni.push({
      data,
      capienza: Math.max(...fasce.map((f) => Number(f?.cap ?? 0))),
      liberi: Math.max(...fasce.map((f) => Number(f?.avail ?? 0))),
    });
  }
  giorni.sort((a, b) => (a.data < b.data ? -1 : 1));
  return giorni;
}
