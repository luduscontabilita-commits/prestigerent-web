/* LA DATA DELLA RECENSIONE, E PERCHE' SERVIVA DAVVERO.
 *
 * Mancava, e si pensava non servisse: in coda c'era gia' `creata` (quando
 * la riga e' entrata qui). Ma quella e' la data NOSTRA, non la sua.
 *
 * 🔴 IL PROBLEMA CHE RISOLVE, posto dalla proprieta' il 23/10/2026:
 * «come faccio a vedere senza indirizzo della singola? ci serve un
 * ordine allora». Viator NON ha un indirizzo per la singola recensione:
 * per ritrovarne una nel portale bisogna scorrere cinque pagine da dieci.
 *
 * L'elenco del portale pero' e' ordinato per DATA, dalla piu' recente.
 * Quindi basta tenere la data e ordinare il pannello allo stesso modo:
 * la riga che in pannello e' la ventinovesima, nel portale sta a pagina 3
 * in nona posizione. Non e' un link, ma e' un indirizzo.
 */

alter table public.coda_recensioni
  add column if not exists data_recensione date;

/* l'ordine che conta e' quello del portale: dalla piu' recente */
create index if not exists coda_recensioni_data
  on public.coda_recensioni (data_recensione desc nulls last);

comment on column public.coda_recensioni.data_recensione is
  'La data che il portale mostra accanto alla recensione. Serve a ritrovarla: l''elenco di Viator e'' ordinato per data, e senza un link alla singola recensione la posizione in quell''ordine e'' l''unico modo di dire dove sta.';
