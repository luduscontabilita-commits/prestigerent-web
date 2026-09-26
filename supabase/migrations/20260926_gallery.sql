/* ============================================================
   LA GALLERY CON TAG: TABELLE, BUCKET E REGOLE D'ACCESSO.
   ============================================================

   COSA E'. Una striscia di fotografie che compare in fondo alle pagine
   del sito -- home, schede tour, categorie -- riempita da chi accompagna
   gli ospiti, non da chi scrive il codice. Ogni foto porta uno o piu'
   TAG, e un tag e' una pagina: la stessa foto puo' stare sulla scheda
   del tour di Siena e sulla pagina della categoria che lo contiene.

   🔴 NASCE SPENTA. `galleries_enabled` e' **false** in questa migrazione,
   e resta false finche' la proprieta' non dice il contrario. Il motivo
   non e' prudenza generica: fra questa migrazione e le fotografie
   approvate passeranno giorni, e una sezione accesa senza foto -- o con
   tre foto provvisorie -- finisce su un sito che Google sta scansionando.
   L'interruttore si accende quando c'e' qualcosa da mostrare.

   PERCHE' DUE BUCKET E NON UNO. Il bucket `media` di questo progetto e'
   pubblico, e va bene per le foto dei tour: le carica un admin e sono
   gia' approvate per definizione. Qui no: una guida carica dal telefono
   e un admin decide dopo. Su un bucket pubblico una foto in attesa --
   o RIFIUTATA -- sarebbe raggiungibile da chiunque ne indovini
   l'indirizzo, e "non e' linkata da nessuna parte" non e' una
   protezione. Quindi:

       gallery-inbox   PRIVATO.  Ci arriva tutto quello che carica una
                       guida. Si guarda solo con un URL firmato a
                       scadenza, che genera il server.
       gallery         PUBBLICO in lettura. Ci finisce un file solo
                       quando un admin lo approva: il file viene COPIATO
                       qui e tolto dall'inbox.

   Il vincolo `gallery_images_stato_bucket` qui sotto rende questa cosa
   una garanzia del database e non una convenzione del codice: una riga
   in attesa o rifiutata NON PUO' essere nel bucket pubblico, nemmeno per
   un errore di programmazione.

   🔴 CHI SCRIVE, E PERCHE' LE POLICY QUI SOTTO SONO LA DIFESA VERA.
   In questo progetto le server action del pannello NON usano la chiave
   segreta: nascono dai cookie di sessione con la chiave pubblicabile
   (vedi `supabaseServer()` in src/lib/auth.ts, e il commento in cima a
   src/app/admin/foto/azioni.ts). Il database vede quindi l'utente vero,
   e la RLS si applica davvero. Conseguenza: le policy qui sotto devono
   permettere esattamente quello che il pannello fa -- e, cosa piu'
   importante, un controllo di ruolo dimenticato nel codice non apre
   niente, perche' il database rifiuta comunque. La chiave segreta resta
   fuori dalla gallery: un percorso privilegiato in meno.

   I DUE RUOLI. Si usano quelli che esistono gia' in `profili`, senza
   aggiungerne: `admin` fa tutto e approva, `guida` carica e tagga le
   PROPRIE foto finche' sono in attesa o rifiutate. Il ruolo `guida` era
   previsto dall'inizio -- e' il default della colonna, e il pannello
   annuncia da mesi "In arrivo: caricamenti delle guide".

   I NOMI DELLE COLONNE SONO IN INGLESE, a differenza del resto del
   database, che li ha in italiano. Non e' distrazione: sono i nomi del
   piano approvato, ripresi uno per uno, e nel piano ci sono le regole
   scritte a parole intorno a `min_images`, `status`, `pinned`. Cambiarli
   qui vorrebbe dire tenere due vocabolari per la stessa cosa.

   PER TORNARE INDIETRO (niente di questo e' letto dal sito finche' la
   Fase 3 non lo aggancia ai template):
     drop view if exists public.gallery_public;
     drop table if exists public.gallery_image_tags, public.gallery_images,
                          public.gallery_tags, public.gallery_settings;
     drop function if exists public.e_caricatore();
     delete from storage.buckets where id in ('gallery','gallery-inbox');
   ============================================================ */


