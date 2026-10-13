/* I TESTI DELL'AREA PARTNER, IN INGLESE E IN ITALIANO.
 *
 * Richiesta della proprieta' del 12/10/2026: la versione italiana di
 * prestigerent.com/partners/ con lo switch fra le due lingue. Tutti i
 * testi dell'area stanno QUI, uno accanto all'altro, cosi' una frase
 * cambiata in una lingua si vede subito che manca nell'altra. Il tipo
 * `Testi` lo impone: una chiave in inglese senza la sua italiana non
 * compila.
 *
 * Modulo SENZA direttiva: lo leggono pagine (server) e componenti
 * (client). La lingua si sceglie in src/lib/partners-lingua.ts.
 *
 * Restano in inglese, apposta: i nomi dei tour e delle opzioni (vengono
 * da Regiondo e dal sito, che e' in inglese) e le email ai partner. */

export type Lingua = 'en' | 'it';
export const LINGUE: Lingua[] = ['en', 'it'];
export const COOKIE_LINGUA = 'partners_lang';

const en = {
  marchio: 'PRESTIGE RENT · PARTNERS',
  schedaAccesso: 'Sign in',
  schedaRichiesta: 'Request access',
  email: 'Email',
  password: 'Password',
  entra: 'Sign in',
  nonHaiAccesso: 'No access yet?',
  haiGiaAccesso: 'Already have access?',
  chiediAccesso: 'Request access',
  passwordPersa: 'Lost your password? Write to usa@prestigerent.com and we will send you a new one.',
  spiegaRichiesta: 'Tell us who you are. We review every request and email you your access once it is approved.',
  nome: 'First name',
  cognome: 'Last name',
  azienda: 'Company',
  tipo: 'Business type',
  tipi: ['Travel agency', 'Tour operator', 'Hotel', 'Cruise line', 'Concierge', 'Other'],
  paese: 'Country',
  emailNota: 'Your access will be sent here',
  telefono: 'Phone',
  telefonoNota: 'With country code, e.g. +44 20 1234 5678',
  sito: 'Website',
  note: 'Anything we should know?',
  invia: 'Send request',
  privacy: 'We use these details only to review your request and to contact you about it.',
  grazieTitolo: 'Thank you, we have your request',
  grazieTesto: (email: string) => `We will email you at ${email} as soon as your access is approved.`,
  vaiAccesso: 'Go to sign in',
  erroreGenerico: 'Something went wrong. Please try again.',
  staEntrando: 'Signing you in…',
  entraConPassword: 'Sign in with email and password',
  esci: 'Sign out',
  ruolo: 'partner',
  menuListino: 'Price list',
  menuFlotta: 'Our fleet',
  // listino
  listinoTitolo: 'Price list',
  listinoSotto: 'Public prices in euro for every service and option. For further details, please visit prestigerent.com.',
  listinoMancanti: 'Some prices could not be loaded right now. Please reload the page in a few minutes.',
  scaricaPdf: (lingua: string) => `Download PDF · ${lingua}`,
  scaricaPdfNota: 'PDF with Retail, Net and your commission for every price.',
  listinoPiede: 'Prices per party are for the whole vehicle and group, not per person. For larger parties or custom itineraries, write to usa@prestigerent.com.',
  cerca: 'Search a service by name…',
  cercaEtichetta: 'Search a service',
  nessuno: 'No service matches this name.',
  servizi: 'services',
  porto: 'From ',
  perPersona: 'per person',
  perGruppo: 'per party',
  persone: 'People',
  opzione: 'Option',
  prezzo: 'Price',
  nonDisponibile: 'Prices are not available right now. Please try again in a few minutes.',
  suTop: 'Back to top',
  // commissioni
  retail: 'Retail',
  net: 'Net',
  commissione: 'Commission',
  commBreve: 'Comm.',
  percento: (n: number) => `${String(n)}%`,
  commissioneDi: (n: number) => `${String(n)}% commission`,
  legendaTitolo: 'How to read the prices',
  legendaRetail: 'the public price, the same your client pays on prestigerent.com.',
  legendaNet: 'what you pay Prestige Rent: the Retail price minus your commission.',
  legendaCommissione: (privato: number, gruppo: number) =>
    `your earnings on each booking: ${String(privato)}% on private services (private tours, cruise port tours, transfers), ${String(gruppo)}% on group tours (small group). Net is rounded to the euro.`,
  sezioni: {
    cruise: 'Cruise Port Tours',
    transfers: 'Transfers',
    small: 'Small Group Tours',
    wine: 'Wine & Food Experiences',
    private: 'Private Tours',
    other: 'Other services',
  },
  gruppi: { 'Direct transfers': 'Direct transfers', 'With a stop on the way': 'With a stop on the way', 'Other ports': 'Other ports' } as Record<string, string>,
  // flotta
  flottaTitolo: 'Our fleet',
  flottaSotto: 'The vehicles we use for our tours and transfers: how many people each one takes and which services it runs. We own and maintain all of them, with our own drivers.',
  finoA: (n: number) => `Up to ${n} passengers`,
  usatoPer: 'Used for:',
  perGruppiDi: (da: number, a: number) => `private tours, cruise port tours and transfers for parties of ${da} to ${a} people.`,
  perSmallGroup: 'our small group tours.',
  creditoFoto: 'photo of the model, not of our vehicle, by',
  creditoVia: 'via Wikimedia Commons, background removed.',
  // messaggi delle azioni
  errScriviNome: 'Please write your first and last name.',
  errAzienda: 'Please write the name of your company.',
  errEmail: 'Please check your email address.',
  errPaese: 'Please write your country.',
  errTelefono: 'Please write a phone number where we can reach you, with country code.',
  errNonRicevo: 'We cannot receive requests right now. Please write to usa@prestigerent.com.',
  errTroppe: 'Too many requests right now. Please try again later or write to usa@prestigerent.com.',
  errSalvataggio: 'We could not save your request. Please try again or write to usa@prestigerent.com.',
  errAccessoCampi: 'Please write your email and password.',
  errAccesso: 'Email or password not correct.',
  errRete: 'We cannot reach the server. Please try again in a moment.',
  errLinkScaduto: 'This link has expired. Please sign in with your email and password.',
  errLinkNonValido: 'This link is not valid. Please sign in with your email and password.',
  errLinkNonAttivo: 'This access is not active. Please write to usa@prestigerent.com.',
  errLinkServizio: 'We cannot sign you in right now. Please use your email and password.',
};

