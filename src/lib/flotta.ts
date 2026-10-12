/* LA FLOTTA, COME LA VEDE CHI HA ACCESSO AL LISTINO (/admin/listino/flotta/).
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
 * Da Wikimedia Commons, con licenza libera, scontornate. NON sono i
 * nostri mezzi: sono il modello. La pagina lo dice, e cita autore e
 * licenza di ognuna come le licenze CC BY-SA chiedono.
 *
 * 🔴 NIENTE MARCHI DI ALTRE AZIENDE (proprieta', 12/10/2026). Restano
 * solo quelli del costruttore (Mercedes, Isuzu, il nome del modello). Le
 * prime foto dei bus portavano la livrea di altre compagnie («KIWI»,
 * «Acorn Travel») e sono state sostituite: l'Isuzu e' ora un Turquoise
 * senza scritte, l'Atego un bus bianco a cui e' stato cancellato il
 * blocco con i dati del proprietario sulla fiancata. Targhe sfocate su
 * entrambi. Chi cambia una foto deve rifare lo stesso controllo.
 * File in public/listino/flotta/.
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
  credito: Credito;
};

const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/';

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
    foto: '/listino/flotta/classe-e.webp',
    credito: {
      autore: 'Damian B Oh',
      licenza: 'CC BY-SA 4.0',
      licenzaUrl: BY_SA_4,
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_W213_FL_E_350_4MATIC_AMG_Line_Obsidian_Black_Metallic_(1).jpg',
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
    foto: '/listino/flotta/classe-s.webp',
    credito: {
      autore: 'Damian B Oh',
      licenza: 'CC BY-SA 4.0',
      licenzaUrl: BY_SA_4,
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_W223_S_400d_4MATIC_AMG_Line_Obsidian_Black_(17).jpg',
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
    foto: '/listino/flotta/classe-v.webp',
    credito: {
      autore: 'Damian B Oh',
      licenza: 'CC BY-SA 4.0',
      licenzaUrl: BY_SA_4,
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_W447_V_250d_AMG_Line_Black_(1).jpg',
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
    foto: '/listino/flotta/sprinter.webp',
    credito: {
      autore: 'Damian B Oh',
      licenza: 'CC BY-SA 4.0',
      licenzaUrl: BY_SA_4,
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercedes-Benz_VS30_Sprinter_Tourer_319_CDI_Jet_Black_(1).jpg',
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
    foto: '/listino/flotta/isuzu.webp',
    credito: {
      autore: 'Anatoliy-024',
      licenza: 'CC BY-SA 3.0',
      licenzaUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      fonte: 'https://commons.wikimedia.org/wiki/File:Isuzu_Turquoise.jpg',
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
    foto: '/listino/flotta/atego.webp',
    credito: {
      autore: 'Bob Adams',
      licenza: 'CC BY-SA 2.0',
      licenzaUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
      fonte: 'https://commons.wikimedia.org/wiki/File:Mercedes_Benz_Atego_bus_(16456228222).jpg',
    },
  },
];

/** I servizi del listino in cui si usa un mezzo. */
export function impiegoDi(m: Mezzo, servizi: Servizio[]): Servizio[] {
  if (m.gruppi) return servizi.filter((s) => s.unita === 'per person');
  if (m.persone) return servizi.filter((s) => s.unita === 'per party');
  return [];
}
