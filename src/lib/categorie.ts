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
  /** compare sotto il titolo e nella descrizione per i motori.
   *  Resta la riga secca e informativa: e' quella che finisce nei
   *  risultati di Google, e li' devono starci i fatti. */
  intro: string;
  /** 🔴 IL PARAGRAFO CHE PARLA A CHI LEGGE, non ai motori.
   *
   *  ⚠️ I TEMPI DI PERCORRENZA SI PRENDONO DAL SITO, NON DA ALTRO.
   *  Il 31/08/2026 avevo scritto qui "tre ore e mezza" per Firenze-Roma,
   *  prendendo i valori dalla lista delle durate da correggere su
   *  Regiondo -- valori giusti nel merito, ma non ancora confermati. Il
   *  risultato erano due numeri diversi per lo stesso viaggio nello
   *  stesso sito: 4 ore sulla scheda del prodotto, 3 e mezza nel testo
   *  della categoria. Uno dei due e' per forza sbagliato, e chi lo nota
   *  smette di credere a tutti e due.
   *  Regola, decisa dalla proprieta': si scrive quello che dice il sito.
   *  Il giorno che le durate su Regiondo vengono corrette, si cambiano
   *  QUI nello stesso momento -- non prima.
   *
   *  `intro` dice cosa c'e' dentro: minibus, venticinque posti, pranzo in
   *  cantina. Sono i fatti, e servono -- ma nessuno ha mai comprato una
   *  giornata perche' il minibus ha venticinque posti.
   *
   *  Questo dice perche' quella giornata vale, e si rivolge alla persona
   *  che sta decidendo con due schede aperte. Va sotto l'intro, non al
   *  suo posto: chi scorre veloce legge la prima e va alle foto, chi sta
   *  scegliendo legge tutte e due.
   *
   *  E' un ELENCO di paragrafi, non un testo unico: nove righe di fila
   *  sono un muro che non legge nessuno, e spezzarle in tre e' l'unico
   *  modo perche' l'ultima -- quella che deve restare -- si veda.
   *
   *  Facoltativo: dove manca, la pagina resta com'era. */
  prosa?: string[];
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
    prosa: [
      'You came to Tuscany for a reason, and it probably was not to follow a numbered flag through a car park.',
      'These are the days we would book ourselves. A small group. One of our own drivers, who knows which road ' +
        'to take when the light is right. A family who opens their cellar because they want to, not because a ' +
        'coach is due. You taste the wine where it is made, sit down to a lunch someone cooked that morning, ' +
        'and have time to stand still in a square without being counted.',
      'Twenty-four years of doing this, and the part we are proudest of is not the itinerary. It is that ' +
        'people come back, and bring their friends.',
    ],
  },
  {
    path: '/private-tours/',
    cat: 'private-tours',
    titolo: 'Private tours in Tuscany and beyond',
    intro:
      'Your party only, your own driver, your own hours. We collect you where you are staying — in Florence or anywhere in Italy — and the day is built around what you want to see.',
    prosa: [
      'A private day is not a bigger version of a group tour. It starts from a different question: not ' +
        'where the bus goes, but what you would like today to be.',
      'Your driver comes to you — your hotel, a villa in the hills, the port at Livorno, the airport at ' +
        'four in the morning if that is when you land. Our cars carry the permits for the restricted centres ' +
        'where coaches are simply not allowed, so you are set down at the door and not half a mile away. ' +
        'The driver speaks your language, has driven these roads for years, and will tell you which trattoria ' +
        'is worth the detour and which one is worth skipping.',
      'Twenty-four years means we have already made the mistakes for you: the winery that does not pick up the ' +
        'phone in August, the restaurant that seats strangers at the back, the hour when the Duomo is a wall of ' +
        'shoulders. What is left is the version that works — and it can change at eleven in the morning, ' +
        'because it is your car and your day.',
      'Tell us what you would like the day to feel like. We build the rest around it.',
    ],
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
    prosa: [
      'There is a version of a wine tasting where a coach pulls up, forty people are handed a plastic cup in a ' +
        'courtyard, and everyone is back on board in fifty minutes. This is not that.',
      'We take you to families we have known for twenty years — estates that still bottle their own wine and ' +
        'still let you into the cellar where it sleeps. You will meet the person whose name is on the label, ' +
        'taste the olive oil pressed a hundred metres from where you are standing, and sit down to a lunch that ' +
        'was cooked that morning for the number of people who actually turned up.',
      'And because we are not selling you someone else’s tour, we can say what nobody else will: which ' +
        'bottle is worth carrying home, and which one is worth drinking here and forgetting.',
      'You are not visiting a winery. You are having lunch at one.',
    ],
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
    prosa: [
      'We know exactly what you are worried about, because everyone asks the same question in the same voice: ' +
        'what if the ship leaves without me.',
      'In twenty-five years it has never happened. Not once. That is not luck — it is that we build the day ' +
        'backwards from your sailing time, not forwards from the quay. We know how long the road to Florence ' +
        'really takes on a Tuesday in August, which gate at Livorno is quicker, and how much slack to leave for ' +
        'the one thing that always goes long. If the traffic turns, your driver knows the way around it, ' +
        'because he drives it every week and not once a season.',
      'And if the worst ever did happen through a mistake of ours, it is written down and it is ours to fix: we ' +
        'arrange and pay for your hotel, your meals and your transport to the next port. If your ship never ' +
        'docks at all — weather, a change of itinerary — you pay nothing and there is no cancellation fee.',
      'The rest is the part you came for. The coast roads out of Livorno, La Spezia and Sorrento are some of the ' +
        'most beautiful drives in Italy, and they are also winding: our drivers take them smoothly and slowly ' +
        'through the bends, because a spectacular view is wasted on someone who feels ill. Air conditioning, ' +
        'water on board, and a stop whenever anyone wants one.',
      'You get off the ship, you see the real thing, and you are back on board with time to spare. That is the ' +
        'whole promise.',
    ],
  },
  {
    path: '/transfers/',
    cat: 'transfers',
    titolo: 'Private transfers across Italy',
    intro:
      'City to city, airport to hotel, port to port. A fixed price agreed before you travel, a driver who waits if your flight is late, and space for everyone’s luggage.',
    prosa: [
      'A transfer has one job: be there, on time, and get you across Italy without the day costing you anything.',
      'The driver is waiting when you land, not summoned when you land. The price is agreed before you travel ' +
        'and does not move for traffic, waiting time or a delayed flight. And whatever you are carrying — four ' +
        'people with four suitcases, a family of eight, golf clubs, a cello — we have the vehicle for it, and ' +
        'it is a comfortable one, because Florence to Rome is four hours and nobody should spend ' +
        'them with a bag on their knees.',
      'Tell us the flight number and the address. We do the rest.',
    ],
  },
  {
    path: '/tours-of-italy/',
    cat: 'tours-of-italy',
    titolo: 'Tours of Italy',
    intro:
      'Everything we run, from a half day in Chianti to a week across the country — small group departures, private days and transfers with stops along the way.',
      prosa: [
      'Everything we run, in one place: half a day in Chianti, a full day in Siena, a week that begins in Florence and ends on the Amalfi Coast.',
      'If you know when you are coming but not yet what to do with the days, this is the page to scroll.',
    ],
  },
  {
    path: '/destinations/',
    cat: 'destinations',
    titolo: 'Where we can take you',
    intro:
      'Florence and Tuscany, the Amalfi Coast, Rome, Venice, the Lakes. Choose where you are starting from and see what we run from there.',
      prosa: [
      'Start from where you are staying, or from where your ship docks. Every page here lists what can honestly be done from that point in a day — not everything that happens to exist within two hundred kilometres of it.',
      'If what you want is not on the list, it usually still exists. Ask us.',
    ],
  },

  /* ── i porti ─────────────────────────────────────────────────────── */
  {
    path: '/cruise-port-tours/livorno-port/',
    cat: 'livorno-port',
    titolo: 'Tours from Livorno cruise port',
    intro: 'Livorno is the port for Florence, Pisa and the Tuscan countryside. We are on the quay when you dock, and back before all aboard.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Livorno is the door to Florence, Pisa and the Chianti hills. We are on the quay before you are through the terminal, and the day is planned backwards from your all-aboard time — never forwards from the gangway.',
      'Most people ask for Florence. Some of the best days we run from here go the other way, into the vineyards, and nobody regrets it.',
    ],
  },
  {
    path: '/cruise-port-tours/la-spezia-port/',
    cat: 'la-spezia-port',
    titolo: 'Tours from La Spezia cruise port',
    intro: 'La Spezia is the gateway to the Cinque Terre, and also within reach of Florence and Pisa in a day.',
    padre: '/cruise-port-tours/',
    prosa: [
      'From La Spezia the Cinque Terre are close enough to walk their streets properly and still be back on board with time to spare. Florence and Pisa are also possible in the day.',
      'We will tell you honestly which of the two is the better use of your hours, and it depends on how long your ship is in port — not on which tour we would rather sell.',
    ],
  },
  {
    path: '/cruise-port-tours/civitavecchia/',
    cat: 'civitavecchia',
    titolo: 'Tours from Civitavecchia cruise port',
    intro: 'Civitavecchia is the port for Rome. An hour and a quarter each way, and the day is yours.',
    padre: '/cruise-port-tours/',
    prosa: [
      'An hour and a quarter to Rome, each way. That leaves a real day in the city rather than a lap of it: the Colosseum, the Vatican, or simply lunch somewhere Romans actually eat.',
      'Your driver stays with you all day, so what you have seen by four o’clock decides what you do at half past four.',
    ],
  },
  {
    path: '/cruise-port-tours/naples-port/',
    cat: 'naples-port',
    titolo: 'Tours from Naples cruise port',
    intro: 'Pompeii, Vesuvius, Sorrento and the Amalfi Coast, all within a day of the Naples quay.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Pompeii, Vesuvius, Sorrento and the Amalfi Coast are all within a day of the Naples quay — but not all of them in the same day, and anyone who promises you otherwise has never driven that coast road in August.',
      'Tell us how many hours you have and we will tell you which two of the four are the right ones.',
    ],
  },
  {
    path: '/cruise-port-tours/sorrento-port/',
    cat: 'sorrento-port',
    titolo: 'Tours from Sorrento port',
    intro: 'Sorrento, Positano, Amalfi and Pompeii, with a driver who knows the coast road.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Positano, Amalfi, Ravello and Pompeii, with a driver who takes that coast road every week rather than once a season — which is exactly what you want on a road that narrow.',
      'Smooth through the bends, a stop whenever anyone wants one, and back at the tender well before the last one leaves.',
    ],
  },
  {
    path: '/cruise-port-tours/salerno-port/',
    cat: 'salerno-port',
    titolo: 'Tours from Salerno port',
    intro: 'Salerno puts the Amalfi Coast and Pompeii within easy reach for the day.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Salerno puts the Amalfi Coast and Pompeii comfortably inside a day, and it is the quieter end of the coast — the traffic builds from the other direction.',
      'A private car, a driver who knows where to stop for the photograph everyone wants, and no waiting for forty other people to come back to a bus.',
    ],
  },
  {
    path: '/cruise-port-tours/amalfi-positano-port/',
    cat: 'amalfi-positano-port',
    titolo: 'Tours from Amalfi and Positano',
    intro: 'The Amalfi Coast from the water: Ravello, Positano, Amalfi and Pompeii.',
    padre: '/cruise-port-tours/',
    prosa: [
      'You are already in the postcard. From here the day is about what is behind it: Ravello above the coast, the villages the coaches skip, and Pompeii inland.',
      'We collect you at the tender and we are there again when you come back down.',
    ],
  },
  {
    path: '/cruise-port-tours/palermo/',
    cat: 'palermo',
    titolo: 'Tours from Palermo cruise port',
    intro: 'Palermo, Monreale and western Sicily, with a private driver for the day.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Palermo, Monreale and western Sicily with a private driver for the day — in a city where knowing which street to take is worth more than knowing where you are going.',
      'Back at the ship in time, with the market and the cathedral behind you rather than a photograph of a coach park.',
    ],
  },
  {
    path: '/cruise-port-tours/messina/',
    cat: 'messina',
    titolo: 'Tours from Messina cruise port',
    intro: 'Taormina, Etna and the Sicilian east coast, from the Messina quay.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Taormina and Etna from the Messina quay: the theatre with the volcano behind it, and the volcano itself if the day allows it.',
      'The road up Etna is long and the weather on it changes fast — your driver watches it, so the plan can change at eleven without costing you the day.',
    ],
  },
  {
    path: '/cruise-port-tours/taormina-port/',
    cat: 'taormina-port',
    titolo: 'Tours from Taormina',
    intro: 'Taormina, Etna and the villages of eastern Sicily.',
    padre: '/cruise-port-tours/',
    prosa: [
      'Taormina, Etna and the villages of eastern Sicily, at the pace of someone who is not counting heads.',
      'A private car from the tender, a driver who knows where to park in a town where nobody can park, and back with time to spare.',
    ],
  },

  /* ── i transfer ──────────────────────────────────────────────────── */
  {
    path: '/transfers/direct-transfers/',
    cat: 'direct-transfers',
    titolo: 'Direct transfers',
    intro: 'Straight from A to B, fixed price, no stops. Airports, stations, hotels and ports.',
    padre: '/transfers/',
    prosa: [
      'Straight from A to B. No stops, no detours, no meter running.',
      'The price is fixed before you travel and does not move — not for traffic, not for a flight that lands ninety minutes late, not for the third suitcase nobody mentioned. The driver waits, because that is what the price already includes.',
    ],
  },
  {
    path: '/transfers/direct-transfers/florence-direct-transfers/',
    cat: 'florence-direct-transfers',
    titolo: 'Direct transfers from Florence',
    intro: 'From Florence to Rome, Milan, Venice, the airports and the ports.',
    padre: '/transfers/direct-transfers/',
    prosa: [
      'Florence to Rome, Milan, Venice, the airports and the cruise ports — door to door, with your luggage in the car and nobody else in it.',
      'Four hours to Rome, to Milan or to Venice. Long enough that the vehicle matters: ours are comfortable, air conditioned, and big enough for the bags you actually have rather than the bags a price list assumes.',
    ],
  },
  {
    path: '/transfers/direct-transfers/rome-direct-transfers/',
    cat: 'rome-direct-transfers',
    titolo: 'Direct transfers from Rome',
    intro: 'Rome and Fiumicino to Florence, Tuscany and the ports.',
    padre: '/transfers/direct-transfers/',
    prosa: [
      'Rome and Fiumicino to Florence, Tuscany and the ports. A fixed price, a driver who is already there when you clear customs, and a name on a sign rather than an app and a wait.',
    ],
  },
  {
    path: '/transfers/direct-transfers/milan-direct-transfers/',
    cat: 'milan-direct-transfers',
    titolo: 'Direct transfers from Milan',
    intro: 'Milan city and Malpensa to Florence, the Lakes and beyond.',
    padre: '/transfers/direct-transfers/',
    prosa: [
      'Milan city and Malpensa to Florence, the Lakes and beyond. Malpensa to Florence is four hours: the sort of journey where a proper vehicle and a driver who does it every week are worth more than a saving of twenty euro.',
    ],
  },
  {
    path: '/transfers/direct-transfers/venice-direct-transfers/',
    cat: 'venice-direct-transfers',
    titolo: 'Direct transfers from Venice',
    intro: 'Venice and its airport to Florence, Bologna and the north.',
    padre: '/transfers/direct-transfers/',
    prosa: [
      'Venice and its airport to Florence, Bologna and the north. We meet you where the water stops — Piazzale Roma or the airport — and take it from there.',
    ],
  },
  {
    path: '/transfers/direct-transfers/naples/',
    cat: 'naples',
    titolo: 'Direct transfers from Naples',
    intro: 'Naples, its airport and the port, to Rome, Sorrento and the Amalfi Coast.',
    padre: '/transfers/direct-transfers/',
    prosa: [
      'Naples, its airport and its port, to Rome, Sorrento and the Amalfi Coast. On that coast the size of the vehicle is not a detail: we choose it for the road, not only for the number of seats.',
    ],
  },
  {
    path: '/transfers/transfers-with-stop-enroute/',
    cat: 'transfers-with-stop-enroute',
    titolo: 'Transfers with a stop on the way',
    intro: 'The journey you had to make anyway, turned into a day out: same trip, one or two stops, one price.',
    padre: '/transfers/',
    prosa: [
      'You have to get from Florence to Rome anyway. You can spend three hours on a motorway, or you can spend the same day seeing Siena, Assisi or Orvieto and arrive at your hotel in the evening.',
      'It is the same journey, the same luggage in the same car, and one price agreed in advance. The only difference is that the day counts for something instead of being lost between two cities.',
      'It is the thing our guests are most surprised we do — and the one they tell their friends about.',
    ],
  },
  {
    path: '/transfers/transfers-with-stop-enroute/florence-to-rome/',
    cat: 'florence-to-rome',
    titolo: 'Florence to Rome with a stop',
    intro: 'Siena, Assisi, Orvieto or Chianti on the way south — instead of three hours of motorway.',
    padre: '/transfers/transfers-with-stop-enroute/',
    prosa: [
      'Siena, Assisi, Orvieto or the Chianti hills on the way south — instead of three hours of motorway and a service station.',
      'Your bags stay in the car, your driver waits while you walk, and you reach Rome in the evening having actually seen something.',
    ],
  },
  {
    path: '/transfers/transfers-with-stop-enroute/florence-to-venice/',
    cat: 'florence-to-venice',
    titolo: 'Florence to Venice with a stop',
    intro: 'Bologna, Ferrara, Padua or the Ferrari museum on the way north.',
    padre: '/transfers/transfers-with-stop-enroute/',
    prosa: [
      'Bologna for lunch, Ferrara for the walls, Padua for the frescoes, or the Ferrari museum at Maranello — on the way north, without adding a day to the trip.',
    ],
  },
  {
    path: '/transfers/transfers-with-stop-enroute/florence-to-milan/',
    cat: 'florence-to-milan',
    titolo: 'Florence to Milan with a stop',
    intro: 'Ferrari, Lamborghini, Modena and its balsamic, or the outlet, on the way to Milan.',
    padre: '/transfers/transfers-with-stop-enroute/',
    prosa: [
      'Ferrari and Lamborghini, Modena and its balsamic, Parma, or the designer outlets — on the way to Milan rather than on a day you do not have.',
      'One price, one car, and the suitcases stay where they are.',
    ],
  },
  {
    path: '/transfers/transfers-with-stop-enroute/rome-to-naples/',
    cat: 'rome-to-naples',
    titolo: 'Rome to Naples with a stop',
    intro: 'Pompeii or the Amalfi Coast on the way down, with your luggage in the car.',
    padre: '/transfers/transfers-with-stop-enroute/',
    prosa: [
      'Pompeii on the way down, with your luggage in the car and nobody to meet at a coach park afterwards. You arrive in Naples in the evening having already done the thing you came south for.',
    ],
  },

  /* ── le destinazioni ─────────────────────────────────────────────── */
  {
    path: '/destinations/florence-tuscany/',
    cat: 'florence-tuscany',
    titolo: 'Florence and Tuscany',
    intro: 'Siena, San Gimignano, Chianti, Pisa, Lucca and the wine country — everything we run from Florence.',
    padre: '/destinations/',
    prosa: [
      'This is home. We have been driving these roads since 2002, and almost everything we run starts within an hour of Florence.',
      'Chianti and its cellars, Siena and San Gimignano, Pisa, Lucca, the Cinque Terre and the Val d’Orcia — in a small group or with the car to yourselves, for half a day or for all of it.',
      'If you are staying in Florence, everything on this page comes to collect you at the door.',
    ],
  },
  {
    path: '/destinations/rome-destinations/',
    cat: 'rome-destinations',
    titolo: 'Rome',
    intro: 'Rome for the day from Florence, from Civitavecchia, or as a transfer with stops on the way.',
    padre: '/destinations/',
    prosa: [
      'Rome in a day from Florence or from the port at Civitavecchia, and Rome as a starting point for the days around it.',
      'A private driver in Rome is worth more than in most cities: the traffic is what it is, the restricted zones are real, and the difference between being set down at the door and being set down half a mile away is an hour of your day.',
    ],
  },
  {
    path: '/destinations/venice-destinations/',
    cat: 'venice-destinations',
    titolo: 'Venice',
    intro: 'Venice for the day, or as a transfer through Bologna, Ferrara and Padua.',
    padre: '/destinations/',
    prosa: [
      'Venice in a day from Florence, or as the end of a journey north with a stop on the way.',
      'We take you as far as the water allows — Piazzale Roma — and we are there again when you come back out.',
    ],
  },
  {
    path: '/destinations/milan-como-destinations/',
    cat: 'milan-como-destinations',
    titolo: 'Milan and Lake Como',
    intro: 'Milan, the Lakes and the motor valley — Ferrari, Lamborghini, Ducati and Modena.',
    padre: '/destinations/',
    prosa: [
      'Milan, Malpensa and the lakes. From Florence it is four hours, and there are several things worth stopping for on the way — Ferrari, Modena, Parma — that turn the transfer into the day.',
    ],
  },
  {
    path: '/destinations/naples-amalfi-coast/',
    cat: 'naples-amalfi-coast',
    titolo: 'Naples and the Amalfi Coast',
    intro: 'Pompeii, Vesuvius, Sorrento, Positano, Amalfi and Ravello.',
    padre: '/destinations/',
    prosa: [
      'Pompeii, Vesuvius, Sorrento, Positano and Amalfi — from the port, from the airport, or as part of a journey down from Rome.',
      'On that coast the road decides the day. We choose the vehicle for the road and the hour for the traffic, which is why our days there feel shorter than they are.',
    ],
  },
  {
    path: '/destinations/livorno-port-destinations/',
    cat: 'livorno-port-destinations',
    titolo: 'From Livorno port',
    intro: 'What we run from the Livorno quay: Florence, Pisa, Siena, Chianti and the Cinque Terre.',
    padre: '/destinations/',
    prosa: [
      'Everything within a day of the Livorno quay: Florence, Pisa, Lucca and the Chianti hills.',
      'Times are calculated backwards from your all-aboard, and we are on the quay before you are through the terminal.',
    ],
  },
  {
    path: '/destinations/la-spezia-destinations/',
    cat: 'la-spezia-destinations',
    titolo: 'From La Spezia port',
    intro: 'The Cinque Terre, Portofino, Florence and Pisa from the La Spezia quay.',
    padre: '/destinations/',
    prosa: [
      'The Cinque Terre first, because they are close and because they are the reason most ships stop here. Florence and Pisa are also within the day if your ship is in port long enough — we will tell you honestly whether it is.',
    ],
  },
  {
    path: '/destinations/civitavecchia-destinations/',
    cat: 'civitavecchia-destinations',
    titolo: 'From Civitavecchia port',
    intro: 'Rome, Orvieto and Tarquinia from the port of Rome.',
    padre: '/destinations/',
    prosa: [
      'An hour and a quarter from the quay to the centre of Rome. That is the whole reason this port exists for a traveller, and it is enough for a real day rather than a rushed one.',
    ],
  },
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
