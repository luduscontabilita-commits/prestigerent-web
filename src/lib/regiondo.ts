/* Regiondo e' la fonte della verita' commerciale.
 *
 * Prezzo, durata, inclusi, non inclusi, orari e punto di ritiro stanno la'
 * dentro, ed e' la' che il cliente li cambia gia' oggi. Il sito li legge:
 * nessuno li ricopia a mano. E' l'unico modo per non ritrovarsi come sul
 * sito vecchio, dove la stessa informazione esisteva in tre copie diverse e
 * discordanti (landing, pagina WordPress, scheda Regiondo).
 *
 * L'endpoint e' quello che usa il widget di prenotazione: pubblico, senza
 * chiave. L'ho ricavato osservando le chiamate di rete della landing.
 */

const SHOP = process.env.NEXT_PUBLIC_REGIONDO_SHOP ?? 'https://prestigerent.regiondo.com';
const PROVIDER = process.env.NEXT_PUBLIC_REGIONDO_PROVIDER ?? 'PR193';

export type RegiondoProduct = {
  sku: string;
  name: string;
  /** prezzo "a partire da", in euro */
  price: number | null;
  currency: string;
  /** ore di servizio, quando dichiarate */
  durationHours: number | null;
  shortDescription: string;
  description: string;
  included: string;
  notIncluded: string;
  otherInfo: string;
  participants: string;
  /** dove si viene presi: per i privati e' l'alloggio del cliente */
  pickup: string;
  images: string[];
  urlKey: string;
};

/** La durata arriva serializzata da PHP (Varien_Object di Magento).
 *  Non vale la pena un parser: serve solo il numero di ore. */
function parseDuration(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/"values";a:1:\{i:0;d:([0-9.]+);\}/);
  if (m) return Number(m[1]);
  const m2 = raw.match(/d:([0-9.]+);/);
  return m2 ? Number(m2[1]) : null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export async function fetchProduct(
  sku: string,
  locale = 'en_US'
): Promise<RegiondoProduct | null> {
  const url =
    `${SHOP}/widgets/booking/product?bookingWidgetVersion=v2` +
    `&locale=${encodeURIComponent(locale)}` +
    `&provider=${encodeURIComponent(PROVIDER)}` +
    `&product=${encodeURIComponent(sku)}` +
    `&currency=EUR&nom=1&includeSoldOut=true`;

  /* Le pagine sono statiche e si rigenerano da sole: un'ora e' il compromesso
     fra "il prezzo e' sempre giusto" e "non martellare Regiondo a ogni visita".
     Se serve piu' veloce si usa la rigenerazione su richiesta. */
  const res = await fetch(url, {
    headers: { Referer: 'https://prestigerent.com/' },
    next: { revalidate: 3600, tags: [`regiondo:${sku}`] },
  });

  if (!res.ok) return null;

  const d = (await res.json()) as Record<string, unknown>;
  if (!d || !d.sku) return null;

  const gallery = Array.isArray(d.media_gallery) ? (d.media_gallery as unknown[]) : [];
  const images = gallery
    .map((g) => (g && typeof g === 'object' ? str((g as Record<string, unknown>).url) : ''))
    .filter(Boolean);
  const main = str(d.image);
  if (main && !images.includes(main)) images.unshift(main);

  const priceRaw = d.price;
  const price =
    typeof priceRaw === 'string' || typeof priceRaw === 'number'
      ? Number(priceRaw) || null
      : null;

  return {
    sku: str(d.sku),
    name: str(d.name),
    price,
    currency: 'EUR',
    durationHours: parseDuration(d.ticket_duration),
    shortDescription: str(d.short_description),
    description: str(d.description),
    included: str(d.faq_included),
    notIncluded: str(d.faq_not_included),
    otherInfo: str(d.faq_other_info),
    participants: str(d.faq_participants),
    pickup: str(d.location_specific_info),
    images,
    urlKey: str(d.url_key),
  };
}
