-- FLOTTA: SI MODIFICANO ANCHE IL NOME, E LA SECONDA RIGA PER INTERO (12/10/2026).
--
-- La proprieta' ha chiesto di modificare la riga sotto la descrizione
-- «per intero, non a porzioni»: nota sui posti e bagagli diventano un
-- solo testo, `dettagli`. E di poter cambiare il nome di ogni mezzo,
-- `nome`. Vedi src/lib/flotta.ts (CAMPI_TESTO).
--
-- Tocca solo il vincolo sui nomi dei campi di `flotta_testi`, nata lo
-- stesso giorno e vuota quando questa e' stata applicata: nessuna riga
-- con i campi vecchi (`notaPosti`, `bagagli`) da sistemare.

alter table public.flotta_testi
  drop constraint flotta_testi_campo_check,
  add constraint flotta_testi_campo_check
    check (campo in ('nome', 'tipo', 'descrizione', 'dettagli', 'suRichiesta'));
