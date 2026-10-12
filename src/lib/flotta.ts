/* LA FLOTTA, COME LA VEDE CHI HA ACCESSO ALL'AREA PARTNER (/partners/fleet/).
 *
 * Dati scritti qui e non nel database: sono sei mezzi, cambiano una volta
 * l'anno, e una tabella con il suo pannello costerebbe piu' di quanto
 * risparmia. Modulo SENZA direttiva: lo leggono sia la pagina (server)
 * sia la scheda (client).
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
  /** una riga sulla capienza, quando il numero da solo non basta */
  notaPosti: string | null;
  bagagli: string | null;
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
   *  EN/IT (src/lib/partners-testi.ts). Il nome del modello non si
   *  traduce. */
  it: { tipo: string; notaPosti: string | null; bagagli: string | null; descrizione: string; suRichiesta: string | null };
};

/** I testi di un mezzo nella lingua dell'area partner. */
export function testiMezzo(m: Mezzo, lingua: 'en' | 'it') {
  return lingua === 'it'
    ? m.it
    : { tipo: m.tipo, notaPosti: m.notaPosti, bagagli: m.bagagli, descrizione: m.descrizione, suRichiesta: m.suRichiesta };
}

export const FLOTTA: Mezzo[] = [
  {
    chiave: 'classe-e',
    nome: 'Mercedes E-Class',
    tipo: 'Sedan',
    quanti: null,
    postiMax: 4,
    notaPosti: 'Most comfortable with up to 3 adults, or 3 adults and a child.',
    bagagli: '2 suitcases + 2 carry-on bags',
    descrizione:
      'Our everyday car for private tours and transfers: leather seats, climate control, Wi-Fi and bottled water on board. It enters the restricted traffic zones of Florence and other historic centres with our permits.',
    persone: [1, 3],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/classe-e.webp?v=2',
    credito: null,
    it: {
      tipo: 'Berlina',
      notaPosti: 'Più comoda fino a 3 adulti, o 3 adulti e un bambino.',
      bagagli: '2 valigie + 2 bagagli a mano',
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
    notaPosti: 'Most comfortable with up to 3 adults, or 3 adults and a child.',
    bagagli: '2 suitcases + 2 carry-on bags',
    descrizione:
      'The executive version of the private car, for clients who ask for it. Same services as the E-Class, on request.',
    persone: [1, 3],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/classe-s.webp?v=2',
    credito: null,
    it: {
      tipo: 'Berlina executive',
      notaPosti: 'Più comoda fino a 3 adulti, o 3 adulti e un bambino.',
      bagagli: '2 valigie + 2 bagagli a mano',
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
    notaPosti: null,
    bagagli: '6 suitcases + 6 carry-on bags',
    descrizione:
      'Six passenger seats, sliding doors and room for everyone’s luggage. The car for families and small parties on private tours and transfers, with Wi-Fi and bottled water on board.',
    persone: [4, 6],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/classe-v.webp?v=2',
    credito: null,
    it: {
      tipo: 'Monovolume',
      notaPosti: null,
      bagagli: '6 valigie + 6 bagagli a mano',
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
    notaPosti: null,
    bagagli: '8 suitcases + 8 carry-on bags',
    descrizione:
      'Eight passenger seats and room for a suitcase each. Used when the party is too large for the V-Class.',
    persone: [7, 8],
    gruppi: false,
    suRichiesta: null,
    foto: '/listino/flotta/sprinter.webp?v=2',
    credito: null,
    it: {
      tipo: 'Minivan',
      notaPosti: null,
      bagagli: '8 valigie + 8 bagagli a mano',
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
    notaPosti: null,
    bagagli: null,
    descrizione:
      'The minibus of our small group tours, never more than 25 guests. Our own vehicles, driven by our own drivers.',
    persone: null,
    gruppi: true,
    suRichiesta: null,
    foto: '/listino/flotta/isuzu.webp?v=2',
    credito: null,
    it: {
      tipo: 'Minibus',
      notaPosti: null,
      bagagli: null,
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
    notaPosti: 'One of the four has an on-board toilet and 28 seats.',
    bagagli: null,
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
      notaPosti: 'Uno dei quattro ha il bagno a bordo e 28 posti.',
      bagagli: null,
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
