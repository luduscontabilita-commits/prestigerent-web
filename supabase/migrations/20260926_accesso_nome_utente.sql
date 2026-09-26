/* ============================================================
   L'ACCESSO CON NOME UTENTE E PASSWORD.
   ============================================================

   COSA CAMBIA. Il pannello si apre con NOME UTENTE + PASSWORD invece che
   con il link via email. I ruoli restano due, `admin` e `guida`, e sono
   gia' quelli su cui tutto il pannello controlla i permessi: e' la
   ragione per cui questo passaggio tocca l'ACCESSO e non i PERMESSI.

   🔴 SOLO AGGIUNTE. Nessun `drop`, nessun `cascade`, nessuna tabella
   ricreata. Non e' prudenza generica:

     - `profili`, `autorizzati`, `e_admin()` e `crea_profilo()` NON stanno
       in nessun file di questa cartella: esistono solo nel database,
       creati a mano il 25/08/2026. Una migrazione "che li versiona"
       ricreandoli cancellerebbe le righe vere;
     - **29 policy su 24 tabelle** dipendono da `e_admin()` -- fra cui
       `scrittura_seo`, `solo_admin_wp` (unica policy di `seo_wordpress`,
       che senza non si legge piu' affatto) e `scrittura_contenuti` su
       `tour_content`, che e' quella che usa il riordino delle foto dei
       tour. Un `drop function e_admin() cascade` le porterebbe via tutte,
       e il guasto si vedrebbe come "il pannello non salva piu'", non come
       un errore;
     - `profili.id` ha `on delete cascade` verso `auth.users`, e
       `gallery_images.uploaded_by` ha `on delete set null` verso
       `profili`: cancellare e ricreare un utente azzererebbe la
       paternita' delle foto gia' caricate.

   🔴 QUESTA MIGRAZIONE VA APPLICATA **PRIMA** DEL PUSH DEL CODICE.
   `chiSono()` (src/lib/auth.ts) ignora l'errore di lettura: se il codice
   nuovo chiedesse `username` prima che la colonna esista, PostgREST
   risponderebbe 42703, `chiSono()` tornerebbe `null` e il pannello
   rimanderebbe alla schermata di accesso TUTTI E TRE gli admin, con il
   database perfettamente sano. Essendo solo aggiuntiva, questa migrazione
   non rompe il codice vecchio: fra i due passi il sito continua a
   funzionare com'e'.

   PER TORNARE INDIETRO:
     alter table public.profili     drop column if exists username;
     alter table public.autorizzati drop column if exists username, drop column if exists contatto;
     (e si rimette la versione precedente di crea_profilo(), qui sotto in
      fondo nel commento)
   ============================================================ */


/* ---- 1. il nome utente -------------------------------------------
   Sta in TUTTE E DUE le tabelle, e non e' un doppione:
     - `autorizzati` e' l'elenco di chi puo' entrare, ed e' li' che
       l'admin scrive quando crea una guida. E' la fonte.
     - `profili` e' quello che il sito legge a ogni richiesta. Ce lo
       copia il trigger al primo accesso, esattamente come fa gia' con
       `ruolo` e `nome`.
   Tenerlo solo in `autorizzati` vorrebbe dire una seconda lettura a ogni
   pagina del pannello per sapere come si chiama chi sta guardando. */

alter table public.profili     add column if not exists username text;
alter table public.autorizzati add column if not exists username text;

/* Il contatto VERO della guida -- la sua email personale, se ce l'ha.
   Separata dall'identita' di accesso di proposito: l'email con cui si
   entra e' interna e non riceve niente (vedi il punto 3), mentre a questa
   si puo' scrivere. Oggi non la usa ancora nessuno; serve il giorno che
   si vuole avvisare una guida per email invece che a voce. */
alter table public.autorizzati add column if not exists contatto text;

/* MINUSCOLO E SENZA SPAZI, e unico senza distinguere le maiuscole:
   `Mario` e `mario` devono essere la stessa persona, o due account
   diversi si contendono lo stesso nome e nessuno capisce perche' non
   entra. L'indice e' parziale (`where username is not null`) perche' i
   profili che non ne hanno ancora uno non devono scontrarsi fra loro. */
create unique index if not exists profili_username_unico
  on public.profili (lower(username)) where username is not null;
create unique index if not exists autorizzati_username_unico
  on public.autorizzati (lower(username)) where username is not null;

/* Il formato: comincia con lettera o cifra, poi lettere, cifre, punto,
   trattino, trattino basso. Da 3 a 32 caratteri. Niente `@`, che e' il
   carattere con cui la schermata di accesso distingue un nome utente da
   un'email: un nome utente che lo contenesse verrebbe trattato come
   indirizzo e non entrerebbe mai. */
alter table public.profili drop constraint if exists profili_username_formato;
alter table public.profili add constraint profili_username_formato
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

alter table public.autorizzati drop constraint if exists autorizzati_username_formato;
alter table public.autorizzati add constraint autorizzati_username_formato
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');

comment on column public.profili.username is
  'Il nome con cui si entra. Copiato da autorizzati dal trigger crea_profilo() al primo '
  'accesso. Unico senza distinguere le maiuscole. Per i tre admin e'' un alias della '
  'loro email vera; per le guide e'' la prima parte dell''email interna.';

comment on column public.autorizzati.contatto is
  'L''email VERA della persona, per scriverle. NON e'' l''indirizzo con cui entra: '
  'quello e'' interno e non riceve posta, apposta.';


