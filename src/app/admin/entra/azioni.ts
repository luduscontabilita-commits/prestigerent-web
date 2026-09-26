'use server';

import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/auth';
import { DOMINIO_GUIDE, normalizza, pareEmail } from '@/lib/accesso';

/* ENTRARE E USCIRE.
 *
 * ── 🔴 PERCHE' L'ACCESSO STA SUL SERVER E NON NEL BROWSER ─────────────
 * Fino al 26/09/2026 la schermata chiamava `signInWithPassword` dal
 * browser. Funzionava, ma con i nomi utente non si poteva piu':
 *
 *  1. i tre admin entrano con la loro EMAIL VERA, e il nome utente e' un
 *     alias. Se la traduzione avvenisse nel browser, gli indirizzi
 *     personali di due persone finirebbero nel bundle JavaScript che
 *     scarica chiunque apra il sito;
 *  2. l'alternativa -- un endpoint che traduce il nome utente in email --
 *     sarebbe raggiungibile senza aver fatto l'accesso, e direbbe a
 *     chiunque QUALI NOMI ESISTONO: un oracolo per indovinare gli account
 *     e per provarli in massa.
 *
 * Qui non c'e' ne' l'uno ne' l'altro. L'azione traduce e tenta l'accesso
 * in un colpo solo, e risponde SEMPRE allo stesso modo: chi prova non
 * impara niente che non avrebbe imparato sbagliando una password.
 *
 * ── PERCHE' NON REDIRIGE ──────────────────────────────────────────────
 * `redirect()` di Next funziona lanciando un'eccezione speciale. Dentro
 * un `try/catch` -- che qui serve -- verrebbe presa dal `catch` e
 * trattata come un errore: il pulsante "Entra" non farebbe niente, e
 * nemmeno un messaggio. Quindi l'azione torna `{ok:true}` e la
 * navigazione resta al client, dov'era prima.
 */

/** 🔴 GLI ALIAS DEI TRE ADMIN. Stanno QUI e non in `src/lib/accesso.ts`
 *  perche' questo file e' `'use server'`: non finisce mai nel browser.
 *  Sono costanti nel codice e non una lettura al database, cosi' non
 *  esiste nessun endpoint che si possa interrogare per sapere se un nome
 *  utente esiste.
 *
 *  Le email NON sono state cambiate in Supabase, di proposito:
 *  `auth.identities` ha una colonna generata dall'indirizzo, e
 *  rinominarlo con SQL la lascerebbe indietro -- con il risultato di non
 *  rientrare piu' ne' col vecchio ne' col nuovo. */
const ALIAS_ADMIN: Record<string, string> = {
  admin: 'usa@prestigerent.com',
  filippo: 'filippo.montomoli@gmail.com',
  michele: 'michele.mocciola.ing@gmail.com',
};

/** Da quello che la persona scrive all'indirizzo con cui Supabase la
 *  conosce. Accetta anche l'email diretta: durante il passaggio nessuno
 *  deve restare fuori perche' si ricordava il vecchio modo. */
function indirizzoDi(scritto: string): string {
  const v = normalizza(scritto);
  if (pareEmail(v)) return v;
  return ALIAS_ADMIN[v] ?? `${v}@${DOMINIO_GUIDE}`;
}

export type EsitoAccesso = { ok: boolean; errore?: string };

export async function entra(scritto: string, password: string): Promise<EsitoAccesso> {
  const nome = normalizza(scritto ?? '');
  if (!nome || !password) {
    return { ok: false, errore: 'Scrivi il nome utente e la password.' };
  }

  try {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({
      email: indirizzoDi(nome),
      password,
    });

    if (error) {
      /* 🔴 UN MESSAGGIO SOLO, QUALUNQUE SIA LA CAUSA.
       *
       * Supabase distingue "Invalid login credentials" da altri casi, ma
       * distinguerli qui vorrebbe dire dire a chi prova SE QUEL NOME
       * ESISTE -- e chi prova nomi a caso userebbe proprio questa
       * differenza per costruirsi l'elenco degli account.
       *
       * E' anche in italiano: prima l'errore di Supabase arrivava grezzo
       * in inglese tecnico a una persona che ha in mano un telefono in
       * mezzo a una vigna. */
      return { ok: false, errore: 'Nome utente o password non corretti.' };
    }

    return { ok: true };
  } catch {
    /* La rete, non l'utente: qui il messaggio deve dire di riprovare, non
       far sospettare di aver sbagliato a scrivere. */
    return { ok: false, errore: 'Non riesco a contattare il server. Riprova fra un momento.' };
  }
}

/* ── USCIRE ───────────────────────────────────────────────────────────
 *
 * 🔴 NON ESISTEVA. Fino al 26/09/2026 in tutto il progetto non c'era una
 * sola riga che chiudesse una sessione: nessun `signOut`, nessun
 * pulsante, nessuna rotta. L'unico modo di uscire era cancellare i cookie
 * dal browser o aspettare la scadenza.
 *
 * Con tre admin al loro computer era un fastidio. Con le guide che usano
 * la gallery dallo smartphone con cui scattano -- un telefono personale,
 * a volte prestato, a volte perso o cambiato -- e' un requisito: senza
 * uscita, l'unico modo di togliere l'accesso a un dispositivo sarebbe
 * disattivare il profilo dal database.
 *
 * ── PERCHE' UN'AZIONE E NON UN LINK ──────────────────────────────────
 * La strada piu' corta sarebbe `<Link href="/admin/esci/">` verso una
 * rotta GET che cancella i cookie. Sarebbe un guasto: Next PREFETCHA i
 * link visibili o al passaggio del mouse, quindi la rotta verrebbe
 * chiamata senza che nessuno l'abbia premuta, e ci si ritroverebbe
 * disconnessi da soli aprendo il pannello. Un'azione non si prefetcha. */
export async function esci(): Promise<void> {
  const sb = await supabaseServer();
  /* `local`: si chiude QUESTO dispositivo, non tutte le sessioni della
     persona. Una guida che esce dal telefono di un collega non deve
     buttare fuori se stessa dal proprio. */
  await sb.auth.signOut({ scope: 'local' });
}

/** Quella che usa il pulsante nel guscio: esce e porta alla schermata di
 *  accesso.
 *
 *  🔴 `redirect()` STA FUORI DA QUALUNQUE try/catch, e non e' pignoleria:
 *  funziona lanciando un'eccezione speciale, e un `catch` di troppo se la
 *  mangerebbe lasciando il pulsante senza effetto -- si resterebbe sulla
 *  pagina, disconnessi, senza nessun segnale. */
export async function esciEVai(): Promise<void> {
  await esci();
  redirect('/admin/entra/');
}
