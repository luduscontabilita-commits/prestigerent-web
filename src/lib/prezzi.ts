/* Il prezzo "a partire da", con due fonti e una gerarchia chiara.
 *
 * 1. REGIONDO, quando il tour ha un prodotto agganciato. E' il prezzo vivo:
 *    cambia sul pannello e cambia sul sito. Vale sempre di piu'.
 * 2. LA SCHEDA "PRICES" DI WORDPRESS, per i 38 tour senza prodotto. Il prezzo
 *    c'e' su tutte e 87 le pagine -- va solo letto.
 *
 * Senza il secondo, un terzo del catalogo mostrava "Price on request" pur
 * avendo il listino scritto sulla pagina da anni.
 *
 * ATTENZIONE al formato: gli importi sono scritti all'inglese, "Euro 750.00",
 * dove il punto e' il separatore DECIMALE. Trattarlo come separatore delle
 * migliaia trasformava 750 euro in 75.000.
 */

export type Prezzo = { valore: number; fonte: 'regiondo' | 'wordpress' };

const IMPORTO = /(?:Euro|EUR|€)\s*([0-9][0-9.,]*)/gi;

function numero(grezzo: string): number | null {
  /* Via le virgole (migliaia), il punto resta decimale: "1,200.00" -> 1200 */
  const n = Number(grezzo.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Il piu' basso degli importi elencati nella scheda dei prezzi. */
export function prezzoDaSchedaPrezzi(tabs?: Record<string, string>): number | null {
  if (!tabs) return null;
  const testo = tabs['PRICES'] ?? tabs['Prices'] ?? tabs['PREZZI'] ?? '';
  if (!testo) return null;

  const valori: number[] = [];
  for (const m of testo.matchAll(IMPORTO)) {
    const n = numero(m[1]);
    /* Sotto i 10 euro sono note tipo "Euro 5.00 di supplemento", non il
       prezzo del tour: prenderle come minimo falserebbe la scheda. */
    if (n != null && n >= 10) valori.push(n);
  }
  if (!valori.length) return null;
  return Math.min(...valori);
}

export function prezzoDi(
  daRegiondo: number | null | undefined,
  tabs?: Record<string, string>
): Prezzo | null {
  if (daRegiondo != null) return { valore: daRegiondo, fonte: 'regiondo' };
  const wp = prezzoDaSchedaPrezzi(tabs);
  return wp != null ? { valore: wp, fonte: 'wordpress' } : null;
}
