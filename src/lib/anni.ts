/* DA QUANTO ESISTE L'AZIENDA, IN UN POSTO SOLO.
 *
 * Il 31/08/2026 il sito diceva quattro cose diverse sulla stessa storia:
 * "since 2002" nei dati strutturati, "Twenty-four years" nei titoli delle
 * recensioni, "in the past 25 years" su cruise-port-tours, "more than 20
 * years" in Perche'. Nessuna delle quattro era vera -- la proprieta' ha
 * confermato che si comincia nel 2000 -- ma il guaio non era il numero
 * sbagliato: era che stavano scritti a mano in quattordici punti, quindi
 * ne bastava uno dimenticato per farne comparire due diversi nella stessa
 * visita. Due numeri che si smentiscono valgono meno di nessun numero.
 *
 * La fonte vera resta la riga `azienda` su Supabase (`anno_fondazione`).
 * Qui c'e' la stessa cifra per i due casi in cui il database non si puo'
 * leggere: i moduli sincroni (dati strutturati, firme delle email) e i
 * testi fissi. Se le due divergono si cambia questa: e' l'unico 2000
 * scritto nel codice.
 */
export const ANNO_FONDAZIONE = 2000;

/** Gli anni compiuti. Calcolati sempre, mai scritti: cosi' il 1 gennaio
 *  il sito invecchia da solo invece di restare fermo a un numero vecchio
 *  (il sito precedente parlava ancora di "covid-19 policy"). */
export function anniDiAttivita(anno?: number | null): number {
  return new Date().getFullYear() - (anno ?? ANNO_FONDAZIONE);
}

const UNITA = ['', 'one', 'two', 'three', 'four', 'five',
               'six', 'seven', 'eight', 'nine'];
const DECINE = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

/** "26" scritto "twenty-six". Nei titoli e nella prosa una cifra in mezzo
 *  a una frase inglese stona; nei riquadri e nei dati serve la cifra. */
export function aParole(n: number): string {
  if (n < 20 || n > 59) return String(n);
  const d = DECINE[Math.floor(n / 10)];
  const u = UNITA[n % 10];
  return u ? `${d}-${u}` : d;
}

/** Con la maiuscola, per quando la frase comincia li'. */
export function aParoleMaiusc(n: number): string {
  const s = aParole(n);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* I SEGNAPOSTO NEI TESTI FISSI.
 *
 * La prosa delle categorie e le 145 risposte delle FAQ sono testo, non
 * codice: non possono chiamare una funzione. Ci scriviamo un segnaposto e
 * lo sostituiamo al momento di stamparlo -- vale anche dentro i dati
 * strutturati, che leggono lo stesso testo.
 *
 *   {anni}   -> 26            {Anni}  -> Twenty-six
 *   {parole} -> twenty-six    {dal}   -> 2000
 */
export function conAnni(testo: string, anno?: number | null): string {
  const n = anniDiAttivita(anno);
  return testo
    .replace(/\{anni\}/g, String(n))
    .replace(/\{Anni\}/g, aParoleMaiusc(n))
    .replace(/\{parole\}/g, aParole(n))
    .replace(/\{dal\}/g, String(anno ?? ANNO_FONDAZIONE));
}
