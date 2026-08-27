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
  /** minuti di servizio, quando dichiarati */
  durationMinutes: number | null;
  /** gia' scritta per il lettore: "15 minutes", "4 hours", "1 hour 30 minutes" */
  durationLabel: string | null;
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

/* 🔴 LA DURATA HA UN'UNITA', E VA LETTA.
 *
 * Arriva serializzata da PHP (Varien_Object di Magento) e contiene DUE
 * campi: i valori e il tipo.
 *
 *     "values";a:1:{i:0;d:15;}  "type";s:6:"minute"
 *
 * Il vecchio parser prendeva solo il numero e la pagina stampava "15
 * hours": il transfer dall'aeroporto di Firenze in citta' -- un quarto
 * d'ora -- risultava una giornata intera. Due pagine su 87, ma sono due
 * transfer, cioe' l'acquisto in cui l'orario e' tutto.
 *
 * I valori possono essere piu' di uno (una durata per opzione di
 * prenotazione, indicizzata per id opzione: `{i:0;d:9;i:21;d:8;}`). Si
 * prende il massimo -- la giornata piena -- e non il primo che capita:
 * su tre prodotti il primo valore e' `d:0` e la durata spariva del tutto.
 */
function parseDuration(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const blocco = raw.match(/"values";a:\d+:\{([^}]*)\}/);
  const valori = [...(blocco?.[1] ?? raw).matchAll(/d:([0-9.]+);/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!valori.length) return null;

  const quanti = Math.max(...valori);
  const unita = raw.match(/"type";s:\d+:"(\w+)"/)?.[1] ?? 'hour';
  const perUnita: Record<string, number> = { minute: 1, hour: 60, day: 60 * 24 };
  return Math.round(quanti * (perUnita[unita] ?? 60));
}

/** La durata come la legge un cliente, non come la conserva Magento. */
export function durataInParole(minuti: number | null): string | null {
  if (!minuti || minuti <= 0) return null;
  if (minuti < 60) return `${minuti} minutes`;
  const ore = Math.floor(minuti / 60);
  const resto = minuti % 60;
  const parteOre = `${ore} ${ore === 1 ? 'hour' : 'hours'}`;
  return resto ? `${parteOre} ${resto} minutes` : parteOre;
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

  const minuti = parseDuration(d.ticket_duration);

  return {
    sku: str(d.sku),
    name: str(d.name),
    price,
    currency: 'EUR',
    durationMinutes: minuti,
    durationLabel: durataInParole(minuti),
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
