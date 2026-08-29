/* Pulizia e riconoscimento del testo che arriva da WordPress.
 *
 * L'HTML di Elementor porta con se' due cose che rovinano la lettura:
 *  - paragrafi vuoti `<p>&nbsp;</p>` usati come spaziatori, che nel nostro
 *    CSS diventano buchi da 15px in mezzo al testo;
 *  - le FAQ scritte come un blocco unico -- domanda in grassetto, `<br>`,
 *    risposta -- invece che come accordion.
 */

export function pulisci(html: string): string {
  return importiInInglese(
    (html || '')
      // i paragrafi-spaziatore: nel CSS della landing diventano buchi
      .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
      .replace(/(&nbsp;\s*){2,}/g, ' ')
      .trim()
  );
}

/* 🔴 IL PUNTO DECIMALE, SEMPRE. Su 75 schede su 87 i due formati stanno
 * nello stesso elenco puntato:
 *
 *     Winery visit and wine tasting – Approx. Euro 40.00 per person
 *     Extra hours with driver, Euro 90,00 per hour, per party
 *
 * Il sito e' in inglese e i clienti sono americani: "Euro 90,00" per loro
 * e' novemila euro, e l'ora in piu' col conducente diventa una cifra da
 * cui si scappa. Sono 140 importi, tutti nella forma "NN,00" -- nessuno
 * con il separatore delle migliaia, quindi la conversione e' meccanica e
 * non puo' cambiare il valore.
 *
 * Si fa qui, in fondo all'imbuto da cui passa OGNI scheda e ogni
 * itinerario, e non con un aggiornamento dei dati: cosi' vale anche per i
 * contenuti che verranno importati domani dallo stesso WordPress. */
export function importiInInglese(html: string): string {
  return (html || '').replace(
    /((?:Euro|EUR|€)\s*[0-9]+),([0-9]{2})(?![0-9])/gi,
    (_, prima: string, decimali: string) => `${prima}.${decimali}`
  );
}

export type Domanda = { q: string; a: string };

/* Riconosce le coppie domanda/risposta dentro il blocco delle FAQ.
 *
 * Il formato di WordPress e' costante: `<p><strong>Domanda</strong>?<br>
 * risposta</p>`. Il punto interrogativo a volte sta FUORI dal grassetto,
 * quindi non si puo' cercare "strong che finisce con ?".
 *
 * 🔴 "COSTANTE" LO E' MENO DI QUANTO SEMBRI, e le eccezioni costano
 * care. Misurato il 29/08/2026, tre schede su ottantasette perdevano una
 * FAQ intera -- il testo era in `tour_content`, arrivava nella pagina, e
 * spariva qui:
 *
 *   `wine-experience-in-tuscany` scrive la domanda in <b> invece che in
 *   <strong>. La domanda persa era "Is this a Big Bus tour?", cioe' la
 *   risposta all'obiezione piu' comune sul tour che vale piu' di tutti.
 *
 *   i due transfer da aeroporto chiudono la domanda con i puntini di
 *   sospensione invece che col punto interrogativo ("...for an early
 *   departure flight ..."). La risposta persa diceva a che ora apre
 *   l'aeroporto: esattamente il motivo per cui uno legge quella FAQ.
 *
 * Percio' ora si accettano tutti e due i grassetti, e la domanda puo'
 * chiudersi col punto interrogativo O con i puntini.
 *
 * Se il riconoscimento fallisce si restituisce lista vuota e il chiamante
 * mostra il testo cosi' com'e': meglio un blocco di testo che una sezione
 * vuota.
 */
