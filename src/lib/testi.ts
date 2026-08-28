import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/locales';

/* LE STRINGHE DELL'INTERFACCIA, FUORI DAI COMPONENTI.
 *
 * ── PERCHE' QUESTO FILE NASCE ADESSO ────────────────────────────────
 * Fino a qui il sito non ne aveva bisogno: il testo che cambia lingua
 * arriva tutto da `tour_content`, che ha gia' una riga per locale, e
 * quello che resta -- footer, intestazione, occhielli -- e' inglese
 * scritto dentro il componente. Funziona finche' la pagina la si legge:
 * in inglese e' giusta, in tedesco e in italiano il contorno resta
 * inglese e nessuno ci muore.
 *
 * Un MODULO no. Un modulo si compila, e un tedesco che legge "Date"
 * sopra una casella non sa se gli stanno chiedendo il giorno del tour o
 * il giorno di oggi. Soprattutto: se sbaglia, l'errore deve dirgli cosa
 * fare NELLA SUA LINGUA, altrimenti chiude la pagina invece di
 * correggere un campo.
 *
 * Quindi qui dentro non c'e' un sistema di traduzioni: c'e' il posto
 * dove mettere le stringhe di ogni pezzo che ne ha bisogno. Il modulo e'
 * il primo. Quando il footer verra' tradotto, si aggiunge un secondo
 * blocco qui e non si inventa un altro meccanismo.
 *
 * ── LE LINGUE SONO TRE, ANCHE SE ONLINE NE GIRA UNA ─────────────────
 * en, de, it. Non otto: `locales.ts` le ha ridotte apposta, e il
 * masterplan §5.5 vieta esplicitamente di riaprirne otto insieme. Se un
 * domani se ne aggiunge una, TypeScript fa fallire la compilazione qui
 * finche' non la si traduce -- che e' il comportamento giusto: meglio
 * un errore in fase di build che una pagina meta' in una lingua e meta'
 * in un'altra.
 *
 * 🔴 DAL 27/08/2026 SUL SITO PUBBLICO E' ACCESO SOLO L'INGLESE, perche'
 * `tour_content` e `seo` non hanno una sola riga in de o it (vedi la nota
 * in cima a `locales.ts`). I testi tedeschi e italiani qui sotto NON si
 * cancellano: sono la meta' gia' fatta del lavoro di riaccensione, e il
 * tipo `Locale` resta a tre proprio per tenerli in piedi e compilati.
 * `testiModulo('de')` continua a restituire il tedesco: e' `isLocale` a
 * dire che oggi quella pagina non si serve, non questo file.
 */

