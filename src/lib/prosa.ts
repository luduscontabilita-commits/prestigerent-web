/* Pulizia e riconoscimento del testo che arriva da WordPress.
 *
 * L'HTML di Elementor porta con se' due cose che rovinano la lettura:
 *  - paragrafi vuoti `<p>&nbsp;</p>` usati come spaziatori, che nel nostro
 *    CSS diventano buchi da 15px in mezzo al testo;
 *  - le FAQ scritte come un blocco unico -- domanda in grassetto, `<br>`,
 *    risposta -- invece che come accordion.
 */

export function pulisci(html: string): string {
  return (html || '')
    // i paragrafi-spaziatore: nel CSS della landing diventano buchi
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/(&nbsp;\s*){2,}/g, ' ')
    .trim();
}

export type Domanda = { q: string; a: string };

/* Riconosce le coppie domanda/risposta dentro il blocco delle FAQ.
 *
 * Il formato di WordPress e' costante: `<p><strong>Domanda</strong>?<br>
 * risposta</p>`. Il punto interrogativo a volte sta FUORI dal grassetto,
 * quindi non si puo' cercare "strong che finisce con ?".
 *
 * Se il riconoscimento fallisce si restituisce lista vuota e il chiamante
 * mostra il testo cosi' com'e': meglio un blocco di testo che una sezione
 * vuota.
 */
export function faqDa(html: string): Domanda[] {
  const pulito = pulisci(html);
  const out: Domanda[] = [];

  const paragrafi = pulito.match(/<p>[\s\S]*?<\/p>/gi) ?? [];
  for (const p of paragrafi) {
    const m = p.match(/^<p>\s*<strong>([\s\S]*?)<\/strong>\s*([?？:]?)\s*(?:<br\s*\/?>)?([\s\S]*)<\/p>$/i);
    if (!m) continue;
    const q = (m[1] + (m[2] || '')).replace(/<[^>]+>/g, '').trim();
    const a = m[3].trim();
    /* Senza risposta non e' una domanda: e' un titoletto in grassetto, e
       trasformarlo in accordion produrrebbe una riga che si apre sul vuoto. */
    if (!q || !a || a.replace(/<[^>]+>/g, '').trim().length < 12) continue;
    out.push({ q, a });
  }

  return out;
}

/* Le entita' HTML nei campi di TESTO SEMPLICE.
 *
 * Il nome del tour arriva da WordPress come "Siena, San Gimignano &amp; the
 * Tuscan countryside": dentro l'HTML e' corretto, ma noi lo stampiamo come
 * testo in React, che NON interpreta le entita'. Risultato: "&amp;" visibile
 * nel titolo, nel sottotitolo e nella scheda del browser.
 *
 * Vale solo per i campi testuali: dove si stampa HTML vero (itinerario,
 * schede) le entita' vanno lasciate stare, ci pensa il browser.
 */
const ENTITA: Record<string, string> = {
  '&amp;': '&', '&#038;': '&', '&#38;': '&',
  '&quot;': '"', '&#039;': "'", '&#39;': "'", '&apos;': "'",
  '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
  '&#8217;': '’', '&#8216;': '‘',
  '&#8211;': '–', '&#8212;': '—', '&#8230;': '…',
};

export function testo(s: string | undefined | null): string {
  if (!s) return '';
  let out = s;
  for (const [e, c] of Object.entries(ENTITA)) out = out.split(e).join(c);
  // qualunque altra entita' numerica rimasta
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  return out.replace(/\s+/g, ' ').trim();
}

/* Alcuni campi di Regiondo contengono righe di punti o trattini usati come
   separatori nel loro pannello. Stampati in pagina sembrano un errore. */
export function utile(s: string | undefined | null): string {
  const t = testo(s);
  if (!t) return '';
  const senzaPunteggiatura = t.replace(/[.…\-_\s]/g, '');
  return senzaPunteggiatura.length < 3 ? '' : t;
}

/* La parola su cui mettere l'accento in Fraunces.
 *
 * Prima prendevo l'ultima parola del titolo: con "Private tour to Cinque
 * Terre and Pisa from Florence" l'accento finiva su "Florence", che e' il
 * punto di partenza e non la meta. Meglio il LUOGO, che e' cio' che il
 * lettore sta cercando. */
const LUOGHI = [
  'Siena', 'San Gimignano', 'Chianti', 'Cinque Terre', 'Montalcino', 'Pisa',
  'Lucca', 'Volterra', 'Montepulciano', 'Pienza', 'Cortona', 'Assisi',
  'Perugia', 'Orvieto', 'Portofino', 'Positano', 'Amalfi', 'Sorrento',
  'Pompeii', 'Fiesole', 'Venice', 'Rome', 'Milan', 'Naples', 'Florence',
  'Tuscany', 'countryside', 'Wineries', 'Vesuvius',
];

export function spezzaTitolo(nome: string): { prima: string; accento: string; dopo: string } {
  const n = testo(nome);
  for (const luogo of LUOGHI) {
    const i = n.toLowerCase().lastIndexOf(luogo.toLowerCase());
    if (i < 0) continue;
    /* "Florence" e "Tuscany" valgono solo se non c'e' di meglio: quasi ogni
       titolo finisce con "from Florence", e accentare la partenza invece
       della meta non dice niente. */
    return { prima: n.slice(0, i), accento: n.slice(i, i + luogo.length), dopo: n.slice(i + luogo.length) };
  }
  const parole = n.split(' ');
  return { prima: parole.slice(0, -1).join(' ') + ' ', accento: parole[parole.length - 1], dopo: '' };
}
