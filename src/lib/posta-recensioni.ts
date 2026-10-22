/* LEGGERE LE RECENSIONI DALLE EMAIL DEI PORTALI.
 *
 * ── PERCHE' DALL'EMAIL, E NON DA UN'API ───────────────────────────────
 * Verificato il 22/10/2026, fonti ufficiali: ne' Viator ne' Tripadvisor
 * ne' GetYourGuide hanno un'API per SCRIVERE la risposta a una
 * recensione, e la lettura e' chiusa o limitata. Ma tutti e tre mandano
 * un'email a ogni recensione nuova, e quella posta la leggiamo. E' l'unico
 * innesco che non dipende dal permesso di nessuno.
 *
 * E non e' un ripiego: l'email del portale contiene il LINK che porta
 * esattamente a quella recensione nel pannello del fornitore. Senza,
 * bisognerebbe cercarla in mezzo a centinaia.
 *
 * ── 🔴 COSA C'E' E COSA NON C'E' ──────────────────────────────────────
 * Misurato sulle email vere a usa@prestigerent.com:
 *   c'e':     prodotto, TITOLO della recensione, voto, fonte, link
 *   NON c'e': IL TESTO DELLA RECENSIONE, e nemmeno il nome di chi scrive
 * Quindi da qui si costruisce la CODA, non la risposta. Il testo si legge
 * aprendo il link, e si scrive nella riga dopo.
 *
 * ── 🔴 DENTRO IL RIEPILOGO VIATOR CI SONO LE RECENSIONI TRIPADVISOR ───
 * Le righe dicono «Tripadvisor Review 5.0» accanto a «Viator Review 4.0»:
 * Viator aggrega. Si risponde in un posto solo e si coprono due
 * piattaforme -- ed e' il motivo per cui `fonte` e `portale` sono due
 * campi diversi e non uno.
 *
 * ── PERCHE' IL LETTORE STA QUI E NON DENTRO LO SCRIPT ─────────────────
 * Perche' si possa provare su un'email salvata, senza casella e senza
 * rete: vedi posta-recensioni.test.ts, che gira sul riepilogo vero del
 * 22/10/2026. Un lettore di email provato «dal vivo» si rompe in
 * silenzio il giorno che il portale cambia una tabella.
 */

export type VoceCoda = {
  /** chi ha scritto la recensione: la piattaforma d'origine */
  fonte: 'viator' | 'tripadvisor' | 'getyourguide';
  /** dove si pubblica la risposta: per viator e tripadvisor e' lo stesso */
  portale: 'viator' | 'getyourguide';
  prodotto: string | null;
  titolo: string;
  voto: number | null;
  link_risposta: string | null;
  id_esterno: string | null;
};

/** Le email HTML arrivano piene di roba che non e' testo: attributi di
 *  stile lunghi centinaia di caratteri e caratteri invisibili messi per
 *  allungare l'anteprima. Si tolgono prima di cercare, se no ogni
 *  espressione deve prevederli. */
function ripulisci(html: string): string {
  return html
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/ (?:style|class)="[^"]*"/g, '')
    .replace(/&zwnj;|&nbsp;|‌| /g, ' ')
    .replace(/>\s+</g, '><');
}

function testoPulito(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* 🔴 NIENTE REGEX GIGANTE CHE ATTRAVERSA IL DOCUMENTO, E SI SA PERCHE'.
 *
 * Il primo tentativo cercava titolo, fonte, voto e link con una sola
 * espressione, con finestre tipo `[\s\S]{0,800}`. Trovava ZERO
 * recensioni, e la ragione e' istruttiva: il link «Respond to review» di
 * Viator e' un indirizzo di tracciamento lungo **1.900 caratteri**, e
 * fra il titolo e il link ce ne sono 2.217. Allargare le finestre non
 * e' la correzione: con finestre larghe due recensioni vicine si
 * fondono, e si perde una riga senza accorgersene.
 *
 * Qui invece il documento si riduce a una fila ordinata di pezzi -- i
 * testi e i collegamenti, nell'ordine in cui stanno -- e la si cammina.
 * La lunghezza di un indirizzo non c'entra piu' niente, e l'ordine e'
 * esattamente quello che l'occhio vede leggendo l'email.
 */
type Pezzo = { testo: string; href?: string };

function pezziDi(t: string): Pezzo[] {
  const fuori: Pezzo[] = [];
  /* un collegamento (col suo testo) oppure un pezzo di testo nudo; il
     collegamento viene prima nell'alternativa, cosi' il suo testo non
     viene letto due volte */
  const TOK = /<a\b[^>]*?href="([^"]*)"[^>]*>([^<]*)<\/a>|>([^<>]+)</g;
  for (const m of t.matchAll(TOK)) {
    const testo = testoPulito(m[1] !== undefined ? m[2] : m[3]);
    if (!testo) continue;
    fuori.push(m[1] !== undefined ? { testo, href: m[1] } : { testo });
  }
  return fuori;
}

