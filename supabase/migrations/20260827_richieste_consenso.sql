-- ═══════════════════════════════════════════════════════════════════
-- IL CONSENSO SULLE RICHIESTE DI CONTATTO
-- ═══════════════════════════════════════════════════════════════════
--
-- PERCHE'. Sotto il pulsante del modulo c'era scritto "We use your
-- details only to answer you. No newsletter, no sharing." e non era
-- vero: `src/app/api/richieste/route.ts` copia nome, email e telefono
-- dentro GoHighLevel (HighLevel Inc., Stati Uniti). Il testo e' stato
-- corretto e accanto e' comparsa una spunta FACOLTATIVA per l'unica
-- cosa che il consenso lo richiede davvero -- usare l'indirizzo per
-- offerte e novita' dopo che la richiesta e' chiusa.
--
-- Una spunta che non lascia traccia pero' non serve a niente: l'art.
-- 7(1) GDPR chiede di poter DIMOSTRARE che il consenso c'e' stato.
-- Servono due colonne, e servono tutte e due:
--
--   `marketing`   -> cosa ha risposto;
--   `consenso_il` -> quando. Vale anche per il "no": dice quando
--                    l'informativa e' stata mostrata, che e' l'altra
--                    meta' di quello che si deve poter dimostrare.
--
-- LE RIGHE GIA' IN TABELLA. Prendono `marketing = false`, che e' il
-- valore giusto -- quel consenso non gli e' mai stato chiesto -- e
-- `consenso_il = now()`, che invece e' una data FINTA: e' il momento
-- della migrazione, non quello della raccolta. Non c'e' modo di
-- ricostruire il vero, perche' non e' mai stato scritto. Per quelle
-- righe fa fede `creata_il`, che c'e' da sempre ed e' quello vero.
--
-- RLS. La tabella ce l'ha gia' accesa con tre policy (inserimento
-- pubblico limitato a `stato = 'nuova'`, lettura ai soli autenticati,
-- scrittura ai soli amministratori). L'`enable` qui sotto e' quindi un
-- no-op, e sta scritto lo stesso: la regola 3 del CLAUDE.md e' che la
-- RLS si accende nella stessa migrazione che tocca la tabella, e una
-- riga innocua che rende la cosa verificabile leggendo il file vale
-- piu' di una riga risparmiata. Le policy esistenti coprono anche le
-- colonne nuove: sono per riga, non per colonna.

alter table public.richieste
  add column if not exists marketing boolean not null default false;

alter table public.richieste
  add column if not exists consenso_il timestamptz not null default now();

comment on column public.richieste.marketing is
  'Spunta facoltativa e NON pre-selezionata: il visitatore acconsente a ricevere '
  'offerte e novita'' via email dopo la chiusura della richiesta. false = non ha '
  'spuntato, oppure la richiesta e'' anteriore alla comparsa della spunta.';

comment on column public.richieste.consenso_il is
  'Istante in cui l''informativa e'' stata mostrata e la scelta registrata, messo '
  'dal server e non dal browser (art. 7(1) GDPR: il consenso va dimostrato). '
  'Sulle righe anteriori alla migrazione vale la data della migrazione, non quella '
  'della raccolta: per quelle fa fede creata_il.';

alter table public.richieste enable row level security;
