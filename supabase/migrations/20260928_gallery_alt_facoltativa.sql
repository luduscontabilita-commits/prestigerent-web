/* ============================================================
   LA DESCRIZIONE (alt) DIVENTA FACOLTATIVA ANCHE NEL DATABASE
   ============================================================

   Il 28/09/2026 la proprieta' ha deciso che il caricamento non chiede
   piu' descrizione ne' didascalia, a nessun ruolo: «la guida non li
   inserirebbe mai». Il codice (commit b9d1fa9) salva `alt = ''`.

   Ma il vincolo nato con la tabella pretendeva da 3 a 300 caratteri:
       check (length(btrim(alt)) between 3 and 300)
   e ogni caricamento, della guida come dell'admin, veniva respinto con
   «violates check constraint gallery_images_alt_check». Il vincolo non
   era stato visto controllando lo schema prima della modifica: la query
   eseguiva due istruzioni e ne mostrava solo l'ultima.

   Si toglie il MINIMO e si tiene il MASSIMO: una descrizione vuota e'
   ammessa, una di mille caratteri incollata per sbaglio no. La colonna
   resta `not null`: vuota e' la stringa vuota, non NULL, cosi' il codice
   che la legge non deve distinguere due modi di dire «niente».
   ============================================================ */

alter table public.gallery_images
  drop constraint if exists gallery_images_alt_check;

alter table public.gallery_images
  add constraint gallery_images_alt_check
  check (length(alt) <= 300);