/* ---- 2. il trigger copia anche il nome utente --------------------
   `crea_profilo()` inserisce oggi esattamente (id, email, nome, ruolo).
   Va esteso, e va fatto QUI: se `username` fosse NOT NULL senza che il
   trigger lo riempia, ogni creazione di utente fallirebbe dentro il
   trigger e Supabase risponderebbe "Database error saving new user"
   senza creare niente -- l'errore che la schermata di accesso traduce
   gia' in "questo indirizzo non e' abilitato", cioe' un messaggio che
   parlerebbe di tutt'altro.

   `create or replace`, non `drop function`: il trigger `al_primo_accesso`
   resta agganciato a questa funzione e non va ricreato.

   LA VERSIONE PRECEDENTE, per tornare indietro:
     insert into profili (id, email, nome, ruolo)
     values (new.id, new.email, n, r) on conflict (id) do nothing;          */
create or replace function public.crea_profilo()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $fn$
declare
  r text;
  n text;
  u text;
begin
  select ruolo, nome, username into r, n, u
    from autorizzati
   where lower(email) = lower(new.email);

  if r is null then
    raise exception 'Questo indirizzo non e'' abilitato ad accedere.';
  end if;

  insert into profili (id, email, nome, ruolo, username)
  values (new.id, new.email, n, r, u)
  on conflict (id) do nothing;

  return new;
end;
$fn$;


/* ---- 3. i tre admin ----------------------------------------------
   I tre account esistenti tengono la loro EMAIL VERA come identita' di
   accesso: non si rinomina niente. `auth.identities` ha una colonna
   `email` generata da `identity_data->>'email'`, e un rename fatto con
   SQL su `auth.users` la lascerebbe indietro -- con il risultato di non
   rientrare piu' ne' col vecchio indirizzo ne' col nuovo.

   Il nome utente qui e' un ALIAS: la schermata di accesso lo traduce
   nell'email con tre costanti nel codice, senza chiedere niente al
   database. Il perche' sta nel punto 4.

   `nome` va riempito anche per gli altri due: la coda di approvazione
   mostra `nome ?? email`, e con l'email interna delle guide a schermo
   finirebbe un indirizzo finto invece di una persona. */
update public.autorizzati set username = 'admin',   nome = coalesce(nome, 'Ufficio Prestige Rent')
  where lower(email) = 'usa@prestigerent.com';
update public.autorizzati set username = 'filippo', nome = coalesce(nome, 'Filippo Montomoli')
  where lower(email) = 'filippo.montomoli@gmail.com';
update public.autorizzati set username = 'michele', nome = coalesce(nome, 'Michele Mocciola')
  where lower(email) = 'michele.mocciola.ing@gmail.com';

update public.profili set username = 'admin',   nome = coalesce(nome, 'Ufficio Prestige Rent')
  where lower(email) = 'usa@prestigerent.com';
update public.profili set username = 'filippo', nome = coalesce(nome, 'Filippo Montomoli')
  where lower(email) = 'filippo.montomoli@gmail.com';
update public.profili set username = 'michele', nome = coalesce(nome, 'Michele Mocciola')
  where lower(email) = 'michele.mocciola.ing@gmail.com';


/* ---- 4. il dominio interno delle guide ---------------------------
   Una guida entra con `mario` e la schermata compone da se'
   `mario@guide.prestigerent.invalid`. Non c'e' nessuna lettura al
   database prima dell'accesso, ed e' voluto: un endpoint che traducesse
   il nome utente in email sarebbe raggiungibile senza essere entrati, e
   direbbe a chiunque quali nomi esistono -- un oracolo per indovinare
   gli account e per provarli in massa.

   PERCHE' `.invalid` E NON `@prestigerent.com`: `.invalid` e' riservato
   dallo standard (RFC 2606) e non esistera' mai. Quell'indirizzo non
   puo' ricevere niente, quindi il recupero password via email su un
   account guida e' impossibile per costruzione -- e non per una
   configurazione che qualcuno potrebbe cambiare. Con un dominio vero
   basterebbe una casella attiva, o un catch-all, per prendersi un
   account guida senza conoscerne la password. */
comment on table public.autorizzati is
  'Chi puo'' entrare nel pannello. I tre admin con la loro email vera; le guide con '
  'un''email interna <username>@guide.prestigerent.invalid, che per costruzione non '
  'riceve posta (RFC 2606): su quegli account il recupero via email e'' impossibile. '
  'Il contatto vero della persona sta nella colonna `contatto`.';


/* ---- 5. disattivare una guida deve valere ANCHE per le sue foto ---
   `lettura_gallery_images_mie` oggi dice solo `uploaded_by = auth.uid()`:
   una guida disattivata (`profili.attivo = false`) non entra piu' nel
   pannello -- `chiSono()` la esclude -- ma se avesse ancora una sessione
   valida nei cookie, quella policy le lascerebbe comunque leggere le
   proprie righe. `e_caricatore()` controlla gia' `attivo`, quindi
   aggiungerlo rende "disattivato" la stessa cosa in tutte le policy.
   E' la differenza fra chiudere una porta e chiuderle tutte. */
drop policy if exists "lettura_gallery_images_mie" on public.gallery_images;
create policy "lettura_gallery_images_mie" on public.gallery_images
  for select to authenticated
  using (e_caricatore() and uploaded_by = auth.uid());
