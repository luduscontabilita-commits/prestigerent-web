/* 🔴 IL BADGE DELL'HERO SI RICAVA DA COSA E' DAVVERO INCLUSO.
 *
 * Prima veniva deciso cercando una parola dentro il testo INTERO delle
 * schede INCLUDED e PRICES messe insieme. Quel testo pero' contiene tre
 * elenchi diversi, e due dicono il contrario del primo:
 *
 *     Included:      Guided visit of 2 wineries, generous tasting...
 *     Not Included:  Lunch or dinner
 *     Optional:      Local guide for 3 hours in Florence, Euro 300,00
 *
 * Cercando "lunch" in tutto il blocco, `wine-experience-in-tuscany`
 * riceveva il badge "Winery lunch and tastings included" grazie alla riga
 * che dice che il pranzo NON e' incluso. Stessa cosa per la guida: TRENTA
 * pagine promettevano "Licensed guide included" prendendo la parola dalla
 * riga "Optional: Local guide, Euro 300,00 per party". Chi prenotava un
 * privato a 250 euro credendo di avere la guida scopriva il giorno stesso
 * che erano 300 euro in piu': rimborso forzato e una stella.
 *
 * Misurato su tutte e 87 le schede: 50 mostravano un badge e solo QUATTRO
 * dicevano il vero. 38 sparivano del tutto perche' non c'e' niente da
 * promettere, 8 dicevano una cosa per un'altra (il pranzo dove c'e' solo
 * la degustazione, la cantina dove c'e' solo il pranzo). Adesso i badge
 * sono dodici e ognuno corrisponde a una riga dell'elenco "Included".
 *
 * Le tre regole che tengono in piedi il conto:
 *
 *  1. si guarda SOLO la sezione "Included" (`primaSezione`), non le altre;
 *  2. si guarda UNA VOCE ALLA VOLTA, non il testo appiattito: cosi'
 *     "Free time to stop for lunch at a typical Tuscan restaurant" resta
 *     quello che e' -- tempo libero per andare a pranzo a proprie spese --
 *     e non diventa "pranzo incluso" (erano tre pagine su Chianti);
 *  3. se la sezione "Not included" nega la stessa cosa senza qualificarla
 *     ("Meals" secco, non "additional wine tastings"), il badge cade.
 *
 * Meglio nessun badge che un badge falso: sotto la soglia il posto resta
 * vuoto, e restano gli altri due punti dell'hero.
 */

import { primaSezione, testo, vociElenco } from './prosa';

export type Badge = { icona: string; testo: string };

/** I titoletti che chiudono l'elenco di cio' che e' compreso nel prezzo. */
const CHIUDE = /^(not\s*-?\s*includ|excluded|not\s*inclus|optional|important|extra|please note)/;

/** Il titoletto di cio' che il prezzo NON copre. */
const NEGA = /^(not\s*-?\s*includ|excluded|not\s*inclus)/;

/* Una voce che comincia con "Free time to..." o che e' subordinata a
 * un'opzione non e' una promessa: e' un'occasione. Non fa badge. */
const NON_E_PROMESSA =
  /free time|at your own (pace|peace)|if option|if selected|option selected|if applicable|if booked|if desired|if interested|if still available|if needed/;

/* La negazione conta solo se e' secca. "Meals and/or ADDITIONAL wine
 * tastings" non smentisce la degustazione che il tour offre davvero. */
const NEGAZIONE_QUALIFICATA = /\b(additional|further|extra|other|second|third|more)\b/;

const PRANZO = /\blunch(es)?\b|\bdinner(s)?\b|\bmeal(s)?\b/;
const VINO = /\btasting|\bwinery\b|\bwineries\b|\bwine tour\b|\bwine estate/;
/* "driver/guide" e' l'autista che racconta la strada, non una guida
 * abilitata: se lo si contasse come guida, tutte le pagine dei privati
 * ripartirebbero con il badge sbagliato. */
const GUIDA = /\bguide(d|s)?\b/;
const NON_E_GUIDA = /driver\s*\/\s*guide|driver-guide|guide\/driver/;

type Cosa = 'pranzo' | 'vino' | 'guida';

const CHIAVI: Record<Cosa, RegExp> = { pranzo: PRANZO, vino: VINO, guida: GUIDA };

/** Cosa il tour include davvero, letto dalla sola sezione "Included". */
export function cosaIncludeDavvero(tabs?: Record<string, string>): Set<Cosa> {
  const scheda = tabs?.['INCLUDED'] ?? tabs?.['Included'] ?? tabs?.['INCLUSI'] ?? '';
  const compresa = primaSezione(scheda, CHIUDE);
  const dentro = vociElenco(compresa).filter((v) => !NON_E_PROMESSA.test(v));

  /* La controprova: l'elenco di cio' che il prezzo NON copre. Sta subito
     dopo la sezione compresa, e vale solo se quel titoletto e' davvero
     "Not included" -- se la scheda passa dritta a "Optional" non c'e'
     niente da smentire. */
  const dopo = scheda.slice(compresa.length);
  const titolo = testo(dopo.split(/(?=<p[\s>])/i)[0].replace(/<[^>]*>/g, ' ')).toLowerCase();
  const negate = NEGA.test(titolo)
    ? vociElenco(primaSezione(dopo, /^(optional|important|extra|please note)/))
    : [];

  const out = new Set<Cosa>();
  for (const cosa of ['pranzo', 'vino', 'guida'] as Cosa[]) {
    const re = CHIAVI[cosa];
    const promesso = dentro.some(
      (v) => re.test(v) && !(cosa === 'guida' && NON_E_GUIDA.test(v))
    );
    if (!promesso) continue;
    const smentito = negate.some((v) => re.test(v) && !NEGAZIONE_QUALIFICATA.test(v));
    if (smentito) continue;
    out.add(cosa);
  }
  return out;
}

/* L'hero ha un posto solo: si dichiara la cosa piu' pesante fra quelle
 * vere. Il pranzo batte la degustazione, la degustazione batte la guida. */
export function badgeIncluso(tabs?: Record<string, string>): Badge | null {
  const c = cosaIncludeDavvero(tabs);
  if (c.has('pranzo') && c.has('vino'))
    return { icona: '🍷', testo: 'Winery lunch and tastings included' };
  if (c.has('pranzo')) return { icona: '🍽️', testo: 'Lunch included' };
  if (c.has('vino')) return { icona: '🍷', testo: 'Wine tastings included' };
  if (c.has('guida')) return { icona: '🗣️', testo: 'Licensed guide included' };
  return null;
}
