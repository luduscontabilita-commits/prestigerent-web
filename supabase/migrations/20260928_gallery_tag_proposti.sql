/* ============================================================
   I TAG PROPOSTI DA UNA GUIDA SU UNA FOTO GIA' APPROVATA
   ============================================================

   Deciso dalla proprieta' il 28/09/2026, insieme al "tag su piu' foto".
   Esempio: una guida ha dieci foto gia' approvate sulla scheda di Siena e
   vuole metterle anche nell'Album. Le foto RESTANO online su Siena come
   prima; il tag nuovo aspetta che un admin lo approvi.

   Prima di oggi una guida poteva toccare i tag solo delle proprie foto
   IN ATTESA o RIFIUTATE (policy `tag_gallery_image_tags_mie`). Quella
   regola non cambia. Si aggiunge un secondo caso, stretto:

     - sulle PROPRIE foto APPROVATE una guida puo' creare, leggere e
       ritirare soltanto legami con `in_attesa = true`, firmati da lei;
     - non puo' toccare i legami gia' pubblicati, ne' approvare i propri.

   🔴 IL SITO NON PUO' VEDERE UN LEGAME IN ATTESA, PER COSTRUZIONE.
   La vista `gallery_public` -- l'unica cosa che le pagine leggono, e da
   cui contano soglia e ordine -- esclude `in_attesa`. E la lettura
   pubblica dei legami, che prima era aperta a tutti, ora esclude gli
   stessi legami: una proposta non approvata non esiste per chi non e'
   entrato.
   ============================================================ */

alter table public.gallery_image_tags
  add column if not exists in_attesa   boolean not null default false,
  add column if not exists proposto_da uuid references public.profili(id) on delete set null,
  add column if not exists proposto_il timestamptz;

comment on column public.gallery_image_tags.in_attesa is
  'Tag proposto da una guida su una foto gia'' approvata: non compare sul sito finche'' '
  'un admin non lo approva (false). I legami normali sono false dalla nascita.';

/* Una proposta ha sempre chi l'ha fatta e quando: senza, la coda
   dell'admin mostrerebbe un tag arrivato dal nulla. */
alter table public.gallery_image_tags
  drop constraint if exists gallery_image_tags_proposta_firmata;
alter table public.gallery_image_tags
  add constraint gallery_image_tags_proposta_firmata
  check (not in_attesa or (proposto_da is not null and proposto_il is not null));

/* La coda delle proposte: poche righe, lette spesso dal pannello. */
create index if not exists gallery_image_tags_proposte
  on public.gallery_image_tags (proposto_il)
  where in_attesa;


/* ---- la lettura pubblica: niente proposte ----------------------- */

drop policy if exists "lettura_gallery_image_tags" on public.gallery_image_tags;
create policy "lettura_gallery_image_tags" on public.gallery_image_tags
  for select to public using (not in_attesa);


/* ---- le proposte della guida, e solo quelle ---------------------- */

drop policy if exists "proposte_gallery_image_tags_mie" on public.gallery_image_tags;
create policy "proposte_gallery_image_tags_mie" on public.gallery_image_tags
  for all to authenticated
  using (
    e_caricatore()
    and in_attesa
    and proposto_da = auth.uid()
    and exists (
      select 1 from public.gallery_images i
      where i.id = image_id
        and i.uploaded_by = auth.uid()
        and i.status = 'approvata'
    )
  )
  with check (
    e_caricatore()
    and in_attesa
    and proposto_da = auth.uid()
    and exists (
      select 1 from public.gallery_images i
      where i.id = image_id
        and i.uploaded_by = auth.uid()
        and i.status = 'approvata'
    )
  );


/* ---- la vista che legge il sito ---------------------------------- */

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
where i.status = 'approvata'
  and not it.in_attesa;

comment on view public.gallery_public is
  'Quello che il sito legge: foto approvate con la chiave della pagina, le misure e '
  'l''ordine. Esclude i tag proposti non ancora approvati. security_invoker: la RLS '
  'delle tabelle sotto vale anche qui.';
