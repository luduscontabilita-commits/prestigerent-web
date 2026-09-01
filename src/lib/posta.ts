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
  /* Il numero della richiesta, breve e leggibile al telefono. Nasce
     dall'identificativo della riga su Supabase: chi chiama lo detta e
     chi risponde ritrova la riga senza cercare per nome. */
  riferimento?: string | null;
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
/* 🔴 LA STORIA DELL'HTML SU QUESTE DUE EMAIL, IN ORDINE.
 *
 * 01/09/2026, mattina -- via l'HTML da tutte e due, su richiesta
 * esplicita: "ne' nell'invio verso usa e ne' nell'invio al cliente, NO
 * HTML". Motivo vero: quello che arrivava era impaginato male.
 *
 * 01/09/2026, pomeriggio -- torna sulla conferma al cliente, chiesta
 * meglio fatta, con grassetti e collegamenti.
 *
 * 01/09/2026, sera -- torna anche su questa, quella dell'ufficio. Il
 * motivo e' esattamente quello che era stato scritto qui come prezzo da
 * pagare, ed e' arrivato il conto: **il formato della risposta lo decide
 * il messaggio a cui si risponde**. Se arriva solo testo, "Rispondi"
 * apre una finestra di solo testo, e li' dentro un grassetto incollato
 * si appiattisce e un collegamento diventa una riga di caratteri. Chi
 * scrive a un cliente un preventivo con dentro i link ai tour non puo'
 * lavorare cosi'.
 *
 * QUINDI L'HTML C'E', MA E' FATTO IN UN MODO PRECISO, e va tenuto cosi':
 * soli paragrafi, nessuna tabella, nessuna immagine, nessuna larghezza
 * fissa, nessuno sfondo colorato. E' il motivo per cui la prima volta
 * era venuto male: un'email vestita da volantino, quando ci si risponde
 * sopra, trascina i suoi stili nella risposta e la fa sembrare rotta.
 * Un'email di soli paragrafi a schermo e' indistinguibile dal testo
 * semplice -- ma il programma di posta la conta come HTML, che e'
 * l'unica cosa che serve.
 *
 * Resta anche la versione in solo testo, sempre: chi legge da orologio o
 * da terminale vede quella. Le due partono insieme nello stesso
 * messaggio (`multipart/alternative`) e ognuno prende la sua.
 */

/* L'EMAIL PER L'UFFICIO, IMPAGINATA.
 *
 * Le stesse informazioni della versione in solo testo, nello stesso
 * ordine: prima quello che ha scritto il cliente, poi i suoi dati.
 * Niente di piu' -- questa la legge chi risponde, di corsa, cinquanta
 * volte al giorno.
 *
 * 🔴 GLI STILI SONO POCHISSIMI APPOSTA. Quello che c'e' qui dentro
 * ricompare citato dentro ogni risposta: piu' se ne mette, piu' la
 * risposta sembra strana. Nessun carattere dichiarato, nessuna misura,
 * nessun colore sul testo che si legge -- cosi' la risposta esce con il
 * carattere che ha scelto chi scrive, non con il nostro.
 */
function htmlAllUfficio(r: RichiestaDaAvvisare): string {
  const e = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const br = (t: string) => e(t).replace(/\r?\n/g, '<br>');

  const note = r.messaggio?.trim();
  const dati: string[] = [];
  const agg = (k: string, v: string | null | undefined) => {
    if (v) dati.push(`<div><strong>${e(k)}:</strong> ${v}</div>`);
  };

  agg('Ref', r.riferimento ? e(r.riferimento) : null);
  agg('Name', e(r.nome));
  /* I recapiti sono collegamenti: chi risponde deve poter chiamare dal
     telefono senza ricopiare il numero a mano. */
  agg('Email', `<a href="mailto:${e(r.email)}">${e(r.email)}</a>`);
  agg('Phone', r.telefono ? `<a href="tel:${e(r.telefono.replace(/[^\d+]/g, ''))}">${e(r.telefono)}</a>` : null);
  agg('Service', r.tour ? e(r.tour) : null);
  agg('Date', r.quando ? e(r.quando) : null);
  agg('Guests', r.persone != null ? String(r.persone) : null);
  agg('Language', e(r.lingua));
  agg('Page', r.pagina
    ? `<a href="https://prestigerent.com${e(r.pagina)}">prestigerent.com${e(r.pagina)}</a>`
    : null);

  return [
    '<div>',
    `<p>${note ? br(note) : '<em>(no notes)</em>'}</p>`,
    '<hr>',
    '<div>',
    dati.join(''),
    '</div>',
    '</div>',
  ].join('');
}

