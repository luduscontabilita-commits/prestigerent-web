-- IL LISTINO PREZZI: ruolo nuovo, richieste di accesso, storico delle tab PRICES.
-- Vedi LISTINO_AGENT.md nella radice.
--
-- 🔴 VA APPLICATA PRIMA DEL PUSH. Il codice nuovo legge `richieste_listino`
-- e `prezzi_tab_storico`; senza le tabelle le pagine del listino per l'admin
-- andrebbero in errore. Il resto del pannello non ne dipende.
--
-- NESSUN PREZZO IN QUESTE TABELLE (regola 3 del CLAUDE.md): i prezzi si
-- leggono da Regiondo. L'unica eccezione dichiarata e' `prezzi_tab_storico`,
-- che conserva l'HTML della tab PRICES prima e dopo una sincronizzazione --
-- cioe' una copia del testo della pagina, per poterla rimettere com'era.

-- ── 1. IL RUOLO `listino` ─────────────────────────────────────────────
-- Gli utenti esterni (agenzie, hotel) che vedono SOLO il listino e la
-- flotta. `e_admin()` ed `e_caricatore()` NON cambiano: controllano
-- ruolo = 'admin' e ruolo in ('admin','guida'), quindi un utente `listino`
-- non ottiene niente da nessuna policy esistente. Verificato il 12/10/2026
-- su pg_policies: le sole policy aperte a ogni autenticato sono di dati gia'
-- pubblici, piu' `profilo_proprio` (il proprio profilo).

alter table public.autorizzati drop constraint autorizzati_ruolo_check;
alter table public.autorizzati add constraint autorizzati_ruolo_check
  check (ruolo = any (array['admin'::text, 'guida'::text, 'listino'::text]));

alter table public.profili drop constraint profili_ruolo_check;
alter table public.profili add constraint profili_ruolo_check
  check (ruolo = any (array['admin'::text, 'guida'::text, 'listino'::text]));

-- ── 2. LE RICHIESTE DI ACCESSO ────────────────────────────────────────
-- Una riga per chi compila /admin/listino/register/. L'utente vero nasce
-- solo all'approvazione (src/app/admin/listino/azioni.ts).
--
-- Nessuna policy per `anon`: l'inserimento lo fa la server action con la
-- chiave segreta, dopo la validazione e il campo esca. Con una policy di
-- insert chiunque potrebbe scrivere qui direttamente via REST.

create table public.richieste_listino (
  id uuid primary key default gen_random_uuid(),
  creata_il timestamptz not null default now(),
  nome text not null,
  cognome text not null,
  azienda text,
  tipo_attivita text,
  paese text,
  email text not null,
  telefono text,
  sito_web text,
  note text,
  -- l'IP di chi ha inviato: serve solo a riconoscere un'ondata di richieste finte
  origine text,
  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'approvata', 'rifiutata')),
  decisa_da uuid references public.profili(id) on delete set null,
  decisa_il timestamptz
);

create index richieste_listino_stato on public.richieste_listino (stato, creata_il desc);
create index richieste_listino_email on public.richieste_listino (lower(email));

alter table public.richieste_listino enable row level security;

create policy richieste_listino_admin on public.richieste_listino
  for all using (e_admin()) with check (e_admin());

-- ── 3. LO STORICO DELLE SINCRONIZZAZIONI DELLE TAB PRICES ─────────────
-- Ogni volta che l'admin preme «Sincronizza» in /admin/listino/sincronizza/
-- resta qui la tab com'era prima e com'e' diventata, per «Annulla».

create table public.prezzi_tab_storico (
  id bigint generated always as identity primary key,
  tour_slug text not null,
  html_prima text not null,
  html_dopo text not null,
  importi integer not null default 0,
  fatto_da uuid references public.profili(id) on delete set null,
  fatto_il timestamptz not null default now(),
  annullata boolean not null default false
);

create index prezzi_tab_storico_tour on public.prezzi_tab_storico (tour_slug, fatto_il desc);

alter table public.prezzi_tab_storico enable row level security;

create policy prezzi_tab_storico_admin on public.prezzi_tab_storico
  for all using (e_admin()) with check (e_admin());
