'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/auth';
import { clientSegreto } from '@/lib/chiave-segreta';
import { normalizza, pareEmail } from '@/lib/accesso';
import { invia } from '@/lib/posta';
import { leggiLinkPartner } from '@/lib/link-partner';

/* LE AZIONI DELL'AREA PARTNER (prestigerent.com/partners/): chiedere di
 * vedere il listino, entrare, uscire. Le prime due si chiamano senza aver
 * fatto l'accesso.
 *
 * In inglese, come le pagine che le usano: chi le vede e' un'agenzia o un
 * hotel, spesso all'estero.
 *
 * ── LA REGISTRAZIONE NON CREA UN UTENTE ──────────────────────────────
 * Lascia una riga in `richieste_listino` e basta. L'utente nasce solo
 * quando un admin approva (src/app/admin/partners/azioni.ts). Due motivi:
 *  1. Supabase Auth e' condiviso con il pannello TURNI, e il trigger
 *     `crea_profilo()` rifiuta chi non e' in `autorizzati`: aprire le
 *     iscrizioni vorrebbe dire toccare quel trigger per tutti;
 *  2. una registrazione non approvata non deve lasciare un account
 *     dormiente con una password scelta da uno sconosciuto.
 *
 * ── PERCHE' LA CHIAVE SEGRETA, E NON UNA POLICY DI INSERIMENTO ───────
 * Con una policy `insert` per `anon` (come fa la tabella `richieste` dei
 * moduli di contatto) chiunque potrebbe scrivere nella tabella
 * direttamente da REST con la chiave pubblicabile, saltando la
 * validazione, il campo esca e il freno qui sotto. Cosi' invece l'unica
 * porta e' questa azione. La tabella resta leggibile e scrivibile solo da
 * `e_admin()`. */

export type Esito = { ok: boolean; errore?: string };

export type DatiRegistrazione = {
  nome: string;
  cognome: string;
  azienda: string;
  tipo: string;
  paese: string;
  email: string;
  telefono: string;
  sito: string;
  note: string;
  /** il campo esca: invisibile a una persona, i robot lo riempiono */
  sitoWeb2?: string;
};

const TIPI = ['Travel agency', 'Tour operator', 'Hotel', 'Cruise line', 'Concierge', 'Other'];

const corto = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

export async function registraRichiesta(d: DatiRegistrazione): Promise<Esito> {
  /* Il robot che riempie tutto riceve un «ok» e non scrive niente: un
     errore gli direbbe quale campo evitare la volta dopo. */
  if (corto(d?.sitoWeb2, 200)) return { ok: true };

  const nome = corto(d.nome, 80);
  const cognome = corto(d.cognome, 80);
  const azienda = corto(d.azienda, 160);
  const tipo = TIPI.includes(d.tipo) ? d.tipo : 'Other';
  const paese = corto(d.paese, 80);
  const email = normalizza(corto(d.email, 200));
  const telefono = corto(d.telefono, 40);
  let sito = corto(d.sito, 200);
  const note = corto(d.note, 1500);

  if (nome.length < 2 || cognome.length < 2) return { ok: false, errore: 'Please write your first and last name.' };
  if (azienda.length < 2) return { ok: false, errore: 'Please write the name of your company.' };
  /* Piu' stretto di `pareEmail()`, che guarda solo la chiocciola: qui
     l'indirizzo e' quello a cui partira' la password. E i domini interni
     (.invalid: guide e pannello TURNI) non sono indirizzi veri. */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.endsWith('.invalid')) {
    return { ok: false, errore: 'Please check your email address.' };
  }
  if (paese.length < 2) return { ok: false, errore: 'Please write your country.' };
  /* OBBLIGATORIO per decisione della proprieta' (12/10/2026): nome, email
     e telefono sono il minimo per richiamare chi chiede l'accesso. Almeno
     sei cifre, e solo caratteri da numero di telefono: «n/a» o «-» non
     richiamano nessuno. */
  if ((telefono.match(/\d/g) ?? []).length < 6 || !/^[+\d\s().\-/]+$/.test(telefono)) {
    return { ok: false, errore: 'Please write a phone number where we can reach you, with country code.' };
  }
  if (sito && !/^https?:\/\//i.test(sito)) sito = `https://${sito}`;

  const sb = clientSegreto();
  if (!sb) return { ok: false, errore: 'We cannot receive requests right now. Please write to usa@prestigerent.com.' };

  /* UN FRENO, NON UN MURO. Una richiesta gia' in attesa per lo stesso
     indirizzo non se ne aggiunge una seconda (e la persona riceve
     comunque «ok»: non deve sapere se quell'indirizzo c'era gia'). E se
     nell'ultima ora ne sono arrivate piu' di 30, qualcosa non va: un
     modulo B2B ne riceve poche al mese. */
  const { count: doppie } = await sb
    .from('richieste_listino')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .eq('stato', 'in_attesa');
  if ((doppie ?? 0) > 0) return { ok: true };

  const unOraFa = new Date(Date.now() - 3600_000).toISOString();
  const { count: recenti } = await sb
    .from('richieste_listino')
    .select('id', { count: 'exact', head: true })
    .gte('creata_il', unOraFa);
  if ((recenti ?? 0) > 30) {
    return { ok: false, errore: 'Too many requests right now. Please try again later or write to usa@prestigerent.com.' };
  }

  const h = await headers();
  const { error } = await sb.from('richieste_listino').insert({
    nome,
    cognome,
    azienda,
    tipo_attivita: tipo,
    paese,
    email,
    telefono,
    sito_web: sito || null,
    note: note || null,
    /* per riconoscere a colpo d'occhio un'ondata di richieste finte */
    origine: (h.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64) || null,
  });
  if (error) return { ok: false, errore: 'We could not save your request. Please try again or write to usa@prestigerent.com.' };

  /* L'avviso all'admin non deve far fallire la richiesta: se la posta e'
     giu', la richiesta resta comunque nel pannello. */
  const a = process.env.RICHIESTE_A;
  if (a) {
    await invia({
      a,
      oggetto: `Listino: richiesta di accesso da ${azienda}`,
      testo:
        `${nome} ${cognome} (${azienda}, ${tipo}, ${paese}) chiede di vedere il listino prezzi.\n\n` +
        `Email: ${email}\nTelefono: ${telefono}\nSito: ${sito || '—'}\n` +
        (note ? `\nNote:\n${note}\n` : '') +
        `\nPer approvarla o rifiutarla: https://prestigerent.com/admin/partners/`,
    });
  }
  return { ok: true };
}