/**
 * Le recensioni dentro un riepilogo giornaliero di Viator.
 *
 * Come si riconosce una recensione: c'e' sempre un pezzo che dice
 * «Tripadvisor Review» o «Viator Review». Da quello si va a prendere il
 * titolo (il testo prima), il voto (il primo numero dopo) e il link (il
 * primo «Respond to review» dopo).
 *
 * Il prodotto non sta in ogni riga: sta nell'intestazione della sezione,
 * subito prima di «View all», e vale per tutte le recensioni che
 * seguono fino alla sezione successiva.
 */
export function daRiepilogoViator(html: string): VoceCoda[] {
  const pezzi = pezziDi(ripulisci(html));
  const voci: VoceCoda[] = [];
  let prodotto: string | null = null;

  for (let i = 0; i < pezzi.length; i++) {
    if (pezzi[i].testo === 'View all') {
      prodotto = pezzi[i - 1]?.testo ?? null;
      continue;
    }

    const etichetta = /^(Tripadvisor|Viator) Review$/i.exec(pezzi[i].testo);
    if (!etichetta) continue;

    const titolo = pezzi[i - 1]?.testo;
    if (!titolo) continue;

    /* 🔴 IL PRODOTTO NON SI RICONOSCE DA «View all»: quel link c'e' solo
       sulla PRIMA sezione del riepilogo. Nelle altre l'intestazione e'
       testo nudo, e cercando «View all» tutte le recensioni finivano
       attribuite al primo prodotto -- sette su sette, il 22/10/2026.
       La regola che vale sempre: una recensione e' fatta di quattro
       pezzi (titolo, etichetta, voto, link). Quindi due pezzi prima
       dell'etichetta c'e' la FINE della recensione precedente
       («Respond to review») oppure l'inizio di una sezione nuova: se
       non e' la fine di un'altra, e' il nome di un prodotto. */
    const prima = pezzi[i - 2];
    if (
      prima &&
      !prima.href &&
      !/^(Respond to review|View all|Activity Report)/i.test(prima.testo) &&
      prima.testo.length >= 5
    ) {
      prodotto = prima.testo;
    }

    /* il voto e il link stanno dopo l'etichetta, e prima della prossima
       recensione: si guarda avanti, ma si smette appena ne comincia
       un'altra -- cosi' due recensioni vicine non si mescolano */
    let voto: number | null = null;
    let link: string | null = null;
    for (let j = i + 1; j < pezzi.length; j++) {
      if (/^(Tripadvisor|Viator) Review$/i.test(pezzi[j].testo)) break;
      if (voto === null && /^\d(?:[.,]\d)?$/.test(pezzi[j].testo)) {
        voto = Number(pezzi[j].testo.replace(',', '.'));
      }
      if (!link && /^Respond to review/i.test(pezzi[j].testo) && pezzi[j].href) {
        link = pezzi[j].href!;
        break;
      }
    }

    voci.push({
      fonte: etichetta[1].toLowerCase() === 'tripadvisor' ? 'tripadvisor' : 'viator',
      portale: 'viator',
      prodotto,
      titolo,
      voto,
      link_risposta: link,
      id_esterno: null,
    });
  }
  return voci;
}

/**
 * La notifica singola di GetYourGuide.
 *
 * Arriva una per recensione e subito (provata: recensione delle 21:08,
 * email alle 21:08). L'oggetto porta l'identificativo -- «Hai una nuova
 * recensione su GetYourGuide - 8058 (129008608)» -- e il corpo il nome
 * del prodotto e il titolo della recensione.
 */
export function daNotificaGetYourGuide(oggetto: string, corpo: string): VoceCoda | null {
  const t = ripulisci(corpo);
  /* il testo semplice della notifica: «Hai ricevuto una nuova recensione
     per il tuo prodotto X.» e subito dopo, da sola su una riga, il titolo */
  const prodotto = /prodotto\s+([^.\n<]{3,160})\./i.exec(t)?.[1];
  const senzaTag = testoPulito(t.replace(/<[^>]+>/g, '\n'));
  const titolo =
    /prodotto[^.]{3,160}\.\s*([^\n.]{2,160}?)\s*(?:Rispondi alla recensione|Respond to|Esplora)/i.exec(
      senzaTag
    )?.[1];

  if (!titolo) return null;

  return {
    fonte: 'getyourguide',
    portale: 'getyourguide',
    prodotto: prodotto ? testoPulito(prodotto) : null,
    titolo: testoPulito(titolo),
    voto: null,
    link_risposta:
      /href="(https:\/\/[^"]*getyourguide[^"]*)"/i.exec(t)?.[1] ??
      'https://supplier.getyourguide.com/reviews',
    id_esterno: /\((\d{6,})\)/.exec(oggetto)?.[1] ?? null,
  };
}
