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
 */

export type Voce = { testo: string; href: string; nota?: string; slug?: string };
export type Gruppo = { titolo: string; voci: Voce[] };
export type Sezione = {
  testo: string;
  href: string;
  gruppi: Gruppo[];
  /** slug dei tour da mostrare col punteggio nella colonna di destra */
  evidenza?: string[];
};

export const SEZIONI: Sezione[] = [
  {
    testo: 'Small Group Tours',
    href: '/small-group-tours/',
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
    evidenza: [
      'wine-experience-in-tuscany',
      'small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence',
    ],
  },

  {
    testo: 'Private Tours',
    href: '/private-tours/',
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
    evidenza: ['private-tour-to-chianti-wineries'],
  },

  {
    testo: 'Cruise Port Tours',
    href: '/cruise-port-tours/',
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
          { testo: 'Florence & Pisa from Livorno', href: '/tour/florence-and-pisa-from-livorno-tour/' },
          { testo: 'Rome from Civitavecchia', href: '/tour/private-rome-from-civitavecchia-port/' },
          { testo: 'Cinque Terre from La Spezia', href: '/tour/tour-to-cinque-terre-from-la-spezia/' },
          { testo: 'Pompeii & Vesuvius from Naples', href: '/tour/pompeii-vesuvius-from-naples-port/' },
        ],
      },
    ],
    evidenza: ['tour-to-cinque-terre-from-la-spezia', 'florence-and-pisa-from-livorno-tour'],
  },

  {
    testo: 'Transfers',
    href: '/transfers/',
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
          { testo: 'Florence airport', href: '/tour/transfer-airport-to-florence/' },
          { testo: 'Pisa airport', href: '/tour/transfer-pisa-airport-to-florence/' },
          { testo: 'Rome Fiumicino', href: '/tour/private-transfer-from-rome-city-or-fco-airport-to-florence/' },
          { testo: 'Florence train station', href: '/tour/transfer-florence-train-station/' },
        ],
      },
    ],
    evidenza: ['florence-to-rome-with-stop-in-siena', 'transfer-airport-to-florence'],
  },

  {
    testo: 'Destinations',
    href: '/destinations/',
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