export function faqDa(html: string): Domanda[] {
  const pulito = pulisci(html);
  const out: Domanda[] = [];

  const paragrafi = pulito.match(/<p>[\s\S]*?<\/p>/gi) ?? [];
  for (let i = 0; i < paragrafi.length; i++) {
    const p = paragrafi[i];
    const m = p.match(/^<p>\s*<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>\s*([?？:\u2026]?|\.\.\.)\s*(?:<br\s*\/?>)?([\s\S]*)<\/p>$/i);
    if (!m) continue;
    const q = (m[1] + (m[2] || '')).replace(/<[^>]+>/g, '').trim();

    /* 🔴 LA RISPOSTA CONTINUA NEI PARAGRAFI SUCCESSIVI.
     *
     * Prima si leggeva solo quello che stava DENTRO lo stesso <p> della
     * domanda, e tutto il resto spariva senza dire niente. Misurato:
     * 1.079 paragrafi su 1.621 buttati via, su 86 pagine su 87.
     *
     * Fra quello che il cliente non vedeva mai:
     *   "You can convert your existing payments to credit, and use it on
     *    your next trip, up to 24 hr prior departure"
     *   "You can transfer your credit to a friend or family member, at no
     *    extra cost"
     *   le istruzioni sulle misure della sedia a rotelle
     * e il listino delle quattro esperienze in cantina, che sembrava
     * "perso nell'importazione" ed era li' da sempre.
     *
     * Su WordPress una FAQ e' scritta cosi': un <p> con la domanda in
     * grassetto, e la risposta puo' continuare nei <p> seguenti finche'
     * non ne comincia un altro in grassetto -- che e' la domanda dopo.
     * Quindi si va avanti finche' non si incontra il prossimo grassetto. */
    const pezzi = [m[3].trim()];
    for (let j = i + 1; j < paragrafi.length; j++) {
      if (/^<p>\s*<(?:strong|b)>/i.test(paragrafi[j])) break;
      const corpo = paragrafi[j].replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
      /* Un paragrafo vuoto o fatto solo di spazi unificatori non aggiunge
         niente e produrrebbe righe vuote dentro l'accordion. */
      if (corpo.replace(/<[^>]+>|&nbsp;|\s/g, '')) pezzi.push(corpo);
      i = j;
    }
    const a = pezzi.filter(Boolean).join('<br>');

    /* Senza risposta non e' una domanda: e' un titoletto in grassetto, e
       trasformarlo in accordion produrrebbe una riga che si apre sul vuoto. */
    if (!q || !a || a.replace(/<[^>]+>/g, '').trim().length < 12) continue;

    /* DEVE finire con un punto interrogativo. Senza questo controllo
       finivano fra le domande i NOMI DEGLI AUTORI delle recensioni --
       "CK_C", "Jana_A", "Timothy_H" -- perche' sulla pagina WordPress
       sono scritti nello stesso identico modo: nome in grassetto, a capo,
       testo. Il punto interrogativo e' l'unica cosa che distingue davvero
       una domanda da un nome.

       Si accettano anche i puntini di sospensione, perche' due FAQ vere
       finiscono cosi' -- e un nome di persona in fondo a una recensione
       non finisce MAI con i puntini, quindi la guardia regge lo stesso. */
    if (!/[?？]\s*$/.test(q) && !/(?:…|\.\.\.)\s*$/.test(q)) continue;

    /* E una domanda vera ha almeno tre parole: "Price?" non lo e'. */
    if (q.split(/\s+/).length < 3) continue;

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

/* ── LE SEZIONI DENTRO UNA SCHEDA ────────────────────────────────────────
 *
 * Le schede di WordPress non sono testo libero: dentro hanno dei titoletti
 * in grassetto -- "Included:", "Not included:", "Optional:", "Important:" --
 * e sotto ciascuno un elenco puntato. Sono TRE cose diverse, e leggerle
 * come se fossero una sola e' esattamente il bug che metteva il badge
 * "pranzo incluso" su una pagina che sotto scrive "Not Included: Lunch".
 *
 * `primaSezione` restituisce solo il pezzo che sta PRIMA del primo
 * titoletto di chiusura: cioe' quello che il tour da' davvero, senza cio'
 * che nega o che fa pagare a parte.
 */
export function primaSezione(html: string | undefined | null, chiude: RegExp): string {
  if (!html) return '';
  /* Ogni <p> puo' aprire un titoletto: si taglia sul primo che chiude. Il
     lookahead tiene attaccato al titoletto l'elenco che lo segue. */
  const pezzi = html.split(/(?=<p[\s>])/i);
  const dentro: string[] = [];
  for (const p of pezzi) {
    const nudo = testo(p.replace(/<[^>]*>/g, ' ')).toLowerCase();
    if (nudo && chiude.test(nudo)) break;
    dentro.push(p);
  }
  return dentro.join('');
}

/** Le voci di un elenco puntato, ripulite: una promessa per riga. */
export function vociElenco(html: string | undefined | null): string[] {
  if (!html) return [];
  return (html.match(/<li[\s\S]*?<\/li>/gi) ?? [])
    .map((v) => testo(v.replace(/<[^>]*>/g, ' ')).toLowerCase())
    .filter(Boolean);
}
