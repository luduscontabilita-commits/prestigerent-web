'use server';

import { revalidatePath } from 'next/cache';
import { chiAgisce, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import { clientSegreto, generaPassword } from '@/lib/chiave-segreta';
import { LOCALE_CODES } from '@/lib/locales';
import { invia } from '@/lib/posta';
import { confronta, riscriviImporti } from '@/lib/prezzi-tab';
import { opzioniDi } from '@/lib/regiondo-listino';
import { creaLinkPartner, DURATA_LINK_GIORNI } from '@/lib/link-partner';

/* LE AZIONI DEL LISTINO, TUTTE DI GESTIONE.
 *
 * 🔴 OGNUNA COMINCIA CON `chiAgisce(RUOLI_GESTIONE)`, prima di leggere un
 * solo parametro. Una server action e' una POST raggiungibile col suo
 * identificativo senza passare da nessuna pagina: un utente del listino
 * -- che e' autenticato -- potrebbe trovarne il nome nel bundle e
 * chiamarla a mano. Il ruolo `listino` NON e' in RUOLI_GESTIONE.
 *
 * Le scritture su `tour_content` passano dalla sessione dell'admin, cioe'
 * dalla policy `e_admin()`: anche se qui mancasse un controllo, il
 * database rifiuterebbe. Le scritture su Supabase Auth (creare un utente,
 * cambiargli la password) vogliono la chiave segreta, e li' il controllo
 * del ruolo e' l'UNICA difesa -- come in src/app/admin/utenti/azioni.ts. */

export type Esito = { ok: boolean; errore?: string };

const LOCALE = 'en';

/* ═══════════════════════════════════════════════════════════════════
   SINCRONIZZARE LE TAB PRICES CON REGIONDO
   ═══════════════════════════════════════════════════════════════════

   Solo su richiesta, dopo che l'admin ha visto la tabella prima/dopo in
   /admin/partners/sincronizza/. Si cambiano SOLO LE CIFRE (src/lib/
   prezzi-tab.ts): testo, note e formattazione restano quelli scritti.

   🔴 SI RILEGGE TUTTO QUI, NON SI FIDA DELLA TABELLA. Fra quando la
   pagina e' stata disegnata e quando si preme il pulsante, su Regiondo
   un prezzo puo' essere cambiato di nuovo, o qualcuno puo' aver toccato
   la tab. Quindi l'azione riceve solo gli slug, rilegge Regiondo senza
   cache e la tab dal database, e ricalcola. Una tab che nel frattempo e'
   diventata «non abbinabile» viene saltata e detta. */

export type EsitoSync = Esito & {
  fatte?: { slug: string; importi: number }[];
  saltate?: { slug: string; motivo: string }[];
};

type Blocchi = { tabs?: Record<string, string> } & Record<string, unknown>;

/** La chiave con cui la tab sta nel database: su WordPress non era
 *  sempre maiuscola, e riscriverla con un nome diverso farebbe comparire
 *  una seconda tab accanto alla prima. */
function chiaveTab(tabs: Record<string, string>): string | null {
  return ['PRICES', 'Prices', 'PREZZI'].find((k) => typeof tabs[k] === 'string') ?? null;
}

function rinnovaPagina(slug: string) {
  /* I percorsi INTERNI, sotto /[locale]/: l'inglese senza prefisso e'
     una riscrittura del proxy -- come in src/app/admin/foto/azioni.ts. */
  for (const l of LOCALE_CODES) revalidatePath(`/${l}/tour/${slug}`);
}

export async function sincronizzaTab(slugs: string[]): Promise<EsitoSync> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };
  if (!Array.isArray(slugs) || !slugs.length) return { ok: false, errore: 'Nessuna pagina scelta.' };

  const sb = await supabaseServer();
  const fatte: { slug: string; importi: number }[] = [];
  const saltate: { slug: string; motivo: string }[] = [];

  for (const slug of [...new Set(slugs.map(String))].slice(0, 200)) {
    const { data: tour } = await sb.from('tours').select('id, regiondo_sku').eq('slug', slug).maybeSingle();
    if (!tour?.regiondo_sku) {
      saltate.push({ slug, motivo: 'Tour senza prodotto Regiondo.' });
      continue;
    }
    const { data: riga } = await sb
      .from('tour_content')
      .select('blocks')
      .eq('tour_id', tour.id)
      .eq('locale', LOCALE)
      .maybeSingle();
    const blocks = (riga?.blocks ?? null) as Blocchi | null;
    const tabs = blocks?.tabs ?? {};
    const chiave = chiaveTab(tabs);
    if (!blocks || !chiave) {
      saltate.push({ slug, motivo: 'La pagina non ha una tab PRICES.' });
      continue;
    }

    const varianti = await opzioniDi(tour.regiondo_sku, true);
    if (!varianti) {
      saltate.push({ slug, motivo: 'Regiondo non ha risposto: riprova fra poco.' });
      continue;
    }

    const prima = tabs[chiave];
    const c = confronta(prima, varianti);
    if (c.stato === 'non_abbinabile') {
      saltate.push({ slug, motivo: c.motivo });
      continue;
    }
    if (c.stato === 'uguale') continue;

    const dopo = riscriviImporti(prima, c.righe);
    const importi = c.righe.filter((r) => r.importo.valore !== r.nuovo).length;

    const { error: e1 } = await sb
      .from('tour_content')
      .update({ blocks: { ...blocks, tabs: { ...tabs, [chiave]: dopo } } })
      .eq('tour_id', tour.id)
      .eq('locale', LOCALE);
    if (e1) {
      saltate.push({ slug, motivo: `Non ho potuto scrivere: ${e1.message}` });
      continue;
    }

    /* La versione di prima si conserva DOPO che la scrittura e' riuscita:
       al contrario, una scrittura fallita lascerebbe nello storico una
       modifica mai avvenuta, e «Annulla» la «annullerebbe». */
    const { error: e2 } = await sb.from('prezzi_tab_storico').insert({
      tour_slug: slug,
      html_prima: prima,
      html_dopo: dopo,
      importi,
      fatto_da: agente.io.id,
    });
    fatte.push({ slug, importi });
    if (e2) saltate.push({ slug, motivo: `Aggiornata, ma la versione di prima non è stata conservata: ${e2.message}` });

    rinnovaPagina(slug);
  }

  /* 🔴 NIENTE `revalidatePath` SULLE PAGINE DEL PANNELLO. Il 12/10/2026,
     nella prova completa, «Approva» lo chiamava su questa stessa pagina e
     il riquadro con l'esito (e la password!) spariva appena comparso: il
     nuovo rendering si portava via lo stato del componente. Le pagine del
     pannello sono `force-dynamic` e il componente chiama gia'
     `router.refresh()`: non serve. Le pagine PUBBLICHE dei tour invece si
     rinnovano (sopra, `rinnovaPagina`), ed e' l'unico motivo per cui
     queste due azioni toccano la cache. */
  return { ok: true, fatte, saltate };
}