/* ---- 0. chi puo' caricare ----------------------------------------
   `e_admin()` esiste gia' e vale per l'approvazione. Qui serve la
   domanda piu' larga: "questa persona puo' mettere foto dentro?".
   `attivo` e' nella condizione perche' e' il modo con cui si chiude
   l'accesso a qualcuno senza cancellarne il profilo e perdere la
   paternita' delle foto che ha caricato. */
create or replace function public.e_caricatore()
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $fn$
  select exists (
    select 1 from profili
    where id = auth.uid() and attivo and ruolo in ('admin', 'guida')
  );
$fn$;

comment on function public.e_caricatore() is
  'Vero per un profilo attivo con ruolo admin o guida. e_admin() resta la '
  'condizione per approvare, cambiare le impostazioni e toccare le foto altrui.';

/* 🔴 SENZA QUESTA RIGA LA FUNZIONE E' CHIAMABILE DA CHI NON HA FATTO
   L'ACCESSO. Supabase pubblica ogni funzione dello schema `public` su
   /rest/v1/rpc. Con `anon` tornerebbe sempre false (`auth.uid()` e'
   null), quindi non direbbe niente a nessuno -- ma e' una SECURITY
   DEFINER raggiungibile senza accesso, cioe' superficie in piu' senza un
   motivo, e l'advisor di sicurezza di Supabase la segnala.
   `e_admin()` era gia' chiusa cosi': queste due funzioni devono avere
   gli stessi diritti, o la differenza diventa una domanda senza
   risposta fra sei mesi.

   🔴 E' `from public`, NON `from anon`. Sbagliato al primo tentativo il
   26/09/2026: `revoke ... from anon` e' andato a buon fine e non ha
   cambiato NIENTE, perche' `anon` quel diritto non ce l'ha per se' --
   lo EREDITA dal grant automatico a PUBLIC che Postgres mette su ogni
   funzione nuova. Togliere un diritto a chi non lo possiede riesce senza
   errori: se ci si ferma al "success" si crede di aver chiuso una porta
   che e' ancora aperta. Si e' visto solo rileggendo `proacl`, dove
   l'ACL di e_admin() non ha la voce di PUBLIC (`=X/postgres`) e la mia
   ce l'aveva. `authenticated` ha il suo grant esplicito e non viene
   toccato: il pannello continua a funzionare. */
revoke execute on function public.e_caricatore() from public;


/* ---- 1. le impostazioni: una riga sola ---------------------------
   Il `check (id = 1)` insieme alla chiave primaria e' quello che rende
   impossibile una seconda riga. Senza, il giorno che per sbaglio ne
   nascono due il sito legge quella che capita e nessuno capisce perche'
   l'interruttore "non funziona". */
create table if not exists public.gallery_settings (
  id smallint primary key default 1 check (id = 1),

  /* 🔴 FALSE. Vedi il banner in cima. */
  galleries_enabled boolean not null default false,

  /* Quante foto approvate servono perche' una pagina mostri la gallery.
     Sotto questa soglia la pagina non rende NIENTE: niente titolo,
     niente contenitore, niente spazio vuoto. Tre e' il minimo per cui
     una striscia sembra una scelta e non un caricamento a meta'. */
  min_images int not null default 3 check (min_images between 1 and 50),

  /* Il titolo, con la sintassi `*parola*` che il sito usa per la parola
     in corsivo (diventa <em class="hl place">), la stessa di
     "What our guests actually *say*". */
  default_title text not null default 'Moments from the *road*',
  default_subtitle text,

  /* DUE TITOLI PREDEFINITI, e non uno.
     Sulle schede tour in cima c'e' GIA' una striscia di fotografie: sono
     le foto del prodotto, gestite da /admin/foto. La gallery sotto le
     recensioni e' una seconda striscia, e due strisce con lo stesso
     titolo sulla stessa pagina sembrano un errore. Quelle di qui sono le
     foto delle giornate vere, e il titolo deve dirlo. Senza questa
     coppia l'alternativa era scrivere un titolo a mano su 87 schede. */
  default_title_tour text not null default 'On this tour, by our *guests*',
  default_subtitle_tour text,

  autoplay_speed text not null default 'medium'
    check (autoplay_speed in ('slow', 'medium', 'fast')),

  /* L'ordine con cui le foto escono, quando la pagina non dice altro.
     'daily_random' e' mescolato ma UGUALE PER TUTTO IL GIORNO: il seme e'
     il tag piu' la data. Un ordine diverso a ogni visita renderebbe le
     pagine non mettibili in cache (home 900s, tour 3600s) e farebbe
     saltare le foto di posto fra il server e il browser. */
  default_sort text not null default 'manual'
    check (default_sort in ('manual', 'newest', 'oldest', 'daily_random', 'alternate')),

  updated_at timestamptz not null default now()
);

