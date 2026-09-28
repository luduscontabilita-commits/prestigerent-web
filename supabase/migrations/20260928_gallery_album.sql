/* ============================================================
   IL TAG "ALBUM" E LA SUA PAGINA /album/
   ============================================================

   Chiesto dalla proprieta' il 28/09/2026: una pagina del sito dove
   finiscono TUTTE le foto taggate "album", sempre, senza le regole di
   visualizzazione delle gallery (interruttore generale, soglia minima,
   override per pagina, titolo, ordine). Le foto restano pero' filtrate
   dall'APPROVAZIONE, deciso lo stesso giorno: e' la tutela contro una
   foto sbagliata o una persona che non ha dato il consenso, non
   un'impostazione di visualizzazione.

   Qui si fa solo quello che il database deve sapere:
     1. un tipo di tag nuovo, `album`, accanto a home/cat/tour/port;
     2. la riga del tag, cosi' guida e admin la trovano nel menu dei tag
        da subito, senza aspettare che qualcuno prema "Sincronizza
        pagine". La sincronizzazione poi la riconosce, perche' `registro()`
        la produce con la stessa chiave: non la marca orfana.

   Nessuna policy nuova: la vista `gallery_public` mostra gia' solo le foto
   `approvata`, e vale per questo tag come per tutti gli altri.
   ============================================================ */

alter table public.gallery_tags
  drop constraint if exists gallery_tags_type_check;

alter table public.gallery_tags
  add constraint gallery_tags_type_check
  check (type in ('home', 'cat', 'tour', 'port', 'album'));

/* `on conflict do update` e non `do nothing`: se la sincronizzazione
   l'avesse gia' creata, qui si riallineano etichetta e indirizzo invece
   di lasciare due versioni della stessa riga. */
insert into public.gallery_tags (key, type, label, path, ref_id, senza_tour)
values ('album', 'album', 'Album · Our guests’ album', '/album/', null, false)
on conflict (key) do update
  set type       = excluded.type,
      label      = excluded.label,
      path       = excluded.path,
      is_orphan  = false,
      updated_at = now();