/** Rimette la tab com'era prima dell'ultima sincronizzazione.
 *
 *  Solo se nel frattempo nessuno l'ha cambiata: se la tab non e' piu'
 *  quella scritta dalla sincronizzazione, rimettere la versione vecchia
 *  cancellerebbe in silenzio la modifica fatta dopo. */
export async function annullaSincronizzazione(slug: string): Promise<Esito> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const sb = await supabaseServer();
  const { data: ultima } = await sb
    .from('prezzi_tab_storico')
    .select('id, html_prima, html_dopo')
    .eq('tour_slug', slug)
    .eq('annullata', false)
    .order('fatto_il', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ultima) return { ok: false, errore: 'Non c’è nessuna sincronizzazione da annullare per questa pagina.' };

  const { data: tour } = await sb.from('tours').select('id').eq('slug', slug).maybeSingle();
  if (!tour) return { ok: false, errore: 'Tour non trovato.' };
  const { data: riga } = await sb
    .from('tour_content')
    .select('blocks')
    .eq('tour_id', tour.id)
    .eq('locale', LOCALE)
    .maybeSingle();
  const blocks = (riga?.blocks ?? null) as Blocchi | null;
  const tabs = blocks?.tabs ?? {};
  const chiave = chiaveTab(tabs);
  if (!blocks || !chiave) return { ok: false, errore: 'La pagina non ha più una tab PRICES.' };
  if (tabs[chiave] !== ultima.html_dopo) {
    return { ok: false, errore: 'La tab è stata cambiata dopo la sincronizzazione: non la rimetto com’era per non cancellare quella modifica.' };
  }

  const { error } = await sb
    .from('tour_content')
    .update({ blocks: { ...blocks, tabs: { ...tabs, [chiave]: ultima.html_prima } } })
    .eq('tour_id', tour.id)
    .eq('locale', LOCALE);
  if (error) return { ok: false, errore: error.message };

  await sb.from('prezzi_tab_storico').update({ annullata: true }).eq('id', ultima.id);
  rinnovaPagina(slug);
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════════
   LE RICHIESTE DI ACCESSO ALL'AREA PARTNER
   ═══════════════════════════════════════════════════════════════════

   Chi chiede l'accesso da prestigerent.com/partners/ lascia una riga in
   `richieste_listino` e NON ha ancora un utente: l'utente nasce qui,
   quando l'admin approva. Cosi' una registrazione non approvata non
   lascia niente in Supabase Auth -- che e' condiviso col pannello TURNI,
   e dove il trigger `crea_profilo()` rifiuta chi non e' in
   `autorizzati`. */