comment on table public.gallery_settings is
  'Impostazioni globali delle gallery: una riga sola (id = 1). galleries_enabled '
  'nasce false di proposito e si accende solo quando ci sono foto approvate.';

insert into public.gallery_settings (id) values (1) on conflict (id) do nothing;

alter table public.gallery_settings enable row level security;

/* Lettura aperta: qui non c'e' niente da nascondere -- un interruttore,
   una soglia e due titoli che comunque finiscono nell'HTML della pagina.
   Il sito pubblico legge con la chiave pubblicabile e questa riga gli
   serve per sapere se disegnare la sezione. */
drop policy if exists "lettura_gallery_settings" on public.gallery_settings;
create policy "lettura_gallery_settings" on public.gallery_settings
  for select to public using (true);

drop policy if exists "scrittura_gallery_settings" on public.gallery_settings;
create policy "scrittura_gallery_settings" on public.gallery_settings
  for all to authenticated using (e_admin()) with check (e_admin());


/* ---- 2. il registro delle pagine ---------------------------------
   Un tag = una pagina del sito dove la gallery puo' comparire. Sono 124:
   la home, 36 pagine di categoria/porto/destinazione/transfer e 87
   schede tour. Le pagine istituzionali (about-us, contact-us, faqs,
   our-vehicles, guest-photos), quelle legali, le landing e il pannello
   NON stanno qui: non avranno mai una gallery, e un tag che non si puo'
   usare e' solo una voce in piu' da spiegare nel menu di chi carica.

   LA CHIAVE E' LEGGIBILE, L'IDENTITA' E' `ref_id`.
   `key` ('tour:wine-experience-in-tuscany') si legge a voce e finisce
   nei tag di cache. Ma uno slug puo' cambiare, ed e' successo su questo
   sito. Per i tour la riga porta anche `ref_id`, che e' `tours.id`: se
   domani lo slug cambia, la sincronizzazione aggiorna `key` e `path` e
   le foto restano attaccate alla pagina giusta. */