/* L'EMAIL AL CLIENTE, IMPAGINATA.
 *
 * 🔴 Anche quella per l'ufficio e' impaginata, dalla sera del
 * 01/09/2026: vedi la nota lunga piu' su. Le due si somigliano ma non
 * fanno lo stesso mestiere -- questa la legge un cliente che non ci
 * conosce, quella la legge chi risponde e ci risponde SOPRA.
 *
 * Qui invece la formattazione serve, ed e' stata chiesta: il testo ha due
 * voci che vanno staccate dal resto (Response Time, Our Commitment) e tre
 * recapiti su cui si deve poter cliccare. In solo testo diventava un muro
 * di righe uguali dove l'indirizzo email va copiato a mano.
 *
 * COME E' FATTO L'HTML. Stili scritti dentro ogni tag, nessun foglio di
 * stile e nessuna tabella: i programmi di posta buttano via il <style> in
 * testa e impaginano le tabelle ognuno a modo suo. Niente immagini e
 * niente loghi -- un'email che chiede di "scaricare le immagini" per
 * essere leggibile sembra pubblicita', e questa e' una risposta.
 */
function htmlAlCliente(r: RichiestaDaAvvisare, saluto: string): string {
  const e = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const P = 'margin:0 0 14px;';
  /* 🔴 I COLLEGAMENTI NON SI COLORANO A MANO.
     C'era l'arancione del marchio scritto dentro ogni <a>. Sembra
     coerente col sito e non lo e': in un'email un collegamento deve
     somigliare a un collegamento, e la gente riconosce il blu
     sottolineato senza pensarci. Un link arancione in mezzo al testo
     nero si legge come una parola in grassetto, e non ci si clicca.
     Senza `style` ogni programma di posta usa il suo colore standard,
     che e' anche quello che il lettore si aspetta li' dentro. */

  const righe: string[] = [];
  const dettaglio = [
    r.riferimento ? ['Reference', r.riferimento] : null,
    r.tour ? ['Service', r.tour] : null,
    r.quando ? ['Date', r.quando] : null,
    r.persone != null ? ['Guests', String(r.persone)] : null,
    r.telefono ? ['Phone', r.telefono] : null,
    ['Email', r.email],
  ].filter((x): x is string[] => x !== null);

  for (const [k, v] of dettaglio) {
    righe.push(`<div style="margin:0 0 4px"><strong>${e(k)}:</strong> ${e(v)}</div>`);
  }

  return [
    '<!doctype html><html><body style="margin:0;padding:0;background:#ffffff">',
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;',
    'color:#16130F;max-width:620px;margin:0 auto;padding:22px 18px">',

    `<p style="${P}">Dear ${e(saluto)},</p>`,

    `<p style="${P}">Thank you for contacting Prestige Rent in Italy. We have successfully `,
    'received your inquiry submitted through our website.</p>',

    `<p style="${P}">Our team is currently reviewing your travel details to curate a `,
    'tailored, transparent proposal for your inquiry.</p>',

    '<ul style="margin:0 0 14px;padding-left:22px">',
    '<li style="margin:0 0 10px"><strong>Response Time</strong>: due to the time zone ',
    'difference between Italy (CET/CEST) and your country, our reply could be delayed a ',
    'few hours. If you do not hear from us within 24 to 48 hours, please email us at ',
    `<a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>.<br>`,
    'If you need immediate assistance, please call us at ',
    `<a href="tel:+39055286059">+39 055 286 059</a> or send a WhatsApp to `,
    `<a href="https://wa.me/393338424047">+39 333 842 4047</a>.</li>`,
    '<li><strong>Our Commitment</strong>: every request is handled with individual care by ',
    'a dedicated travel specialist, to ensure executive-level service, flexible payment ',
    'options and seamless logistics.</li>',
    '</ul>',

    `<p style="${P}">We look forward to hosting you and crafting an unforgettable Italian `,
    'travel experience.</p>',

    `<p style="${P}">Warm regards,<br>Prestige Rent Team</p>`,

    /* Il riepilogo: chi scrive a tre operatori in una sera non ricorda
       quale data ha chiesto a chi. */
    '<div style="margin:22px 0 0;padding:14px 16px;background:#F7F5F2;border-radius:8px;',
    'font-size:14px;line-height:1.5">',
    '<div style="margin:0 0 8px;font-size:11px;font-weight:bold;letter-spacing:1px;',
    'text-transform:uppercase;color:#847B70">Summary of your request</div>',
    righe.join(''),
    r.messaggio && r.messaggio.trim()
      ? `<div style="margin:10px 0 0;padding-top:10px;border-top:1px solid #DED7CE"><strong>Your notes:</strong><br>${e(r.messaggio.trim()).replace(/\n/g, '<br>')}</div>`
      : '',
    '</div>',

    '<div style="margin:24px 0 0;padding-top:16px;border-top:1px solid #DED7CE;font-size:14px;line-height:1.5">',
    '<div style="font-weight:bold">Prestige Rent</div>',
    '<div style="font-weight:bold;font-style:italic">Tours, Transfers &amp; Experiences in Italy</div>',
    '<div style="margin-top:8px">Ph: +39 055 286 059<br>WhatsApp: +39 333 842 4047</div>',
    `<div><a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a><br>`,
    `<a href="https://prestigerent.com">www.prestigerent.com</a></div>`,
    '<div style="margin-top:8px;color:#847B70;font-style:italic">Tour Operator, Travel Agency &amp; Limo Company</div>',
    '<div style="color:#847B70">Company ID 571489 &mdash; VAT 05745220482</div>',
    '</div>',

    '</div></body></html>',
  ].join('');
}

