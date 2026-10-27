/* IL LISTINO PREZZI: come si ordinano i servizi, e cosa vede chi lo apre.
 *
 * Logica pura, condivisa fra le pagine del pannello (server) e le tabelle
 * (client): per questo sta in un modulo SENZA direttiva -- vedi la regola
 * in testa a src/lib/menu-admin.ts. Provata da `listino.test.ts`.
 *
 * I prezzi NON stanno qui e non stanno nel database: si leggono da
 * Regiondo ogni volta (src/lib/regiondo-listino.ts). Regola 3 del
 * CLAUDE.md.
 *
 * ── LE SEZIONI SONO QUELLE DEL SITO ─────────────────────────────────
 * Le stesse del menu (src/lib/menu.ts) tranne Destinations, che e'
 * geografica e ripeterebbe tutto il catalogo una seconda volta.
 * L'appartenenza viene da `tour_categorie`, la stessa tabella che riempie
 * le pagine categoria. Un tour sta in piu' categorie (un tour dal porto
 * di Livorno e' anche un «private tour»): nel listino compare UNA volta,
 * nella prima sezione che lo contiene secondo l'ordine qui sotto. Le
 * escursioni dai porti vengono prima perche' sono l'informazione piu'
 * specifica: chi le cerca le cerca per porto.
 */

export type Opzione = { id: string; nome: string; prezzo: number };
export type Variante = { id: string; titolo: string; opzioni: Opzione[] };

/** Il prezzo come lo scrive l'API ufficiale di Regiondo, in numero.
 *
 *  🔴 L'API scrive le migliaia con la VIRGOLA: «1,040.00». Con un
 *  `Number()` nudo diventa NaN, e il 27/10/2026 il listino ha perso tutte
 *  le opzioni da mille euro in su -- le colonne 6, 7, 8 persone e intere
 *  varianti «Driver + Guide» -- e la sincronizzazione segnava «tab PRICES
 *  non abbinabile» su 69 servizi. Il punto e' sempre il separatore dei
 *  decimali (formato inglese), la virgola sempre quello delle migliaia. */
export function prezzoRegiondo(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const pulito = v.trim().replace(/[\s,]/g, '');
  return pulito ? Number(pulito) : NaN;
}

export type ChiaveSezione = 'cruise' | 'transfers' | 'small' | 'wine' | 'private' | 'other';

export type Servizio = {
  slug: string;
  nome: string;
  sku: string;
  sezione: ChiaveSezione;
  /** il porto, o il tipo di transfer; null dove la sezione non si divide */
  gruppo: string | null;
  unita: 'per person' | 'per party';
  /** null = Regiondo non ha risposto per questo prodotto */
  varianti: Variante[] | null;
};

export const SEZIONI: { chiave: ChiaveSezione; en: string; it: string }[] = [
  { chiave: 'cruise', en: 'Cruise Port Tours', it: 'Cruise Port Tours (escursioni dai porti)' },
  { chiave: 'transfers', en: 'Transfers', it: 'Transfers' },
  { chiave: 'small', en: 'Small Group Tours', it: 'Small Group Tours' },
  { chiave: 'wine', en: 'Wine & Food Experiences', it: 'Wine & Food' },
  { chiave: 'private', en: 'Private Tours', it: 'Private Tours' },
  { chiave: 'other', en: 'Other services', it: 'Altri servizi' },
];

/** I porti nell'ordine del menu del sito, con la categoria che li indica. */
export const PORTI: [categoria: string, nome: string][] = [
  ['livorno-port', 'Livorno'],
  ['la-spezia-port', 'La Spezia'],
  ['civitavecchia', 'Civitavecchia (Rome)'],
  ['naples-port', 'Naples'],
  ['sorrento-port', 'Sorrento'],
  ['salerno-port', 'Salerno'],
  ['amalfi-positano-port', 'Amalfi & Positano'],
  ['palermo', 'Palermo'],
  ['messina', 'Messina'],
  ['taormina-port', 'Taormina'],
];

