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
