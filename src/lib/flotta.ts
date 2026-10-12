/* LA FLOTTA, COME LA VEDE CHI HA ACCESSO ALL'AREA PARTNER (/partners/fleet/).
 *
 * Dati scritti qui e non nel database: sono sei mezzi, cambiano una volta
 * l'anno. Modulo SENZA direttiva: lo leggono sia la pagina (server)
 * sia le righe e l'editor (client).
 *
 * ── I TESTI SI CAMBIANO DAL PANNELLO (dal 12/10/2026) ────────────────
 * Nome, tipo, descrizione, la riga «posti e bagagli» e «per cosa si
 * usa», in inglese e in italiano, si modificano in /admin/partners/flotta/
 * (clic sul testo). Ogni riga della pagina e' UN testo intero: la
 * proprieta' ha chiesto di non modificarla a pezzi (12/10/2026), per
 * questo nota sui posti e bagagli sono diventate un campo solo
 * (`dettagli`). Le modifiche stanno nella tabella `flotta_testi` e
 * vincono su quelle scritte qui (`testiMezzo`); «Ripristina» cancella la
 * riga e torna il testo di questo file. Quindi: chi cambia un testo QUI
 * non lo vede in pagina se l'admin l'aveva gia' modificato. Posti, foto e
 * numero di mezzi restano solo qui.
 *
 * ── DA DOVE VENGONO I NUMERI ─────────────────────────────────────────
 *  - Auto: capienze e bagagli come in /our-vehicles/ (src/app/[locale]/
 *    our-vehicles/page.tsx), che e' gia' online e gia' rivista.
 *  - Bus: dalla proprieta', 12/10/2026: «6 minibus Isuzu e 4 bus Atego
 *    (36 posti, di cui 1 solo da 28 perche' ha il bagno)».
 *  - I 25 posti dell'Isuzu: confermati dalla proprieta' il 12/10/2026
 *    (sono anche quelli che il sito promette per i small group).
 *
 * ── QUALE MEZZO PER QUALE TOUR ───────────────────────────────────────
 * Confermato dalla proprieta' il 12/10/2026, partendo da quello che dicono
 * le schede («Vehicle: Mercedes sedan or van, depending on your party
 * size»): i servizi «per party» usano le auto secondo il numero di
 * persone, i tre small group (prezzo a persona) usano il minibus. Per
 * questo l'elenco dei tour di ogni mezzo si CALCOLA dal listino
 * (`impiegoDi`), invece di scriverlo a mano: un tour nuovo finisce sotto il
 * mezzo giusto da solo.
 *
 * ── LE FOTO ──────────────────────────────────────────────────────────
 * Dal 12/10/2026 (proprieta': «le immagini devono essere tutte delle
 * stesse dimensioni, con un layout ordinato; prendile dal sito se ne
 * trovi di migliori»):
 *  - le quattro AUTO sono le immagini di studio gia' usate dal sito
 *    (/our-vehicles/, media/wp/2021/09/Mercedes-Benz-*-black.png);
 *  - l'ISUZU e' un nostro minibus vero, con la livrea «Wine Experience»
 *    (media/wp/2021/04/Wine-bus-at-a-Tuscan-winery-1.jpg), scontornato;
 *  - l'ATEGO resta la foto di Wikimedia Commons, senza marchi di altre
 *    aziende e con la targa sfocata: sul sito l'unica foto del nostro
 *    (media/lp/img/Piazzale-Montelungo-minibuses-2022.webp) e' troppo
 *    piccola. E' l'unica che chiede i crediti (`credito`).
 *
 * TUTTE SULLA STESSA TELA: 800x400, trasparente, il mezzo ridotto a
 * stare in un riquadro di 740x330, centrato e appoggiato a 24px dal
 * fondo. Cosi' nelle righe della pagina hanno tutte la stessa misura.
 * Chi cambia una foto la rifaccia uguale, e niente marchi di altre
 * aziende. File in public/listino/flotta/; `?v=` nel nome si alza a ogni
 * cambio, perche' i browser non tengano la vecchia.
 */

import type { Servizio } from './listino';

export type Credito = { autore: string; licenza: string; licenzaUrl: string; fonte: string };