create table if not exists public.gallery_tags (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,

  /* Nessun tipo 'page': le pagine che non sono prodotto sono escluse dal
     registro, quindi il tipo non serve a nessuno. */
  type text not null check (type in ('home', 'cat', 'tour', 'port', 'dest', 'transfer')),

  /* Il nome che si legge nel pannello, in italiano: "Tour · Wine
     Experience in Tuscany". Chi carica dal telefono non deve mai vedere
     una chiave tecnica. */
  label text not null,

  /* L'indirizzo pubblico con la barra finale, come tutto il resto del
     sito (`trailingSlash: true`). Serve al link "apri pagina". */
  path text not null,

  /* `on delete set null` e non `cascade`: se un tour sparisce dal
     catalogo le sue fotografie non devono sparire con lui. La riga
     diventa orfana, il pannello la mostra, e un admin decide. */
  ref_id uuid references public.tours(id) on delete set null,

  /* Alzata dalla sincronizzazione quando la pagina non esiste piu' nel
     codice. Le righe orfane NON si cancellano mai da sole se hanno
     fotografie attaccate: si cancella il lavoro di qualcuno. */
  is_orphan boolean not null default false,

  /* Vero per le 10 pagine di categoria che oggi non contengono un solo
     tour (sei porti, i transfer diretti da Napoli, Venezia
     destinazioni, e /tours-of-italy/ che e' l'indice generale).
     Esistono e rispondono 200, ma sono fuori dall'indice di Google. Si
     tengono nel registro -- sono pagine vere -- e il pannello lo dice,
     cosi' nessuno ci carica venti foto pensando che siano viste. */
  senza_tour boolean not null default false,

  custom_title text,
  custom_subtitle text,

  /* 'inherit' segue l'interruttore globale; 'off' spegne questa pagina
     anche a interruttore acceso; 'on' la accende anche a interruttore
     spento -- ed e' cosi' che si prova la gallery in produzione su UNA
     pagina mentre il resto del sito non mostra niente. */
  visibility_override text not null default 'inherit'
    check (visibility_override in ('inherit', 'on', 'off')),

  /* Vuoto = usa la soglia globale. Lo stesso intervallo, perche' una
     soglia per pagina fuori scala sarebbe una gallery che non compare
     mai senza che il pannello sappia dire perche'. */
  min_images_override int check (min_images_override between 1 and 50),

  /* Vuoto = usa l'ordinamento globale. */
  sort_override text
    check (sort_override in ('manual', 'newest', 'oldest', 'daily_random', 'alternate')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gallery_tags is
  'Il registro delle pagine che possono avere una gallery: 124 voci (home, 36 '
  'categorie/porti/destinazioni/transfer, 87 tour). Popolato dal pulsante '
  '"Sincronizza pagine" del pannello. Le righe orfane con foto attaccate non si '
  'cancellano mai automaticamente.';

comment on column public.gallery_tags.ref_id is
  'tours.id per i tag di tipo tour: l''identita'' stabile, perche'' lo slug puo'' '
  'cambiare mentre le foto devono restare attaccate alla stessa pagina.';

alter table public.gallery_tags enable row level security;

/* Lettura aperta: il sito deve risolvere titolo, soglia e override della
   pagina che sta disegnando. Non c'e' niente di riservato in una riga
   che descrive una pagina pubblica. */
drop policy if exists "lettura_gallery_tags" on public.gallery_tags;
create policy "lettura_gallery_tags" on public.gallery_tags
  for select to public using (true);

drop policy if exists "scrittura_gallery_tags" on public.gallery_tags;
create policy "scrittura_gallery_tags" on public.gallery_tags
  for all to authenticated using (e_admin()) with check (e_admin());


/* ---- 3. le fotografie -------------------------------------------- */
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),

  /* Dove sta il file, e in quale dei due bucket. I due campi insieme
     sono l'indirizzo completo, e insieme sono unici: due righe che
     puntano allo stesso file vorrebbero dire che approvarne una
     cancella il file dell'altra. */
  bucket text not null default 'gallery-inbox'
    check (bucket in ('gallery', 'gallery-inbox')),
  storage_path text not null,

  /* Misure DOPO la rotazione. Il telefono salva la foto coricata e
     scrive nell'EXIF "ruotala di 90 gradi"; il pannello applica la
     rotazione ai pixel e poi butta l'EXIF (per il GPS). Se qui
     finissero le misure di prima, ogni verticale uscirebbe con
     larghezza e altezza scambiate e la pagina riserverebbe lo spazio
     sbagliato. Servono a dichiarare `aspect-ratio` e a calcolare
     `sizes` foto per foto: e' cosi' che il CLS resta zero. */
  width int not null check (width > 0),
  height int not null check (height > 0),

  /* Il colore o la sfumatura mostrata mentre la foto arriva. */
  blur_data_url text,

  /* IN INGLESE E OBBLIGATORIO: e' testo che leggono Google e chi usa uno
     screen reader, e sta su pagine in inglese. Il minimo di 3 caratteri
     non impedisce un alt scritto male, ma impedisce l'alt messo per far
     passare il modulo (".", "-", "foto"). */
  alt text not null check (length(btrim(alt)) between 3 and 300),
  caption text check (caption is null or length(caption) <= 500),

  /* IL CICLO DI VITA.
       in_attesa   caricata da una guida, non e' sul sito
       approvata   sul sito, e conta per la soglia
       rifiutata   respinta con un motivo; la guida corregge e reinvia
       nascosta    era approvata, un admin l'ha tolta dal sito

     Una foto caricata da un admin nasce 'approvata': l'admin e' chi
     approva, e fargli approvare le proprie foto sarebbe un passaggio
     senza contenuto. */
  status text not null default 'in_attesa'
    check (status in ('in_attesa', 'approvata', 'rifiutata', 'nascosta')),

  /* `on delete set null` su tutte e due: cancellare un profilo non deve
     portarsi via le fotografie ne' la memoria di chi le ha approvate. */
  uploaded_by uuid references public.profili(id) on delete set null,
  reviewed_by uuid references public.profili(id) on delete set null,
  reviewed_at timestamptz,

  /* Il motivo del rifiuto, che la guida LEGGE. Per questo e'
     obbligatorio quando lo stato e' 'rifiutata': un rifiuto senza motivo
     e' una foto che torna indietro e una persona che non sa cosa
     cambiare. */
  review_note text check (review_note is null or length(review_note) <= 1000),

  /* La data di scatto, letta dall'EXIF NEL BROWSER prima che il canvas
     butti i metadati. Del GPS non si conserva niente. Se manca (foto
     ricevute su WhatsApp, schermate) l'ordinamento per data usa
     `created_at` e il pannello lo dichiara. */
  taken_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (bucket, storage_path),

  /* 🔴 IL VINCOLO CHE TIENE FUORI DAL PUBBLICO QUELLO CHE NON E' STATO
     APPROVATO. Non e' una ripetizione della logica del pannello: e' la
     sola cosa che resta vera anche se il pannello sbaglia. Una riga in
     attesa o rifiutata sta nell'inbox privato, una approvata o nascosta
     nel bucket pubblico. All'approvazione il file si copia e la riga
     cambia stato e bucket nello stesso update. */
  constraint gallery_images_stato_bucket check (
    (status in ('approvata', 'nascosta') and bucket = 'gallery')
    or
    (status in ('in_attesa', 'rifiutata') and bucket = 'gallery-inbox')
  ),

  constraint gallery_images_rifiuto_motivato check (
    status <> 'rifiutata' or length(btrim(coalesce(review_note, ''))) > 0
  )
);

