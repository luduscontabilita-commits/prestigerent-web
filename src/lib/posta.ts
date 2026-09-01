import nodemailer from 'nodemailer';
import { ANNO_FONDAZIONE } from './anni';

/* L'EMAIL CHE AVVISA CHE E' ARRIVATA UNA RICHIESTA.
 *
 * ── PERCHE' ESISTE ──────────────────────────────────────────────────
 * Fino al 28 agosto il modulo funzionava, salvava su Supabase, creava il
 * contatto nel CRM -- e non avvisava nessuno. La pagina prometteva "you
 * will hear from a real person, usually within a few hours", e la
 * richiesta restava in una tabella che non ha nemmeno una schermata nel
 * pannello. La prova sta nella tabella stessa: una riga del 27 agosto
 * diceva "PROVA, verifico se la richiesta arriva a qualcuno", ed era
 * ancora in stato `nuova` il giorno dopo.
 *
 * Un modulo che accetta, ringrazia e non avvisa e' peggio di un modulo
 * rotto: rotto se ne accorge qualcuno.
 *
 * ── DA DOVE PARTE, E PERCHE' NON DALL'HOSTING ───────────────────────
 * Da `usa@prestigerent.com` attraverso Microsoft 365, cioe' la stessa
 * casella e lo stesso server da cui si risponde. Mittente e destinatario
 * coincidono: la consegna e' interna e non attraversa niente.
 *
 * La prima strada era l'SMTP dell'hosting, e non funziona: quel server
 * risponde `550 No Such User Here` a qualunque indirizzo
 * @prestigerent.com. Il motivo e' una configurazione che non torna --
 * gli MX del dominio puntano a Microsoft
 * (`prestigerent-com.mail.protection.outlook.com`), ma cPanel e'
 * impostato come se la posta fosse sua, ha una casella sola e un
 * indirizzo predefinito che fallisce.
 *
 * Vale la pena saperlo perche' spiega un'altra cosa: quel server non ha
 * MAI potuto avvisare nessuno. Probabilmente e' il motivo per cui le
 * notifiche dei moduli di WordPress non sono mai arrivate in tutti
 * questi anni. La configurazione dell'hosting resta da sistemare, ma
 * adesso non e' piu' sulla strada di niente.
 *
 * ── SE FALLISCE, LA RICHIESTA NON SI PERDE ──────────────────────────
 * Questa funzione viene chiamata DOPO che la riga e' gia' su Supabase, e
 * non fa fallire la risposta al visitatore. Se il server di posta e'
 * giu', il cliente vede comunque "grazie" e il dato resta salvato: e'
 * l'avviso che manca, non la richiesta.
 */

export type RichiestaDaAvvisare = {
  nome: string;
  email: string;
  telefono: string | null;
  tour: string | null;
  quando: string | null;
  persone: number | null;
  messaggio: string | null;
  pagina: string | null;
  lingua: string;
  marketing: boolean;
};

function conf() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const a = process.env.RICHIESTE_A;
  if (!host || !user || !pass || !a) return null;
  return { host, user, pass, a, porta: Number(process.env.SMTP_PORT ?? 465) };
}

/* UNA CONNESSIONE SOLA, RIUSATA.
 *
 * Le due email -- l'avviso all'ufficio e la conferma al cliente -- prima
 * aprivano ognuna la propria connessione a Microsoft, con handshake TLS
 * e accesso da capo. Sono circa tre secondi buttati per il solo fatto di
 * presentarsi due volte allo stesso portiere.
 *
 * `pool: true` tiene la connessione aperta e la riusa: la seconda email
 * parte sulla stessa. Il trasporto vive quanto la funzione, che su
 * Vercel dura poco -- non e' un oggetto da tenere per sempre, e infatti
 * non lo si conserva fra una richiesta e l'altra. */
let trasporto: nodemailer.Transporter | null = null;