export type Mezzo = {
  chiave: string;
  nome: string;
  tipo: string;
  /** quanti ne abbiamo, quando la proprieta' l'ha detto */
  quanti: number | null;
  postiMax: number;
  /** la riga sotto la descrizione: capienza, quando il numero da solo
   *  non basta, e bagagli. Un testo solo, si modifica per intero. */
  dettagli: string | null;
  descrizione: string;
  /** per quali gruppi si usa, per i servizi «per party» */
  persone: [da: number, a: number] | null;
  /** usato per i small group (prezzo a persona) */
  gruppi: boolean;
  /** quando non e' legato a un tour del sito */
  suRichiesta: string | null;
  foto: string;
  /** solo per le foto che non sono nostre (licenza CC) */
  credito: Credito | null;
  /** gli stessi testi in italiano, per l'area partner con il selettore
   *  EN/IT (src/lib/partners-testi.ts). Il nome del modello qui non si
   *  traduce: e' lo stesso nelle due lingue, finche' l'admin non lo cambia
   *  dal pannello. */
  it: { tipo: string; dettagli: string | null; descrizione: string; suRichiesta: string | null };
};

export type TestiMezzo = { nome: string } & Mezzo['it'];
export type CampoTesto = keyof TestiMezzo;

/** I testi che l'admin puo' cambiare da /admin/partners/flotta/, in
 *  quest'ordine nella finestra. I posti e le foto restano nel codice:
 *  sono fatti, non testi. */
export const CAMPI_TESTO: { campo: CampoTesto; nome: string; obbligatorio: boolean }[] = [
  { campo: 'nome', nome: 'Nome del mezzo', obbligatorio: true },
  { campo: 'tipo', nome: 'Tipo di mezzo', obbligatorio: true },
  { campo: 'descrizione', nome: 'Descrizione', obbligatorio: true },
  { campo: 'dettagli', nome: 'Posti e bagagli', obbligatorio: false },
  { campo: 'suRichiesta', nome: 'Per cosa si usa', obbligatorio: false },
];

/** Un testo cambiato dall'admin (tabella `flotta_testi`, migrazione
 *  20261012_flotta_testi.sql). Vince su quello scritto qui sotto. */
export type ModificaTesto = { chiave: string; lingua: 'en' | 'it'; campo: CampoTesto; testo: string };

export const MAX_TESTO = 1000;

/** I testi di un mezzo nella lingua dell'area partner, con sopra le
 *  modifiche dell'admin. Un campo facoltativo svuotato dall'admin
 *  sparisce (null); uno obbligatorio vuoto non arriva mai qui, lo
 *  rifiuta l'azione, ma se capitasse resta l'originale. */
export function testiMezzo(m: Mezzo, lingua: 'en' | 'it', modifiche: ModificaTesto[] = []): TestiMezzo {
  const base: TestiMezzo = lingua === 'it'
    ? { nome: m.nome, ...m.it }
    : { nome: m.nome, tipo: m.tipo, dettagli: m.dettagli, descrizione: m.descrizione, suRichiesta: m.suRichiesta };
  const campi = base as Record<CampoTesto, string | null>;
  for (const x of modifiche) {
    if (x.chiave !== m.chiave || x.lingua !== lingua) continue;
    const def = CAMPI_TESTO.find((c) => c.campo === x.campo);
    if (!def) continue;
    const t = x.testo.trim();
    if (t) campi[x.campo] = t;
    else if (!def.obbligatorio) campi[x.campo] = null;
  }
  return base;
}

