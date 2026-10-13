import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';
import { raggruppa, righeDelServizio, type Servizio, type Variante } from './listino';
import { testiDi, type Lingua } from './partners-testi';
import { scomponi, tipoCommissione, type Commissioni } from './commissioni';
import { testoBreve } from './cifre';

/* IL LISTINO IN PDF, DA STAMPARE COME BROCHURE (richiesta della
 * proprieta' del 12/10/2026: «da mostrare ai clienti a una fiera»).
 *
 * Due facciate A4, in italiano o in inglese: in cima logo, presentazione
 * e contatti; poi TUTTI i servizi in una tabella compatta, una riga per
 * servizio (o per variante) con le colonne «1 … 8 persone». I servizi a
 * persona (Adult/Youth) scrivono i loro prezzi nella riga.
 *
 * Funzione PURA: riceve i dati e restituisce il file. La legge la rotta
 * /admin/partners/listino/pdf/ (solo admin), e la si puo' provare fuori
 * da Next sui prezzi veri.
 *
 * ── STARE IN DUE PAGINE ──────────────────────────────────────────────
 * Le righe sono ~110. La misura del carattere si sceglie da sola: si
 * impagina a 8 pt e si scende finche' tutto sta in due facciate (mai
 * sotto 5,8 pt, che stampato e' ancora leggibile) -- vedi
 * `creaPdfListino`. Se un giorno i servizi
 * raddoppiassero, il PDF passerebbe a tre pagine invece di diventare
 * illeggibile.
 *
 * ── I CARATTERI ──────────────────────────────────────────────────────
 * Helvetica dei font standard del PDF: nessun file da incorporare, e il
 * PDF pesa pochi KB. Copre l'euro e le lettere accentate italiane, non
 * simboli come le stelle: `pulito()` li toglie, altrimenti pdf-lib
 * fermerebbe la generazione con un errore.
 *
 * ── LA VERSIONE PER I PARTNER (dal 12/10/2026) ───────────────────────
 * Con `commissioni` il PDF diventa il listino da dare alle agenzie: sotto
 * ogni prezzo Retail, nella stessa colonna, il Net e la commissione
 * (src/lib/commissioni.ts). Tre righe per servizio non stanno in due
 * facciate, e non serve: non e' una brochure da fiera. Si impagina a una
 * misura fissa e prende le pagine che servono. */

export type DatiAzienda = {
  anno_fondazione?: number | null;
  telefono?: string | null;
  email?: string | null;
  indirizzo?: string | null;
  whatsapp?: string | null;
  voto_medio?: number | null;
  tour_effettuati?: number | null;
};

/** I numeri della testata: GLI STESSI DELLA HOME (proprieta', 13/10/2026),
 *  letti dalla stessa fonte -- `riprova()` in src/lib/riprova.ts, cioe' le
 *  tabelle `azienda` e `fonti_recensioni`. Niente cifre scritte qui. */
export type NumeriPdf = {
  voto: number | null;
  clienti: number | null;
  tour: number | null;
  posizione: number | null;
  categoria: string | null;
  anni: number | null;
  /** recensioni sommate sulle piattaforme (12.081 -> «12,000+») */
  recensioni: number | null;
};

/** «12,000+» / «12.000»: le recensioni arrotondate in difetto al migliaio. */
function migliaia(n: number, lingua: Lingua): string {
  const m = Math.floor(n / 1000) * 1000;
  return String(m).replace(/\B(?=(\d{3})+(?!\d))/g, lingua === 'it' ? '.' : ',');
}

const A4: [number, number] = [595.28, 841.89];
const MARGINE = 30;
const INCHIOSTRO = rgb(0.141, 0.2, 0.247); // #24333F, l'inchiostro del sito
const GRIGIO = rgb(0.42, 0.46, 0.5);
const RIGA = rgb(0.95, 0.96, 0.97);
const LINEA = rgb(0.85, 0.87, 0.89);
const ARANCIO = rgb(0.929, 0.404, 0.027); // #ED6707, l'arancio Prestige

/** Solo caratteri che Helvetica (WinAnsi) sa scrivere. */
function pulito(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E -ÿ€–—•·]/g, '');
}

