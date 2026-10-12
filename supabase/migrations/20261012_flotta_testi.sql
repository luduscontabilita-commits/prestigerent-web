-- I TESTI DELLA FLOTTA MODIFICABILI DAL PANNELLO (12/10/2026).
--
-- I testi di partenza stanno in src/lib/flotta.ts (inglese e italiano).
-- Questa tabella tiene SOLO quelli cambiati dall'admin in
-- /admin/partners/flotta/: un testo qui vince su quello del codice; senza
-- riga si usa l'originale ("Ripristina" cancella la riga).
--
-- Nessun dato riservato (sono i testi che il partner legge), quindi
-- lettura per tutti; scrive solo e_admin(). RLS accesa qui, regola 4.

create table public.flotta_testi (
  chiave text not null check (chiave ~ '^[a-z0-9-]{2,40}$'),
  lingua text not null check (lingua in ('en', 'it')),
  -- i campi cambiano in 20261012_flotta_testi_nome_dettagli.sql
  campo text not null check (campo in ('tipo', 'descrizione', 'notaPosti', 'bagagli', 'suRichiesta')),
  testo text not null check (char_length(testo) <= 1000),
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references public.profili(id) on delete set null,
  primary key (chiave, lingua, campo)
);

alter table public.flotta_testi enable row level security;

create policy flotta_testi_lettura on public.flotta_testi
  for select using (true);

create policy flotta_testi_admin on public.flotta_testi
  for all using (e_admin()) with check (e_admin());
