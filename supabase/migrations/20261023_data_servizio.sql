/* LA DATA DEL SERVIZIO, CHE NON E' LA DATA DELLA RECENSIONE.
 *
 * Richiesta della proprieta', 23/10/2026: il meteo «del giorno del
 * servizio (non della recensione eh! importantissimo)». Giusto: una
 * recensione scritta il 21 parla di un tour fatto magari il 17, e il
 * tempo che conta e' quello del 17.
 *
 * 🔴 NELLE RECENSIONI DEI PORTALI QUESTA DATA NON C'E'. Viator e
 * Tripadvisor mostrano quando il cliente ha scritto; sul pubblico al
 * massimo il mese del viaggio. Quindi la colonna nasce VUOTA e si
 * riempie da fuori: dall'incrocio con le prenotazioni Regiondo (nome e
 * periodo), o a mano. Finche' e' vuota, il pannello mostra il meteo del
 * giorno di calendario e lo dice -- non finge di sapere quando e' stato
 * il tour.
 */
alter table public.coda_recensioni
  add column if not exists data_servizio date;

comment on column public.coda_recensioni.data_servizio is
  'Il giorno in cui il cliente ha FATTO il tour. Non e'' la data della recensione. I portali non la danno: si riempie da Regiondo o a mano.';