comment on table public.gallery_images is
  'Le fotografie della gallery. Solo status = ''approvata'' e'' sul sito e conta per '
  'la soglia minima. Le foto non approvate stanno nel bucket privato gallery-inbox: '
  'il vincolo gallery_images_stato_bucket lo garantisce nel database, non nel codice. '
  'Nessun dato EXIF conservato, nessuna posizione GPS.';

/* La coda "Da approvare" e il contatore che sta in ogni pagina del
   pannello. Parziale: le approvate sono la maggior parte e non servono a
   questa domanda. */
create index if not exists gallery_images_da_approvare
  on public.gallery_images (created_at)
  where status = 'in_attesa';

/* "Le mie foto", le tre schede della guida. */
create index if not exists gallery_images_di_chi
  on public.gallery_images (uploaded_by, status, created_at desc);

alter table public.gallery_images enable row level security;

/* 🔴 IL PUBBLICO VEDE SOLO LE APPROVATE. Una foto in attesa, rifiutata o
   nascosta non esiste per la chiave pubblicabile: nemmeno il suo
   indirizzo nello storage, che e' l'unica cosa che servirebbe per
   andarselo a prendere. */
drop policy if exists "lettura_gallery_images" on public.gallery_images;
create policy "lettura_gallery_images" on public.gallery_images
  for select to public using (status = 'approvata');

/* Un admin vede tutto: la coda, i rifiuti, le nascoste. */
drop policy if exists "lettura_gallery_images_admin" on public.gallery_images;
create policy "lettura_gallery_images_admin" on public.gallery_images
  for select to authenticated using (e_admin());

/* Una guida vede le proprie, in qualunque stato: e' la pagina "Le mie
   foto", dove legge anche il motivo di un rifiuto. Le foto delle altre
   guide non le vede. */
drop policy if exists "lettura_gallery_images_mie" on public.gallery_images;
create policy "lettura_gallery_images_mie" on public.gallery_images
  for select to authenticated using (uploaded_by = auth.uid());

/* Chi carica firma con il proprio nome e parte da 'in_attesa'. Il
   `with check` impedisce a una guida di inserire una riga gia'
   approvata, o intestata a qualcun altro: sono le due scorciatoie che
   salterebbero l'approvazione. Un admin usa la policy sotto e inserisce
   quello che vuole. */
drop policy if exists "inserimento_gallery_images_guida" on public.gallery_images;
create policy "inserimento_gallery_images_guida" on public.gallery_images
  for insert to authenticated
  with check (
    e_caricatore()
    and uploaded_by = auth.uid()
    and status = 'in_attesa'
    and bucket = 'gallery-inbox'
    and reviewed_by is null
    and reviewed_at is null
  );

/* Una guida corregge le PROPRIE foto solo finche' non sono sul sito.
   Approvata o nascosta, la tocca solo un admin: e' la regola piu'
   semplice che non lascia buchi, perche' l'alternativa -- modifiche in
   sospeso su foto gia' online -- vorrebbe dire una seconda coda di
   approvazione per le modifiche.
   Il `with check` tiene la riga dentro gli stessi limiti dopo la
   modifica: una guida non si approva la foto da sola, e non la passa a
   un'altra persona. */