/** Una cifra della tabella, SENZA il simbolo €: ripetuto su ogni prezzo
 *  era rumore (proprieta', 12/10/2026). Che sono euro lo dice la nota
 *  sopra la tabella («Prezzi in euro...»). */
function cifra(n: number, lingua: Lingua): string {
  const intero = Number.isInteger(n);
  const [i, d] = n.toFixed(intero ? 0 : 2).split('.');
  const sep = lingua === 'it' ? '.' : ',';
  const migliaia = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const dec = d ? (lingua === 'it' ? ',' : '.') + d : '';
  return `${migliaia}${dec}`;
}

const TESTI_PDF = {
  en: {
    sottotitolo: 'Private tours, small group tours, shore excursions and transfers in Tuscany and Italy',
    intro: (anno: number) =>
      `Since ${anno} Prestige Rent has been driving travellers across Tuscany and Italy from its base in Florence. ` +
      'We own and maintain our fleet of Mercedes cars, vans, minibuses and coaches, driven by our own employed drivers, ' +
      'and we run every tour ourselves: private days in Chianti, Siena and the Val d’Orcia, small group tours, wine experiences, ' +
      'shore excursions from the cruise ports and transfers between cities, ports and airports.',
    /* come la fascia dei numeri della home: «4.9 average rating · 1.1M+
       guests driven · 270k+ tours and transfers · #1 tour operator in
       Florence · 26 years on the road» */
    fatti: (n: NumeriPdf) =>
      [
        n.voto ? `${n.voto} average rating` : null,
        n.clienti ? `${testoBreve(n.clienti)} guests driven` : null,
        n.tour ? `${testoBreve(n.tour)} tours and transfers` : null,
        n.posizione && n.categoria ? `#${n.posizione} ${n.categoria}` : null,
        n.anni ? `${n.anni} years on the road` : null,
      ]
        .filter(Boolean)
        .join('  ·  '),
    /* i premi della home (Premi.tsx): li' sono immagini, qui testo */
    premi: (n: NumeriPdf) =>
      [
        'Viator Experience Award Winner 2025 & 2023',
        n.voto && n.recensioni ? `${n.voto} based on ${migliaia(n.recensioni, 'en')}+ reviews on Viator & Tripadvisor` : null,
        'Tripadvisor Travellers’ Choice Awards 2025',
      ]
        .filter(Boolean)
        .join('  ·  '),
    titoloListino: (data: string) => `Price list ${data}`,
    titoloPartner: (data: string) => `Partner price list ${data}`,
    notaPartner: (p: string, g: string) =>
      `Prices in euro. For every service: Retail, the public price; Net, what you pay us; Your commission: ${p} on private services, ${g} on group tours. Net is rounded to the euro.`,
    retail: 'Retail',
    net: 'Net',
    comm: 'Your commission',
    nota: 'Prices in euro for the whole vehicle and party, unless marked "per person". Columns: number of people in the party.',
    persone: 'People',
    perPersona: 'per person',
    piede: 'Prices may change: the current price is always the one on prestigerent.com and at the time of booking.',
    pagina: (n: number, di: number) => `Page ${n} of ${di}`,
  },
  it: {
    sottotitolo: 'Tour privati, tour in piccolo gruppo, escursioni dai porti e transfer in Toscana e in Italia',
    intro: (anno: number) =>
      `Dal ${anno} Prestige Rent accompagna i viaggiatori in Toscana e in tutta Italia, partendo da Firenze. ` +
      'La flotta è nostra – auto, van, minibus e pullman Mercedes e Isuzu – e la guidano i nostri autisti, ' +
      'e ogni tour lo facciamo noi: giornate private nel Chianti, a Siena e in Val d’Orcia, tour in piccolo gruppo, esperienze di vino, ' +
      'escursioni dai porti delle navi da crociera e transfer fra città, porti e aeroporti.',
    fatti: (n: NumeriPdf) =>
      [
        n.voto ? `${String(n.voto).replace('.', ',')} voto medio` : null,
        n.clienti ? `${testoBreve(n.clienti).replace('.', ',')} ospiti accompagnati` : null,
        n.tour ? `${testoBreve(n.tour).replace('.', ',')} tour e transfer` : null,
        n.posizione && n.categoria ? `#${n.posizione} ${n.categoria.replace(/ in Florence$/i, ' a Firenze')}` : null,
        n.anni ? `${n.anni} anni di attività` : null,
      ]
        .filter(Boolean)
        .join('  ·  '),
    premi: (n: NumeriPdf) =>
      [
        'Viator Experience Award 2025 e 2023',
        n.voto && n.recensioni ? `${String(n.voto).replace('.', ',')} su oltre ${migliaia(n.recensioni, 'it')} recensioni su Viator e Tripadvisor` : null,
        'Tripadvisor Travellers’ Choice Awards 2025',
      ]
        .filter(Boolean)
        .join('  ·  '),
    titoloListino: (data: string) => `Listino prezzi ${data}`,
    titoloPartner: (data: string) => `Listino partner ${data}`,
    notaPartner: (p: string, g: string) =>
      `Prezzi in euro. Per ogni servizio: Retail, il prezzo al pubblico; Net, quello che paghi a noi; La tua commissione: ${p} sui servizi privati, ${g} sui tour di gruppo. Il Net è arrotondato all’euro.`,
    retail: 'Retail',
    net: 'Net',
    comm: 'La tua commissione',
    nota: 'Prezzi in euro per l’intero veicolo e gruppo, salvo dove è indicato «a persona». Colonne: numero di persone del gruppo.',
    persone: 'Persone',
    perPersona: 'a persona',
    piede: 'I prezzi possono cambiare: vale sempre quello su prestigerent.com e al momento della prenotazione.',
    pagina: (n: number, di: number) => `Pagina ${n} di ${di}`,
  },
};