/** L'accesso dei partner: email e password, messaggi in inglese.
 *
 *  Non riusa `entra()` di src/app/admin/entra/azioni.ts per una ragione
 *  sola: quella risponde in italiano («Nome utente o password non
 *  corretti»). La logica e' la stessa -- un solo messaggio qualunque sia
 *  la causa, per non dire a chi prova quali indirizzi esistono. */
export async function accedi(email: string, password: string): Promise<Esito> {
  const indirizzo = normalizza(email ?? '');
  if (!pareEmail(indirizzo) || !password) return { ok: false, errore: 'Please write your email and password.' };
  try {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email: indirizzo, password });
    if (error) return { ok: false, errore: 'Email or password not correct.' };
    return { ok: true };
  } catch {
    return { ok: false, errore: 'We cannot reach the server. Please try again in a moment.' };
  }
}

/** L'ACCESSO DAL LINK DELL'EMAIL (/partners/enter/?t=...).
 *
 *  Il gettone e' firmato dal sito (src/lib/link-partner.ts). Se e' buono
 *  e il partner e' ancora attivo, si apre la sessione SENZA password:
 *  Supabase genera un link monouso (`generateLink`, che non manda email)
 *  e lo si consuma qui stesso con `verifyOtp`, che scrive i cookie di
 *  sessione come un accesso normale.
 *
 *  Solo per il ruolo `listino`: un link che aprisse una sessione da admin
 *  sarebbe la chiave del pannello dentro un'email. */
export async function entraConLink(t: string): Promise<Esito & { email?: string }> {
  const l = leggiLinkPartner(t);
  if ('errore' in l) {
    return {
      ok: false,
      email: l.email,
      errore:
        l.errore === 'scaduto'
          ? 'This link has expired. Please sign in with your email and password.'
          : 'This link is not valid. Please sign in with your email and password.',
    };
  }

  const segreto = clientSegreto();
  if (!segreto) return { ok: false, email: l.email, errore: 'We cannot sign you in right now. Please use your email and password.' };

  const { data: p } = await segreto.from('profili').select('ruolo, attivo').eq('email', l.email).maybeSingle();
  const prof = p as { ruolo: string; attivo: boolean } | null;
  if (!prof || prof.ruolo !== 'listino' || !prof.attivo) {
    return { ok: false, email: l.email, errore: 'This access is not active. Please write to usa@prestigerent.com.' };
  }

  const { data, error } = await segreto.auth.admin.generateLink({ type: 'magiclink', email: l.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return { ok: false, email: l.email, errore: 'We cannot sign you in right now. Please use your email and password.' };
  }

  const sb = await supabaseServer();
  const { error: e2 } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (e2) {
    return { ok: false, email: l.email, errore: 'We cannot sign you in right now. Please use your email and password.' };
  }
  return { ok: true };
}

/** L'uscita dei partner: chiude la sessione su questo dispositivo e
 *  torna a /partners/, non alla schermata di accesso del pannello (che e'
 *  in italiano e chiede un «nome utente» che il partner non ha).
 *  `redirect()` fuori da ogni try/catch: vedi `esciEVai()` in
 *  src/app/admin/entra/azioni.ts. */
export async function esciPartner(): Promise<void> {
  const sb = await supabaseServer();
  await sb.auth.signOut({ scope: 'local' });
  redirect('/partners/');
}
