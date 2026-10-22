/* LE RISPOSTE ALLE RECENSIONI.
 *
 * ── 🔴 PERCHE' UNA TABELLA A PARTE E NON DUE COLONNE SU `recensioni` ──
 * `recensioni` ha `lettura_recensioni` in SELECT a `public`: la legge il
 * sito, quindi la legge chiunque abbia la chiave pubblicabile, che sta
 * nel browser. Una bozza di risposta messa in quella riga sarebbe
 * leggibile da fuori PRIMA di essere approvata -- cioe' testo che parla
 * con la voce dell'azienda, pubblico per sbaglio.
 *
 * Qui invece non c'e' nessuna policy per `public`: solo `e_admin()`. La
 * bozza esce da questa tabella soltanto quando qualcuno la pubblica, e
 * allora la pubblica sul portale, non sul sito.
 *
 * ── PERCHE' LA RISPOSTA NON E' UN CAMPO SOLO ───────────────────────────
 * Servono tre cose diverse, e tenerle insieme le confonde:
 *   - `testo`      quello che il modello ha scritto, intatto;
 *   - `corretto`   quello che la persona ha corretto a mano (se l'ha fatto);
 *   - `stato`      dove siamo: bozza -> approvata -> pubblicata.
 * Senza `corretto` separato, la prima correzione cancellerebbe la prova di
 * cosa aveva scritto il modello, e non si potrebbe piu' capire se i criteri
 * funzionano o se ogni risposta va riscritta a mano.
 *
 * ── PERCHE' SI SEGNA IL COSTO RIGA PER RIGA ───────────────────────────
 * Regola della proprieta': accanto a ogni pulsante che consuma API ci va
 * scritto quanto costa. Un totale globale non basta -- serve il costo
 * VERO della singola chiamata, e OpenRouter lo restituisce. Qui si
 * conserva: cosi' la schermata somma e dice "finora hai speso X", con un
 * numero misurato e non una stima.
 */

create table if not exists public.risposte_recensioni (
  recensione_id bigint primary key
    references public.recensioni (id) on delete cascade,

  /* quello che ha scritto il modello, mai sovrascritto */
  testo text not null,
  /* la correzione a mano: null finche' nessuno tocca niente */
  corretto text,

  /* bozza: scritta, nessuno l'ha guardata
     approvata: una persona l'ha letta e va bene, ma non e' ancora sul portale
     pubblicata: e' online (su Google via API, o incollata a mano altrove)
     scartata: non va bene e non si ripropone */
  stato text not null default 'bozza'
    check (stato in ('bozza', 'approvata', 'pubblicata', 'scartata')),

  /* quale modello l'ha scritta e quanto e' costata DAVVERO quella
     chiamata, in euro (OpenRouter torna il costo reale con
     usage.include) */
  modello text,
  costo numeric(10, 6) default 0,

  /* chi ha approvato o pubblicato, e quando: una risposta pubblica e'
     un atto, e si deve sapere di chi e' */
  chi uuid references auth.users (id),
  creata timestamptz not null default now(),
  aggiornata timestamptz not null default now()
);

/* La schermata chiede sempre "quelle da guardare": l'indice e' su `stato`. */
create index if not exists risposte_recensioni_stato
  on public.risposte_recensioni (stato);

alter table public.risposte_recensioni enable row level security;

/* 🔴 NESSUNA POLICY PER `public` O `anon`, ED E' IL PUNTO DI QUESTA
   TABELLA: senza una policy che lo permetta, RLS nega. La chiave
   pubblicabile che sta nel browser qui non legge niente. */
drop policy if exists risposte_solo_admin on public.risposte_recensioni;
create policy risposte_solo_admin
  on public.risposte_recensioni
  for all
  to authenticated
  using (public.e_admin())
  with check (public.e_admin());

/* `aggiornata` a mano non si ricorda mai: la scrive il database. */
create or replace function public.tocca_risposte_recensioni()
returns trigger
language plpgsql
as $$
begin
  new.aggiornata := now();
  return new;
end;
$$;

drop trigger if exists tocca_risposte on public.risposte_recensioni;
create trigger tocca_risposte
  before update on public.risposte_recensioni
  for each row execute function public.tocca_risposte_recensioni();
