-- ═══════════════════════════════════════════════════════════════════
-- LA MEMORIA DEI CARICAMENTI VERSO GOOGLE ADS E META
-- ═══════════════════════════════════════════════════════════════════
--
-- PERCHE'. Il pagamento si conclude dentro Regiondo, su un dominio non
-- nostro: Safari cancella i cookie di terze parti e chi paga con 3DS
-- esce dal sito. Misurato: Regiondo registra circa 97 prenotazioni
-- dirette al mese, Google Ads ne vede 1. Il lavoro notturno
-- (`src/app/api/conversioni/notturno/route.ts`) rimanda quelle vendite
-- alle due piattaforme, con le impronte SHA-256 degli identificativi.
--
-- Questa tabella e' la sua memoria: senza, ogni notte ripartirebbero le
-- stesse prenotazioni. Google e Meta scarterebbero i doppioni per conto
-- loro -- ed e' vero -- ma il tetto di chiamate si consumerebbe lo
-- stesso, i rapporti diventerebbero illeggibili, e soprattutto non ci
-- sarebbe piu' modo di rispondere alla domanda che conta il giorno in
-- cui qualcosa va storto: quali righe sono partite davvero.
--
-- LA REGOLA. Si scrive `esito = 'ok'` SOLO quando il destinatario ha
-- accettato. Un caricamento fallito lascia `esito = 'rifiutata'`, che
-- NON conta come fatto: la notte dopo si riprova, e se stavolta passa
-- l'upsert sostituisce la riga. Segnare prima e correggere dopo
-- perderebbe per sempre le righe di ogni caricamento andato male.
--
-- COSA NON C'E' DENTRO. Nessuna email, nessun telefono, nessun nome,
-- nemmeno la loro impronta. Solo il numero d'ordine di Regiondo,
-- l'importo e le date. Le impronte esistono per il tempo di una
-- chiamata HTTP e non vengono mai scritte: una tabella di impronte
-- sarebbe un archivio di identificativi personali (pseudonimizzati, non
-- anonimi) da custodire, giustificare e cancellare a richiesta. Qui non
-- serve, quindi non c'e'.
--
-- RLS. Accesa in questa stessa migrazione, come vuole la regola 3 del
-- CLAUDE.md, e con UNA sola policy: lettura ai soli amministratori.
-- Nessuna policy di scrittura, di proposito -- a scrivere e' il lavoro
-- notturno con la chiave di servizio, che la RLS la scavalca per
-- definizione. La chiave pubblicabile finisce nel browser: da li' questa
-- tabella dev'essere muta.

create table if not exists public.conversioni_caricate (
  -- Il numero d'ordine di Regiondo. E' anche il `transactionId` mandato
  -- a Google e l'`event_id` mandato a Meta: e' cosi' che le due
  -- piattaforme riconoscono i doppioni fra il tag del browser e questo
  -- caricamento. Un numero solo, ovunque.
  ordine text not null check (length(ordine) between 3 and 64),

  destinatario text not null check (destinatario in ('google', 'meta')),

  esito text not null check (esito in ('ok', 'rifiutata')),

  -- L'importo dell'ordine intero. Un ordine con due righe da 129 e 89
  -- vale 218: le righe si sommano prima di partire, se no si conta meta'
  -- fatturato.
  valore numeric(10, 2) check (valore is null or valore >= 0),

  valuta text not null default 'EUR' check (valuta ~ '^[A-Z]{3}$'),

  -- Quando la prenotazione e' nata su Regiondo, non quando l'abbiamo
  -- caricata. Serve a due cose: capire quanto ritardo accumula il lavoro
  -- notturno, e sapere se una riga e' ancora dentro i sette giorni che
  -- Meta concede.
  creata_il timestamptz,

  caricata_il timestamptz not null default now(),

  -- Il motivo, quando e' andata male. Tagliato a 500 caratteri da chi
  -- scrive: i messaggi di Google sanno essere lunghissimi e qui serve
  -- capire cos'e' successo, non conservare il testo integrale.
  motivo text check (motivo is null or length(motivo) <= 500),

  -- La coppia, non il solo ordine: la stessa prenotazione va su tutte e
  -- due le piattaforme, e un errore su Meta non deve impedire di
  -- ricordare che Google l'aveva presa.
  primary key (ordine, destinatario)
);

comment on table public.conversioni_caricate is
  'Registro dei caricamenti verso Google Ads (Data Manager API) e Meta (Conversions '
  'API). Serve a non ricaricare due volte la stessa prenotazione. Solo esito = ''ok'' '
  'conta come fatto. Nessun dato personale: solo numero d''ordine, importo e date.';

comment on column public.conversioni_caricate.ordine is
  'Numero d''ordine di Regiondo. E'' anche il transactionId per Google e l''event_id '
  'per Meta: e'' la chiave con cui le due piattaforme scartano i doppioni rispetto ai '
  'tag del browser.';

comment on column public.conversioni_caricate.esito is
  '''ok'' = accettata dall''API del destinatario. NON vuol dire attribuita a una '
  'campagna: Google cerca per ognuna un clic sui propri annunci e scarta quelle che '
  'non ne hanno. ''rifiutata'' non conta come fatto e viene ritentata.';

-- Per la domanda che si fa davvero: "cosa e' stato caricato ieri, e
-- quanto valeva". Senza indice diventa una scansione dell'intera
-- tabella, che fra un anno sono decine di migliaia di righe.
create index if not exists conversioni_caricate_quando
  on public.conversioni_caricate (caricata_il desc);

-- Per ritrovare in fretta i tentativi ancora da recuperare.
create index if not exists conversioni_caricate_rifiutate
  on public.conversioni_caricate (destinatario, caricata_il desc)
  where esito = 'rifiutata';

alter table public.conversioni_caricate enable row level security;

-- Nessuna policy per `anon`: dal browser questa tabella non esiste.
-- `e_admin()` e' la stessa funzione che protegge `autorizzati` e le
-- modifiche a `richieste`.
drop policy if exists lettura_conversioni_caricate on public.conversioni_caricate;
create policy lettura_conversioni_caricate
  on public.conversioni_caricate
  for select
  to authenticated
  using (e_admin());
