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
 * Ogni voce si riempie leggendo la CATEGORIA WOOCOMMERCE con lo stesso
 * nome: /cruise-port-tours/livorno-port/ prende i tour della categoria
 * "livorno-port". Non c'e' niente da mappare a mano, gli slug coincidono.
 *
 * Prima indovinavo l'appartenenza cercando parole nel nome del tour, e su
 * meta' delle pagine sbagliavo: "Direct transfers from Rome" mostrava otto
 * tour su dieci CON sosta, Salerno e Sorrento mostravano gli stessi tre
 * tour che partono da Napoli. Quelle associazioni su WordPress esistono
 * gia' e le ha fatte qualcuno a mano, tour per tour: andavano lette, non
 * indovinate.
 *
 * Sei di queste categorie sono VUOTE anche su WordPress -- Palermo,
 * Messina, Taormina, Salerno, Amalfi/Positano e i transfer diretti da
 * Napoli. Le pagine esistono da anni senza un solo tour dentro: non e' un
 * difetto nostro, e' un buco del sito attuale.
 */

export type Categoria = {
  /** l'indirizzo, identico a WordPress, barra finale compresa */
  path: string;
  titolo: string;
  /** compare sotto il titolo e nella descrizione per i motori */
  intro: string;
  /** lo slug della categoria WooCommerce: e' l'ultimo pezzo del percorso,
   *  e coincide sempre. Da li' si legge quali tour ci stanno dentro --
   *  associazioni fatte a mano su WordPress, tour per tour. */
  cat: string;
  /** l'indirizzo della pagina che la contiene, per le briciole di pane */
  padre?: string;
};