type Riga =
  | { tipo: 'sezione'; testo: string }
  | { tipo: 'gruppo'; testo: string }
  | {
      tipo: 'servizio';
      nome: string;
      rientro: boolean;
      prezzi: (number | null)[] | null;
      testoPrezzi: string | null;
      /** solo nel PDF dei partner: la commissione del servizio */
      percentuale?: number | null;
      /** solo nel PDF dei partner, per le opzioni a persona (Adult/Youth):
       *  le tre righe Retail, Net, commissione */
      treTesti?: [string, string, string] | null;
      /** la pagina del tour sul sito: il nome diventa un link */
      url?: string;
    };

/** Due titoli di varianti uniti senza ripetere l'inizio comune:
 *  «Driver + Guide in Florence + Accademia tickets» e «… + Uffizi
 *  tickets» diventano «Driver + Guide in Florence + Accademia tickets /
 *  Uffizi tickets». Altrimenti si scriverebbe due volte la stessa frase e
 *  la riga verrebbe tagliata. */
function unisciTitoli(a: string, b: string): string {
  const pa = a.split(' ');
  const pb = b.split(' ');
  let i = 0;
  while (i < pa.length - 1 && i < pb.length - 1 && pa[i] === pb[i]) i++;
  return i >= 2 ? `${a} / ${pb.slice(i).join(' ')}` : `${a} / ${b}`;
}

/** Le varianti identiche (stesse opzioni, stessi prezzi: mattina e
 *  pomeriggio) si scrivono una volta sola, coi titoli uniti. */
function variantiUniche(varianti: Variante[]): { titolo: string; v: Variante }[] {
  const fuori: { titolo: string; v: Variante; firma: string }[] = [];
  for (const v of varianti) {
    if (!v.opzioni.length) continue;
    const firma = JSON.stringify(v.opzioni.map((o) => [o.nome, o.prezzo]));
    const gia = fuori.find((x) => x.firma === firma);
    if (gia) gia.titolo = unisciTitoli(gia.titolo, v.titolo);
    else fuori.push({ titolo: v.titolo, v, firma });
  }
  return fuori;
}