export type TestiModulo = {
  /* intestazione della sezione */
  occhiello: string;
  titolo: string;
  /** la parola in Fraunces corsivo dentro il titolo */
  accento: string;
  titoloCoda: string;
  sottotitolo: string;

  /* etichette dei campi */
  nome: string;
  email: string;
  telefono: string;
  tour: string;
  quando: string;
  persone: string;
  messaggio: string;

  /* segnaposto: dicono con un esempio cosa ci si aspetta */
  nomeEs: string;
  emailEs: string;
  telefonoEs: string;
  tourEs: string;
  messaggioEs: string;

  facoltativo: string;
  invia: string;
  inviando: string;

  /* il popup "Quick request" della scheda tour: il pulsante che lo apre
     e la croce che lo chiude. Vedi `RichiestaModale.tsx`. */
  pulsanteRapido: string;
  chiudi: string;

  /* L'INFORMATIVA, AL POSTO DELLA RASSICURAZIONE.
   *
   * Qui c'era un campo solo, `privacy`, e diceva:
   *
   *     "We use your details only to answer you. No newsletter, no
   *      sharing."
   *
   * Due problemi, e il secondo e' molto piu' grave del primo.
   *
   * Il primo: non era un'informativa. L'art. 13 GDPR chiede che al
   * momento della raccolta si sappia CHI e' il titolare, PERCHE'
   * raccoglie, su quale BASE, a CHI arrivano i dati, per QUANTO restano
   * e quali diritti ci sono. Una frase rassicurante non e' nessuna di
   * queste cose, e soprattutto non c'era il link alla pagina che le
   * contiene -- che allora non esisteva nemmeno.
   *
   * Il secondo: la frase NON ERA VERA. `src/app/api/richieste/route.ts`,
   * dopo aver salvato la riga, chiama `contattoDaRichiesta()` e copia
   * nome, email, telefono, tour, data e numero di persone dentro
   * GoHighLevel (HighLevel Inc., Stati Uniti). Dire "no sharing" a chi
   * sta per premere Invia e' una dichiarazione inesatta resa nel momento
   * esatto della raccolta, che e' il caso peggiore possibile: non e' una
   * pagina che nessuno legge, e' la riga sotto il pulsante.
   *
   * Adesso sono tre campi. `informativa` finisce col testo che precede
   * il link, quindi va lasciato lo spazio in fondo. */
  informativa: string;
  /** il testo del link alla privacy policy dentro l'informativa */
  informativaLink: string;
  /** l'etichetta della spunta facoltativa di marketing */
  marketing: string;

  /* la risposta dopo l'invio */
  fattoTitolo: string;
  fattoTesto: string;

  /* GLI ERRORI. Ognuno dice cosa fare, non cosa e' successo: "Manca la
     chiocciola" e' inutile, "Controlla l'indirizzo: manca la chiocciola"
     dice dove mettere le mani. La chiave e' la stessa che torna dalla
     rotta, cosi' il server non deve conoscere nessun testo. */
  errori: Record<CodiceErrore, string>;
};

/** I codici che la rotta restituisce. Il testo lo sceglie il browser,
 *  nella lingua della pagina: cosi' la validazione seria sta sul server
 *  e le traduzioni stanno qui, e non si rincorrono. */
export type CodiceErrore =
  | 'nome'
  | 'email'
  | 'telefono'
  | 'quando'
  | 'persone'
  | 'messaggio'
  | 'troppo_veloce'
  | 'troppe'
  | 'salvataggio'
  | 'rete';

const EN: TestiModulo = {
  occhiello: 'Not sure yet?',
  titolo: 'Tell us what your ',
  accento: 'day',
  titoloCoda: ' should look like',
  sottotitolo:
    'Private tours are built, not booked from a calendar. Send us the details and a real person answers — usually within a few hours.',

  nome: 'Your name',
  email: 'Email',
  telefono: 'Phone or WhatsApp',
  tour: 'Service you are interested in',
  quando: 'Preferred date',
  persone: 'How many of you',
  messaggio: 'What should we know?',

  nomeEs: 'Jane Miller',
  emailEs: 'jane@example.com',
  telefonoEs: '+1 555 0100',
  tourEs: 'Siena & San Gimignano, a transfer, or tell us',
  messaggioEs:
    'Pick-up from our hotel in Florence, a wheelchair to fit in the boot, back by 6pm…',

  facoltativo: 'optional',
  invia: 'Send my request',
  inviando: 'Sending…',
  pulsanteRapido: 'Quick request',
  chiudi: 'Close',

  informativa:
    'We use your name and contact details to answer this request and prepare your quote. ' +
    'They are stored in our systems and in the CRM our team replies from, and they are ' +
    'not sold or passed to anyone else. Full details, retention times and your rights are ' +
    'in our ',
  informativaLink: 'Privacy Policy',
  marketing:
    'You may also email me occasional offers and news about your tours. ' +
    '(Optional — you can unsubscribe at any time.)',

  fattoTitolo: 'Got it — thank you.',
  fattoTesto:
    'Your request is with our team in Florence. You will hear from a real person, usually within a few hours. In a hurry? Message us on WhatsApp.',

  errori: {
    nome: 'Please tell us your name, so we know who we are writing back to.',
    email: 'Please check the email address — that is where our answer goes.',
    telefono: 'That phone number looks too short. Leave it empty if you prefer email only.',
    quando: 'Please pick a date from today onwards, within the next two years.',
    persone: 'How many people are traveling? Any number from 1 to 60.',
    messaggio: 'Your message is too long — please keep it under 2,000 characters.',
    troppo_veloce: 'That was quick. Take a moment to check the fields, then send again.',
    troppe: 'You have already sent us a few requests. Give us a little time to answer, or message us on WhatsApp.',
    salvataggio: 'We could not save your request. Please try again, or message us on WhatsApp.',
    rete: 'Your request did not reach us. Check your connection and try again.',
  },
};

