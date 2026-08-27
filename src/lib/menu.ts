/* LA STRUTTURA DEL MENU.
 *
 * Le voci di primo livello sono le stesse del sito WordPress -- Small Group
 * Tours, Private Tours, Cruise Port Tours, Transfers, Destinations, Quick
 * Request -- e non per abitudine: sono le categorie con cui il catalogo e'
 * diviso davvero (`tours.kind`), sono quelle che Google ha imparato in anni
 * di scansioni, e cambiarle il giorno del passaggio vorrebbe dire
 * ricominciare da capo su tutte.
 *
 * Cambia il CONTENUTO sotto, non le voci. Il menu di WordPress ha 84 link,
 * 43 distinti e 40 ripetuti (Elementor lo stampa due volte): sono 84 link su
 * ogni pagina che si spartiscono il peso interno, e chi arriva deve leggere
 * ventidue tour privati per trovarne uno. Qui sotto ogni voce ci sono i tour
 * che contano, raggruppati per come li cerca la gente -- per destinazione i
 * privati, per porto quelli delle crociere, per tratta i transfer.
 *
 * Le voci di primo livello sono LINK, non solo interruttori: si deve poter
 * arrivare alla categoria intera senza aprire niente, e un menu fatto di
 * soli bottoni non lascia niente da seguire a chi scansiona la pagina.
 *
 * ── LA VETRINA (le foto in cima al pannello) ────────────────────────────
 * Il mega menu di WordPress apriva un pannello a tutta larghezza con una
 * fila di riquadri fotografici: titolo del pannello in alto a sinistra,
 * "all destinations →" in alto a destra, e sotto le foto col nome
 * sovrapposto in basso. Quella e' la parte che il titolare riconosce come
 * "il menu del sito vecchio", ed e' quella che `vetrina` rimette in piedi.
 *
 * Ogni riquadro dichiara DA QUALE TOUR prendere la foto (`tour`), non
 * l'indirizzo dell'immagine: le copertine stanno su Supabase e si leggono
 * da li' una volta sola, nel layout. Se domani si cambia la copertina di un
 * tour, il menu cambia da solo e qui non si tocca niente.
 *
 * PERCHE' UN TOUR SCELTO A MANO E NON "IL PRIMO DELLA CATEGORIA": nella
 * tabella `tours` quasi nessuno ha `reviews_count`, quindi ordinare per
 * popolarita' significa ordinare per slug, cioe' a caso. E dentro
 * `tour_content.images` solo la PRIMA foto e' vera copertina: dalla
 * seconda in poi sono riempitivi condivisi (le Mercedes, le foto della
 * degustazione) uguali su decine di tour. Quindi: una categoria, un tour
 * rappresentativo, la sua copertina. Scelto guardando che la foto mostri
 * davvero il posto che il riquadro nomina.
 *
 * LE CATEGORIE VUOTE NON HANNO IL RIQUADRO. Sei porti (Sorrento, Salerno,
 * Amalfi/Positano, Palermo, Messina, Taormina), i transfer diretti da
 * Napoli, Roma-Napoli, /tours-of-italy/ e /destinations/venice-destinations/
 * non hanno un solo tour dentro nemmeno su WordPress. Un riquadro grigio che
 * porta a una pagina vuota e' peggio di un riquadro che non c'e'.
 */

export type Voce = { testo: string; href: string; nota?: string; slug?: string };
export type Gruppo = { titolo: string; voci: Voce[] };

/** Un riquadro fotografico del pannello. */
export type Riquadro = {
  /** il titolo sovrapposto in basso a sinistra */
  testo: string;
  href: string;
  /** lo slug del tour da cui si prende la foto di copertina */
  tour: string;
  /** cosa si vede NELLA FOTO: non ripete il titolo, lo completa */
  alt: string;
};

export type Sezione = {
  testo: string;
  href: string;
  /** il titolo del pannello, in alto a sinistra */
  pannello: string;
  /** il link in alto a destra, come "all destinations" sul sito vecchio */
  tutti: string;
  vetrina: Riquadro[];
  gruppi: Gruppo[];
};

