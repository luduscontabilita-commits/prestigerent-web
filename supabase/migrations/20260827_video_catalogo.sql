/* ============================================================
   IL CATALOGO DEI VIDEO, E CHI SE LI PRENDE.
   ============================================================

   PRIMA: l'elenco dei filmati stava dentro `tour_content.blocks->videos`,
   cioe' un blocco JSON ricopiato per intero su OGNI tour che li mostra.
   Quattro righe, quattro copie identiche di sei oggetti. Due conseguenze
   gia' visibili prima di questa migrazione:

     1. su `wine-experience-in-tuscany` e `wine-food-experience-in-tuscany`
        era finita la lista di SIENA -- il check-in con la bandiera rossa e
        le torri di San Gimignano su una giornata in cantina. Nessuno
        l'aveva fatto apposta: era una copia-incolla della riga accanto.
     2. aggiungere un decimo filmato domani avrebbe voluto dire riscrivere
        a mano lo stesso JSON su ogni riga -- e su ogni lingua, quando le
        traduzioni arriveranno (oggi `tour_content` ha solo 'en').

   ADESSO: due tabelle e una vista.

     video_clip        il catalogo. UNA riga per filmato, con la sua
                       etichetta, la sua didascalia e i suoi temi.
     tour_video_tema   quali temi puo' mostrare un tour.
     tour_video        la vista che li mette insieme (temi in comune).

   Aggiungere un filmato domani = UN insert in `video_clip` con i suoi
   temi, e compare da solo su tutti i tour che hanno quel tema. Aggiungere
   un tour = UNA riga in `tour_video_tema`. In nessuno dei due casi si
   tocca il codice, che e' il punto.

   PERCHE' I TEMI E NON UN ELENCO TOUR->VIDEO. Un elenco a coppie avrebbe
   voluto dire, per un filmato nuovo, una riga per ogni tour che lo mostra
   (oggi sarebbero quindici). Con i temi la stessa cosa si dice una volta.

   PERCHE' NON RIUSARE `tour_categorie`. Quelle categorie sono
   commerciali -- "transfers", "livorno-port", "private-tours" -- e
   dicono come si vende un tour, non cosa si vede dentro un filmato.
   `wine-and-food-experiences` ci va vicino ma e' incompleta anche su
   WordPress: i tre tour che hanno "winery"/"wineries" nel nome non ci
   stanno dentro. L'associazione dei video e' un'altra cosa e si scrive
   a parte.

   PER TORNARE INDIETRO:
     update tour_content t set blocks = s.blocks_prima
     from video_blocks_storico s
     where t.tour_id = s.tour_id and t.locale = s.locale;
     drop view public.tour_video;
     drop table public.tour_video_tema, public.video_clip;
   ============================================================ */

/* ---- 1. la fotografia di com'era, prima di togliere la chiave ---- */
create table if not exists public.video_blocks_storico (
  tour_id     uuid not null,
  locale      text not null,
  blocks_prima jsonb not null,
  salvato_il  timestamptz not null default now(),
  primary key (tour_id, locale)
);
comment on table public.video_blocks_storico is
  'Fotografia di tour_content.blocks PRIMA che l''elenco dei video uscisse dal JSON per finire in video_clip/tour_video_tema.';

insert into public.video_blocks_storico (tour_id, locale, blocks_prima)
select tour_id, locale, blocks from public.tour_content where blocks ? 'videos'
on conflict (tour_id, locale) do nothing;

alter table public.video_blocks_storico enable row level security;
create policy "scrittura_video_blocks_storico" on public.video_blocks_storico
  for all to authenticated using (e_admin()) with check (e_admin());
/* nessuna policy di lettura pubblica: e' un archivio, non contenuto */


/* ---- 2. il catalogo ---- */
create table if not exists public.video_clip (
  /* il nome del file senza estensione: e' anche la chiave con cui si
     riconosce il filmato parlandone a voce ("mandami sg3") */
  chiave      text primary key,
  /* i temi a cui il filmato appartiene. Un filmato puo' averne piu' di
     uno: la proposta di matrimonio e' stata girata fra le vigne durante
     una giornata che comprende sia la campagna senese sia la cantina. */
  temi        text[] not null default '{}',
  /* indirizzi PIENI su Supabase Storage. Si tengono per esteso e non
     ricostruiti da `chiave` perche' un domani un filmato potrebbe avere
     un'estensione diversa o stare in un'altra cartella, e quello non deve
     diventare una modifica al codice. */
  src         text not null,
  poster      text,
  /* il testo del <span> nella didascalia: dove/quando */
  etichetta   text,
  /* il testo del <b>: cosa si vede. Puo' contenere entita' HTML
     (&ldquo;) perche' e' cosi' che sta scritto sulle landing. */
  didascalia  text,
  /* aria-label del <video>, per chi non vede l'immagine */
  alt         text,
  /* l'ordine di uscita, uguale su tutte le pagine. I numeri vanno di
     dieci in dieci apposta: infilarne uno in mezzo non obbliga a
     rinumerare gli altri. */
  ordine      int  not null default 100,
  attivo      boolean not null default true,
  creato_il   timestamptz not null default now()
);
comment on table public.video_clip is
  'Le testimonianze girate col telefono dagli ospiti. I file stanno su Storage sotto lp/video/. Nessun prezzo, nessun dato personale.';

