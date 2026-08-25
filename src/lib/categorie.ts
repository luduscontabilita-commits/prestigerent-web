/* LE PAGINE DI CATEGORIA.
 *
 * Trovate leggendo il menu vero di WordPress: sono TRENTACINQUE indirizzi
 * vivi (verificati uno per uno, tutti HTTP 200) che sul sito nuovo non
 * esistevano. Il giorno del passaggio avrebbero risposto 404 tutti insieme
 * -- comprese /small-group-tours/ e /private-tours/, che sono le voci
 * principali del menu e le pagine su cui Google ha piu' storia dopo la home.
 *
 * Non sono pagine "in piu'": sono meta' della struttura del sito. Il
 * baseline diceva che mancano pagine di categoria e di servizio; in realta'
 * esistono, semplicemente non erano nell'elenco degli 87 tour da cui ero
 * partito.
 *
 * Ogni voce dice come si riempie: una categoria (`kind`) e/o delle parole
 * da cercare nel nome e nell'indirizzo del tour. Le parole si cercano in
 * OR fra loro e in AND con la categoria.
 */

export type Categoria = {
  /** l'indirizzo, identico a WordPress, barra finale compresa */
  path: string;
  titolo: string;
  /** compare sotto il titolo e nella descrizione per i motori */
  intro: string;
  kind?: 'small_group' | 'private' | 'cruise' | 'transfer';
  /** almeno una di queste deve comparire nello slug o nel nome */
  parole?: string[];
  /** l'indirizzo della pagina che la contiene, per le briciole di pane */
  padre?: string;
};