const INDIRIZZO_PARTNERS = 'https://prestigerent.com/partners/';

/** L'email con l'accesso. Per decisione della proprieta' (12/10/2026)
 *  parla di «Partners area», non di «price list», e comincia con il LINK
 *  per entrare senza scrivere niente (src/lib/link-partner.ts, 14
 *  giorni). Sotto restano email e password: servono quando il link e'
 *  scaduto, o da un altro dispositivo. */
function letteraAccesso(nome: string, email: string, password: string, nuova: boolean): string {
  const link = creaLinkPartner(email);
  return (
    `Dear ${nome || 'partner'},\n\n` +
    (nuova
      ? 'here are your new access details for the Prestige Rent Partners area. The old password no longer works.\n\n'
      : 'welcome! Your access to the Prestige Rent Partners area has been approved.\n\n') +
    (link
      ? `Enter the Partners area directly, no password needed (link valid for ${DURATA_LINK_GIORNI} days):\n${link}\n\n`
      : '') +
    `You can always sign in at ${INDIRIZZO_PARTNERS}\n` +
    `Email: ${email}\n` +
    `Password: ${password}\n\n` +
    'In the Partners area you will find our price list, with live prices for every service and option, and our fleet.\n' +
    'If you lose your password, reply to this email and we will send you a new one.\n\n' +
    'Prestige Rent\nusa@prestigerent.com · +39 055 286059'
  );
}

export type EsitoApprova = Esito & {
  email?: string;
  password?: string;
  /** false se l'email all'utente non e' partita: la password va
   *  consegnata a mano, e il pannello la mostra apposta */
  inviata?: boolean;
};

type Richiesta = {
  id: string;
  nome: string;
  cognome: string;
  azienda: string | null;
  email: string;
  stato: string;
};

/** L'ORDINE E' OBBLIGATO, come in `creaGuida()`: prima la riga in
 *  `autorizzati`, poi l'utente in Supabase Auth -- il trigger
 *  `crea_profilo()` rifiuta chi non e' in `autorizzati`. Se la creazione
 *  fallisce la riga si toglie, o il secondo tentativo direbbe «gia'
 *  abilitato» senza che esista nessun utente. */