alter table public.video_clip enable row level security;
create policy "lettura_video_clip" on public.video_clip
  for select to public using (attivo);
create policy "scrittura_video_clip" on public.video_clip
  for all to authenticated using (e_admin()) with check (e_admin());


/* ---- 3. quali temi mostra un tour ---- */
create table if not exists public.tour_video_tema (
  /* text e non uuid, come in `tour_categorie`: si scrive e si legge a
     occhio, ed e' lo stesso slug che sta nell'indirizzo della pagina */
  tour_slug   text primary key,
  temi        text[] not null default '{}',
  nota        text
);
comment on table public.tour_video_tema is
  'Quali temi di video puo` mostrare un tour. Un tour senza riga qui non mostra la sezione video: meglio niente che i filmati di un`altra giornata.';

alter table public.tour_video_tema enable row level security;
create policy "lettura_tour_video_tema" on public.tour_video_tema
  for select to public using (true);
create policy "scrittura_tour_video_tema" on public.tour_video_tema
  for all to authenticated using (e_admin()) with check (e_admin());


/* ---- 4. la vista che il sito legge ----
   security_invoker: la vista deve rispettare le policy delle due tabelle
   sotto, non scavalcarle con i diritti di chi l'ha creata. Senza questa
   opzione Postgres la eseguirebbe come proprietario e la RLS delle
   tabelle di base non varrebbe piu' nulla. */
create or replace view public.tour_video with (security_invoker = true) as
select
  m.tour_slug,
  v.chiave,
  v.src,
  v.poster,
  v.etichetta,
  v.didascalia,
  v.alt,
  v.ordine
from public.tour_video_tema m
join public.video_clip v on v.temi && m.temi
where v.attivo;


/* ---- 5. i nove filmati, con etichette e didascalie PRESE DALLE DUE
          LANDING, parola per parola. Non sono state riscritte: quelle
          righe girano su traffico a pagamento da mesi.

   I temi:
     siena-san-gimignano  la giornata in campagna con Siena e/o San
                          Gimignano. Tre filmati su quattro sono
                          riconoscibilmente li' (le torri, la tenuta).
     vino                 una giornata in cantina: la vendemmia, il viale
                          dei cipressi, i filari.
     ritrovo-piccolo-gruppo  il check-in con la bandiera rossa al punto
                          di ritrovo a Firenze. Esiste SOLO per le
                          partenze in piccolo gruppo: su un tour privato,
                          che passa a prendere in albergo, sarebbe una
                          promessa sbagliata. Le due partenze "wine" in
                          piccolo gruppo usano lo stesso ritrovo: il
                          giorno che lo si vuole mostrare anche li',
                          basta aggiungere il tema alla loro riga.

   L'ordine: 10..90 riproduce ESATTAMENTE l'ordine delle due landing.
     Siena   sg2, sg1, t3, sg3, sg4, proposal  -> 10 20 30 40 50 60
     Tasting t3, proposal, t2, t4, t1          -> 30 60 70 80 90
   ------------------------------------------------------------ */
insert into public.video_clip (chiave, temi, src, poster, etichetta, didascalia, alt, ordine) values
  ('testimonial-sg2', '{ritrovo-piccolo-gruppo}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg2.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg2.jpg',
   'Check-in', 'The red flag at the meeting point',
   'Clip filmed at check-in before departure', 10),

  ('testimonial-sg1', '{siena-san-gimignano}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg1.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg1.jpg',
   'On the road', 'Leaving Florence for the Tuscan hills',
   'Clip filmed on our Siena and San Gimignano tour', 20),

  ('testimonial-t3', '{siena-san-gimignano,vino}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t3.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t3.jpg',
   'A guest, in his words', '&ldquo;Prestige was really great&rdquo;',
   'A guest talking to camera about their day with Prestige Rent', 30),

  ('testimonial-sg3', '{siena-san-gimignano}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg3.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg3.jpg',
   'San Gimignano', 'Among the medieval towers',
   'Clip filmed in San Gimignano', 40),

  ('testimonial-sg4', '{siena-san-gimignano}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg4.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-sg4.jpg',
   'The estate', 'Where we stop for lunch',
   'Clip filmed at the wine estate near San Gimignano', 50),

  ('testimonial-proposal', '{siena-san-gimignano,vino}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-proposal.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-proposal.jpg',
   'Wedding proposal', 'He proposed between the vines',
   'A surprise wedding proposal filmed during one of our Tuscany tours', 60),

  ('testimonial-t2', '{vino}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t2.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t2.jpg',
   'Arriving', 'Up the cypress avenue to the estate',
   'Guests walking up the cypress avenue to the wine estate', 70),

  ('testimonial-t4', '{vino}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t4.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t4.jpg',
   'In the vineyard', 'Between the vines with our guests',
   'Guests in the vineyard during one of our wine tours', 80),

  ('testimonial-t1', '{vino}',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t1.mp4',
   'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video/testimonial-t1.jpg',
   'Harvest', 'The Sangiovese comes in',
   'Sangiovese grapes going into the destemmer at the winery during harvest', 90)
