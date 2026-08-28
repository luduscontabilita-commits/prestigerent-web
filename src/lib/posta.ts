import nodemailer from 'nodemailer';

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
 * ── DA DOVE PARTE ───────────────────────────────────────────────────
 * Da una casella dedicata, `sito@prestigerent.com`, creata apposta.
 * Non da `usa@prestigerent.com`: per usare quella servirebbe la sua
 * password, e cambiarla romperebbe il client di posta di chi la legge
 * tutti i giorni.
 *
 * ── DOVE ARRIVA, E PERCHE' NON A usa@ ───────────────────────────────
 * 🔴 Il server dell'hosting NON riesce a mandare email a nessun
 * indirizzo @prestigerent.com. Misurato: `550 No Such User Here`.
 *
 * Il motivo e' una configurazione che non torna: gli MX del dominio
 * puntano a Microsoft 365 (`prestigerent-com.mail.protection.outlook.com`),
 * ma cPanel e' impostato come se la posta fosse locale, ha una sola
 * casella e un indirizzo predefinito che fallisce. Quindi ogni email che
 * quel server prova a mandare a un indirizzo del dominio rimbalza.
 * Probabilmente e' anche il motivo per cui le notifiche dei moduli di
 * WordPress non sono mai arrivate a nessuno.
 *
 * Sistemarlo vuol dire cambiare l'instradamento della posta sull'hosting:
 * si fa, ma non di corsa e non senza avvisare chi la usa. Nel frattempo
 * la destinazione e' una variabile d'ambiente (`RICHIESTE_A`): il giorno
 * che la posta e' a posto si cambia li', senza toccare una riga.
 *
 * Verso l'esterno invece funziona: provato, l'email arriva.
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

export function postaConfigurata() {
  return conf() != null;
}

export async function avvisaRichiesta(r: RichiestaDaAvvisare) {
  const c = conf();
  if (!c) return { ok: false, errore: 'posta non configurata' };

  /* L'oggetto porta gia' tutto quello che serve per decidere se aprire
     adesso o fra un'ora: chi, che tour, quante persone. Chi risponde
     guarda l'elenco della posta, non apre ogni messaggio. */
  const oggetto =
    `Richiesta dal sito — ${r.nome}` +
    (r.tour ? ` · ${r.tour}` : '') +
    (r.persone ? ` · ${r.persone} pax` : '');

  const righe = [
    r.messaggio?.trim() || '(nessun messaggio scritto)',
    '',
    '───────────────',
    `${r.nome} · ${r.email}${r.telefono ? ` · ${r.telefono}` : ''}`,
    r.tour ? `tour: ${r.tour}` : null,
    r.quando ? `data desiderata: ${r.quando}` : null,
    r.persone != null ? `persone: ${r.persone}` : null,
    `lingua: ${r.lingua}`,
    r.pagina ? `pagina: https://prestigerent.com${r.pagina}` : null,
    `consenso a ricevere comunicazioni: ${r.marketing ? 'sì' : 'no'}`,
  ].filter(Boolean);

  try {
    const t = nodemailer.createTransport({
      host: c.host,
      port: c.porta,
      secure: c.porta === 465,
      auth: { user: c.user, pass: c.pass },
      /* Il certificato del server di posta e' intestato all'hosting, non
         al dominio: rifiutarlo vorrebbe dire non mandare mai niente. La
         connessione resta cifrata, non e' verificato il nome. */
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await t.sendMail({
      from: `Sito Prestige Rent <${c.user}>`,
      to: c.a,
      /* Si risponde direttamente al cliente premendo "Rispondi": nessuno
         deve copiare l'indirizzo a mano, ed e' il gesto che fa guadagnare
         i minuti che contano. */
      replyTo: `${r.nome} <${r.email}>`,
      subject: oggetto,
      text: righe.join('\n'),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : String(e) };
  }
}