export const SEZIONI: Sezione[] = [
  {
    testo: 'Small Group Tours',
    href: '/small-group-tours/',
    pannello: 'Small group tours from Florence',
    tutti: 'All small group tours',
    /* Qui i riquadri sono i tour, non le categorie: di small group ne
       facciamo tre, e una pagina di categoria in mezzo sarebbe un clic
       in piu' per arrivare alle stesse tre cose. Come sul sito vecchio. */
    vetrina: [
      {
        testo: 'Wine Experience in Tuscany',
        href: '/tour/wine-experience-in-tuscany/',
        tour: 'wine-experience-in-tuscany',
        alt: 'Oak barrels in the cellar of a Tuscan winery',
      },
      {
        testo: 'Siena, San Gimignano & the Tuscan countryside',
        href: '/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/',
        tour: 'small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence',
        alt: 'The Torre del Mangia and Palazzo Pubblico seen from Piazza del Campo',
      },
      {
        testo: 'Wine & Food Experience in Tuscany',
        href: '/tour/wine-food-experience-in-tuscany/',
        tour: 'wine-food-experience-in-tuscany',
        alt: 'A table laid for a tasting at a family winery',
      },
    ],
    gruppi: [
      {
        titolo: 'Our three small-group days',
        voci: [
          {
            testo: 'Siena & San Gimignano with winery lunch',
            href: '/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/',
            slug: 'small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence',
          },
          {
            testo: 'Wine Experience in Tuscany',
            href: '/tour/wine-experience-in-tuscany/',
            slug: 'wine-experience-in-tuscany',
          },
          {
            testo: 'Wine & Food Experience in Tuscany',
            href: '/tour/wine-food-experience-in-tuscany/',
            slug: 'wine-food-experience-in-tuscany',
          },
        ],
      },
    ],
  },

  {
    testo: 'Private Tours',
    href: '/private-tours/',
    pannello: 'Private tours — your party only, your own hours',
    tutti: 'All private tours',
    /* I tour privati non hanno pagine di sottocategoria: la divisione per
       zona esiste solo nella testa di chi cerca. Quindi i riquadri portano
       direttamente ai sei tour privati piu' venduti, uno per tema. */
    vetrina: [
      {
        testo: 'Chianti & the wineries',
        href: '/tour/private-tour-to-chianti-wineries/',
        tour: 'private-tour-to-chianti-wineries',
        alt: 'A winemaker in front of the great oak barrels of his Chianti cellar',
      },
      {
        testo: 'Siena & San Gimignano',
        href: '/tour/private-tour-siena-and-san-gimignano/',
        tour: 'private-tour-siena-and-san-gimignano',
        alt: 'The brick front of the church of San Domenico in Siena',
      },
      {
        testo: 'Cinque Terre',
        href: '/tour/private-cinque-terre-from-florence/',
        tour: 'private-cinque-terre-from-florence',
        alt: 'Coloured houses stacked above the sea in the Cinque Terre',
      },
      {
        testo: 'Pisa & Lucca',
        href: '/tour/private-tour-to-pisa-and-lucca/',
        tour: 'private-tour-to-pisa-and-lucca',
        alt: 'Pisa cathedral and the leaning tower across the grass',
      },
      {
        testo: 'Rome for the day',
        href: '/tour/private-tour-to-rome-from-florence/',
        tour: 'private-tour-to-rome-from-florence',
        alt: 'The tiers of arches of the Colosseum, close up',
      },
      {
        testo: 'Ferrari & Lamborghini',
        href: '/tour/tour-to-ferrari-and-lamborghini/',
        tour: 'tour-to-ferrari-and-lamborghini',
        alt: 'The entrance to the Ferrari museum at Maranello',
      },
    ],
    gruppi: [
      {
        titolo: 'Wine & Chianti',
        voci: [
          { testo: 'Chianti & wineries', href: '/tour/private-tour-to-chianti-wineries/', slug: 'private-tour-to-chianti-wineries' },
          { testo: 'Chianti, half day', href: '/tour/private-half-day-tour-of-chianti/' },
          { testo: 'Montalcino & Brunello', href: '/tour/montalcino-brunello-wine-tour/' },
          { testo: 'Montepulciano & Pienza', href: '/tour/private-tour-to-montepulciano-pienza/' },
        ],
      },
      {
        titolo: 'Siena & San Gimignano',
        voci: [
          { testo: 'Siena & San Gimignano', href: '/tour/private-tour-siena-and-san-gimignano/' },
          { testo: 'Siena & Chianti', href: '/tour/private-tour-to-siena-and-chianti/' },
          { testo: 'Siena, San Gimignano, Chianti & Pisa', href: '/tour/private-tour-to-siena-san-gimignano-chianti-pisa/' },
          { testo: 'San Gimignano & Volterra', href: '/tour/tour-san-gimignano-and-volterra/' },
        ],
      },
      {
        titolo: 'Cities & coast',
        voci: [
          { testo: 'Cinque Terre', href: '/tour/private-cinque-terre-from-florence/' },
          { testo: 'Pisa & Lucca', href: '/tour/private-tour-to-pisa-and-lucca/' },
          { testo: 'Florence & Fiesole', href: '/tour/private-tour-of-florence-and-fiesole/' },
          { testo: 'Portofino & Santa Margherita', href: '/tour/tour-to-portofino-santa-margherita/' },
        ],
      },
      {
        titolo: 'Further afield',
        voci: [
          { testo: 'Rome for the day', href: '/tour/private-tour-to-rome-from-florence/' },
          { testo: 'Venice for the day', href: '/tour/private-tour-to-venice-from-florence/' },
          { testo: 'Perugia & Assisi', href: '/tour/private-tour-to-perugia-and-assisi/' },
          { testo: 'Ferrari & Lamborghini', href: '/tour/tour-to-ferrari-and-lamborghini/' },
        ],
      },
    ],
  },

  {
    testo: 'Cruise Port Tours',
    href: '/cruise-port-tours/',
    pannello: 'Shore excursions from the Italian cruise ports',
    tutti: 'All ports of call',
    /* Quattro riquadri, non dieci: gli altri sei porti sono categorie
       vive ma senza un solo tour dentro. Restano nell'elenco qui sotto,
       dove un link che porta a una pagina magra costa poco; in vetrina no,
       perche' una foto grande promette un catalogo che non c'e'. */
    vetrina: [
      {
        testo: 'Livorno — for Florence & Pisa',
        href: '/cruise-port-tours/livorno-port/',
        tour: 'florence-and-pisa-from-livorno-tour',
        alt: 'The dome and bell tower of Florence cathedral above the rooftops',
      },
      {
        testo: 'La Spezia — for the Cinque Terre',
        href: '/cruise-port-tours/la-spezia-port/',
        tour: 'tour-to-cinque-terre-from-la-spezia',
        alt: 'The Cinque Terre coast dropping straight into the sea',
      },
      {
        testo: 'Civitavecchia — for Rome',
        href: '/cruise-port-tours/civitavecchia/',
        tour: 'private-rome-from-civitavecchia-port',
        alt: 'The Colosseum in the low afternoon light',
      },
      {
        testo: 'Naples — for Pompeii & the coast',
        href: '/cruise-port-tours/naples-port/',
        tour: 'tour-sorrento-positano-and-amalfi',
        alt: 'The lit houses of Positano climbing the cliff at dusk',
      },
    ],
    gruppi: [
      {
        titolo: 'Ports of call',
        voci: [
          { testo: 'Livorno Port (Florence)', href: '/cruise-port-tours/livorno-port/' },
          { testo: 'La Spezia Port (Cinque Terre)', href: '/cruise-port-tours/la-spezia-port/' },
          { testo: 'Civitavecchia Port (Rome)', href: '/cruise-port-tours/civitavecchia/' },
          { testo: 'Naples Port', href: '/cruise-port-tours/naples-port/' },
          { testo: 'Sorrento Port', href: '/cruise-port-tours/sorrento-port/' },
        ],
      },
      {
        titolo: 'Southern Italy & Sicily',
        voci: [
          { testo: 'Salerno Port', href: '/cruise-port-tours/salerno-port/' },
          { testo: 'Amalfi / Positano Port', href: '/cruise-port-tours/amalfi-positano-port/' },
          { testo: 'Palermo Port', href: '/cruise-port-tours/palermo/' },
          { testo: 'Messina Port', href: '/cruise-port-tours/messina/' },
          { testo: 'Taormina Port', href: '/cruise-port-tours/taormina-port/' },
        ],
      },
      {
        titolo: 'Most booked from the ports',
        voci: [
          { testo: 'Florence & Pisa from Livorno', href: '/tour/florence-and-pisa-from-livorno-tour/', slug: 'florence-and-pisa-from-livorno-tour' },
          { testo: 'Rome from Civitavecchia', href: '/tour/private-rome-from-civitavecchia-port/' },
          { testo: 'Cinque Terre from La Spezia', href: '/tour/tour-to-cinque-terre-from-la-spezia/' },
          { testo: 'Pompeii & Vesuvius from Naples', href: '/tour/pompeii-vesuvius-from-naples-port/', slug: 'pompeii-vesuvius-from-naples-port' },
        ],
      },
    ],
  },

  {
    testo: 'Transfers',
    href: '/transfers/',
    pannello: 'Private transfers across Italy',
    tutti: 'All transfers',
    /* Le tre tratte "con sosta" e i transfer diretti da Firenze: sono le
       uniche categorie di transfer che hanno tour con una copertina che
       mostri qualcosa. Roma, Milano e Venezia "dirette" hanno un tour solo
       ciascuna, e tutte e tre la STESSA copertina (i tetti di Firenze):
       tre riquadri identici in fila si leggono come un errore. Restano
       nell'elenco. */
    vetrina: [
      {
        testo: 'Direct transfers from Florence',
        href: '/transfers/direct-transfers/florence-direct-transfers/',
        tour: 'transfer-airport-to-florence',
        alt: 'Palazzo Vecchio and its tower over the roofs of Florence',
      },
      {
        testo: 'Florence to Rome, with a stop',
        href: '/transfers/transfers-with-stop-enroute/florence-to-rome/',
        tour: 'florence-to-rome-with-stop-in-siena',
        alt: 'The shell-shaped Piazza del Campo in Siena',
      },
      {
        testo: 'Florence to Venice, with a stop',
        href: '/transfers/transfers-with-stop-enroute/florence-to-venice/',
        tour: 'florence-venice-with-stop-in-bologna',
        alt: 'The two leaning brick towers of Bologna at sunset',
      },
      {
        testo: 'Florence to Milan, with a stop',
        href: '/transfers/transfers-with-stop-enroute/florence-to-milan/',
        tour: 'florence-milan-with-stop-at-ferrari',
        alt: 'Ferraris lined up inside the museum at Maranello',
      },
      {
        testo: 'Every direct transfer',
        href: '/transfers/direct-transfers/',
        tour: 'transfer-from-florence-to-milan-mxp',
        alt: 'The marble spires of Milan cathedral',
      },
    ],
    gruppi: [
      {
        titolo: 'Direct transfers from',
        voci: [
          { testo: 'Florence', href: '/transfers/direct-transfers/florence-direct-transfers/' },
          { testo: 'Rome', href: '/transfers/direct-transfers/rome-direct-transfers/' },
          { testo: 'Milan', href: '/transfers/direct-transfers/milan-direct-transfers/' },
          { testo: 'Venice', href: '/transfers/direct-transfers/venice-direct-transfers/' },
          { testo: 'Naples', href: '/transfers/direct-transfers/naples/' },
        ],
      },
      {
        titolo: 'Transfers with a stop on the way',
        voci: [
          { testo: 'Florence to Rome', href: '/transfers/transfers-with-stop-enroute/florence-to-rome/' },
          { testo: 'Florence to Venice', href: '/transfers/transfers-with-stop-enroute/florence-to-venice/' },
          { testo: 'Florence to Milan', href: '/transfers/transfers-with-stop-enroute/florence-to-milan/' },
          { testo: 'Rome to Naples', href: '/transfers/transfers-with-stop-enroute/rome-to-naples/' },
        ],
      },
      {
        titolo: 'Airports & stations',
        voci: [
          { testo: 'Florence airport', href: '/tour/transfer-airport-to-florence/', slug: 'transfer-airport-to-florence' },
          { testo: 'Pisa airport', href: '/tour/transfer-pisa-airport-to-florence/' },
          { testo: 'Rome Fiumicino', href: '/tour/private-transfer-from-rome-city-or-fco-airport-to-florence/' },
          { testo: 'Florence train station', href: '/tour/transfer-florence-train-station/', slug: 'transfer-florence-train-station' },
        ],
      },
    ],
  },

  {
    testo: 'Destinations',
    href: '/destinations/',
    pannello: 'Where we can take you',
    tutti: 'All destinations',
    /* Venezia NON c'e' in vetrina: /destinations/venice-destinations/ e'
       una categoria senza un solo tour associato, anche se il tour privato
       a Venezia esiste e si vende. E' un buco nei dati di WordPress, non
       una scelta -- basta associare il tour alla categoria e il riquadro
       compare da solo.

       Milano e il lago di Como nemmeno: la categoria ha UN tour, ed e' il
       transfer con sosta all'acetaia di Modena. La sua copertina sono
       bottigliette di aceto balsamico -- vera, ma sotto la scritta "Milan
       & Lake Como" sembra la foto sbagliata di qualcun altro. Resta
       nell'elenco finche' non ci finiscono dentro i tour giusti. */
    vetrina: [
      {
        testo: 'Florence & Tuscany',
        href: '/destinations/florence-tuscany/',
        tour: 'tour-to-san-gimignano-from-florence',
        alt: 'The medieval towers of San Gimignano over the Tuscan hills',
      },
      {
        testo: 'Rome',
        href: '/destinations/rome-destinations/',
        tour: 'private-rome-from-civitavecchia-port',
        alt: 'The Colosseum in the low afternoon light',
      },
      {
        testo: 'Naples & the Amalfi Coast',
        href: '/destinations/naples-amalfi-coast/',
        tour: 'private-pompeii-and-vesuvius-winery',
        alt: 'The excavated streets of Pompeii with Vesuvius behind',
      },
      {
        testo: 'From Livorno port',
        href: '/destinations/livorno-port-destinations/',
        tour: 'private-florence-from-livorno-port',
        alt: 'The Ponte Vecchio and its shops over the Arno',
      },
      {
        testo: 'From La Spezia port',
        href: '/destinations/la-spezia-destinations/',
        tour: 'tour-to-cinque-terre-from-la-spezia',
        alt: 'The Cinque Terre coast dropping straight into the sea',
      },
      {
        testo: 'From Civitavecchia port',
        href: '/destinations/civitavecchia-destinations/',
        tour: 'private-orvieto-from-civitavecchia',
        alt: 'Orvieto standing on its cliff of tufa rock',
      },
    ],
    gruppi: [
      {
        titolo: 'Where we go',
        voci: [
          { testo: 'Florence & Tuscany', href: '/destinations/florence-tuscany/' },
          { testo: 'Rome', href: '/destinations/rome-destinations/' },
          { testo: 'Venice', href: '/destinations/venice-destinations/' },
          { testo: 'Milan & Lake Como', href: '/destinations/milan-como-destinations/' },
          { testo: 'Naples & the Amalfi Coast', href: '/destinations/naples-amalfi-coast/' },
        ],
      },
      {
        titolo: 'From the cruise ports',
        voci: [
          { testo: 'Livorno port', href: '/destinations/livorno-port-destinations/' },
          { testo: 'La Spezia port', href: '/destinations/la-spezia-destinations/' },
          { testo: 'Civitavecchia port', href: '/destinations/civitavecchia-destinations/' },
        ],
      },
      {
        titolo: 'Everything we run',
        voci: [
          { testo: 'Tours of Italy', href: '/tours-of-italy/' },
          { testo: 'About Prestige Rent', href: '/about-us/' },
        ],
      },
    ],
  },
];