drop policy if exists "modifica_gallery_images_mie" on public.gallery_images;
create policy "modifica_gallery_images_mie" on public.gallery_images
  for update to authenticated
  using (
    e_caricatore()
    and uploaded_by = auth.uid()
    and status in ('in_attesa', 'rifiutata')
  )
  with check (
    uploaded_by = auth.uid()
    and status = 'in_attesa'
    and bucket = 'gallery-inbox'
  );

/* Ritirare un proprio invio, finche' e' ancora una cosa privata. */
drop policy if exists "cancella_gallery_images_mie" on public.gallery_images;
create policy "cancella_gallery_images_mie" on public.gallery_images
  for delete to authenticated
  using (
    e_caricatore()
    and uploaded_by = auth.uid()
    and status in ('in_attesa', 'rifiutata')
  );

/* L'admin: approva, rifiuta, corregge, nasconde, cancella. */
drop policy if exists "gestione_gallery_images_admin" on public.gallery_images;
create policy "gestione_gallery_images_admin" on public.gallery_images
  for all to authenticated using (e_admin()) with check (e_admin());


/* ---- 4. quale foto su quale pagina ------------------------------- */
create table if not exists public.gallery_image_tags (
  image_id uuid not null references public.gallery_images(id) on delete cascade,
  tag_id   uuid not null references public.gallery_tags(id)   on delete cascade,

  /* L'ordine a mano, per QUESTA pagina: la stessa foto puo' essere la
     prima su una scheda e l'ultima su una categoria.
     Il pannello assegna i numeri DI DIECI IN DIECI, come in `video_clip`,
     cosi' infilarne una in mezzo non obbliga a rinumerare le altre. Il
     default 0 vale solo per una riga inserita senza dirlo, e la manda in
     testa: visibile subito, quindi correggibile subito. */
  position int not null default 0,

  /* "Fissa all'inizio", per pagina. Le fissate vengono prima nel loro
     ordine manuale, e il criterio scelto (piu' recenti, casuale del
     giorno...) si applica a tutte le altre. Cosi' la foto piu' bella
     resta la prima anche con l'ordine mescolato. */
  pinned boolean not null default false,

  created_at timestamptz not null default now(),

  primary key (image_id, tag_id)
);

comment on table public.gallery_image_tags is
  'Molti-a-molti fra fotografie e pagine. position e pinned sono PER PAGINA: la '
  'stessa foto puo'' essere la prima su una scheda tour e l''ultima su una categoria.';

/* L'unica lettura che fa il sito: "le foto di questa pagina, in ordine".
   Le fissate prima, poi la posizione. */
create index if not exists gallery_image_tags_pagina
  on public.gallery_image_tags (tag_id, pinned desc, position);

alter table public.gallery_image_tags enable row level security;

/* Il collegamento si legge in chiaro, ma da solo non porta a niente: la
   foto in fondo resta invisibile se non e' approvata, per la policy
   sopra. Tenerlo aperto evita di dover incrociare due volte gli stati
   nella lettura del sito. */
drop policy if exists "lettura_gallery_image_tags" on public.gallery_image_tags;
create policy "lettura_gallery_image_tags" on public.gallery_image_tags
  for select to public using (true);

/* Un tag messo da una guida arriva sul sito solo con l'approvazione
   della foto: qui si permette di taggare le proprie foto non ancora
   approvate, e la visibilita' la decide comunque lo stato della foto. */
drop policy if exists "tag_gallery_image_tags_mie" on public.gallery_image_tags;
create policy "tag_gallery_image_tags_mie" on public.gallery_image_tags
  for all to authenticated
  using (
    e_caricatore() and exists (
      select 1 from public.gallery_images i
      where i.id = image_id
        and i.uploaded_by = auth.uid()
        and i.status in ('in_attesa', 'rifiutata')
    )
  )
  with check (
    e_caricatore() and exists (
      select 1 from public.gallery_images i
      where i.id = image_id
        and i.uploaded_by = auth.uid()
        and i.status in ('in_attesa', 'rifiutata')
    )
  );

drop policy if exists "gestione_gallery_image_tags_admin" on public.gallery_image_tags;
create policy "gestione_gallery_image_tags_admin" on public.gallery_image_tags
  for all to authenticated using (e_admin()) with check (e_admin());