export const FLOTTA: Mezzo[] = [
  {
    chiave: 'classe-e',
    nome: 'Mercedes E-Class',
    tipo: 'Sedan',
    quanti: null,
    postiMax: 4,
    dettagli: 'Most comfortable with up to 3 adults, or 3 adults and a child. Luggage: 2 suitcases + 2 carry-on bags.',
    descrizione:
      'Our everyday car for private tours and transfers: leather seats, climate control, Wi-Fi and bottled water on board. It enters the restricted traffic zones of Florence and other historic centres with our permits.',
    persone: [1, 3],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/classe-e.webp?v=2',
    credito: null,
    it: {
      tipo: 'Berlina',
      dettagli: 'Più comoda fino a 3 adulti, o 3 adulti e un bambino. Bagagli: 2 valigie + 2 bagagli a mano.',
      descrizione:
        'La nostra auto di ogni giorno per tour privati e transfer: sedili in pelle, climatizzatore, Wi-Fi e acqua a bordo. Entra nelle zone a traffico limitato di Firenze e degli altri centri storici con i nostri permessi.',
      suRichiesta: null,
    },
  },
  {
    chiave: 'classe-s',
    nome: 'Mercedes S-Class',
    tipo: 'Executive sedan',
    quanti: null,
    postiMax: 4,
    dettagli: 'Most comfortable with up to 3 adults, or 3 adults and a child. Luggage: 2 suitcases + 2 carry-on bags.',
    descrizione:
      'The executive version of the private car, for clients who ask for it. Same services as the E-Class, on request.',
    persone: [1, 3],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/classe-s.webp?v=2',
    credito: null,
    it: {
      tipo: 'Berlina executive',
      dettagli: 'Più comoda fino a 3 adulti, o 3 adulti e un bambino. Bagagli: 2 valigie + 2 bagagli a mano.',
      descrizione:
        'La versione executive dell\'auto privata, per i clienti che la chiedono. Stessi servizi della Classe E, su richiesta.',
      suRichiesta: null,
    },
  },
  {
    chiave: 'classe-v',
    nome: 'Mercedes V-Class',
    tipo: 'MPV',
    quanti: null,
    postiMax: 6,
    dettagli: 'Luggage: 6 suitcases + 6 carry-on bags.',
    descrizione:
      'Six passenger seats, sliding doors and room for everyone’s luggage. The car for families and small parties on private tours and transfers, with Wi-Fi and bottled water on board.',
    persone: [4, 6],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/classe-v.webp?v=2',
    credito: null,
    it: {
      tipo: 'Monovolume',
      dettagli: 'Bagagli: 6 valigie + 6 bagagli a mano.',
      descrizione:
        'Sei posti passeggero, porte scorrevoli e spazio per i bagagli di tutti. L\'auto per famiglie e piccoli gruppi nei tour privati e nei transfer, con Wi-Fi e acqua a bordo.',
      suRichiesta: null,
    },
  },
  {
    chiave: 'sprinter',
    nome: 'Mercedes Sprinter',
    tipo: 'Minivan',
    quanti: null,
    postiMax: 8,
    dettagli: 'Luggage: 8 suitcases + 8 carry-on bags.',
    descrizione:
      'Eight passenger seats and room for a suitcase each. Used when the party is too large for the V-Class.',
    persone: [7, 8],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/sprinter.webp?v=2',
    credito: null,
    it: {
      tipo: 'Minivan',
      dettagli: 'Bagagli: 8 valigie + 8 bagagli a mano.',
      descrizione:
        'Otto posti passeggero e spazio per una valigia a testa. Si usa quando il gruppo è troppo numeroso per la Classe V.',
      suRichiesta: null,
    },
  },
  {
    chiave: 'isuzu',
    nome: 'Isuzu minibus',
    tipo: 'Minibus',
    quanti: 6,
    postiMax: 25,
    dettagli: null,
    descrizione:
      'The minibus of our small group tours, never more than 25 guests. Our own vehicles, driven by our own drivers.',
    persone: null,
    gruppi: true,
    suRichiesta: null,
    foto: '/listino/flotta/isuzu.webp?v=2',
    credito: null,
    it: {
      tipo: 'Minibus',
      dettagli: null,
      descrizione:
        'Il minibus dei nostri tour in piccolo gruppo, mai più di 25 ospiti. Mezzi nostri, guidati dai nostri autisti.',
      suRichiesta: null,
    },
  },
  {
    chiave: 'atego',
    nome: 'Mercedes Atego coach',
    tipo: 'Coach',
    quanti: 4,
    postiMax: 36,
    dettagli: 'One of the four has an on-board toilet and 28 seats.',
    descrizione:
      'Our largest vehicles, for groups that do not fit a minibus, weddings and events.',
    persone: null,
    gruppi: false,
    suRichiesta: 'Groups of 9 or more, events and weddings, on request.',
    foto: '/listino/flotta/atego.webp?v=2',
    credito: {
      autore: 'Bob Adams',
      licenza: 'CC BY-SA 2.0',
      licenzaUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercedes_Benz_Atego_bus_(16456228222).jpg',
    },
    it: {
      tipo: 'Pullman',
      dettagli: 'Uno dei quattro ha il bagno a bordo e 28 posti.',
      descrizione:
        'I nostri mezzi più grandi, per i gruppi che non entrano in un minibus, matrimoni ed eventi.',
      suRichiesta: 'Gruppi da 9 persone in su, eventi e matrimoni, su richiesta.',
    },
  },
];

/** I servizi del listino in cui si usa un mezzo. */
export function impiegoDi(m: Mezzo, servizi: Servizio[]): Servizio[] {
  if (m.gruppi) return servizi.filter((s) => s.unita === 'per person');
  if (m.persone) return servizi.filter((s) => s.unita === 'per party');
  return [];
}
