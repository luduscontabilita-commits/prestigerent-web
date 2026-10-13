import type { Lingua } from './partners-testi';

/* LA PRESENTAZIONE DELL'AZIENDA, pagina iniziale dell'area partner
 * (/partners/welcome/, proprieta' 13/10/2026).
 *
 * L'INGLESE E' QUELLO DELLE DUE BROCHURE B2B (docs/pdf_partner/, «Prestige
 * Rent B2B Brochure-1/2.pdf»), parola per parola: e' il testo che la
 * proprieta' ha gia' approvato e dato ai partner. L'italiano e' la sua
 * traduzione. Chi cambia la brochure cambi anche qui, o la pagina e il
 * PDF diranno cose diverse.
 *
 * L'anno di fondazione e i contatti NON sono qui: arrivano dalla tabella
 * `azienda`, come in tutto il sito. */

export type TestiBenvenuto = {
  menu: string;
  sopratitolo: (anno: number) => string;
  titolo: string;
  intro: string;
  punti: { titolo: string; testo: string }[];
  serviziTitolo: string;
  servizi: { titolo: string; testo: string }[];
  chiusura: string;
  sede: string;
  sedeValore: string;
  web: string;
  email: string;
  telefono: string;
  whatsapp: string;
  fotoVigne: string;
  fotoFlotta: string;
};

const en: TestiBenvenuto = {
  menu: 'About us',
  sopratitolo: (anno) => `Italy's premier ground operator since ${anno}`,
  titolo: 'Your Trusted Ground Partner in Florence, Tuscany & Beyond.',
  intro:
    'When you send your VIP clients to Italy, your reputation is on the line. American travel professionals have trusted Prestige Rent for over two decades because we understand exactly what discerning travelers expect: flawless logistics, luxurious comfort, and absolute reliability. Based in the heart of Florence, we deliver seamless transportation and immersive experiences across the Italian peninsula.',
  punti: [
    {
      titolo: 'Zero Middlemen',
      testo:
        'We are not a brokerage. We personally run and oversee every single service we offer, ensuring immediate answers, total quality control, and direct accountability to you.',
    },
    {
      titolo: '100% Owned Fleet',
      testo:
        'We proudly own and rigorously maintain our entire fleet in-house. From sleek Mercedes sedans to spacious luxury coaches, we guarantee pristine condition and safety.',
    },
    {
      titolo: 'Employed Chauffeurs',
      testo:
        'Your clients are welcomed by our direct employees, not independent contractors. Our drivers are vetted professionals, fluent in English, and passionate local experts.',
    },
    {
      titolo: 'Peace of Mind',
      testo:
        'Partnering directly with the source means seamless booking, transparent communication, and the certainty that your clients are receiving genuine white-glove treatment.',
    },
  ],
  serviziTitolo: 'Our Signature Services',
  servizi: [
    {
      titolo: 'VIP Transfers & Logistics',
      testo:
        'Seamless, point-to-point connections. We cover all major Italian airports, cities, hotels, and train stations with absolute punctuality, ensuring your clients transition effortlessly throughout their Italian journey.',
    },
    {
      titolo: 'Bespoke Private, Semi-Private & Small-Group Tours',
      testo:
        'Immersive itineraries through Tuscany and Italy’s most iconic destinations. We handle the complex logistics, allowing your clients to discover the art, history, and hidden magic of Italy without a single worry.',
    },
    {
      titolo: 'Exclusive Shore Excursions',
      testo:
        'Effortless day trips from Italy’s major cruise ports including Livorno, Civitavecchia, La Spezia, and Naples. Our excursions are meticulously timed to ship schedules, guaranteeing a relaxed and secure return.',
    },
    {
      titolo: 'Wine & Culinary Experiences',
      testo:
        'We unlock the authentic flavors of Italy with exclusive access to hidden-gem wineries in Chianti, Brunello, and beyond, offering private tastings and authentic local food tours tailored for gourmands.',
    },
  ],
  chiusura: "Let's Build Extraordinary Journeys.",
  sede: 'Headquarters',
  sedeValore: 'Florence, Tuscany, Italy',
  web: 'Web',
  email: 'Email',
  telefono: 'Phone',
  whatsapp: 'WhatsApp',
  fotoVigne: 'A Prestige Rent Mercedes V-Class with guests among the vineyards of Tuscany at sunset',
  fotoFlotta: 'The Prestige Rent fleet of Mercedes sedans, vans and minibuses in front of a Tuscan villa',
};