export type Testi = typeof en;

const it: Testi = {
  marchio: 'PRESTIGE RENT · PARTNER',
  schedaAccesso: 'Accedi',
  schedaRichiesta: 'Richiedi l’accesso',
  email: 'Email',
  password: 'Password',
  entra: 'Accedi',
  nonHaiAccesso: 'Non hai ancora l’accesso?',
  haiGiaAccesso: 'Hai già l’accesso?',
  chiediAccesso: 'Richiedilo',
  passwordPersa: 'Hai perso la password? Scrivi a usa@prestigerent.com e te ne mandiamo una nuova.',
  spiegaRichiesta: 'Dicci chi sei. Esaminiamo ogni richiesta e, appena approvata, ti mandiamo l’accesso per email.',
  nome: 'Nome',
  cognome: 'Cognome',
  azienda: 'Azienda',
  tipo: 'Tipo di attività',
  tipi: ['Agenzia di viaggi', 'Tour operator', 'Hotel', 'Compagnia di crociere', 'Concierge', 'Altro'],
  paese: 'Paese',
  emailNota: 'Ti mandiamo qui l’accesso',
  telefono: 'Telefono',
  telefonoNota: 'Con il prefisso, es. +39 055 123 4567',
  sito: 'Sito web',
  note: 'Qualcosa che dobbiamo sapere?',
  invia: 'Invia la richiesta',
  privacy: 'Usiamo questi dati solo per esaminare la richiesta e per contattarti in merito.',
  grazieTitolo: 'Grazie, abbiamo ricevuto la richiesta',
  grazieTesto: (email: string) => `Ti scriveremo a ${email} appena l’accesso sarà approvato.`,
  vaiAccesso: 'Vai all’accesso',
  erroreGenerico: 'Qualcosa non ha funzionato. Riprova.',
  staEntrando: 'Accesso in corso…',
  entraConPassword: 'Accedi con email e password',
  esci: 'Esci',
  ruolo: 'partner',
  menuListino: 'Listino prezzi',
  menuFlotta: 'La flotta',
  listinoTitolo: 'Listino prezzi',
  listinoSotto: 'Prezzi al pubblico in euro per ogni servizio e opzione. Per ulteriori dettagli consulta il sito prestigerent.com.',
  listinoMancanti: 'Alcuni prezzi non si sono caricati. Ricarica la pagina fra qualche minuto.',
  scaricaPdf: (lingua: string) => `Scarica PDF · ${lingua}`,
  scaricaPdfNota: 'PDF con Retail, Net e la tua commissione per ogni prezzo.',
  listinoPiede: 'I prezzi «per gruppo» valgono per l’intero veicolo e gruppo, non a persona. Per gruppi più numerosi o itinerari su misura scrivi a usa@prestigerent.com.',
  cerca: 'Cerca un servizio per nome…',
  cercaEtichetta: 'Cerca un servizio',
  nessuno: 'Nessun servizio con questo nome.',
  servizi: 'servizi',
  porto: 'Porto di ',
  perPersona: 'a persona',
  perGruppo: 'per gruppo',
  persone: 'Persone',
  opzione: 'Opzione',
  prezzo: 'Prezzo',
  nonDisponibile: 'Prezzi non disponibili in questo momento. Riprova fra qualche minuto.',
  suTop: 'Torna in cima',
  // commissioni
  retail: 'Retail',
  net: 'Net',
  commissione: 'Commissione',
  commBreve: 'Comm.',
  percento: (n: number) => `${String(n).replace('.', ',')}%`,
  commissioneDi: (n: number) => `commissione ${String(n).replace('.', ',')}%`,
  legendaTitolo: 'Come leggere i prezzi',
  legendaRetail: 'il prezzo al pubblico, lo stesso che il cliente paga su prestigerent.com.',
  legendaNet: 'quello che paghi a Prestige Rent: il prezzo Retail meno la tua commissione.',
  legendaCommissione: (privato: number, gruppo: number) =>
    `il tuo guadagno su ogni prenotazione: ${String(privato).replace('.', ',')}% sui servizi privati (tour privati, escursioni dai porti, transfer), ${String(gruppo).replace('.', ',')}% sui tour di gruppo (small group). Il Net è arrotondato all’euro.`,
  sezioni: {
    cruise: 'Escursioni dai porti',
    transfers: 'Transfer',
    small: 'Tour in piccolo gruppo',
    wine: 'Vino e gastronomia',
    private: 'Tour privati',
    other: 'Altri servizi',
  },
  gruppi: { 'Direct transfers': 'Transfer diretti', 'With a stop on the way': 'Con una tappa lungo il percorso', 'Other ports': 'Altri porti' },
  flottaTitolo: 'La flotta',
  flottaSotto: 'I mezzi che usiamo per tour e transfer: quante persone porta ciascuno e per quali servizi lo impieghiamo. Sono tutti nostri, con i nostri autisti.',
  finoA: (n: number) => `Fino a ${n} passeggeri`,
  usatoPer: 'Usato per:',
  perGruppiDi: (da: number, a: number) => `tour privati, escursioni dai porti e transfer per gruppi da ${da} a ${a} persone.`,
  perSmallGroup: 'i nostri tour in piccolo gruppo.',
  creditoFoto: 'foto del modello, non del nostro mezzo, di',
  creditoVia: 'da Wikimedia Commons, sfondo rimosso.',
  errScriviNome: 'Scrivi nome e cognome.',
  errAzienda: 'Scrivi il nome della tua azienda.',
  errEmail: 'Controlla l’indirizzo email.',
  errPaese: 'Scrivi il tuo paese.',
  errTelefono: 'Scrivi un numero di telefono a cui trovarti, con il prefisso internazionale.',
  errNonRicevo: 'Ora non riusciamo a ricevere richieste. Scrivi a usa@prestigerent.com.',
  errTroppe: 'Troppe richieste in questo momento. Riprova più tardi o scrivi a usa@prestigerent.com.',
  errSalvataggio: 'Non siamo riusciti a salvare la richiesta. Riprova o scrivi a usa@prestigerent.com.',
  errAccessoCampi: 'Scrivi email e password.',
  errAccesso: 'Email o password non corrette.',
  errRete: 'Non riusciamo a contattare il server. Riprova fra un momento.',
  errLinkScaduto: 'Questo link è scaduto. Accedi con email e password.',
  errLinkNonValido: 'Questo link non è valido. Accedi con email e password.',
  errLinkNonAttivo: 'Questo accesso non è attivo. Scrivi a usa@prestigerent.com.',
  errLinkServizio: 'Ora non riusciamo a farti entrare. Usa email e password.',
};

export const TESTI: Record<Lingua, Testi> = { en, it };

export function testiDi(l: string | null | undefined): Testi {
  return TESTI[l === 'it' ? 'it' : 'en'];
}

/** Il valore inglese di un tipo di attivita' scelto in italiano: nel
 *  database e nell'email all'admin il tipo resta uno solo. */
export function tipoInInglese(scelto: string): string {
  const i = it.tipi.indexOf(scelto);
  return i >= 0 ? en.tipi[i] : scelto;
}