const DE: TestiModulo = {
  occhiello: 'Noch unsicher?',
  titolo: 'Sagen Sie uns, wie Ihr ',
  accento: 'Tag',
  titoloCoda: ' aussehen soll',
  sottotitolo:
    'Private Touren werden zusammengestellt, nicht aus einem Kalender gebucht. Schreiben Sie uns die Einzelheiten — ein echter Mensch antwortet, meist innerhalb weniger Stunden.',

  nome: 'Ihr Name',
  email: 'E-Mail',
  telefono: 'Telefon oder WhatsApp',
  tour: 'Leistung, die Sie interessiert',
  quando: 'Wunschtermin',
  persone: 'Wie viele Personen',
  messaggio: 'Was sollten wir wissen?',

  nomeEs: 'Anna Müller',
  emailEs: 'anna@example.com',
  telefonoEs: '+49 151 0100',
  tourEs: 'Siena & San Gimignano, ein Transfer — oder beschreiben Sie es uns',
  messaggioEs:
    'Abholung an unserem Hotel in Florenz, ein Rollstuhl muss in den Kofferraum, zurück bis 18 Uhr…',

  facoltativo: 'optional',
  invia: 'Anfrage senden',
  inviando: 'Wird gesendet…',
  pulsanteRapido: 'Schnellanfrage',
  chiudi: 'Schliessen',

  informativa:
    'Wir verwenden Ihren Namen und Ihre Kontaktdaten, um diese Anfrage zu beantworten und ' +
    'Ihr Angebot zu erstellen. Sie werden in unseren Systemen und in dem CRM gespeichert, ' +
    'aus dem unser Team antwortet, und werden nicht verkauft oder weitergegeben. Alle ' +
    'Einzelheiten, Speicherfristen und Ihre Rechte finden Sie in unserer ',
  informativaLink: 'Datenschutzerklärung',
  marketing:
    'Sie dürfen mir gelegentlich Angebote und Neuigkeiten zu Ihren Touren per E-Mail ' +
    'senden. (Freiwillig — jederzeit abbestellbar.)',

  fattoTitolo: 'Angekommen — vielen Dank.',
  fattoTesto:
    'Ihre Anfrage liegt bei unserem Team in Florenz. Ein echter Mensch meldet sich, meist innerhalb weniger Stunden. Eilig? Schreiben Sie uns auf WhatsApp.',

  errori: {
    nome: 'Bitte nennen Sie uns Ihren Namen, damit wir wissen, wem wir antworten.',
    email: 'Bitte prüfen Sie die E-Mail-Adresse — dorthin geht unsere Antwort.',
    telefono: 'Diese Telefonnummer scheint zu kurz. Lassen Sie das Feld leer, wenn Sie nur per E-Mail schreiben möchten.',
    quando: 'Bitte wählen Sie ein Datum ab heute, innerhalb der nächsten zwei Jahre.',
    persone: 'Wie viele Personen reisen mit? Eine Zahl zwischen 1 und 60.',
    messaggio: 'Ihre Nachricht ist zu lang — bitte höchstens 2.000 Zeichen.',
    troppo_veloce: 'Das ging schnell. Prüfen Sie die Felder kurz und senden Sie erneut.',
    troppe: 'Sie haben uns schon mehrere Anfragen geschickt. Geben Sie uns etwas Zeit zu antworten, oder schreiben Sie uns auf WhatsApp.',
    salvataggio: 'Wir konnten Ihre Anfrage nicht speichern. Bitte versuchen Sie es erneut oder schreiben Sie uns auf WhatsApp.',
    rete: 'Ihre Anfrage hat uns nicht erreicht. Prüfen Sie die Verbindung und versuchen Sie es erneut.',
  },
};

