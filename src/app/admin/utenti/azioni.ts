'use server';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { chiAgisce, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import {
  ALFABETO_PASSWORD,
  DOMINIO_GUIDE,
  LUNGHEZZA_PASSWORD,
  emailDiGuida,
  nomeUtenteValido,
  normalizza,
} from '@/lib/accesso';

/* GLI UTENTI: l'admin crea le guide e consegna le credenziali.
 *
 * ── 🔴 QUESTA E' L'UNICA SCRITTURA DEL PANNELLO SENZA LA RETE DELLA RLS
 * Tutto il resto del pannello scrive con la sessione dell'utente e la
 * chiave pubblicabile, quindi anche se qui nel codice ci si dimenticasse
 * un controllo, il database rifiuterebbe comunque. Qui no: creare un
 * utente in Supabase Auth richiede la chiave segreta, che la RLS la
 * scavalca per definizione.
 *
 * Quindi in queste azioni il controllo del ruolo e' l'UNICA difesa, e sta
 * nella PRIMA riga di ognuna, prima di leggere qualunque parametro. Una
 * server action e' una POST raggiungibile con il suo identificativo senza
 * passare da nessuna pagina: una guida che ne trovasse il nome nel
 * bundle potrebbe chiamarla a mano.
 *
 * ── E IL RUOLO NON ARRIVA MAI DAL CLIENT ──────────────────────────────
 * `creaGuida` scrive `'guida'` come costante. Se il ruolo fosse un
 * parametro, chi chiamasse l'azione a mano si creerebbe un admin -- e un
 * admin creato cosi' sopravvivrebbe anche al cambio della password
 * condivisa, perche' ha una password sua che conosce solo lui. Un secondo
 * admin si fa dal database, a mano, da chi ha le chiavi.
 */

export type Esito = { ok: boolean; errore?: string };

function segreto(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chiave) return null;
  return createClient(url, chiave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Una password che si possa dettare al telefono senza domande.
 *  `crypto.getRandomValues` e non `Math.random()`: la seconda e'
 *  prevedibile, e una password prevedibile non e' una password. */
function generaPassword(): string {
  const n = ALFABETO_PASSWORD.length;
  const byte = new Uint32Array(LUNGHEZZA_PASSWORD);
  crypto.getRandomValues(byte);
  /* Il modulo introduce una piccolissima preferenza per i primi
     caratteri dell'alfabeto; con 2^32 valori su 56 lettere e' fuori da
     qualunque rilevanza pratica, e vale la pena dirlo invece di far
     finta che il modulo sia innocuo. */
  return Array.from(byte, (b) => ALFABETO_PASSWORD[b % n]).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   CREARE UNA GUIDA
   ═══════════════════════════════════════════════════════════════════ */

export type GuidaCreata = Esito & {
  username?: string;
  password?: string;
  /** il testo gia' pronto da incollare in un messaggio */
  consegna?: string;
};

/**
 * L'ORDINE E' OBBLIGATO, e va spiegato perche' sembra al contrario.
 *
 * Prima la riga in `autorizzati`, poi l'utente in Supabase Auth. Non e'
 * una scelta: il trigger `crea_profilo()` su `auth.users` cerca
 * l'indirizzo in `autorizzati` e, se non lo trova, ALZA UN'ECCEZIONE --
 * l'utente non nasce affatto e Supabase risponde "Database error saving
 * new user". Creare prima l'utente e poi la riga non funzionerebbe mai.
 *
 * Conseguenza: se la creazione dell'utente fallisce (password troppo
 * corta, indirizzo gia' preso), in `autorizzati` resta una riga orfana
 * che al secondo tentativo darebbe un conflitto. Per questo in caso di
 * errore la riga si toglie prima di tornare indietro: se no l'admin
 * riproverebbe e non capirebbe perche' ora dice "nome gia' in uso".
 */
export async function creaGuida(dati: {
  username: string;
  nome: string;
  contatto: string;
}): Promise<GuidaCreata> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const sb = segreto();
  if (!sb) return { ok: false, errore: 'Manca SUPABASE_SECRET_KEY: non posso creare utenti.' };

  const username = normalizza(dati.username ?? '');
  const nome = (dati.nome ?? '').trim();
  const contatto = normalizza(dati.contatto ?? '');

  if (!nomeUtenteValido(username)) {
    return {
      ok: false,
      errore:
        'Il nome utente va da 3 a 32 caratteri: lettere minuscole, numeri, punto, trattino. Niente spazi e niente @.',
    };
  }
  if (nome.length < 2) {
    return { ok: false, errore: 'Scrivi il nome della persona: è quello che si vede nel pannello.' };
  }
  if (contatto && !contatto.includes('@')) {
    return { ok: false, errore: 'Il contatto, se lo metti, deve essere un indirizzo email.' };
  }

  const email = emailDiGuida(username);
  const password = generaPassword();

  const utente = await supabaseServer();

  /* Il nome utente libero si controlla PRIMA, per poter dare un messaggio
     che si capisce. Il vincolo unico nel database c'e' comunque ed e' lui
     la garanzia: fra questo controllo e l'insert passa un istante in cui
     qualcun altro potrebbe prendere lo stesso nome, e in quel caso
     l'insert fallisce e l'errore arriva qui sotto. */
  const { data: preso } = await utente
    .from('autorizzati')
    .select('email')
    .eq('username', username)
    .maybeSingle();
  if (preso) return { ok: false, errore: `Il nome utente «${username}» è già in uso.` };

  const { error: e1 } = await utente.from('autorizzati').insert({
    email,
    ruolo: 'guida',
    nome,
    username,
    contatto: contatto || null,
  });
  if (e1) return { ok: false, errore: `Non ho potuto abilitare l’utente: ${e1.message}` };

  const { error: e2 } = await sb.auth.admin.createUser({
    email,
    password,
    /* Senza questo Supabase manderebbe un'email di conferma a un
       indirizzo che non esiste (`.invalid`), e l'utente resterebbe in
       attesa per sempre. */
    email_confirm: true,
  });

  if (e2) {
    /* Si toglie la riga appena scritta: senza, il secondo tentativo
       direbbe "nome gia' in uso" e l'admin non avrebbe modo di pulire. */
    await utente.from('autorizzati').delete().eq('email', email);
    return { ok: false, errore: `Non ho potuto creare l’accesso: ${e2.message}` };
  }

  return {
    ok: true,
    username,
    password,
    consegna:
      `Ciao ${nome}, ecco come entrare per caricare le foto:\n\n` +
      `Indirizzo: https://prestigerent.com/admin/entra/\n` +
      `Nome utente: ${username}\n` +
      `Password: ${password}\n\n` +
      `Salvali nel telefono: la password non si può cambiare da sola, ` +
      `se la perdi te ne assegno un’altra io.`,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   RIGENERARE UNA PASSWORD
   ═══════════════════════════════════════════════════════════════════ */

/**
 * 🔴 QUESTO E' IL MOTIVO PER CUI «la password non si cambia» NON BASTA.
 *
 * Nel sito non c'e' nessun modo di cambiare la propria password, ma
 * `supabase.auth.updateUser({password})` e' un endpoint del SERVIZIO, non
 * una funzione nostra: chi e' dentro ha la sessione e la chiave
 * pubblicabile nel browser, e puo' chiamarlo dalla console. Togliere un
 * modulo non spegne un endpoint.
 *
 * Quindi l'immutabilita' non e' ottenibile, e non va promessa. Quello che
 * si ottiene e' il CONTROLLO: da qui l'admin riprende in mano qualunque
 * account, in un momento, qualunque cosa sia successa alla password.
 */
export async function rigeneraPassword(idProfilo: string): Promise<GuidaCreata> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const sb = segreto();
  if (!sb) return { ok: false, errore: 'Manca SUPABASE_SECRET_KEY.' };

  const utente = await supabaseServer();
  const { data: p } = await utente
    .from('profili')
    .select('id,email,nome,username,ruolo')
    .eq('id', idProfilo)
    .maybeSingle();
  const prof = p as { id: string; email: string; nome: string | null; username: string | null; ruolo: string } | null;
  if (!prof) return { ok: false, errore: 'Questo utente non esiste.' };

  /* Gli admin no: le loro password sono quelle condivise e si cambiano da
     Supabase, tutte e tre insieme. Farlo da qui su uno solo dei tre
     romperebbe il patto "la stessa per tutti" senza che nessuno se ne
     accorga fino al prossimo accesso di un altro. */
  if (prof.ruolo !== 'guida') {
    return {
      ok: false,
      errore: 'Le password degli amministratori si cambiano da Supabase, e vanno cambiate su tutti e tre.',
    };
  }

  const password = generaPassword();
  const { error } = await sb.auth.admin.updateUserById(prof.id, { password });
  if (error) return { ok: false, errore: error.message };

  return {
    ok: true,
    username: prof.username ?? undefined,
    password,
    consegna:
      `Ciao ${prof.nome ?? ''}, ecco la password nuova per entrare:\n\n` +
      `Indirizzo: https://prestigerent.com/admin/entra/\n` +
      `Nome utente: ${prof.username ?? ''}\n` +
      `Password: ${password}\n\n` +
      `La vecchia non funziona più.`,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   APRIRE E CHIUDERE L'ACCESSO
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Non si cancella nessuno, si disattiva. `profili.id` ha
 * `on delete cascade` verso `auth.users` e `gallery_images.uploaded_by`
 * ha `on delete set null` verso `profili`: cancellare una persona
 * porterebbe via la paternita' di tutte le foto che ha caricato, che e'
 * proprio la cosa che si vuole conservare.
 *
 * `attivo = false` chiude l'accesso e basta: `chiSono()` lo legge, e le
 * funzioni RLS `e_admin()` e `e_caricatore()` pure.
 */
export async function cambiaAttivo(idProfilo: string, attivo: boolean): Promise<Esito> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };

  const sb = segreto();
  if (!sb) return { ok: false, errore: 'Manca SUPABASE_SECRET_KEY.' };

  /* Non si chiude fuori se stessi: un admin solo davanti allo schermo che
     si disattiva per sbaglio non ha piu' nessun modo di rientrare dal
     sito. */
  if (idProfilo === agente.io.id && !attivo) {
    return { ok: false, errore: 'Non puoi disattivare te stesso.' };
  }

  /* 🔴 QUI SERVE LA CHIAVE SEGRETA, e non e' una scorciatoia.
     Su `public.profili` esiste UNA SOLA policy, `profilo_proprio`, ed e'
     di SELECT: nessuna INSERT, nessuna UPDATE, nessuna DELETE. Con la
     sessione dell'utente questo update toccherebbe ZERO righe e
     tornerebbe senza errore -- il pannello direbbe "fatto" e l'accesso
     resterebbe aperto.
     L'alternativa sarebbe aggiungere una policy di scrittura su
     `profili`, ma e' la tabella da cui dipendono `e_admin()` e
     `e_caricatore()`, e quindi 29 policy su 24 tabelle: non e' il posto
     dove si va a ritoccare le regole per comodita'. */
  const { error } = await sb.from('profili').update({ attivo }).eq('id', idProfilo);
  if (error) return { ok: false, errore: error.message };
  return { ok: true };
}

/* Il dominio interno serve alla pagina per non mostrarlo mai. */
export async function dominioGuide(): Promise<string> {
  return DOMINIO_GUIDE;
}