/** Tutti gli slug che servono al menu per una foto o un punteggio: il
 *  layout li legge da Supabase in una query sola, non una per riquadro. */
export const SLUG_MENU: string[] = [
  ...new Set([
    ...SEZIONI.flatMap((s) => s.vetrina.map((r) => r.tour)),
    ...SEZIONI.flatMap((s) => s.gruppi.flatMap((g) => g.voci.map((v) => v.slug ?? ''))),
  ]),
].filter(Boolean);

/* LA MINIATURA.
 *
 * Le copertine su Storage sono i file originali di WordPress: da 44 KB a
 * 727 KB l'uno. Sette riquadri a piena risoluzione sono un megabyte e
 * mezzo per aprire un menu, ed e' il tipo di peso che non si vede in prova
 * e si paga sul telefono di chi arriva da un annuncio.
 *
 * Supabase Storage sa ritagliare e ricomprimere da solo: stesso file,
 * indirizzo /render/image/ invece di /object/, e il ritaglio esce a 440x290
 * gia' in webp se il browser lo accetta -- fra i 25 e i 31 KB, cioe' un
 * ventesimo. Il ritaglio lo fa il server e non `object-fit`, quindi non si
 * scaricano nemmeno i pixel che poi vengono tagliati via.
 *
 * Se un giorno la trasformazione delle immagini venisse spenta sul
 * progetto, questi indirizzi risponderebbero in errore: per quello il
 * componente tiene un `onError` che rimette l'originale. Il menu
 * diventerebbe pesante, non rotto.
 */
export const MINI_L = 440;
export const MINI_H = 290;

export function miniatura(url: string, l = MINI_L, h = MINI_H): string {
  if (!url.includes('/storage/v1/object/public/')) return url;
  return (
    url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${l}&height=${h}&resize=cover&quality=62`
  );
}