function apri(c: { host: string; porta: number; user: string; pass: string }) {
  if (trasporto) return trasporto;
  trasporto = nodemailer.createTransport({
    host: c.host,
    port: c.porta,
    secure: c.porta === 465,
    requireTLS: c.porta !== 465,
    auth: { user: c.user, pass: c.pass },
    pool: true,
    maxConnections: 1,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return trasporto;
}

export function postaConfigurata() {
  return conf() != null;
}

/* ── LA CONFERMA A CHI HA SCRITTO ──────────────────────────────────────
 *
 * Non e' cortesia: evita la richiesta doppia. Chi scrive dagli Stati
 * Uniti alle due di notte ora italiana non sa se il modulo ha
 * funzionato, e senza una riga di conferma meta' riscrive il giorno dopo
 * -- o va su Viator, dove la conferma arriva sempre.
 *
 * SOLO TESTO, e non e' pigrizia. Una conferma vestita da newsletter
 * finisce nello spam proprio nel momento in cui non ci si puo'
 * permettere che sparisca; e il testo semplice si vede uguale su ogni
 * programma di posta, orologio compreso, senza caratteri che si rompono.
 *
 * NESSUNA PROMESSA DI ORARIO. Non "entro due ore": se poi si risponde in
 * sei, l'avete promesso voi. "Di solito in poche ore" e' vero e non
 * impegna.
 *
 * SI PUO' RISPONDERE: il `replyTo` e' la casella dell'ufficio, quindi se
 * il cliente risponde a questa email finisce dove qualcuno la legge.
 *
 * Se fallisce non succede niente di grave -- la richiesta e' salvata e
 * l'ufficio gia' avvisato -- ma si scrive nei log, perche' una conferma
 * che non arriva produce la stessa richiesta due volte.
 */
export async function confermaAlCliente(r: RichiestaDaAvvisare) {
  const c = conf();
  if (!c) return { ok: false, errore: 'posta non configurata' };

  const nomeBreve = r.nome.trim().split(' ')[0];
  const righe: string[] = [
    `Hello ${nomeBreve},`,
    '',
    r.tour
      ? `we have received your request about ${r.tour}.`
      : 'we have received your request.',
    'A real person from our office in Florence will get back to you,',
    'usually within a few hours.',
    '',
    'In a hurry? Write to us on WhatsApp: +39 333 842 4047',
  ];

  if (r.messaggio && r.messaggio.trim()) {
    righe.push('', 'This is what you sent us:', '', r.messaggio.trim());
  }

  /* LA FIRMA. I dati sono quelli veri della scheda azienda, gli stessi
     del piede del sito e dei dati strutturati: telefono dell'ufficio,
     WhatsApp, indirizzo, partita IVA e licenza. La licenza non e'
     pedanteria -- e' cio' che distingue un operatore autorizzato da un
     intermediario, ed e' la prima cosa che guarda un cliente che ha
     appena scritto a uno sconosciuto lasciandogli il suo numero. */
  righe.push(
    '',
    '--',
    `Prestige Rent S.R.L. - Tours & Transfers in Italy since ${ANNO_FONDAZIONE}`,
    'Via Della Saggina 98, 50145 Florence, Italy',
    '',
    'Office     +39 055 286059',
    'WhatsApp   +39 333 842 4047',
    'Email      usa@prestigerent.com',
    'Web        https://prestigerent.com',
    '',
    'VAT IT05745220482 - Tuscany Region licensed travel agency and tour operator',
    'Emergency contacts are on your confirmation voucher, answered 24/7.'
  );

  try {
    const t = apri(c);
    await t.sendMail({
      from: `Prestige Rent <${c.user}>`,
      to: r.email,
      replyTo: c.a,
      subject: r.tour
        ? `We received your request - ${r.tour}`
        : 'We received your request - Prestige Rent',
      text: righe.join('\n'),
      /* dichiarato a mano: senza, un accento o un trattino lungo scritto
         dal cliente arriva come un punto interrogativo dentro un rombo */
      textEncoding: 'quoted-printable',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : String(e) };
  }
}

export async function avvisaRichiesta(r: RichiestaDaAvvisare) {
  const c = conf();
  if (!c) return { ok: false, errore: 'posta non configurata' };

  /* 🔴 IN INGLESE, PERCHE' IN INGLESE LAVORA CHI LA LEGGE.
     Fino al 01/09/2026 questa email era tutta in italiano -- oggetto
     compreso -- e finisce nella casella di chi risponde ai clienti, che
     l'inglese ce l'ha come lingua di lavoro. Segnalato dalla proprieta'
     come "strane scritte". Il testo per il cliente era gia' inglese: era
     rimasta indietro solo la nostra.

     L'oggetto porta gia' tutto quello che serve per decidere se aprire
     adesso o fra un'ora: chi, che servizio, quante persone. Chi risponde
     guarda l'elenco della posta, non apre ogni messaggio. */
  const oggetto =
    `New request — ${r.nome}` +
    (r.tour ? ` · ${r.tour.replace(/\s+/g, ' ').slice(0, 60)}` : '') +
    (r.persone ? ` · ${r.persone} pax` : '');

  const righe = [
    r.messaggio?.trim() || '(no notes)',
    '',
    '───────────────',
    `${r.nome} · ${r.email}${r.telefono ? ` · ${r.telefono}` : ''}`,
    r.tour ? `Service: ${r.tour}` : null,
    r.quando ? `Date: ${r.quando}` : null,
    r.persone != null ? `Guests: ${r.persone}` : null,
    `Language: ${r.lingua}`,
    r.pagina ? `Page: https://prestigerent.com${r.pagina}` : null,
    `Marketing consent: ${r.marketing ? 'yes' : 'no'}`,
  ].filter(Boolean);

  try {
    const t = apri(c);

    await t.sendMail({
      from: `Prestige Rent website <${c.user}>`,
      to: c.a,
      /* Si risponde direttamente al cliente premendo "Rispondi": nessuno
         deve copiare l'indirizzo a mano, ed e' il gesto che fa guadagnare
         i minuti che contano. */
      replyTo: `${r.nome} <${r.email}>`,
      subject: oggetto,
      text: righe.join('\n'),
      textEncoding: 'quoted-printable',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : String(e) };
  }
}
