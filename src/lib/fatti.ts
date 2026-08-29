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

export type Fatto = { icona: Icona; etichetta: string; valore: string };

export type Icona =
  | 'luogo' | 'durata' | 'ora' | 'lingua' | 'tipo' | 'gruppo'
  | 'annullamento' | 'biglietto' | 'ritrovo';

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

/* Le citta' da cui si parte davvero. Non e' un elenco di fantasia: sono
   quelle che compaiono nelle schede TIME / LOCATION e nelle categorie
   (Firenze piu' i porti). Si cercano nel testo del ritrovo, e se non ce
   n'e' nessuna la voce non si mostra -- vedi la nota in cima al file su
   perche' qui un valore predefinito e' pericoloso. */
const CITTA = [
  'Florence', 'Livorno', 'La Spezia', 'Naples', 'Civitavecchia',
  'Rome', 'Milan', 'Venice', 'Genoa', 'Pisa', 'Sorrento', 'Salerno',
];

function cittaDa(html: string | undefined): string | null {
  if (!html) return null;
  const piano = testo(html.replace(/<[^>]+>/g, ' '));
  /* Si guarda solo la parte che parla del ritrovo: piu' avanti il testo
     nomina le mete del giro (Siena, San Gimignano) e prenderebbe quelle
     al posto della partenza. */
  const i = piano.search(/meeting point/i);
  const zona = i >= 0 ? piano.slice(i, i + 400) : piano.slice(0, 400);
  for (const c of CITTA) if (nominata(zona, c)) return c;
  return null;
}

/* 🔴 NIENTE ESPRESSIONE REGOLARE COSTRUITA DA UNA STRINGA, QUI.
 *
 * La prima versione faceva `new RegExp('\b' + citta + '\b')` -- e nel
 * file c'e' finito UN backslash solo. In un'espressione regolare scritta
 * a mano `\b` e' il confine di parola; dentro una stringa di JavaScript
 * e' il carattere BACKSPACE. Il codice compilava, girava, non lanciava
 * niente: cercava semplicemente un carattere di controllo che in pagina
 * non c'e', quindi non trovava mai nessuna citta' e la voce "Location"
 * spariva da tutte le ottantasei schede senza un errore da nessuna
 * parte. E' il tipo di difetto che si scopre solo guardando la pagina.
 *
 * Il confronto qui sotto fa la stessa cosa guardando i due caratteri ai
 * lati: nessun escape da sbagliare, e si legge. */
function nominata(testoPiano: string, citta: string): boolean {
  const t = testoPiano.toLowerCase();
  const c = citta.toLowerCase();
  let da = 0;
  for (;;) {
    const i = t.indexOf(c, da);
    if (i < 0) return false;
    const prima = t[i - 1] ?? ' ';
    const dopo = t[i + c.length] ?? ' ';
    /* "Florence" dentro "Florences" non vale; dentro "from Florence." si. */
    const lettera = (ch: string) => ch >= 'a' && ch <= 'z';
    if (!lettera(prima) && !lettera(dopo)) return true;
    da = i + 1;
  }
}

/** Il punto d'incontro esatto. NON entra piu' nella barra -- in tre
 *  colonne "Piazzale Montelungo, opposite the parking lot" andava a capo
 *  e rompeva la griglia -- ma la funzione resta perche' il dato serve
 *  altrove e ritrovarlo costa. */
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

  /* L'ORDINE E' QUELLO DEL SITO VECCHIO, e non per nostalgia: Location,
     Duration e Time sono le tre domande che si fanno per prime, e stanno
     sulla prima riga della griglia a tre colonne. Il resto segue. */
  const citta = cittaDa(tempoLuogo);
  if (citta) fuori.push({ icona: 'luogo', etichetta: 'Location', valore: citta });

  if (durata) fuori.push({ icona: 'durata', etichetta: 'Duration', valore: durata });

  const orari = orariDa(tempoLuogo);
  if (orari) fuori.push({ icona: 'ora', etichetta: 'Time', valore: orari });

  /* L'inglese non e' un'ipotesi: ogni scheda dichiara "English speaking
     driver/guide" fra le cose comprese, e il sito e' in inglese soltanto. */
  fuori.push({ icona: 'lingua', etichetta: 'Language', valore: 'English' });

  if (kind && TIPO[kind]) fuori.push({ icona: 'tipo', etichetta: 'Tour type', valore: TIPO[kind] });
  if (kind && GRUPPO[kind]) fuori.push({ icona: 'gruppo', etichetta: 'Group', valore: GRUPPO[kind] });

  /* Le ventiquattro ore valgono su tutto il catalogo: e' la condizione
     che l'azienda applica, scritta in ogni scheda e ripetuta nel
     calendario. */
  fuori.push({ icona: 'annullamento', etichetta: 'Free cancellation', valore: 'Up to 24 hrs' });

  /* 🔴 SI DICE IL FATTO, NON LA PROMESSA.
     La tentazione e' scrivere "easy and fast check-in", che pero' e' un
     giudizio nostro sul nostro servizio: chi legge lo sconta come
     pubblicita' e non gli cambia niente. La preoccupazione vera e'
     un'altra e molto piu' concreta -- devo stampare qualcosa? devo fare
     una fila? -- e si chiude dicendo dov'e' il biglietto. Vale su tutto
     il catalogo: Regiondo emette un voucher elettronico per ogni
     prodotto, transfer compresi. */
  fuori.push({ icona: 'biglietto', etichetta: 'Ticket', valore: 'E-ticket on your phone' });

  return fuori;
}