export async function approvaRichiesta(id: string): Promise<EsitoApprova> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const segreto = clientSegreto();
  if (!segreto) return { ok: false, errore: 'Manca SUPABASE_SECRET_KEY: non posso creare utenti.' };

  const sb = await supabaseServer();
  const { data } = await sb
    .from('richieste_listino')
    .select('id, nome, cognome, azienda, email, stato')
    .eq('id', id)
    .maybeSingle();
  const r = data as Richiesta | null;
  if (!r) return { ok: false, errore: 'Richiesta non trovata.' };
  if (r.stato !== 'in_attesa') return { ok: false, errore: 'Questa richiesta è già stata decisa.' };

  const email = r.email.trim().toLowerCase();
  const { data: gia } = await sb.from('autorizzati').select('email, ruolo').eq('email', email).maybeSingle();
  if (gia) {
    return { ok: false, errore: `L’indirizzo ${email} può già entrare (ruolo «${(gia as { ruolo: string }).ruolo}»).` };
  }

  const nome = `${r.nome} ${r.cognome}`.trim();
  const { error: e1 } = await sb.from('autorizzati').insert({
    email,
    /* COSTANTE, mai dal client: chi chiamasse l'azione a mano non deve
       potersi creare un admin. */
    ruolo: 'listino',
    nome,
    contatto: r.azienda,
  });
  if (e1) return { ok: false, errore: `Non ho potuto abilitare l’indirizzo: ${e1.message}` };

  const password = generaPassword();
  const { error: e2 } = await segreto.auth.admin.createUser({ email, password, email_confirm: true });
  if (e2) {
    await sb.from('autorizzati').delete().eq('email', email);
    return { ok: false, errore: `Non ho potuto creare l’accesso: ${e2.message}` };
  }

  await sb
    .from('richieste_listino')
    .update({ stato: 'approvata', decisa_da: agente.io.id, decisa_il: new Date().toISOString() })
    .eq('id', r.id);

  const inviata = await invia({
    a: email,
    oggetto: 'Your access to the Prestige Rent Partners area',
    testo: letteraAccesso(r.nome, email, password, false),
  });

  /* Niente `revalidatePath` qui: cancellava il riquadro con la password
     appena mostrato (vedi la nota in `sincronizzaTab`). Aggiorna la
     pagina il `router.refresh()` del componente. */
  return { ok: true, email, password, inviata };
}

export async function rifiutaRichiesta(id: string): Promise<Esito> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const sb = await supabaseServer();
  const { error } = await sb
    .from('richieste_listino')
    .update({ stato: 'rifiutata', decisa_da: agente.io.id, decisa_il: new Date().toISOString() })
    .eq('id', id)
    .eq('stato', 'in_attesa');
  if (error) return { ok: false, errore: error.message };
  return { ok: true };
}

/** Una password nuova a un utente del listino, mandata per email.
 *  Solo per il ruolo `listino`: le guide hanno la loro in /admin/utenti/,
 *  gli admin si cambiano da Supabase. */
export async function nuovaPasswordPartner(idProfilo: string): Promise<EsitoApprova> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const segreto = clientSegreto();
  if (!segreto) return { ok: false, errore: 'Manca SUPABASE_SECRET_KEY.' };

  const sb = await supabaseServer();
  const { data } = await sb.from('profili').select('id, email, nome, ruolo').eq('id', idProfilo).maybeSingle();
  const p = data as { id: string; email: string; nome: string | null; ruolo: string } | null;
  if (!p) return { ok: false, errore: 'Utente non trovato.' };
  if (p.ruolo !== 'listino') return { ok: false, errore: 'Da qui si cambia la password solo agli utenti del listino.' };

  const password = generaPassword();
  const { error } = await segreto.auth.admin.updateUserById(p.id, { password });
  if (error) return { ok: false, errore: error.message };

  const inviata = await invia({
    a: p.email,
    oggetto: 'Your new access to the Prestige Rent Partners area',
    testo: letteraAccesso((p.nome ?? '').split(' ')[0], p.email, password, true),
  });
  return { ok: true, email: p.email, password, inviata };
}