export async function confermaAlCliente(r: RichiestaDaAvvisare) {
  const c = conf();
  if (!c) return { ok: false, errore: 'posta non configurata' };

  /* 🔴 IL NOME, SENZA FIGURACCE.
     Prima si prendeva sempre la prima parola: con un campo compilato male
     -- successo davvero il 01/09/2026, in una prova con le etichette
     incollate dentro i campi -- e' partita un'email che diceva
     "Hello Your,". Ora se la prima parola non sembra un nome si usa il
     campo intero, e se non sembra niente si saluta senza nome: meglio un
     "Dear guest" che un "Dear Your". */
  const nomeIntero = r.nome.trim().replace(/\s+/g, ' ');
  const primo = nomeIntero.split(' ')[0];
  const saluto =
    primo.length >= 2 && /^[\p{L}'-]+$/u.test(primo)
      ? primo
      : nomeIntero.length >= 2
        ? nomeIntero
        : 'guest';

  /* Il testo e' quello scritto dalla proprieta' il 01/09/2026, parola per
     parola. Due sole correzioni di grammatica, perche' questa email la
     legge ogni cliente: "if you will not hear" -> "if you do not hear",
     e "if your question need" -> "if you need". */
  const righe: string[] = [
    `Dear ${saluto},`,
    '',
    'Thank you for contacting Prestige Rent in Italy. We have successfully',
    'received your inquiry submitted through our website.',
    '',
    'Our team is currently reviewing your travel details to curate a tailored,',
    'transparent proposal for your inquiry.',
    '',
    'RESPONSE TIME',
    'Due to the time zone difference between Italy (CET/CEST) and your country,',
    'our reply could be delayed a few hours. If you do not hear from us within',
    '24 to 48 hours, please email us at usa@prestigerent.com',
    '',
    'If you need immediate assistance, please call us at +39 055 286 059 or',
    'send a WhatsApp to +39 333 842 4047',
    '',
    'OUR COMMITMENT',
    'Every request is handled with individual care by a dedicated travel',
    'specialist, to ensure executive-level service, flexible payment options',
    'and seamless logistics.',
    '',
    'We look forward to hosting you and crafting an unforgettable Italian',
    'travel experience.',
    '',
    'Warm regards,',
    '',
    'Prestige Rent Team',
  ];

  /* \U0001F534 IL RIEPILOGO, CHIESTO DALLA PROPRIETA' IL 01/09/2026.
     Prima si rimandava indietro solo il messaggio libero. Ma chi scrive a
     tre operatori in una sera non ricorda quale data ha chiesto a chi: il
     riepilogo e' la prova di cosa e' partito, e taglia il giro di email
     che comincia con "scusate, avevo scritto il 25 o il 26?".
     Il riferimento sta sopra, da solo: e' la cosa che si detta al
     telefono. */
  const riepilogo = [
    r.riferimento ? `Your reference: ${r.riferimento}` : null,
    '',
    'SUMMARY OF YOUR REQUEST',
    r.tour ? `Service: ${r.tour}` : null,
    r.quando ? `Date: ${r.quando}` : null,
    r.persone != null ? `Guests: ${r.persone}` : null,
    r.telefono ? `Phone: ${r.telefono}` : null,
    `Email: ${r.email}`,
  ].filter((x): x is string => x !== null);

  righe.push('', '───────────────', ...riepilogo);

  if (r.messaggio && r.messaggio.trim()) {
    righe.push('', 'Your notes:', r.messaggio.trim());
  }

  /* LA FIRMA, come la vuole la proprieta'. La licenza e la partita IVA non
     sono pedanteria: sono cio' che distingue un operatore autorizzato da un
     intermediario, ed e' la prima cosa che guarda un cliente che ha appena
     scritto a uno sconosciuto lasciandogli il suo numero. */
  righe.push(
    '',
    '--',
    'Prestige Rent',
    'Tours, Transfers & Experiences in Italy',
    '',
    'Ph:        +39 055 286 059',
    'WhatsApp:  +39 333 842 4047',
    'Email:     usa@prestigerent.com',
    'Web:       www.prestigerent.com',
    '',
    `Tour Operator, Travel Agency & Limo Company - since ${ANNO_FONDAZIONE}`,
    'Company ID 571489 - VAT 05745220482'
  );

  try {
    const t = apri(c);
    await t.sendMail({
      from: `Prestige Rent <${c.user}>`,
      to: r.email,
      replyTo: c.a,
      /* 🔴 L'OGGETTO NON PORTA PIU' DENTRO IL CAMPO LIBERO.
         Ci finiva il testo del servizio cosi' com'era scritto, e con un
         campo compilato male e' partito un
         "We received your request - Service you are interested in optional".
         L'oggetto lo leggono tutti prima di aprire: deve essere sempre lo
         stesso e sempre giusto. Il servizio richiesto sta nel corpo. */
      /* L'oggetto e' quello scritto dalla proprieta'. Il numero della
         richiesta non ci va: sta nel riepilogo, dentro il messaggio.
         Un oggetto sempre uguale si riconosce a colpo d'occhio nella
         posta, e questo lo leggono clienti che non ci conoscono. */
      subject: 'Thank you for your request. Prestige Rent Italy',
      text: righe.join('\n'),
      html: htmlAlCliente(r, saluto),
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
    `New request${r.riferimento ? ` ${r.riferimento}` : ''} — ${r.nome}` +
    (r.tour ? ` · ${r.tour.replace(/\s+/g, ' ').slice(0, 60)}` : '') +
    (r.persone ? ` · ${r.persone} pax` : '');

  const righe = [
    r.messaggio?.trim() || '(no notes)',
    '',
    '───────────────',
    r.riferimento ? `Ref: ${r.riferimento}` : null,
    `${r.nome} · ${r.email}${r.telefono ? ` · ${r.telefono}` : ''}`,
    r.tour ? `Service: ${r.tour}` : null,
    r.quando ? `Date: ${r.quando}` : null,
    r.persone != null ? `Guests: ${r.persone}` : null,
    `Language: ${r.lingua}`,
    r.pagina ? `Page: https://prestigerent.com${r.pagina}` : null,
    /* La riga sul consenso alle comunicazioni non c'e' piu': da quando
       la casella e' stata tolta dal modulo e' sempre "no", e una riga
       che dice sempre la stessa cosa non e' informazione -- e' rumore
       in un'email che si legge di corsa. Il dato resta in tabella. */
    /* Il filtro con la guardia e non `Boolean`: cosi' il tipo resta
       `string[]` e il convertitore in HTML lo accetta senza forzature. */
  ].filter((x): x is string => typeof x === 'string' && x !== '');

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
      /* 🔴 QUESTA RIGA E' IL MOTIVO PER CUI "RISPONDI" FUNZIONA.
         Il formato della risposta lo decide il messaggio a cui si
         risponde: senza `html` qui, chi preme Rispondi si ritrova una
         finestra di solo testo dove i grassetti si appiattiscono e i
         collegamenti diventano righe di caratteri. */
      html: htmlAllUfficio(r),
      textEncoding: 'quoted-printable',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : String(e) };
  }
}
