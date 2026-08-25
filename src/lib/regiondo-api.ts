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

    const d = await chiama<{ items?: Prenotazione[] } | Prenotazione[]>('supplier/bookings', p);
    const lista = Array.isArray(d) ? d : (d?.items ?? []);
    if (!lista.length) break;
    fuori.push(...lista);
    if (lista.length < 250) break;
    offset += 250;
  }
  return fuori;
}
