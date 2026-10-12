-- I QR CODE CON LA DESTINAZIONE MODIFICABILE (12/10/2026).
--
-- Il QR stampato sulle brochure e sullo stand contiene un indirizzo FISSO
-- del sito: https://prestigerent.com/qr/<codice>. Dove porta lo decide
-- questa tabella, e l'admin la cambia da /admin/partners/qrcode/: i QR gia'
-- stampati continuano a funzionare e portano alla destinazione nuova,
-- senza ristampare niente. Il rimando lo fa src/app/qr/[codice]/route.ts.
--
-- Nessun dato riservato: la destinazione e' un indirizzo pubblico, quindi
-- la si legge con la chiave pubblicabile (la rotta del rimando non ha
-- sessione). Scrive solo e_admin(). RLS accesa qui, regola 4 del CLAUDE.md.

create table public.qr_link (
  codice text primary key check (codice ~ '^[a-z0-9-]{2,40}$'),
  destinazione text not null check (destinazione ~ '^https://'),
  nota text,
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references public.profili(id) on delete set null
);

alter table public.qr_link enable row level security;

create policy qr_link_lettura on public.qr_link
  for select using (true);

create policy qr_link_admin on public.qr_link
  for all using (e_admin()) with check (e_admin());

insert into public.qr_link (codice, destinazione, nota)
values ('partners', 'https://prestigerent.com/partners/', 'QR delle brochure e dello stand in fiera: area partner');