export const CATEGORIE: Categoria[] = [
  /* ── le sei voci principali del menu ─────────────────────────────── */
  {
    path: '/small-group-tours/',
    cat: 'small-group-tours',
    titolo: 'Small group tours from Florence',
    intro:
      'Three days out of Florence in our own minibuses, never more than 25 guests, with our own guides and lunch at a family winery. Departures every week, booking confirmed instantly.',
  },
  {
    path: '/private-tours/',
    cat: 'private-tours',
    titolo: 'Private tours in Tuscany and beyond',
    intro:
      'Your party only, your own driver, your own hours. We collect you where you are staying — in Florence or anywhere in Italy — and the day is built around what you want to see.',
  },
  {
    /* 🔴 RIMESSA IL 28/08/2026, DOPO AVERLA TOLTA PER SBAGLIO.
       Il giorno prima del passaggio questa categoria era stata sostituita
       da un redirect verso /destinations/florence-tuscany/, con il
       ragionamento che i suoi sette tour stanno tutti anche li'. Sui
       prodotti e' vero; sul resto no. Era una delle voci principali del
       menu di WordPress, con una pagina sua, un testo suo e anni di
       posizionamento -- ed e' la categoria dell'85% del fatturato.
       Mandare "wine and food experiences" su una pagina che si chiama
       "Florence & Tuscany" vuol dire far sparire dal sito la parola con
       cui questa azienda viene cercata. */
    path: '/wine-and-food-experiences/',
    cat: 'wine-and-food-experiences',
    titolo: 'Wine and food experiences in Tuscany',
    intro:
      'The days people come to Tuscany for: family estates in the Chianti hills, cellars you walk into, tastings of wine and olive oil, and lunch where the wine is made. Our own vehicles, our own guides, no intermediaries.',
  },
  {
    path: '/cruise-port-tours/',
    cat: 'cruise-port-tours',
    titolo: 'Shore excursions from the Italian cruise ports',
    /* 🔴 LA GARANZIA, RIMESSA IL 28/08/2026.
       Il vecchio sito non prometteva solo il rientro in tempo: diceva
       cosa succede se qualcosa va storto, ed e' quello che chiude la
       vendita a chi ha una nave che riparte senza di lui. Nel passaggio
       era rimasta la promessa e sparita la garanzia. Testo ripreso dal
       vecchio sito, parola per parola. */
    intro:
      'Off the ship, into Italy, back on board in time. Book with confidence thanks to our Worry-free policy for cruisers: in the past 25 years none of our clients have missed the boat, and in the very rare case you are dropped off late through our mistake, we arrange and pay for your accommodation, meals and transport to your next port of call. If your ship does not dock at all — weather, a change of itinerary — there is no penalty and no cancellation fee.',
  },
  {
    path: '/transfers/',
    cat: 'transfers',
    titolo: 'Private transfers across Italy',
    intro:
      'City to city, airport to hotel, port to port. A fixed price agreed before you travel, a driver who waits if your flight is late, and space for everyone’s luggage.',
  },
  {
    path: '/tours-of-italy/',
    cat: 'tours-of-italy',
    titolo: 'Tours of Italy',
    intro:
      'Everything we run, from a half day in Chianti to a week across the country — small group departures, private days and transfers with stops along the way.',
  },
  {
    path: '/destinations/',
    cat: 'destinations',
    titolo: 'Where we can take you',
    intro:
      'Florence and Tuscany, the Amalfi Coast, Rome, Venice, the Lakes. Choose where you are starting from and see what we run from there.',
  },

  /* ── i porti ─────────────────────────────────────────────────────── */
  { path: '/cruise-port-tours/livorno-port/', cat: 'livorno-port', titolo: 'Tours from Livorno cruise port', intro: 'Livorno is the port for Florence, Pisa and the Tuscan countryside. We are on the quay when you dock, and back before all aboard.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/la-spezia-port/', cat: 'la-spezia-port', titolo: 'Tours from La Spezia cruise port', intro: 'La Spezia is the gateway to the Cinque Terre, and also within reach of Florence and Pisa in a day.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/civitavecchia/', cat: 'civitavecchia', titolo: 'Tours from Civitavecchia cruise port', intro: 'Civitavecchia is the port for Rome. An hour and a quarter each way, and the day is yours.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/naples-port/', cat: 'naples-port', titolo: 'Tours from Naples cruise port', intro: 'Pompeii, Vesuvius, Sorrento and the Amalfi Coast, all within a day of the Naples quay.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/sorrento-port/', cat: 'sorrento-port', titolo: 'Tours from Sorrento port', intro: 'Sorrento, Positano, Amalfi and Pompeii, with a driver who knows the coast road.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/salerno-port/', cat: 'salerno-port', titolo: 'Tours from Salerno port', intro: 'Salerno puts the Amalfi Coast and Pompeii within easy reach for the day.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/amalfi-positano-port/', cat: 'amalfi-positano-port', titolo: 'Tours from Amalfi and Positano', intro: 'The Amalfi Coast from the water: Ravello, Positano, Amalfi and Pompeii.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/palermo/', cat: 'palermo', titolo: 'Tours from Palermo cruise port', intro: 'Palermo, Monreale and western Sicily, with a private driver for the day.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/messina/', cat: 'messina', titolo: 'Tours from Messina cruise port', intro: 'Taormina, Etna and the Sicilian east coast, from the Messina quay.', padre: '/cruise-port-tours/' },
  { path: '/cruise-port-tours/taormina-port/', cat: 'taormina-port', titolo: 'Tours from Taormina', intro: 'Taormina, Etna and the villages of eastern Sicily.', padre: '/cruise-port-tours/' },

  /* ── i transfer ──────────────────────────────────────────────────── */
  { path: '/transfers/direct-transfers/', cat: 'direct-transfers', titolo: 'Direct transfers', intro: 'Straight from A to B, fixed price, no stops. Airports, stations, hotels and ports.', padre: '/transfers/' },
  { path: '/transfers/direct-transfers/florence-direct-transfers/', cat: 'florence-direct-transfers', titolo: 'Direct transfers from Florence', intro: 'From Florence to Rome, Milan, Venice, the airports and the ports.', padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/rome-direct-transfers/', cat: 'rome-direct-transfers', titolo: 'Direct transfers from Rome', intro: 'Rome and Fiumicino to Florence, Tuscany and the ports.', padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/milan-direct-transfers/', cat: 'milan-direct-transfers', titolo: 'Direct transfers from Milan', intro: 'Milan city and Malpensa to Florence, the Lakes and beyond.', padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/venice-direct-transfers/', cat: 'venice-direct-transfers', titolo: 'Direct transfers from Venice', intro: 'Venice and its airport to Florence, Bologna and the north.', padre: '/transfers/direct-transfers/' },
  { path: '/transfers/direct-transfers/naples/', cat: 'naples', titolo: 'Direct transfers from Naples', intro: 'Naples, its airport and the port, to Rome, Sorrento and the Amalfi Coast.', padre: '/transfers/direct-transfers/' },
  { path: '/transfers/transfers-with-stop-enroute/', cat: 'transfers-with-stop-enroute', titolo: 'Transfers with a stop on the way', intro: 'The journey you had to make anyway, turned into a day out: same trip, one or two stops, one price.', padre: '/transfers/' },
  { path: '/transfers/transfers-with-stop-enroute/florence-to-rome/', cat: 'florence-to-rome', titolo: 'Florence to Rome with a stop', intro: 'Siena, Assisi, Orvieto or Chianti on the way south — instead of three hours of motorway.', padre: '/transfers/transfers-with-stop-enroute/' },
  { path: '/transfers/transfers-with-stop-enroute/florence-to-venice/', cat: 'florence-to-venice', titolo: 'Florence to Venice with a stop', intro: 'Bologna, Ferrara, Padua or the Ferrari museum on the way north.', padre: '/transfers/transfers-with-stop-enroute/' },
  { path: '/transfers/transfers-with-stop-enroute/florence-to-milan/', cat: 'florence-to-milan', titolo: 'Florence to Milan with a stop', intro: 'Ferrari, Lamborghini, Modena and its balsamic, or the outlet, on the way to Milan.', padre: '/transfers/transfers-with-stop-enroute/' },
  { path: '/transfers/transfers-with-stop-enroute/rome-to-naples/', cat: 'rome-to-naples', titolo: 'Rome to Naples with a stop', intro: 'Pompeii or the Amalfi Coast on the way down, with your luggage in the car.', padre: '/transfers/transfers-with-stop-enroute/' },

  /* ── le destinazioni ─────────────────────────────────────────────── */
  { path: '/destinations/florence-tuscany/', cat: 'florence-tuscany', titolo: 'Florence and Tuscany', intro: 'Siena, San Gimignano, Chianti, Pisa, Lucca and the wine country — everything we run from Florence.', padre: '/destinations/' },
  { path: '/destinations/rome-destinations/', cat: 'rome-destinations', titolo: 'Rome', intro: 'Rome for the day from Florence, from Civitavecchia, or as a transfer with stops on the way.', padre: '/destinations/' },
  { path: '/destinations/venice-destinations/', cat: 'venice-destinations', titolo: 'Venice', intro: 'Venice for the day, or as a transfer through Bologna, Ferrara and Padua.', padre: '/destinations/' },
  { path: '/destinations/milan-como-destinations/', cat: 'milan-como-destinations', titolo: 'Milan and Lake Como', intro: 'Milan, the Lakes and the motor valley — Ferrari, Lamborghini, Ducati and Modena.', padre: '/destinations/' },
  { path: '/destinations/naples-amalfi-coast/', cat: 'naples-amalfi-coast', titolo: 'Naples and the Amalfi Coast', intro: 'Pompeii, Vesuvius, Sorrento, Positano, Amalfi and Ravello.', padre: '/destinations/' },
  { path: '/destinations/livorno-port-destinations/', cat: 'livorno-port-destinations', titolo: 'From Livorno port', intro: 'What we run from the Livorno quay: Florence, Pisa, Siena, Chianti and the Cinque Terre.', padre: '/destinations/' },
  { path: '/destinations/la-spezia-destinations/', cat: 'la-spezia-destinations', titolo: 'From La Spezia port', intro: 'The Cinque Terre, Portofino, Florence and Pisa from the La Spezia quay.', padre: '/destinations/' },
  { path: '/destinations/civitavecchia-destinations/', cat: 'civitavecchia-destinations', titolo: 'From Civitavecchia port', intro: 'Rome, Orvieto and Tarquinia from the port of Rome.', padre: '/destinations/' },
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