export const CATEGORIE: Categoria[] = [
  /* ── le sei voci principali del menu ─────────────────────────────── */
  {
    path: '/small-group-tours/',
    titolo: 'Small group tours from Florence',
    intro:
      'Three days out of Florence in our own minibuses, never more than 25 guests, with our own guides and lunch at a family winery. Departures every week, booking confirmed instantly.',
    kind: 'small_group',
  },
  {
    path: '/private-tours/',
    titolo: 'Private tours in Tuscany and beyond',
    intro:
      'Your party only, your own driver, your own hours. We collect you where you are staying — in Florence or anywhere in Italy — and the day is built around what you want to see.',
    kind: 'private',
  },
  {
    path: '/cruise-port-tours/',
    titolo: 'Shore excursions from the Italian cruise ports',
    intro:
      'Off the ship, into Italy, back on board in time. We watch your ship, not the clock: if it docks late we adjust, and we guarantee you are back before all aboard.',
    kind: 'cruise',
  },
  {
    path: '/transfers/',
    titolo: 'Private transfers across Italy',
    intro:
      'City to city, airport to hotel, port to port. A fixed price agreed before you travel, a driver who waits if your flight is late, and space for everyone’s luggage.',
    kind: 'transfer',
  },
  {
    path: '/tours-of-italy/',
    titolo: 'Tours of Italy',
    intro:
      'Everything we run, from a half day in Chianti to a week across the country — small group departures, private days and transfers with stops along the way.',
  },
  {
    path: '/destinations/',
    titolo: 'Where we can take you',
    intro:
      'Florence and Tuscany, the Amalfi Coast, Rome, Venice, the Lakes. Choose where you are starting from and see what we run from there.',
  },

  /* ── i porti ─────────────────────────────────────────────────────── */
  { path: '/cruise-port-tours/livorno-port/', titolo: 'Tours from Livorno cruise port', intro: 'Livorno is the port for Florence, Pisa and the Tuscan countryside. We are on the quay when you dock, and back before all aboard.', kind: 'cruise', parole: ['livorno'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/la-spezia-port/', titolo: 'Tours from La Spezia cruise port', intro: 'La Spezia is the gateway to the Cinque Terre, and also within reach of Florence and Pisa in a day.', kind: 'cruise', parole: ['la-spezia', 'la spezia'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/civitavecchia/', titolo: 'Tours from Civitavecchia cruise port', intro: 'Civitavecchia is the port for Rome. An hour and a quarter each way, and the day is yours.', kind: 'cruise', parole: ['civitavecchia'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/naples-port/', titolo: 'Tours from Naples cruise port', intro: 'Pompeii, Vesuvius, Sorrento and the Amalfi Coast, all within a day of the Naples quay.', kind: 'cruise', parole: ['naples', 'napoli'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/sorrento-port/', titolo: 'Tours from Sorrento port', intro: 'Sorrento, Positano, Amalfi and Pompeii, with a driver who knows the coast road.', kind: 'cruise', parole: ['sorrento'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/salerno-port/', titolo: 'Tours from Salerno port', intro: 'Salerno puts the Amalfi Coast and Pompeii within easy reach for the day.', kind: 'cruise', parole: ['salerno', 'amalfi', 'positano'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/amalfi-positano-port/', titolo: 'Tours from Amalfi and Positano', intro: 'The Amalfi Coast from the water: Ravello, Positano, Amalfi and Pompeii.', kind: 'cruise', parole: ['amalfi', 'positano', 'ravello'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/palermo/', titolo: 'Tours from Palermo cruise port', intro: 'Palermo, Monreale and western Sicily, with a private driver for the day.', kind: 'cruise', parole: ['palermo', 'sicil'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/messina/', titolo: 'Tours from Messina cruise port', intro: 'Taormina, Etna and the Sicilian east coast, from the Messina quay.', kind: 'cruise', parole: ['messina', 'taormina', 'etna'], padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/taormina-port/', titolo: 'Tours from Taormina', intro: 'Taormina, Etna and the villages of eastern Sicily.', kind: 'cruise', parole: ['taormina', 'etna'], padre: '/cruise-port-tours/' },

  /* ── i transfer ──────────────────────────────────────────────────── */
  { path: '/transfers/direct-transfers/', titolo: 'Direct transfers', intro: 'Straight from A to B, fixed price, no stops. Airports, stations, hotels and ports.', kind: 'transfer', parole: ['transfer-', 'private-transfer', 'airport', 'station'], padre: '/transfers/' },
  { path: '/transfers/direct-transfers/florence-direct-transfers/', titolo: 'Direct transfers from Florence', intro: 'From Florence to Rome, Milan, Venice, the airports and the ports.', kind: 'transfer', parole: ['florence'], padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/rome-direct-transfers/', titolo: 'Direct transfers from Rome', intro: 'Rome and Fiumicino to Florence, Tuscany and the ports.', kind: 'transfer', parole: ['rome', 'fco', 'fiumicino'], padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/milan-direct-transfers/', titolo: 'Direct transfers from Milan', intro: 'Milan city and Malpensa to Florence, the Lakes and beyond.', kind: 'transfer', parole: ['milan', 'mxp'], padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/venice-direct-transfers/', titolo: 'Direct transfers from Venice', intro: 'Venice and its airport to Florence, Bologna and the north.', kind: 'transfer', parole: ['venice', 'venezia'], padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/naples/', titolo: 'Direct transfers from Naples', intro: 'Naples, its airport and the port, to Rome, Sorrento and the Amalfi Coast.', kind: 'transfer', parole: ['naples', 'napoli'], padre: '/transfers/direct-transfers/' },
  { path: '/transfers/transfers-with-stop-enroute/', titolo: 'Transfers with a stop on the way', intro: 'The journey you had to make anyway, turned into a day out: same trip, one or two stops, one price.', kind: 'transfer', parole: ['stop', 'via-'], padre: '/transfers/' },
  { path: '/transfers/transfers-with-stop-enroute/florence-to-rome/', titolo: 'Florence to Rome with a stop', intro: 'Siena, Assisi, Orvieto or Chianti on the way south — instead of three hours of motorway.', kind: 'transfer', parole: ['rome'], padre: '/transfers/transfers-with-stop-enroute/' },
  { path: '/transfers/transfers-with-stop-enroute/florence-to-venice/', titolo: 'Florence to Venice with a stop', intro: 'Bologna, Ferrara, Padua or the Ferrari museum on the way north.', kind: 'transfer', parole: ['venice'], padre: '/transfers/transfers-with-stop-enroute/' },
  { path: '/transfers/transfers-with-stop-enroute/florence-to-milan/', titolo: 'Florence to Milan with a stop', intro: 'Ferrari, Lamborghini, Modena and its balsamic, or the outlet, on the way to Milan.', kind: 'transfer', parole: ['milan'], padre: '/transfers/transfers-with-stop-enroute/' },
  { path: '/transfers/transfers-with-stop-enroute/rome-to-naples/', titolo: 'Rome to Naples with a stop', intro: 'Pompeii or the Amalfi Coast on the way down, with your luggage in the car.', kind: 'transfer', parole: ['naples', 'rome'], padre: '/transfers/transfers-with-stop-enroute/' },

  /* ── le destinazioni ─────────────────────────────────────────────── */
  { path: '/destinations/florence-tuscany/', titolo: 'Florence and Tuscany', intro: 'Siena, San Gimignano, Chianti, Pisa, Lucca and the wine country — everything we run from Florence.', parole: ['florence', 'siena', 'gimignano', 'chianti', 'pisa', 'lucca', 'montalcino', 'montepulciano', 'volterra', 'tuscan'], padre: '/destinations/' },
  { path: '/destinations/rome-destinations/', titolo: 'Rome', intro: 'Rome for the day from Florence, from Civitavecchia, or as a transfer with stops on the way.', parole: ['rome', 'roma', 'civitavecchia', 'orvieto', 'tarquinia'], padre: '/destinations/' },
  { path: '/destinations/venice-destinations/', titolo: 'Venice', intro: 'Venice for the day, or as a transfer through Bologna, Ferrara and Padua.', parole: ['venice', 'venezia', 'padua', 'ferrara'], padre: '/destinations/' },
  { path: '/destinations/milan-como-destinations/', titolo: 'Milan and Lake Como', intro: 'Milan, the Lakes and the motor valley — Ferrari, Lamborghini, Ducati and Modena.', parole: ['milan', 'como', 'ferrari', 'lamborghini', 'ducati', 'modena', 'parma', 'bologn'], padre: '/destinations/' },
  { path: '/destinations/naples-amalfi-coast/', titolo: 'Naples and the Amalfi Coast', intro: 'Pompeii, Vesuvius, Sorrento, Positano, Amalfi and Ravello.', parole: ['naples', 'napoli', 'pompeii', 'vesuvius', 'sorrento', 'positano', 'amalfi', 'ravello'], padre: '/destinations/' },
  { path: '/destinations/livorno-port-destinations/', titolo: 'From Livorno port', intro: 'What we run from the Livorno quay: Florence, Pisa, Siena, Chianti and the Cinque Terre.', parole: ['livorno'], padre: '/destinations/' },
  { path: '/destinations/la-spezia-destinations/', titolo: 'From La Spezia port', intro: 'The Cinque Terre, Portofino, Florence and Pisa from the La Spezia quay.', parole: ['la-spezia', 'la spezia', 'cinque terre', 'cinque-terre'], padre: '/destinations/' },
  { path: '/destinations/civitavecchia-destinations/', titolo: 'From Civitavecchia port', intro: 'Rome, Orvieto and Tarquinia from the port of Rome.', parole: ['civitavecchia'], padre: '/destinations/' },
];

export const PERCORSI = CATEGORIE.map((c) => c.path);

export function categoriaDi(path: string): Categoria | undefined {
  const p = path.endsWith('/') ? path : path + '/';
  return CATEGORIE.find((c) => c.path === p);
}

/** Le figlie dirette di una categoria, per l'elenco in fondo alla pagina. */
export function figlieDi(path: string): Categoria[] {
  return CATEGORIE.filter((c) => c.padre === path);
}
