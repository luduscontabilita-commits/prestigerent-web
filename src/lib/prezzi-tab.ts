/* LA TAB «PRICES» CONFRONTATA CON REGIONDO, E RIALLINEATA SOLO NELLE CIFRE.
 *
 * Le tab PRICES delle 86 schede tour sono testo ereditato da WordPress e
 * stanno in `tour_content.blocks.tabs.PRICES`. Dentro ci sono i prezzi
 * scritti a mano -- «Euro 850.00 – party of 1 person» -- che sono una
 * COPIA dei prezzi di Regiondo. Il 12/10/2026 85 tab su 86 coincidevano;
 * la 86esima (Chianti da Livorno) era rimasta ai prezzi di prima.
 *
 * Per decisione della proprieta' la tab NON si rigenera: il testo, le
 * note, i limiti d'eta', i «contact us» restano quelli scritti. Si
 * cambiano SOLO LE CIFRE, e solo quando l'admin preme il pulsante in
 * /admin/listino/sincronizza/ dopo aver visto la tabella prima/dopo.
 *
 * Questo file e' logica pura (nessuna rete, nessun database) ed e'
 * provato da `prezzi-tab.test.ts`. Non importa niente di proposito: lo si
 * puo' far girare anche fuori da Next, sui testi veri, prima di fidarsi.
 *
 * ── COME SI ABBINA UN IMPORTO A UN'OPZIONE ───────────────────────────
 * Per ORDINE, non per valore. Il valore e' proprio la cosa che cambia: il
 * giorno in cui Regiondo passa da 690 a 680, cercare «690» su Regiondo
 * non trova niente. L'ordine invece e' quello in cui la tab elenca le
 * opzioni ed e' lo stesso in cui Regiondo le restituisce (provato su
 * tutte le 86: nessuna eccezione).
 *
 * Per non abbinare a vuoto ci sono due freni:
 *   - il NUMERO degli importi deve essere uguale a quello delle opzioni;
 *   - dove la riga dice «party of N», l'opzione deve essere «N people».
 * Se uno dei due non torna la tab e' «non abbinabile» e NON si tocca: la
 * si sistema a mano. Meglio una tab segnalata che una tab sbagliata.
 */

export type Opzione = { id: string; nome: string; prezzo: number };
export type Variante = { id: string; titolo: string; opzioni: Opzione[] };

export type Importo = {
  /** posizione delle CIFRE nell'HTML: e' tutto quello che si riscrive */
  inizio: number;
  fine: number;
  /** le cifre come sono scritte: "850.00", "90,00", "1,200.00" */
  grezzo: string;
  valore: number;
  /** il testo della riga, per farla riconoscere a chi legge la tabella */
  riga: string;
};

export type Riga = {
  importo: Importo;
  variante: string;
  opzione: string;
  optionId: string;
  /** il prezzo di Regiondo */
  nuovo: number;
};

export type Confronto =
  | { stato: 'uguale' | 'diverso'; righe: Riga[] }
  | { stato: 'non_abbinabile'; motivo: string; righe: [] };

/* Gli stessi titoletti che in src/lib/prezzi.ts chiudono il listino vero
 * e aprono gli extra a pagamento: «Optional: Siena Cathedral, Euro 15,00»
 * e' un supplemento, non un prezzo del tour. */
const DOPO_IL_LISTINO = /^(optional|important|extra|please note|note:)/;

/* Le cifre dopo «Euro», «EUR» o «€», anche con lo spazio scritto come
 * entita'. Il gruppo 1 sono SOLO le cifre: e' quello che si riscrive. */