const CON_FERMATA = ['transfers-with-stop-enroute', 'florence-to-rome', 'florence-to-venice', 'florence-to-milan', 'rome-to-naples'];
const DIRETTI = ['direct-transfers', 'florence-direct-transfers', 'rome-direct-transfers', 'milan-direct-transfers', 'venice-direct-transfers', 'naples'];

export const GRUPPO_DIRETTI = 'Direct transfers';
export const GRUPPO_FERMATA = 'With a stop on the way';

/** L'ordine dei gruppi dentro una sezione: i porti come nel menu, poi i
 *  transfer diretti prima di quelli con la fermata. */
export const ORDINE_GRUPPI: string[] = [...PORTI.map(([, n]) => n), GRUPPO_DIRETTI, GRUPPO_FERMATA];

/** In quale sezione (e gruppo) del listino va un tour, dalle sue
 *  categorie del sito. */
export function sezioneDi(categorie: readonly string[]): { sezione: ChiaveSezione; gruppo: string | null } {
  const c = new Set(categorie);
  const porto = PORTI.find(([cat]) => c.has(cat));
  if (porto) return { sezione: 'cruise', gruppo: porto[1] };
  if (c.has('cruise-port-tours')) return { sezione: 'cruise', gruppo: 'Other ports' };
  if (CON_FERMATA.some((k) => c.has(k))) return { sezione: 'transfers', gruppo: GRUPPO_FERMATA };
  if (c.has('transfers') || DIRETTI.some((k) => c.has(k))) return { sezione: 'transfers', gruppo: GRUPPO_DIRETTI };
  if (c.has('small-group-tours')) return { sezione: 'small', gruppo: null };
  if (c.has('wine-and-food-experiences')) return { sezione: 'wine', gruppo: null };
  if (c.has('private-tours')) return { sezione: 'private', gruppo: null };
  return { sezione: 'other', gruppo: null };
}

/** Le colonne della tabella di un servizio sono le varianti, le righe le
 *  opzioni (per decisione della proprieta' del 12/10/2026: le persone si
 *  leggono scendendo, non scorrendo di lato). Quando TUTTE le opzioni sono
 *  «N person/people» la prima colonna si intitola «People» e la riga
 *  mostra solo il numero. */
export function righeDelServizio(varianti: Variante[]): {
  perPersone: boolean;
  righe: { etichetta: string; prezzi: (number | null)[] }[];
} {
  const nomi: string[] = [];
  for (const v of varianti) for (const o of v.opzioni) if (!nomi.includes(o.nome)) nomi.push(o.nome);
  /* `\s*` e non `\s+`: su Regiondo alcune opzioni sono scritte «1person»,
     attaccato (trovato il 12/10/2026 su tre servizi). */
  const perPersone = nomi.length > 0 && nomi.every((n) => /^\d+\s*(person|people)$/i.test(n));
  return {
    perPersone,
    righe: nomi.map((n) => ({
      etichetta: perPersone ? n.replace(/\s*(person|people)$/i, '') : n,
      prezzi: varianti.map((v) => v.opzioni.find((o) => o.nome === n)?.prezzo ?? null),
    })),
  };
}

/** I servizi divisi in sezioni e gruppi, nell'ordine in cui si leggono.
 *  Dentro un gruppo, in ordine alfabetico: e' un listino, non una vetrina. */
export function raggruppa(servizi: Servizio[]) {
  return SEZIONI.map((s) => {
    const dentro = servizi.filter((x) => x.sezione === s.chiave);
    const gruppi = [...new Set(dentro.map((x) => x.gruppo ?? ''))]
      .sort((a, b) => {
        const ia = ORDINE_GRUPPI.indexOf(a);
        const ib = ORDINE_GRUPPI.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .map((g) => ({
        gruppo: g || null,
        servizi: dentro.filter((x) => (x.gruppo ?? '') === g).sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
    return { ...s, totale: dentro.length, gruppi };
  }).filter((s) => s.totale > 0);
}