/* ---- 5. la vista che legge il sito ------------------------------
   UNA lettura per pagina, invece di una per le foto e una per i
   collegamenti. `security_invoker = true` come in `tour_video`: la vista
   deve rispettare le policy delle tabelle sotto, non scavalcarle coi
   diritti di chi l'ha creata. Senza quell'opzione il pubblico vedrebbe
   attraverso la vista anche le foto in attesa.

   La vista espone SOLO le colonne che servono a disegnare la striscia:
   `review_note`, `uploaded_by` e `reviewed_by` restano fuori. Sono cose
   del pannello, e il pannello legge le tabelle. */
create or replace view public.gallery_public with (security_invoker = true) as
select
  t.key           as tag_key,
  i.id            as image_id,
  i.bucket,
  i.storage_path,
  i.width,
  i.height,
  i.blur_data_url,
  i.alt,
  i.caption,
  i.taken_at,
  i.created_at,
  it.position,
  it.pinned
from public.gallery_image_tags it
join public.gallery_images i on i.id = it.image_id
join public.gallery_tags   t on t.id = it.tag_id
where i.status = 'approvata';

comment on view public.gallery_public is
  'Quello che il sito legge: foto approvate con la chiave della pagina, le misure e '
  'l''ordine. security_invoker: la RLS delle tabelle sotto vale anche qui.';


/* ---- 6. i due bucket -------------------------------------------- */

/* PUBBLICO in lettura, come `media`. Ci arrivano solo le foto approvate:
   un indirizzo indovinato porta a una foto che un admin ha gia' deciso
   di mostrare. 12 MB e' largo: il pannello carica WebP a 2400px sul lato
   lungo, che sta sotto il megabyte, e il margine c'e' per il giorno che
   si carica una panoramica. */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 12582912,
        array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/* 🔴 PRIVATO. `public = false` vuol dire che nessun indirizzo diretto
   funziona: si guarda solo con un URL firmato a scadenza, generato dal
   server per un admin che sta esaminando la coda. E' la meta' della
   promessa "le foto non approvate non sono raggiungibili dal pubblico" --
   l'altra meta' e' il vincolo stato/bucket sulla tabella.
   Piu' largo del pubblico perche' qui arriva il file cosi' com'e' se il
   browser non riesce a ricodificarlo. */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-inbox', 'gallery-inbox', false, 26214400,
        array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


/* ---- 7. i file: perche' qui non ci sono policy sullo storage ------
   🔴 NON SI POSSONO SCRIVERE DA UNA MIGRAZIONE, MISURATO IL 26/09/2026.
   `storage.objects` appartiene a `supabase_storage_admin`, e il ruolo
   `postgres` -- quello con cui girano le migrazioni -- non ne e' membro
   e non puo' diventarlo:

       pg_has_role('postgres','supabase_storage_admin','MEMBER') = false

   Un `create policy ... on storage.objects` qui dentro non darebbe un
   avviso: farebbe fallire la migrazione intera, tabelle comprese. E'
   anche il motivo per cui l'unica policy esistente sullo storage
   ("media lettura pubblica") non sta in nessuna migrazione di questo
   repo. L'`insert into storage.buckets` del punto 6, invece, passa: su
   `buckets` i diritti ci sono.

   LE OPERAZIONI SUI FILE LE FA IL SERVER CON LA CHIAVE SEGRETA
   (`SUPABASE_SECRET_KEY`, gia' in uso in src/lib/numeri-freschi.ts e
   src/lib/conversioni-memoria.ts: nessuna variabile nuova). Sono quattro:
   l'URL firmato per il caricamento nell'inbox, l'URL firmato a scadenza
   per far vedere l'anteprima a un admin, la copia inbox -> gallery
   all'approvazione, la cancellazione.

   QUESTO NON APRE NIENTE AL PUBBLICO, e vale la pena dire perche':
     - `gallery-inbox` ha `public = false`: senza una firma del server
       nessun indirizzo risponde. E' la CHIAVE a essere privilegiata, non
       il bucket;
     - le RIGHE continuano a passare dalla RLS con la sessione
       dell'utente, e sono loro che decidono cosa e' pubblico. Il file
       arriva nel bucket pubblico solo DOPO che l'update della riga e'
       passato da `e_admin()`: prima la riga, poi il file. Se il database
       rifiuta, la copia non parte;
     - un file nel bucket pubblico senza una riga approvata non e'
       raggiungibile da nessuna pagina: la vista `gallery_public` parte
       dalle righe.

   Se si vuole comunque la rete di sicurezza anche sui file, le quattro
   policy vanno create a mano dal pannello Supabase (Storage -> Policies).
   Non e' un lavoro che si puo' versionare qui. */