const IT: TestiModulo = {
  occhiello: 'Ancora indeciso?',
  titolo: 'Racconti com’è la sua ',
  accento: 'giornata',
  titoloCoda: ' ideale',
  sottotitolo:
    'I tour privati si costruiscono, non si prendono da un calendario. Ci scriva i dettagli: risponde una persona vera, di solito in poche ore.',

  nome: 'Il suo nome',
  email: 'Email',
  telefono: 'Telefono o WhatsApp',
  tour: 'Servizio che le interessa',
  quando: 'Data desiderata',
  persone: 'Quante persone',
  messaggio: 'Cosa dobbiamo sapere?',

  nomeEs: 'Giulia Rossi',
  emailEs: 'giulia@example.com',
  telefonoEs: '+39 333 0100',
  tourEs: 'Siena e San Gimignano, un transfer, oppure ce lo dica lei',
  messaggioEs:
    'Ritiro al nostro hotel a Firenze, una carrozzina da caricare nel bagagliaio, rientro entro le 18…',

  facoltativo: 'facoltativo',
  invia: 'Invia la richiesta',
  inviando: 'Invio in corso…',
  pulsanteRapido: 'Richiesta rapida',
  chiudi: 'Chiudi',

  informativa:
    'Usiamo il suo nome e i suoi recapiti per rispondere a questa richiesta e preparare il ' +
    'preventivo. Restano nei nostri sistemi e nel CRM da cui il nostro team risponde, e non ' +
    'vengono venduti né ceduti a terzi. Dettagli, tempi di conservazione e i suoi diritti ' +
    'sono nella nostra ',
  informativaLink: 'Privacy Policy',
  marketing:
    'Potete inviarmi via email offerte e novità sui vostri tour. ' +
    '(Facoltativo — può disiscriversi in qualsiasi momento.)',

  fattoTitolo: 'Ricevuta, grazie.',
  fattoTesto:
    'La sua richiesta è arrivata al nostro team a Firenze. Le risponderà una persona vera, di solito in poche ore. Ha fretta? Ci scriva su WhatsApp.',

  errori: {
    nome: 'Ci dica come si chiama, così sappiamo a chi stiamo rispondendo.',
    email: 'Controlli l’indirizzo email: è lì che arriva la nostra risposta.',
    telefono: 'Questo numero sembra troppo corto. Lo lasci vuoto se preferisce solo l’email.',
    quando: 'Scelga una data da oggi in avanti, entro i prossimi due anni.',
    persone: 'Quante persone viaggiano? Un numero da 1 a 60.',
    messaggio: 'Il messaggio è troppo lungo: resti entro 2.000 caratteri.',
    troppo_veloce: 'È andata troppo veloce. Ricontrolli i campi e riprovi a inviare.',
    troppe: 'Ci ha già inviato diverse richieste. Ci dia il tempo di risponderle, oppure ci scriva su WhatsApp.',
    salvataggio: 'Non siamo riusciti a salvare la richiesta. Riprovi, oppure ci scriva su WhatsApp.',
    rete: 'La richiesta non è arrivata. Controlli la connessione e riprovi.',
  },
};

const MODULO: Record<Locale, TestiModulo> = { en: EN, de: DE, it: IT };

/** Le stringhe del modulo nella lingua della pagina. Su una lingua che
 *  non esiste si ripiega sull'inglese invece di rompersi: una pagina in
 *  inglese e' un fastidio, una pagina bianca e' un cliente perso. */
export function testiModulo(locale: string): TestiModulo {
  return MODULO[isLocale(locale) ? locale : DEFAULT_LOCALE];
}