function righeDelPdf(servizi: Servizio[], lingua: Lingua, commissioni?: Commissioni): Riga[] {
  const T = testiDi(lingua);
  const P = TESTI_PDF[lingua];
  const righe: Riga[] = [];
  for (const sez of raggruppa(servizi)) {
    righe.push({ tipo: 'sezione', testo: T.sezioni[sez.chiave] });
    for (const g of sez.gruppi) {
      if (g.gruppo) {
        righe.push({
          tipo: 'gruppo',
          testo: sez.chiave === 'cruise' && g.gruppo !== 'Other ports' ? T.porto + g.gruppo : T.gruppi[g.gruppo] ?? g.gruppo,
        });
      }
      for (const s of g.servizi) {
        const uniche = variantiUniche(s.varianti ?? []);
        if (!uniche.length) continue;
        const { perPersone } = righeDelServizio(uniche.map((u) => u.v));
        const prezziPersone = (v: Variante) =>
          Array.from({ length: 8 }, (_, i) => v.opzioni.find((o) => Number(o.nome.trim().match(/^\d+/)?.[0]) === i + 1)?.prezzo ?? null);
        const percentuale = commissioni ? commissioni[tipoCommissione(s)] : null;
        /* Le opzioni a persona (Adult/Youth) stanno nella riga. Nel PDF
           dei partner diventano tre righe, come i prezzi in colonna:
           «Adult 149 · Youth 119», poi i Net, poi le commissioni. */
        const testoOpzioni = (v: Variante) => v.opzioni.map((o) => `${o.nome.trim()} ${cifra(o.prezzo, lingua)}`).join('  ·  ');
        const treOpzioni = (v: Variante): [string, string, string] | null => {
          if (percentuale == null) return null;
          const riga = (k: 'retail' | 'net' | 'commissione') =>
            v.opzioni.map((o) => `${o.nome.trim()} ${cifra(scomponi(o.prezzo, percentuale)[k], lingua)}`).join('  ·  ');
          return [riga('retail'), riga('net'), riga('commissione')];
        };
        const nome = s.unita === 'per person' ? `${s.nome} (${P.perPersona})` : s.nome;
        const url = `https://prestigerent.com/tour/${s.slug}/`;
        if (uniche.length === 1) {
          righe.push(
            perPersone
              ? { tipo: 'servizio', nome, rientro: false, prezzi: prezziPersone(uniche[0].v), testoPrezzi: null, percentuale, url }
              : { tipo: 'servizio', nome, rientro: false, prezzi: null, testoPrezzi: testoOpzioni(uniche[0].v), treTesti: treOpzioni(uniche[0].v), percentuale, url }
          );
        } else {
          righe.push({ tipo: 'servizio', nome, rientro: false, prezzi: null, testoPrezzi: null, url });
          for (const u of uniche) {
            righe.push(
              perPersone
                ? { tipo: 'servizio', nome: u.titolo, rientro: true, prezzi: prezziPersone(u.v), testoPrezzi: null, percentuale }
                : { tipo: 'servizio', nome: u.titolo, rientro: true, prezzi: null, testoPrezzi: testoOpzioni(u.v), treTesti: treOpzioni(u.v), percentuale }
            );
          }
        }
      }
    }
  }
  return righe;
}

/** Il testo tagliato con «...» se non sta nella larghezza. */
function taglia(t: string, font: PDFFont, misura: number, larghezza: number): string {
  let s = pulito(t);
  if (font.widthOfTextAtSize(s, misura) <= larghezza) return s;
  while (s.length > 1 && font.widthOfTextAtSize(s + '...', misura) > larghezza) s = s.slice(0, -1);
  return s.trimEnd() + '...';
}

/** Le righe di un paragrafo che sta in `larghezza`. */
function aCapo(t: string, font: PDFFont, misura: number, larghezza: number): string[] {
  const parole = pulito(t).split(/\s+/);
  const righe: string[] = [];
  let r = '';
  for (const p of parole) {
    const prova = r ? r + ' ' + p : p;
    if (font.widthOfTextAtSize(prova, misura) > larghezza && r) {
      righe.push(r);
      r = p;
    } else r = prova;
  }
  if (r) righe.push(r);
  return righe;
}

type DatiPdf = {
  servizi: Servizio[];
  lingua: Lingua;
  azienda: DatiAzienda;
  logoPng: Uint8Array | null;
  /** solo per il PDF dei partner: Net e commissione sotto ogni prezzo */
  commissioni?: Commissioni;
  /** i numeri della home; senza, la riga dei numeri e dei premi si accorcia */
  numeri?: NumeriPdf;
  /** l'anno del listino, gia' scritto («2026»): solo l'anno, senza giorno
   *  e mese, per decisione della proprieta' (12/10/2026) -- la brochure
   *  si stampa per una fiera e deve valere tutto l'anno */
  data: string;
};

