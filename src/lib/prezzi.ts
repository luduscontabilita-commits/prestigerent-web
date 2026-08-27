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
 * migliaia trasformava 750 euro in 75.000. Su 75 schede pero' convivono con
 * la forma italiana "Euro 90,00" -- vedi `numero()`.
 */

import { primaSezione, testo as inChiaro } from './prosa';

export type Prezzo = { valore: number; fonte: 'regiondo' | 'wordpress' };

const IMPORTO = /(?:Euro|EUR|€)\s*([0-9][0-9.,]*)/gi;

/* I titoletti che chiudono il listino vero e aprono gli extra a pagamento.
 * Senza questo taglio il "da" della pagina poteva diventare il prezzo di
 * un supplemento: "Euro 15,00 per person" della visita al Duomo di Siena
 * e' un extra facoltativo, non il prezzo del tour da 149. */
const DOPO_IL_LISTINO = /^(optional|important|extra|please note|note:)/;

export function numero(grezzo: string): number | null {
  let s = grezzo.trim();
  /* DUE FORMATI NELLA STESSA PAGINA, ereditati da WordPress: "Euro 750.00"
     all'inglese e "Euro 90,00" all'italiana, a volte nello stesso elenco.
     Chi decide guardando solo la virgola sbaglia in un verso o nell'altro:
     "1,200.00" sono milleduecento euro, "90,00" sono novanta. Discrimina
     la POSIZIONE: due cifre dopo la virgola e fine stringa -> decimale. */
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function schedaPrezzi(tabs?: Record<string, string>): string {
  return tabs?.['PRICES'] ?? tabs?.['Prices'] ?? tabs?.['PREZZI'] ?? '';
}

/** Il piu' basso degli importi elencati nella scheda dei prezzi. */
export function prezzoDaSchedaPrezzi(tabs?: Record<string, string>): number | null {
  const scheda = schedaPrezzi(tabs);
  if (!scheda) return null;

  const valori: number[] = [];
  for (const m of primaSezione(scheda, DOPO_IL_LISTINO).matchAll(IMPORTO)) {
    const n = numero(m[1]);
    /* Sotto i 10 euro sono note tipo "Euro 5.00 di supplemento", non il
       prezzo del tour: prenderle come minimo falserebbe la scheda. */
    if (n != null && n >= 10) valori.push(n);
  }
  if (!valori.length) return null;
  return Math.min(...valori);
}

/* ── PER PERSONA O PER GRUPPO ────────────────────────────────────────────
 *
 * L'etichetta accanto al prezzo era decisa dal TIPO di tour: `private` ->
 * "per party", tutto il resto -> "per person". Su 55 pagine su 87 diceva
 * il contrario di quello che la stessa pagina scrive due schermate piu'
 * sotto: la barra prezzo prometteva "from €750 per person" e la tabella
 * PRICES apriva con "Prices below are per party (not per person)".
 *
 * Una famiglia di quattro leggeva tremila euro per Firenze-Roma e se ne
 * andava senza chiedere. E' l'errore che costa di piu' fra quelli trovati,
 * perche' non produce un reclamo: produce un carrello abbandonato che
 * nessuno conta.
 *
 * L'etichetta ora la detta la scheda PRICES, che lo dichiara a lettere sue
 * su tutte e 87 le pagine: 83 per gruppo, 4 per persona (i piccoli gruppi).
 */
export type Unita = 'per person' | 'per party';

export function unitaDaSchedaPrezzi(tabs?: Record<string, string>): Unita | null {
  const nudo = inChiaro(schedaPrezzi(tabs).replace(/<[^>]*>/g, ' '));
  if (!nudo) return null;
  const m = nudo.match(/prices?\s+(?:below\s+)?are\s+per\s+(person|party|group|vehicle|car)/i);
  if (m) return /person/i.test(m[1]) ? 'per person' : 'per party';
  /* Non l'ha detto in apertura: lo dice comunque il listino, che e' fatto
     di righe "Euro 850.00 - party of 4 people". */
  if (/\bnot\s+per\s+person\b/i.test(nudo) || /\bparty of\b/i.test(nudo)) return 'per party';
  return null;
}

/** L'etichetta da stampare accanto al prezzo. Il tipo di tour interviene
 *  solo se la pagina non dichiara niente: e in quel caso il gruppo e' la
 *  scelta prudente, perche' un prezzo di gruppo letto come per persona
 *  moltiplica la cifra invece di dividerla. */
export function unitaDi(tabs: Record<string, string> | undefined, kind: string): Unita {
  return unitaDaSchedaPrezzi(tabs) ?? (kind === 'small_group' ? 'per person' : 'per party');
}

export function prezzoDi(
  daRegiondo: number | null | undefined,
  tabs?: Record<string, string>
): Prezzo | null {
  if (daRegiondo != null) return { valore: daRegiondo, fonte: 'regiondo' };
  const wp = prezzoDaSchedaPrezzi(tabs);
  return wp != null ? { valore: wp, fonte: 'wordpress' } : null;
}