const it: TestiBenvenuto = {
  menu: 'Chi siamo',
  sopratitolo: (anno) => `Il principale operatore di trasporti e tour in Italia dal ${anno}`,
  titolo: 'Il vostro partner di fiducia a Firenze, in Toscana e oltre.',
  intro:
    'Quando mandate in Italia i vostri clienti VIP, è in gioco la vostra reputazione. I professionisti del turismo americani si affidano a Prestige Rent da oltre vent’anni perché sappiamo esattamente cosa si aspettano i viaggiatori più esigenti: una logistica impeccabile, comfort di lusso e affidabilità assoluta. Dal cuore di Firenze offriamo trasporti senza intoppi ed esperienze coinvolgenti in tutta la penisola.',
  punti: [
    {
      titolo: 'Nessun intermediario',
      testo:
        'Non siamo un’agenzia di intermediazione. Gestiamo e seguiamo di persona ogni servizio che offriamo: risposte immediate, controllo totale della qualità e responsabilità diretta verso di voi.',
    },
    {
      titolo: 'Flotta 100% di proprietà',
      testo:
        'La nostra flotta è tutta nostra e la manuteniamo con rigore al nostro interno. Dalle eleganti berline Mercedes ai pullman di lusso più spaziosi, garantiamo mezzi impeccabili e sicuri.',
    },
    {
      titolo: 'Autisti dipendenti',
      testo:
        'I vostri clienti sono accolti da nostri dipendenti diretti, non da collaboratori esterni. I nostri autisti sono professionisti selezionati, parlano inglese fluente e conoscono il territorio con passione.',
    },
    {
      titolo: 'Tranquillità',
      testo:
        'Lavorare direttamente con chi fa il servizio vuol dire prenotazioni semplici, comunicazione trasparente e la certezza che i vostri clienti ricevano un trattamento davvero di prima classe.',
    },
  ],
  serviziTitolo: 'I nostri servizi',
  servizi: [
    {
      titolo: 'Transfer VIP e logistica',
      testo:
        'Collegamenti punto a punto senza pensieri. Copriamo tutti i principali aeroporti, città, hotel e stazioni italiane con puntualità assoluta, perché i vostri clienti si spostino senza fatica durante tutto il viaggio.',
    },
    {
      titolo: 'Tour privati, semi-privati e in piccolo gruppo su misura',
      testo:
        'Itinerari coinvolgenti nella Toscana e nelle mete più iconiche d’Italia. Pensiamo noi alla logistica, così i vostri clienti scoprono l’arte, la storia e la magia nascosta dell’Italia senza alcuna preoccupazione.',
    },
    {
      titolo: 'Escursioni dai porti',
      testo:
        'Gite di un giorno dai principali porti crocieristici italiani, fra cui Livorno, Civitavecchia, La Spezia e Napoli. Le escursioni sono calibrate sugli orari della nave, per un rientro rilassato e sicuro.',
    },
    {
      titolo: 'Esperienze di vino e gastronomia',
      testo:
        'Facciamo scoprire i sapori autentici dell’Italia con accesso esclusivo a cantine poco conosciute nel Chianti, a Montalcino e oltre, con degustazioni private e tour gastronomici pensati per i buongustai.',
    },
  ],
  chiusura: 'Costruiamo insieme viaggi straordinari.',
  sede: 'Sede',
  sedeValore: 'Firenze, Toscana, Italia',
  web: 'Web',
  email: 'Email',
  telefono: 'Telefono',
  whatsapp: 'WhatsApp',
  fotoVigne: 'Una Mercedes Classe V di Prestige Rent con ospiti fra i vigneti toscani al tramonto',
  fotoFlotta: 'La flotta Prestige Rent, berline, van e minibus Mercedes, davanti a una villa toscana',
};

export function testiBenvenuto(lingua: Lingua): TestiBenvenuto {
  return lingua === 'it' ? it : en;
}

/** «393338424047» -> «+39 333 842 4047», come nella brochure. */
export function whatsappLeggibile(n: string): string {
  const c = n.replace(/\D/g, '');
  const m = /^39(\d{3})(\d{3})(\d{3,4})$/.exec(c);
  return m ? `+39 ${m[1]} ${m[2]} ${m[3]}` : `+${c}`;
}