on conflict (chiave) do nothing;


/* ---- 6. quali tour mostrano quali temi.
   La regola l'ho tenuta stretta apposta: un filmato si mostra dove la
   giornata contiene davvero quello che si vede dentro.

     - `vino` va dove la cantina E' il tour, non dove e' una sosta fra le
       altre. Per questo i due tour "Siena + San Gimignano + Chianti"
       hanno solo il tema senese: la sosta in Chianti c'e', ma la
       giornata non e' una degustazione, e t1 (la vendemmia) prometterebbe
       un'altra cosa.
     - i transfer non hanno alcun tema. `transfer-to-rome-via-san-gimignano`
       si ferma a San Gimignano davvero, ma sg4 ("dove ci fermiamo a
       pranzo", alla tenuta) su un trasferimento sarebbe una promessa
       sbagliata, e mettere un solo filmato per non lasciare la sezione
       vuota e' esattamente il motivo per cui questa tabella esiste.
     - `private-tour-of-siena-from-florence` resta fuori: e' Siena citta',
       senza San Gimignano e senza cantina, e tre dei cinque filmati del
       tema senese sono riconoscibilmente altrove. Meglio nessuna sezione
       che una sezione che racconta un'altra giornata.
     - i tour fuori Toscana (Pompei, Amalfi, Cinque Terre) restano fuori
       per ovvi motivi: i filmati sono cipressi e Sangiovese.
   ------------------------------------------------------------ */
insert into public.tour_video_tema (tour_slug, temi, nota) values
  /* le due giornate su cui girano gli annunci a pagamento: l'ordine e la
     scelta qui sotto riproducono ESATTAMENTE le due landing di partenza */
  ('small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence',
   '{siena-san-gimignano,ritrovo-piccolo-gruppo}',
   'I sei filmati della landing lan2, nello stesso ordine.'),
  ('wine-experience-in-tuscany', '{vino}',
   'I cinque filmati della landing tasting lan2, nello stesso ordine.'),

  ('siena-san-gimignano-the-tuscan-countryside-landing',
   '{siena-san-gimignano,ritrovo-piccolo-gruppo}', null),
  ('wine-food-experience-in-tuscany', '{vino}', null),

  /* Siena e/o San Gimignano e la campagna */
  ('private-tour-siena-and-san-gimignano',            '{siena-san-gimignano}', null),
  ('private-tour-to-siena-san-gimignano-chianti-pisa','{siena-san-gimignano}', null),
  ('tour-to-siena-san-gimignano-chianti',             '{siena-san-gimignano}', null),
  ('siena-and-san-gimignano-from-livorno',            '{siena-san-gimignano}', null),
  ('tour-san-gimignano-and-volterra',                 '{siena-san-gimignano}', null),
  ('tour-to-san-gimignano-from-florence',             '{siena-san-gimignano}', null),

  /* la cantina E' la giornata */
  ('montalcino-brunello-wine-tour',      '{vino}', null),
  ('private-half-day-tour-of-chianti',   '{vino}', null),
  ('private-tour-to-chianti-wineries',   '{vino}', null),
  ('chianti-wineries-from-livorno-port', '{vino}', null),
  ('tour-chianti-wineries-from-la-spezia','{vino}', null),
  ('tour-the-mall-and-chianti-winery',   '{vino}', null)
on conflict (tour_slug) do nothing;


/* ---- 7. via la chiave `videos` dal JSON.
   Si toglie e non si lascia li' "per sicurezza": due elenchi dello stesso
   contenuto sono la premessa perche' fra sei mesi qualcuno aggiorni
   quello che il sito non legge. Il vecchio contenuto sta in
   `video_blocks_storico` (punto 1) e si rimette con una riga. */
update public.tour_content set blocks = blocks - 'videos' where blocks ? 'videos';
