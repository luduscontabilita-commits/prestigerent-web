import { testo } from '@/lib/prosa';

/* LA BARRA DEI FATTI: le sei risposte che uno cerca prima di leggere.
 *
 * ── PERCHE' ESISTE ──────────────────────────────────────────────────
 * Il sito WordPress, subito sotto il titolo, aveva una riga con Location,
 * Duration, Time, Language, Tour Type e Free Cancellation. Sei risposte
 * in due righe, senza aprire niente. Nel passaggio quella riga e' sparita
 * e le stesse informazioni sono finite dentro le schede, dove per
 * leggerle bisogna sapere che ci sono e andarle a cercare.
 *
 * Non e' un dettaglio di stile: sono le sei domande che una persona si fa
 * PRIMA di decidere se vale la pena leggere il resto. Se non trova la
 * durata in tre secondi, non scorre: torna indietro.
 *
 * ── 🔴 LA REGOLA: SI MOSTRA SOLO QUELLO CHE SI TROVA ────────────────
 * Ogni voce nasce da un dato vero -- Regiondo per la durata, il tipo di
 * tour dal catalogo, gli orari e il punto d'incontro letti dal testo
 * della scheda TIME / LOCATION. Quando un dato non c'e', la voce non
 * compare: NON si mette un trattino, non si scrive "n/d" e soprattutto
 * non si mette un valore predefinito.
 *
 * Il valore predefinito e' la tentazione vera qui: scrivere "Florence"
 * per tutti costa una riga e funziona su ottanta tour su ottantasei. Ma
 * sui sei che partono dai porti -- Livorno, La Spezia, Napoli,
 * Civitavecchia -- direbbe a un crocierista di presentarsi nella citta'
 * sbagliata. Un dato mancante non fa danno; un dato sbagliato fa perdere
 * il cliente e la giornata.
 */

export type Fatto = { etichetta: string; valore: string };

/** Il primo orario che compare nel testo, in forma leggibile.
 *  "8:45am (if booked for the 9:00am tour departure)" -> "9:00am"
 *  Si preferisce la PARTENZA al check-in: e' quella che la gente cerca. */
function orariDa(html: string | undefined): string | null {
  if (!html) return null;
  const piano = testo(html.replace(/<[^>]+>/g, ' '));

  /* Prima si cercano gli orari dichiarati come partenza: nel testo di
     WordPress sono scritti come "9:00am tour departure" oppure
     "departure at 9:00am". Il check-in viene prima nel testo ma non e'
     quello che si vuole leggere in cima alla pagina. */
  const partenze = [
    ...piano.matchAll(/(\d{1,2}[:.]\d{2}\s*(?:am|pm))\s*(?:tour\s*)?departure/gi),
    ...piano.matchAll(/departure\s*(?:at|:)?\s*(\d{1,2}[:.]\d{2}\s*(?:am|pm))/gi),
  ].map((m) => m[1].replace(/\s+/g, '').replace('.', ':').toLowerCase());

  const unici = [...new Set(partenze)];
  if (unici.length === 1) return unici[0];
  /* Due partenze (mattina e pomeriggio) si dicono tutte e due: e' una
     scelta in piu' per il cliente, non un dettaglio da nascondere. Oltre
     le due si tace, perche' una fila di orari in cima alla pagina non si
     legge e occupa il posto di qualcosa di utile. */
  if (unici.length === 2) return `${unici[0]} or ${unici[1]}`;
  return null;
}

/** Il punto d'incontro, accorciato al nome del posto. */
function ritrovoDa(html: string | undefined): string | null {
  if (!html) return null;
  const piano = testo(html.replace(/<[^>]+>/g, ' '));
  const m = piano.match(/meeting point\s*:?\s*(.{4,60}?)(?:[.–—]|\s+-\s|,\s*\(|\s+It takes|\s+If you|\s+Please|$)/i);
  if (!m) return null;
  const v = m[1].replace(/\s+/g, ' ').trim().replace(/[,;:]$/, '');
  /* Un ritrovo di due parole ("the parking") non dice dove si va, e uno
     di sessanta e' un paragrafo: fuori entrambi. */
  return v.length >= 6 && v.length <= 52 ? v : null;
}

const TIPO: Record<string, string> = {
  small_group: 'Small group tour',
  private: 'Private tour',
  cruise: 'Shore excursion',
  transfer: 'Private transfer',
};

/** Quante persone al massimo. Sono i numeri che il testo dei tour
 *  dichiara gia' ("max 25 people", "max 8"), non una stima. */
const GRUPPO: Record<string, string> = {
  small_group: 'Max 25 (or 8 semiprivate)',
  private: 'Your party only',
  cruise: 'Your party only',
  transfer: 'Your party only',
};

export function fattiDi(opzioni: {
  kind: string | null | undefined;
  durata: string | null | undefined;
  schede: Record<string, string> | undefined;
}): Fatto[] {
  const { kind, durata, schede } = opzioni;
  const tempoLuogo = schede?.['TIME / LOCATION'];
  const fuori: Fatto[] = [];

  const ritrovo = ritrovoDa(tempoLuogo);
  if (ritrovo) fuori.push({ etichetta: 'Meeting point', valore: ritrovo });

  if (durata) fuori.push({ etichetta: 'Duration', valore: durata });

  const orari = orariDa(tempoLuogo);
  if (orari) fuori.push({ etichetta: 'Departure', valore: orari });

  /* L'inglese non e' un'ipotesi: ogni scheda dichiara "English speaking
     driver/guide" fra le cose comprese, e il sito e' in inglese soltanto. */
  fuori.push({ etichetta: 'Language', valore: 'English' });

  if (kind && TIPO[kind]) fuori.push({ etichetta: 'Tour type', valore: TIPO[kind] });
  if (kind && GRUPPO[kind]) fuori.push({ etichetta: 'Group', valore: GRUPPO[kind] });

  /* Le ventiquattro ore valgono su tutto il catalogo: e' la condizione
     che l'azienda applica, scritta in ogni scheda e ripetuta nel
     calendario. */
  fuori.push({ etichetta: 'Cancellation', valore: 'Free up to 24h' });

  return fuori;
}