/** Il PDF piu' leggibile che stia in DUE facciate: si impagina davvero a
 *  8 pt e, se escono tre pagine, si riprova un poco piu' piccolo. Una
 *  stima dell'altezza sbagliava di due righe (l'introduzione inglese e'
 *  piu' lunga di quella italiana): contare le pagine vere non sbaglia. */
export async function creaPdfListino(dati: DatiPdf): Promise<Uint8Array> {
  /* il PDF dei partner non deve stare in due facciate: misura fissa */
  if (dati.commissioni) return (await componi(dati, 7.4)).file;
  let ultimo: Uint8Array | null = null;
  for (let misura = 8; misura >= 5.8; misura -= 0.2) {
    const { file, pagine } = await componi(dati, misura);
    ultimo = file;
    if (pagine <= 2) return file;
  }
  return ultimo!;
}

async function componi(dati: DatiPdf, misura: number): Promise<{ file: Uint8Array; pagine: number }> {
  const { lingua, azienda } = dati;
  const P = TESTI_PDF[lingua];
  const pdf = await PDFDocument.create();
  const titolo = dati.commissioni ? P.titoloPartner(dati.data) : P.titoloListino(dati.data);
  pdf.setTitle(pulito(`Prestige Rent - ${titolo}`));
  pdf.setAuthor('Prestige Rent');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const grassetto = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = dati.logoPng ? await pdf.embedPng(dati.logoPng).catch(() => null) : null;
  const righe = righeDelPdf(dati.servizi, lingua, dati.commissioni);
  const percento = (n: number) => `${lingua === 'it' ? String(n).replace('.', ',') : n}%`;

  const L = A4[0] - 2 * MARGINE; // larghezza utile
  const COLONNE = 8;
  const larghezzaPrezzo = 34;
  const larghezzaNome = L - COLONNE * larghezzaPrezzo;

  /* ── la testata della prima pagina: si misura prima, per sapere quanto
     spazio resta alla tabella ── */
  const anno = azienda.anno_fondazione ?? 2000;
  const intro = aCapo(P.intro(anno), font, 8.6, L);
  const piede = 26;
  const passo = misura * 1.42;

  let pagina: PDFPage = pdf.addPage(A4);
  const pagine: PDFPage[] = [pagina];
  let y = A4[1] - MARGINE;

  const testo = (p: PDFPage, t: string, x: number, yy: number, m: number, f: PDFFont = font, colore: RGB = INCHIOSTRO) =>
    p.drawText(pulito(t), { x, y: yy, size: m, font: f, color: colore });
  const aDestra = (p: PDFPage, t: string, xDestra: number, yy: number, m: number, f: PDFFont = font, colore: RGB = INCHIOSTRO) =>
    testo(p, t, xDestra - f.widthOfTextAtSize(pulito(t), m), yy, m, f, colore);
  /** Il nome del servizio, cliccabile verso la sua pagina sul sito
   *  (proprieta', 12/10/2026): un'annotazione «Link» grande quanto il
   *  testo scritto. Stampato non si vede niente; sullo schermo si apre la
   *  scheda del tour. */
  const nomeConLink = (p: PDFPage, t: string, x: number, yy: number, m: number, f: PDFFont, url?: string) => {
    testo(p, t, x, yy, m, f);
    if (!url) return;
    const w = f.widthOfTextAtSize(pulito(t), m);
    const link = pdf.context.register(
      pdf.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, yy - m * 0.25, x + w, yy + m * 0.85],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
      })
    );
    p.node.addAnnot(link);
  };

  /* ── TESTATA ── */
  const lato = 46;
  if (logo) pagina.drawImage(logo, { x: MARGINE, y: y - lato, width: lato, height: lato });
  const xTitolo = MARGINE + (logo ? lato + 12 : 0);
  testo(pagina, 'PRESTIGE RENT', xTitolo, y - 20, 20, grassetto);
  testo(pagina, P.sottotitolo, xTitolo, y - 34, 8.4, font, GRIGIO);
  const contatti = [azienda.telefono ?? '+39 055 286059', azienda.email ?? 'usa@prestigerent.com', 'prestigerent.com'];
  contatti.forEach((c, i) => aDestra(pagina, c, A4[0] - MARGINE, y - 12 - i * 11, 8.4, i === 2 ? grassetto : font));
  /* niente filetto arancione sotto il logo: tolto su richiesta della
     proprieta' (12/10/2026) */
  y -= 58;
  for (const r of intro) {
    y -= 11;
    testo(pagina, r, MARGINE, y, 8.6);
  }
  y -= 14;
  const numeri: NumeriPdf = dati.numeri ?? {
    voto: azienda.voto_medio ?? null,
    clienti: null,
    tour: azienda.tour_effettuati ?? null,
    posizione: null,
    categoria: null,
    anni: azienda.anno_fondazione ? new Date().getFullYear() - azienda.anno_fondazione : null,
    recensioni: null,
  };
  testo(pagina, taglia(P.fatti(numeri), grassetto, 8.2, L), MARGINE, y, 8.2, grassetto);
  y -= 12;
  testo(pagina, taglia(P.premi(numeri), font, 8, L), MARGINE, y, 8, font, GRIGIO);
  y -= 20;

  /* ── la tabella ── */
  const intestazione = (p: PDFPage) => {
    testo(p, titolo, MARGINE, y, misura * 1.5, grassetto);
    y -= passo * 1.3;
    p.drawRectangle({ x: MARGINE, y: y - 3, width: L, height: passo + 2, color: INCHIOSTRO });
    testo(p, P.persone.toUpperCase(), MARGINE + 4, y, misura * 0.92, grassetto, rgb(1, 1, 1));
    for (let i = 0; i < COLONNE; i++) {
      aDestra(p, String(i + 1), MARGINE + larghezzaNome + (i + 1) * larghezzaPrezzo - 4, y, misura, grassetto, rgb(1, 1, 1));
    }
    y -= passo * 1.4;
  };
  if (dati.commissioni) {
    /* la legenda dei partner va a capo: e' la chiave per leggere tutto */
    const nota = aCapo(P.notaPartner(percento(dati.commissioni.privato), percento(dati.commissioni.gruppo)), font, misura, L);
    nota.forEach((r, i) => testo(pagina, r, MARGINE, y + 4 - i * passo, misura, font, GRIGIO));
    y -= passo * (nota.length - 1);
  } else {
    testo(pagina, taglia(P.nota, font, misura, L), MARGINE, y + 4 - 0, misura, font, GRIGIO);
  }
  y -= passo * 1.6;
  intestazione(pagina);

  let pari = false;
  for (const r of righe) {
    /* nel PDF dei partner una riga coi prezzi in colonna ne occupa tre:
       Retail, Net, Comm. */
    const tre = r.tipo === 'servizio' && r.percentuale != null && (r.prezzi != null || !!r.treTesti);
    const h = r.tipo === 'sezione' ? passo * 1.9 : r.tipo === 'gruppo' ? passo * 1.25 : tre ? passo * 2.9 : passo;
    if (y - h < MARGINE + piede) {
      pagina = pdf.addPage(A4);
      pagine.push(pagina);
      y = A4[1] - MARGINE - 4;
      intestazione(pagina);
    }
    if (r.tipo === 'sezione') {
      y -= passo * 0.7;
      pagina.drawRectangle({ x: MARGINE, y: y - 2, width: 3, height: passo, color: ARANCIO });
      testo(pagina, r.testo.toUpperCase(), MARGINE + 7, y, misura * 1.08, grassetto);
      pagina.drawLine({ start: { x: MARGINE, y: y - 3.5 }, end: { x: MARGINE + L, y: y - 3.5 }, thickness: 0.6, color: LINEA });
      y -= passo * 1.2;
      pari = false;
      continue;
    }
    if (r.tipo === 'gruppo') {
      testo(pagina, r.testo, MARGINE + 2, y, misura * 0.95, grassetto, GRIGIO);
      y -= passo * 1.25;
      pari = false;
      continue;
    }
    if (pari) pagina.drawRectangle({ x: MARGINE, y: y - passo * 0.3 - (h - passo), width: L, height: h, color: RIGA });
    pari = !pari;
    const rientro = r.rientro ? 10 : 2;
    const fNome = r.rientro ? font : grassetto;
    const sotto = passo * 0.95;
    if (tre) {
      /* PDF DEI PARTNER: le etichette Retail / Net / Your commission a
         destra del nome, sulle tre righe (proprieta', 13/10/2026), e il
         nome che va a capo prima di arrivarci invece di finirci sotto. */
      const mEt = misura * 0.9;
      const etichette = [P.retail, P.net, P.comm];
      const lEt = Math.max(...etichette.map((e) => font.widthOfTextAtSize(e, mEt)));
      etichette.forEach((e, k) => aDestra(pagina, e, MARGINE + larghezzaNome - 6, y - k * sotto, mEt, font, GRIGIO));
      const spazio = larghezzaNome - rientro - lEt - 14;
      let righeNome = aCapo(r.nome, fNome, misura, spazio);
      if (righeNome.length > 3) righeNome = [righeNome[0], righeNome[1], taglia(righeNome.slice(2).join(' '), fNome, misura, spazio)];
      righeNome.forEach((t, k) => nomeConLink(pagina, t, MARGINE + rientro, y - k * sotto, misura, fNome, r.url));
    }
    if (r.prezzi) {
      if (!tre) nomeConLink(pagina, taglia(r.nome, fNome, misura, larghezzaNome - rientro - 6), MARGINE + rientro, y, misura, fNome, r.url);
      r.prezzi.forEach((p, i) => {
        if (p == null) return;
        const x = MARGINE + larghezzaNome + (i + 1) * larghezzaPrezzo - 4;
        if (!tre) {
          aDestra(pagina, cifra(p, lingua), x, y, misura);
          return;
        }
        const s = scomponi(p, r.percentuale!);
        aDestra(pagina, cifra(s.retail, lingua), x, y, misura, grassetto);
        aDestra(pagina, cifra(s.net, lingua), x, y - sotto, misura * 0.95);
        /* commissione come il Net: stessa misura, stesso colore (proprieta') */
        aDestra(pagina, cifra(s.commissione, lingua), x, y - 2 * sotto, misura * 0.95);
      });
    } else if (tre && r.treTesti) {
      /* le opzioni a persona: tre righe come i prezzi in colonna, stesso
         peso -- Retail in grassetto, Net e commissione uguali */
      r.treTesti.forEach((t, k) =>
        testo(pagina, taglia(t, k === 0 ? grassetto : font, misura, COLONNE * larghezzaPrezzo - 4), MARGINE + larghezzaNome + 4, y - k * sotto, k === 0 ? misura : misura * 0.95, k === 0 ? grassetto : font)
      );
    } else if (r.testoPrezzi) {
      const nome = taglia(r.nome, fNome, misura, larghezzaNome - rientro - 6);
      nomeConLink(pagina, nome, MARGINE + rientro, y, misura, fNome, r.url);
      testo(pagina, taglia(r.testoPrezzi, font, misura, COLONNE * larghezzaPrezzo - 4), MARGINE + larghezzaNome + 4, y, misura);
    } else {
      nomeConLink(pagina, taglia(r.nome, fNome, misura, L - rientro), MARGINE + rientro, y, misura, fNome, r.url);
    }
    y -= h;
  }

  /* ── il piede, su ogni pagina ── */
  const indirizzo = azienda.indirizzo ?? 'Via Della Saggina 98, 50145 Florence, Italy';
  pagine.forEach((p, i) => {
    p.drawLine({ start: { x: MARGINE, y: MARGINE + 14 }, end: { x: A4[0] - MARGINE, y: MARGINE + 14 }, thickness: 0.5, color: LINEA });
    testo(p, taglia(`Prestige Rent  ·  ${indirizzo}  ·  ${P.piede}`, font, 6.4, L - 60), MARGINE, MARGINE + 4, 6.4, font, GRIGIO);
    aDestra(p, P.pagina(i + 1, pagine.length), A4[0] - MARGINE, MARGINE + 4, 6.4, font, GRIGIO);
  });

  return { file: await pdf.save(), pagine: pagine.length };
}
