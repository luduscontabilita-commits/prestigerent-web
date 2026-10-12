-- LE COMMISSIONI DEI PARTNER, MODIFICABILI DALL'ADMIN (12/10/2026).
--
-- Due percentuali sole: «privato» (servizi con prezzo per gruppo/veicolo:
-- tour privati, escursioni dai porti, transfer) e «gruppo» (tour con
-- prezzo a persona: i small group). Il listino ne ricava Net e commissione
-- dal prezzo Retail letto da Regiondo (src/lib/commissioni.ts).
--
-- Sono percentuali, non prezzi: la regola 3 del CLAUDE.md (nessun prezzo
-- nel database) resta intatta, i prezzi restano solo su Regiondo.
--
-- RLS accesa qui (regola 4). Legge e scrive solo e_admin(): il listino dei
-- partner le legge sul server con la chiave segreta, quindi nel browser
-- non arriva nessun accesso diretto alla tabella.

create table public.commissioni (
  tipo text primary key check (tipo in ('privato', 'gruppo')),
  percentuale numeric(5, 2) not null check (percentuale >= 0 and percentuale < 100),
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references public.profili(id) on delete set null
);

alter table public.commissioni enable row level security;

create policy commissioni_admin on public.commissioni
  for all using (e_admin()) with check (e_admin());

insert into public.commissioni (tipo, percentuale) values ('privato', 10), ('gruppo', 20);
