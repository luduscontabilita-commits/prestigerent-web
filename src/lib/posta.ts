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
      /* 465 e' cifrato dall'inizio; 587 -- quello di Microsoft -- parte in
         chiaro e si cifra subito dopo con STARTTLS. `requireTLS` fa
         fallire l'invio se quel passaggio non riesce, invece di mandare
         una password in chiaro. */
      secure: c.porta === 465,
      requireTLS: c.porta !== 465,
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    /* ── L'EMAIL COME LA LEGGE CHI RISPONDE ────────────────────────────
     *
     * Prima era un elenco separato da trattini: ci si trovava dentro, ma
     * bisognava leggerlo tutto per capire di cosa si trattava. Chi
     * risponde ne apre venti al giorno dal telefono e deve capire in tre
     * secondi CHI e' e COSA vuole.
     *
     * DELIBERATAMENTE SENZA GRAFICA: niente fasce colorate, niente
     * pulsanti, niente immagini. Un'email interna vestita da newsletter
     * insospettisce i filtri -- e questa parte da un indirizzo aziendale
     * e arriva a se stesso, che e' gia' un percorso su cui i filtri sono
     * severi. Qui c'e' solo tipografia: grassetto, grigi, un filetto.
     * Si legge in tre secondi e non somiglia a una pubblicita'.
     *
     * Stile in linea e non in <style>: meta' dei programmi di posta
     * butta via il foglio di stile, e Outlook non conosce flex.
     *
     * `text` resta e non e' un residuo: e' quello che leggono le
     * anteprime, gli orologi e chi ha le immagini spente. */
    const esc = (x: string) =>
      x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const riga = (etichetta: string, valore: string | null) =>
      valore
        ? '<tr><td style="padding:4px 16px 4px 0;color:#777;font-size:13px;' +
          'white-space:nowrap;vertical-align:top">' + etichetta + '</td>' +
          '<td style="padding:4px 0;color:#111;font-size:14px">' + esc(valore) + '</td></tr>'
        : '';

    const html =
      '<!doctype html><html><body style="margin:0;padding:20px;background:#ffffff;' +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;" +
      'color:#111;font-size:15px;line-height:1.6">' +
      '<div style="max-width:560px">' +

      '<div style="font-size:17px;font-weight:700">' + esc(r.nome) + '</div>' +
      '<div style="margin-top:3px;color:#555;font-size:14px">' +
      '<a href="mailto:' + esc(r.email) + '" style="color:#111">' + esc(r.email) + '</a>' +
      (r.telefono
        ? ' &middot; <a href="tel:' + esc(r.telefono.replace(/\s/g, '')) +
          '" style="color:#111">' + esc(r.telefono) + '</a>'
        : '') +
      '</div>' +

      (r.messaggio && r.messaggio.trim()
        ? '<div style="margin-top:16px;padding-left:14px;border-left:2px solid #ddd;' +
          'white-space:pre-wrap">' + esc(r.messaggio.trim()) + '</div>'
        : '<div style="margin-top:16px;color:#777;font-style:italic">Nessun messaggio scritto.</div>') +

      '<table cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse">' +
      riga('Servizio', r.tour ?? null) +
      riga('Data', r.quando ?? null) +
      riga('Persone', r.persone != null ? String(r.persone) : null) +
      riga('Lingua', r.lingua) +
      riga('Comunicazioni', r.marketing ? 'acconsente' : 'non acconsente') +
      '</table>' +

      '<div style="margin-top:20px;padding-top:12px;border-top:1px solid #eee;' +
      'color:#999;font-size:12px">' +
      'Rispondendo a questa email scrivi direttamente a ' + esc(r.nome) + '.' +
      (r.pagina
        ? '<br>Richiesta inviata da prestigerent.com' + esc(r.pagina)
        : '') +
      '</div>' +

      '</div></body></html>';

    await t.sendMail({
      from: `Sito Prestige Rent <${c.user}>`,
      to: c.a,
      /* Si risponde direttamente al cliente premendo "Rispondi": nessuno
         deve copiare l'indirizzo a mano, ed e' il gesto che fa guadagnare
         i minuti che contano. */
      replyTo: `${r.nome} <${r.email}>`,
      subject: oggetto,
      text: righe.join('\n'),
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : String(e) };
  }
}
