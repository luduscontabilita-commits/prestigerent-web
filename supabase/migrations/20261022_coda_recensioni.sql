/* LA CODA DELLE RECENSIONI DAI PORTALI.
 *
 * ── 🔴 PERCHE' NON SI USA LA TABELLA `recensioni` ─────────────────────
 * `recensioni` e' quello che il SITO mostra: 494 righe, 488 da Regiondo,
 * leggibili da chiunque abbia la chiave pubblicabile. Queste sono un'altra
 * cosa: sono il lavoro da fare. Arrivano da Viator, Tripadvisor e
 * GetYourGuide, sono circa 400 al mese, e per gran parte del loro ciclo di
 * vita contengono una bozza NON approvata -- testo che parla con la voce
 * dell'azienda e che nessuno ha ancora letto. Non puo' stare in una
 * tabella pubblica.
 *
 * ── COSA SI SA E QUANDO ───────────────────────────────────────────────
 * Misurato il 22/10/2026 sulle email vere a usa@prestigerent.com:
 *   - Viator manda un RIEPILOGO al giorno (verso le 15:16 italiane) con,
 *     per ogni recensione: prodotto, TITOLO, voto, fonte e il link per
 *     rispondere. Dentro ci sono anche le recensioni Tripadvisor.
 *   - GetYourGuide manda una notifica per OGNI recensione, subito.
 *   - 🔴 In nessuna delle due c'e' il TESTO della recensione.
 * Per questo `testo` nasce vuoto: si riempie quando si apre il portale.
 * Lo stato dice a che punto siamo, e niente va avanti da solo.
 *
 * ── PERCHE' `pubblicare_il` E NON «pubblica subito» ───────────────────
 * Diciotto risposte pubblicate nello stesso minuto si vedono: sono una
 * raffica, e una raffica dice «qui non c'e' nessuno, c'e' un programma».
 * Ogni riga si prende il suo momento, estratto a caso dentro una finestra
 * e mai di notte (il calcolo sta in src/lib/attesa.ts, cosi' si puo'
 * provare senza pubblicare niente).
 */

create table if not exists public.coda_recensioni (
  id bigserial primary key,

  /* da dove viene DAVVERO la recensione: dentro il riepilogo Viator
     arrivano anche quelle Tripadvisor, e rispondere su Viator copre
     entrambe -- ma sapere quale delle due e' cambia il tono e il posto
     dove la risposta si vedra' */
  fonte text not null check (fonte in ('viator', 'tripadvisor', 'getyourguide')),
  /* il portale su cui si pubblica: per viator e tripadvisor e' lo stesso */
  portale text not null check (portale in ('viator', 'getyourguide')),

  prodotto text,
  titolo text,
  voto numeric(2, 1),
  autore text,
  lingua text,

  /* il testo della recensione: NULL finche' non si apre il portale */
  testo text,

  /* il link «Respond to review» preso dall'email: porta esattamente alla
     recensione giusta, e risparmia di cercarla in mezzo a centinaia */
  link_risposta text,
  /* l'identificativo che da' la piattaforma, quando c'e' (GetYourGuide lo
     mette nell'oggetto). Serve a non inserire due volte la stessa. */
  id_esterno text,

  stato text not null default 'nuova'
    check (stato in ('nuova', 'letta', 'bozza', 'approvata', 'pubblicata', 'saltata')),

  risposta text,
  corretto text,
  modello text,
  costo numeric(10, 6) default 0,

  /* quando tocca a questa: lo decide il calcolo del ritardo, non l'uomo */
  pubblicare_il timestamptz,
  pubblicata_il timestamptz,

  chi uuid references auth.users (id),
  vista_il timestamptz not null default now(),
  creata timestamptz not null default now(),
  aggiornata timestamptz not null default now()
);

/* 🔴 NIENTE DOPPIONI. Il riepilogo Viator ripete le stesse recensioni di
   giorno in giorno finche' non si risponde: senza questo vincolo, dopo
   una settimana la coda avrebbe sette copie di ogni riga. La coppia
   portale+titolo+prodotto e' quello che si ha SEMPRE (l'id esterno no). */
create unique index if not exists coda_recensioni_unica
  on public.coda_recensioni (portale, coalesce(prodotto, ''), coalesce(titolo, ''), coalesce(autore, ''));

create index if not exists coda_recensioni_stato on public.coda_recensioni (stato);
create index if not exists coda_recensioni_quando on public.coda_recensioni (pubblicare_il)
  where stato = 'approvata';

alter table public.coda_recensioni enable row level security;

/* come `risposte_recensioni`: nessuna policy per public o anon, quindi
   RLS nega a chi arriva dal browser con la chiave pubblicabile */
drop policy if exists coda_solo_admin on public.coda_recensioni;
create policy coda_solo_admin
  on public.coda_recensioni
  for all
  to authenticated
  using (public.e_admin())
  with check (public.e_admin());

drop trigger if exists tocca_coda on public.coda_recensioni;
create trigger tocca_coda
  before update on public.coda_recensioni
  for each row execute function public.tocca_risposte_recensioni();
