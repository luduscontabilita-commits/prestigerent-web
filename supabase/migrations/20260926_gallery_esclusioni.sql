/* ============================================================
   FUORI DAL REGISTRO /destinations/ E /transfers/.
   ============================================================

   DECISIONE DELLA PROPRIETA', 26/09/2026, in due passaggi: la gallery
   non va sulle pagine il cui indirizzo contiene `/destinations/` ne' su
   quelle il cui indirizzo contiene `/transfers/`. Sono ventuno pagine di
   categoria su trentasei, contate una per una su `CATEGORIE` in
   src/lib/categorie.ts.

   LE NOVE SOTTO /destinations/ (era l'intero tipo `dest`, piu' la sua
   pagina madre che era di tipo `cat`):
       /destinations/
       /destinations/florence-tuscany/
       /destinations/rome-destinations/
       /destinations/venice-destinations/
       /destinations/milan-como-destinations/
       /destinations/naples-amalfi-coast/
       /destinations/livorno-port-destinations/
       /destinations/la-spezia-destinations/
       /destinations/civitavecchia-destinations/

   LE DODICI SOTTO /transfers/ (l'intero tipo `transfer`, piu' le tre
   pagine contenitore che erano di tipo `cat`):
       /transfers/
       /transfers/direct-transfers/
       /transfers/direct-transfers/florence-direct-transfers/
       /transfers/direct-transfers/rome-direct-transfers/
       /transfers/direct-transfers/milan-direct-transfers/
       /transfers/direct-transfers/venice-direct-transfers/
       /transfers/direct-transfers/naples/
       /transfers/transfers-with-stop-enroute/
       /transfers/transfers-with-stop-enroute/florence-to-rome/
       /transfers/transfers-with-stop-enroute/florence-to-venice/
       /transfers/transfers-with-stop-enroute/florence-to-milan/
       /transfers/transfers-with-stop-enroute/rome-to-naples/

   DUE TIPI SPARISCONO, `dest` e `transfer`: non hanno piu' nessuna
   pagina, e lasciarli fra i valori ammessi vorrebbe dire tenere due
   opzioni che nessuno puo' usare e che il prossimo che legge lo schema
   deve stare a interpretare. I valori diventano quattro.

   IL REGISTRO PASSA DA 124 A 103 TAG:
       1 home + 5 cat + 10 port + 87 tour

   Le cinque `cat` che restano sono /small-group-tours/, /private-tours/,
   /wine-and-food-experiences/, /cruise-port-tours/ e /tours-of-italy/.

   🔴 I TRANSFER COME PRODOTTO RESTANO DENTRO, ed e' una conseguenza da
   sapere. La regola e' sull'INDIRIZZO, e le schede dei singoli transfer
   stanno sotto `/tour/<slug>/`, non sotto `/transfers/`: sono 32 delle
   87 righe di `tours` (`kind = 'transfer'`), e continuano a poter avere
   una gallery. Esce la pagina che ELENCA i transfer da Firenze, non la
   scheda del transfer Firenze-Roma. Se anche quelle devono uscire e' una
   riga in piu' nel sincronizzatore, non un'altra migrazione.

   LE PAGINE RESTANO SUL SITO. Questa migrazione non tocca niente di
   pubblico: `/destinations/...` e `/transfers/...` rispondono come
   prima, con i loro tour e i loro testi. Cambia solo che non possono
   ospitare una gallery, e quindi non compaiono nel menu di chi carica
   le foto.

   NIENTE DA CANCELLARE. `gallery_tags` ha zero righe: il registro non e'
   ancora stato riempito (lo riempira' il pulsante "Sincronizza pagine"
   del pannello). Quindi qui non si perde il lavoro di nessuno -- si
   stringe una regola prima che ci sia qualcosa da rompere. Se la
   decisione fosse arrivata a registro pieno, prima di stringere il
   vincolo si sarebbe dovuto controllare che nessuna foto fosse attaccata
   a quei ventuno tag, e decidere cosa farne.

   PER TORNARE INDIETRO: rimettere 'dest' e 'transfer' fra i valori del
   vincolo, e togliere le due esclusioni dal sincronizzatore.
   ============================================================ */

alter table public.gallery_tags
  drop constraint if exists gallery_tags_type_check;

alter table public.gallery_tags
  add constraint gallery_tags_type_check
  check (type in ('home', 'cat', 'tour', 'port'));

/* Il commento della tabella diceva 124 voci e nominava destinazioni e
   transfer: era la descrizione giusta stamattina. Si riscrive, invece di
   lasciare due numeri diversi nello stesso database. */
comment on table public.gallery_tags is
  'Il registro delle pagine che possono avere una gallery: 103 voci (home, 5 '
  'categorie, 10 porti, 87 tour). ESCLUSE le nove pagine sotto /destinations/ e le '
  'dodici sotto /transfers/ (decisione della proprieta'' del 26/09/2026), le '
  'istituzionali, le legali, le landing e il pannello. Le SCHEDE dei singoli '
  'transfer restano dentro: stanno sotto /tour/, non sotto /transfers/. Popolato dal '
  'pulsante "Sincronizza pagine". Le righe orfane con foto attaccate non si '
  'cancellano mai automaticamente.';
