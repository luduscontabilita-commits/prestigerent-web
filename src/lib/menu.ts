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
    href: '/?kind=small_group',
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
    href: '/?kind=private',
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
    href: '/?kind=cruise',
    gruppi: [
      {
        titolo: 'From Livorno',
        voci: [
          { testo: 'Florence & Pisa', href: '/tour/florence-and-pisa-from-livorno-tour/' },
          { testo: 'Siena & San Gimignano', href: '/tour/siena-and-san-gimignano-from-livorno/' },
          { testo: 'Chianti wineries', href: '/tour/chianti-wineries-from-livorno-port/' },
          { testo: 'Cinque Terre', href: '/tour/tour-to-cinque-terre-from-livorno/' },
        ],
      },
      {
        titolo: 'From La Spezia',
        voci: [
          { testo: 'Cinque Terre', href: '/tour/tour-to-cinque-terre-from-la-spezia/' },
          { testo: 'Florence', href: '/tour/private-tour-florence-from-la-spezia/' },
          { testo: 'Pisa & Lucca', href: '/tour/tour-to-pisa-lucca-from-la-spezia/' },
          { testo: 'Chianti wineries', href: '/tour/tour-chianti-wineries-from-la-spezia/' },
        ],
      },
      {
        titolo: 'From Civitavecchia',
        voci: [
          { testo: 'Rome', href: '/tour/private-rome-from-civitavecchia-port/' },
          { testo: 'Orvieto', href: '/tour/private-orvieto-from-civitavecchia/' },
          { testo: 'Tarquinia', href: '/tour/private-tarquinia-from-civitavecchia/' },
        ],
      },
      {
        titolo: 'From Naples',
        voci: [
          { testo: 'Pompeii & Vesuvius', href: '/tour/pompeii-vesuvius-from-naples-port/' },
          { testo: 'Sorrento & Positano', href: '/tour/sorrento-and-positano-from-naples/' },
          { testo: 'Positano, Amalfi & Ravello', href: '/tour/private-tour-positano-amalfi-ravello/' },
        ],
      },
    ],
  },

  {
    testo: 'Transfers',
    href: '/?kind=transfer',
    gruppi: [
      {
        titolo: 'Airports & stations',
        voci: [
          { testo: 'Florence airport', href: '/tour/transfer-airport-to-florence/' },
          { testo: 'Pisa airport', href: '/tour/transfer-pisa-airport-to-florence/' },
          { testo: 'Rome Fiumicino', href: '/tour/private-transfer-from-rome-city-or-fco-airport-to-florence/' },
          { testo: 'Florence train station', href: '/tour/transfer-florence-train-station/' },
        ],
      },
      {
        titolo: 'To Rome',
        voci: [
          { testo: 'With a stop in Siena', href: '/tour/florence-to-rome-with-stop-in-siena/' },
          { testo: 'With a stop in Assisi', href: '/tour/florence-to-rome-with-stop-in-assisi/' },
          { testo: 'Through Chianti', href: '/tour/transfer-to-rome-via-chianti/' },
          { testo: 'Via Orvieto', href: '/tour/transfer-florence-rome-via-orvieto/' },
        ],
      },
      {
        titolo: 'To Venice',
        voci: [
          { testo: 'With a stop in Bologna', href: '/tour/florence-venice-with-stop-in-bologna/' },
          { testo: 'With a stop at Ferrari', href: '/tour/florence-venice-with-stop-at-ferrari/' },
          { testo: 'With a stop in Padua', href: '/tour/florence-venice-with-stop-in-padua/' },
          { testo: 'Direct', href: '/tour/transfer-from-florence-to-venice/' },
        ],
      },
      {
        titolo: 'To Milan',
        voci: [
          { testo: 'With a stop at Ferrari', href: '/tour/florence-milan-with-stop-at-ferrari/' },
          { testo: 'With a stop at Lamborghini', href: '/tour/milan-with-stop-at-lamborghini/' },
          { testo: 'With a stop in Parma', href: '/tour/transfer-to-milan-with-stop-in-parma/' },
          { testo: 'Malpensa airport', href: '/tour/transfer-from-florence-to-milan-mxp/' },
        ],
      },
    ],
  },

  {
    testo: 'Destinations',
    href: '/',
    /* Le destinazioni portano a ELENCHI FILTRATI, non alle singole schede.
       Puntarle ai tour significherebbe ripetere nel menu link che ci sono
       gia' sotto "Private Tours" e "Cruise Port Tours": lo stesso
       indirizzo due volte nella stessa pagina e' peso interno buttato --
       ed e' precisamente il difetto del menu di WordPress. */
    gruppi: [
      {
        titolo: 'Tuscany',
        voci: [
          { testo: 'Siena', href: '/?place=siena' },
          { testo: 'San Gimignano', href: '/?place=san-gimignano' },
          { testo: 'Chianti', href: '/?place=chianti' },
          { testo: 'Pisa', href: '/?place=pisa' },
          { testo: 'Lucca', href: '/?place=lucca' },
          { testo: 'Montalcino & Montepulciano', href: '/?place=montalcino' },
        ],
      },
      {
        titolo: 'Coast & beyond',
        voci: [
          { testo: 'Cinque Terre', href: '/?place=cinque-terre' },
          { testo: 'Rome', href: '/?place=rome' },
          { testo: 'Venice', href: '/?place=venice' },
          { testo: 'Amalfi & Sorrento', href: '/?place=amalfi' },
        ],
      },
      {
        titolo: 'Departing from',
        voci: [
          { testo: 'Florence', href: '/?from=florence' },
          { testo: 'Livorno port', href: '/?from=livorno' },
          { testo: 'La Spezia port', href: '/?from=la-spezia' },
          { testo: 'Civitavecchia', href: '/?from=civitavecchia' },
          { testo: 'Naples port', href: '/?from=naples' },
        ],
      },
    ],
  },
];
