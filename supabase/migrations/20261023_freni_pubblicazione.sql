/* I FRENI DELLA PUBBLICAZIONE AUTOMATICA.
 *
 * Regola della proprieta', 23/10/2026: «non voglio processi che vanno a
 * compromettermi Viator». Un giro automatico che scrive dentro l'account
 * del fornitore deve poter fare un danno SOLO se glielo si permette, e
 * fermarsi da solo al primo dubbio. Queste tre cose lo garantiscono dal
 * database, cioe' da un posto che il giro non puo' aggirare.
 *
 * 1. L'INTERRUTTORE. `automatico` nasce SPENTO. Finche' e' spento il giro
 *    puo' solo leggere: non incolla niente, qualunque cosa ci sia in coda.
 *    Si accende dal pannello, e si spegne dal pannello -- in un secondo,
 *    senza chiedere niente a nessuno.
 *
 * 2. IL TETTO GIORNALIERO. Anche con l'interruttore acceso, oltre
 *    `max_al_giorno` risposte in ventiquattr'ore il giro si ferma. E' il
 *    freno contro il caso peggiore: un errore di logica che fa uscire
 *    tutto in una volta. Venti al giorno sono piu' di quante ne arrivano.
 *
 * 3. LO STATO «ERRORE» E LA NOTA. Quando qualcosa non torna -- la
 *    recensione nel portale non corrisponde, la pagina non e' quella
 *    attesa, l'invio non ha dato conferma -- la riga finisce in `errore`
 *    con scritto il perche', e il giro SI FERMA. Non riprova, non passa
 *    alla successiva: un processo che sbaglia una volta e continua ne
 *    sbaglia dieci.
 */

create table if not exists public.impostazioni_recensioni (
  /* una riga sola: la chiave e' fissa e il vincolo lo garantisce */
  id boolean primary key default true check (id),
  automatico boolean not null default false,
  max_al_giorno integer not null default 20 check (max_al_giorno between 1 and 100),
  /* quando e' stato toccato l'interruttore, e da chi: se un giorno la
     pubblicazione parte «da sola», qui si vede chi l'ha accesa */
  cambiato_il timestamptz not null default now(),
  cambiato_da uuid references auth.users (id)
);

insert into public.impostazioni_recensioni (id) values (true)
  on conflict (id) do nothing;

alter table public.impostazioni_recensioni enable row level security;

drop policy if exists impostazioni_recensioni_solo_admin on public.impostazioni_recensioni;
create policy impostazioni_recensioni_solo_admin
  on public.impostazioni_recensioni
  for all
  to authenticated
  using (public.e_admin())
  with check (public.e_admin());

/* lo stato «errore» e la nota che spiega */
alter table public.coda_recensioni
  drop constraint if exists coda_recensioni_stato_check;
alter table public.coda_recensioni
  add constraint coda_recensioni_stato_check
  check (stato in ('nuova', 'letta', 'bozza', 'approvata', 'pubblicata', 'saltata', 'errore'));

alter table public.coda_recensioni
  add column if not exists nota text;

comment on column public.coda_recensioni.nota is
  'Perche'' una riga e'' in errore, scritto dal giro automatico nel momento in cui si e'' fermato. Vuota in tutti gli altri stati.';