const IMPORTO = /(?:Euro|EUR|€|&euro;)(?:\s|&nbsp;|&#160;)*([0-9](?:[0-9.,]*[0-9])?)/gi;

/* Dove finisce una riga: i blocchi dell'HTML che WordPress usa per
 * andare a capo. */
const CONFINE = /<\/?(?:p|li|ul|ol|h[1-6]|div|tr|td|br)\b[^>]*>/gi;

/** Le cifre come le legge un cliente. Stessa regola di `numero()` in
 *  src/lib/prezzi.ts: due cifre dopo la virgola in fondo vogliono dire
 *  decimali all'italiana ("90,00"); altrimenti la virgola separa le
 *  migliaia ("1,200.00"). */
export function leggiNumero(grezzo: string): number | null {
  let s = grezzo.trim();
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function testoLeggibile(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&euro;/g, '€')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gli importi del listino, nell'ordine in cui compaiono. Si ferma al
 *  primo titoletto degli extra e scarta quello che sta sotto i 10 euro
 *  (note tipo «Euro 5.00 di supplemento»), come `prezzoDaSchedaPrezzi`. */
export function importiDellaTab(html: string | null | undefined): Importo[] {
  if (!html) return [];

  /* I blocchi: dall'inizio, da ogni confine, fino alla fine. */
  const tagli = [0];
  for (const m of html.matchAll(CONFINE)) {
    tagli.push(m.index!, m.index! + m[0].length);
  }
  tagli.push(html.length);

  const fuori: Importo[] = [];
  for (let i = 0; i < tagli.length - 1; i += 2) {
    const da = tagli[i];
    const a = tagli[i + 1];
    if (a <= da) continue;
    const pezzo = html.slice(da, a);
    const riga = testoLeggibile(pezzo);
    if (!riga) continue;
    if (DOPO_IL_LISTINO.test(riga.toLowerCase())) break;

    for (const m of pezzo.matchAll(IMPORTO)) {
      const grezzo = m[1];
      const valore = leggiNumero(grezzo);
      if (valore == null || valore < 10) continue;
      const inizio = da + m.index! + m[0].length - grezzo.length;
      fuori.push({ inizio, fine: inizio + grezzo.length, grezzo, valore, riga });
    }
  }
  return fuori;
}

type InFila = { variante: string; opzione: Opzione }[];

/** Le opzioni di Regiondo in fila, come le elenca la tab. Le file
 *  possibili sono DUE, e la tab ne segue una:
 *
 *  1. TUTTE le varianti, una dopo l'altra. E' il caso dei porti di La
 *     Spezia: «Accademia» e «Uffizi» costano uguale, ma la tab le scrive
 *     come due opzioni distinte -- sono due giornate diverse.
 *  2. Le varianti IDENTICHE contate una volta. E' il caso della wine
 *     experience: «AM» e «PM» hanno le stesse opzioni agli stessi prezzi,
 *     e la tab le scrive una volta sola.
 *
 *  Vale la fila il cui conto torna con gli importi della tab, provando
 *  prima la 1. Se il pomeriggio un giorno costasse diverso dalla mattina,
 *  nessuna delle due tornerebbe e la tab finirebbe fra le «non
 *  abbinabili»: e' giusto, perche' in quel caso il testo va riscritto da
 *  una persona. */
export function opzioniInFila(varianti: Variante[], unaVolta: boolean): InFila {
  const viste = new Set<string>();
  const fila: InFila = [];
  for (const v of varianti) {
    if (!v.opzioni.length) continue;
    if (unaVolta) {
      const firma = JSON.stringify(v.opzioni.map((o) => [o.nome.trim().toLowerCase(), o.prezzo]));
      if (viste.has(firma)) continue;
      viste.add(firma);
    }
    for (const o of v.opzioni) fila.push({ variante: v.titolo, opzione: o });
  }
  return fila;
}

/** Il confronto di una tab con le opzioni di Regiondo. */
export function confronta(html: string | null | undefined, varianti: Variante[]): Confronto {
  const importi = importiDellaTab(html);
  const tutte = opzioniInFila(varianti, false);

  if (!tutte.length) return { stato: 'non_abbinabile', motivo: 'Regiondo non restituisce opzioni con prezzo.', righe: [] };
  if (!importi.length) return { stato: 'non_abbinabile', motivo: 'Nella tab PRICES non c’è nessun importo.', righe: [] };

  const fila = [tutte, opzioniInFila(varianti, true)].find((f) => f.length === importi.length);
  if (!fila) {
    return {
      stato: 'non_abbinabile',
      motivo: `La tab elenca ${importi.length} importi, Regiondo ha ${tutte.length} opzioni.`,
      righe: [],
    };
  }

  const righe: Riga[] = [];
  for (let i = 0; i < fila.length; i++) {
    const imp = importi[i];
    const { variante, opzione } = fila[i];
    const nellaRiga = imp.riga.match(/party of (\d+)/i)?.[1];
    const nellOpzione = opzione.nome.match(/^(\d+)\s*(?:person|people|pax)\b/i)?.[1];
    if (nellaRiga && nellOpzione && nellaRiga !== nellOpzione) {
      return {
        stato: 'non_abbinabile',
        motivo: `La riga «${imp.riga}» parla di ${nellaRiga} persone, l’opzione di Regiondo nello stesso posto è «${opzione.nome}».`,
        righe: [],
      };
    }
    righe.push({ importo: imp, variante, opzione: opzione.nome, optionId: opzione.id, nuovo: opzione.prezzo });
  }

  return { stato: righe.some((r) => r.importo.valore !== r.nuovo) ? 'diverso' : 'uguale', righe };
}

/** Il prezzo nuovo scritto COME QUELLO VECCHIO: stessi decimali, stesso
 *  separatore. «850.00» diventa «680.00», «90,00» diventa «95,00»,
 *  «1,200.00» diventa «1,150.00». Chi legge la tab non deve accorgersi
 *  che una cifra e' stata cambiata da una macchina. */
export function scriviCome(n: number, grezzo: string): string {
  const dec = grezzo.match(/([.,])(\d{1,2})$/);
  const decimali = dec ? dec[2].length : 0;
  const sepDec = dec ? dec[1] : '.';
  const intera = dec ? grezzo.slice(0, -dec[0].length) : grezzo;
  const altro = sepDec === '.' ? ',' : '.';
  const sepMigliaia = intera.includes(altro) ? altro : '';

  const [i, d] = n.toFixed(decimali).split('.');
  const conMigliaia = sepMigliaia ? i.replace(/\B(?=(\d{3})+(?!\d))/g, sepMigliaia) : i;
  return d ? `${conMigliaia}${sepDec}${d}` : conMigliaia;
}

/** L'HTML della tab con le sole cifre cambiate. Tutto il resto -- tag,
 *  spazi, note, trattini -- resta identico al carattere. */
export function riscriviImporti(html: string, righe: Riga[]): string {
  let fuori = html;
  /* Dal fondo: cosi' le posizioni delle righe prima non si spostano
     quando una cifra cambia lunghezza (950 -> 1050). */
  for (const r of [...righe].sort((a, b) => b.importo.inizio - a.importo.inizio)) {
    if (r.importo.valore === r.nuovo) continue;
    fuori = fuori.slice(0, r.importo.inizio) + scriviCome(r.nuovo, r.importo.grezzo) + fuori.slice(r.importo.fine);
  }
  return fuori;
}
