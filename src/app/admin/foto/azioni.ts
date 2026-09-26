'use server';

import { revalidatePath } from 'next/cache';
import { chiAgisce, supabaseServer } from '@/lib/auth';
import { LOCALE_CODES } from '@/lib/locales';
import { supabase } from '@/lib/supabase';
import { firmaCaricamento } from '@/lib/gallery-file';
import { fotoDi, type Blocchi } from '@/components/admin/blocchi';
import type { FotoAdmin } from '@/components/admin/RiordinaFoto';

/* IL SALVATAGGIO DELL'ORDINE DELLE FOTO.
 *
 * Sta in un Server Action e non nel browser perche' la scrittura su
 * `tour_content` passa dalla policy `e_admin()`: la chiave pubblicabile
 * che il client ha in mano non la supera, e un update dal browser
 * tornerebbe "riuscito" con zero righe toccate. Qui il client Supabase
 * nasce dai cookie di sessione, quindi il database vede un admin vero.
 */

const LOCALE = 'en';

type Esito = { ok: boolean; errore?: string };

export async function salvaFoto(slug: string, foto: FotoAdmin[]): Promise<Esito> {
  /* 🔴 IL CONTROLLO DEL RUOLO STA QUI, non nella pagina che apre il
     riordino. Una server action non passa da nessuna pagina: si chiama
     con una POST al suo identificativo, e chiunque abbia fatto l'accesso
     al pannello puo' farlo a mano. Proteggere /admin/foto/ e lasciare
     aperta questa funzione vorrebbe dire permettere a una guida di
     riscrivere la copertina di un tour -- cioe' la foto che finisce
     nell'elenco della home e nelle anteprime social.
     La RLS rifiuterebbe comunque la scrittura (`e_admin()` su
     `tour_content`): questo serve a dire "non hai i permessi" invece di
     un "riuscito" con zero righe toccate. */
  const { errore } = await chiAgisce();
  if (errore) return { ok: false, errore };

  /* Salvare zero foto vuol dire una scheda senza copertina in home e
     senza anteprima social: se e' davvero quello che si vuole, si toglie
     il tour, non le sue immagini. */
  if (!foto.length) return { ok: false, errore: 'Serve almeno una foto.' };

  const puliti = foto
    .map((f) => ({
      src: typeof f.src === 'string' ? f.src.trim() : '',
      alt: f.alt,
      label: f.label,
      caption: f.caption,
    }))
    .filter((f) => f.src);
  if (!puliti.length) return { ok: false, errore: 'Nessun indirizzo valido fra le foto.' };

  const sb = await supabaseServer();

  const { data: tour } = await sb.from('tours').select('id').eq('slug', slug).maybeSingle();
  if (!tour) return { ok: false, errore: `Nessun tour con slug ${slug}.` };

  const { data: riga } = await sb
    .from('tour_content')
    .select('blocks')
    .eq('tour_id', tour.id)
    .eq('locale', LOCALE)
    .maybeSingle();
  if (!riga) return { ok: false, errore: `Nessun contenuto ${LOCALE} per ${slug}.` };

  const blocks = (riga.blocks ?? {}) as Record<string, unknown>;

  /* I DUE ARRAY SI SCRIVONO INSIEME, DALLA STESSA LISTA.
     `gallery` alimenta la striscia con le didascalie, `images` il mosaico
     e la copertina in home. Aggiornarne uno solo non rompe niente subito:
     rompe piu' tardi, quando il mosaico mostra foto diverse dalla striscia
     e nessuno sa perche'. */
  const nuovi = {
    ...blocks,
    gallery: puliti,
    images: puliti.map((f) => f.src),
  };

  const { error } = await sb
    .from('tour_content')
    .update({ blocks: nuovi })
    .eq('tour_id', tour.id)
    .eq('locale', LOCALE);
  if (error) return { ok: false, errore: error.message };

  /* Le pagine hanno `revalidate = 3600`: senza questa riga la modifica si
     vedrebbe fra un'ora, e chi ha appena salvato penserebbe che il
     pannello non funziona. Anche la home va rigenerata, perche' la prima
     foto e' la copertina della scheda nell'elenco.
     I percorsi sono quelli INTERNI, sotto /[locale]/: l'inglese senza
     prefisso e' una riscrittura del proxy, non una pagina a se'. */
  for (const l of LOCALE_CODES) {
    revalidatePath(`/${l}/tour/${slug}`);
    revalidatePath(`/${l}`);
  }

  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════════
   AGGIUNGERE FOTO A UN TOUR
   ═══════════════════════════════════════════════════════════════════

   Fino al 26/09/2026 da qui si poteva solo RIORDINARE: la pagina di un
   tour senza foto diceva «vanno caricate prima altrove», e altrove non
   esisteva. Un tour senza copertina restava senza copertina.

   ── DOVE FINISCONO I FILE ────────────────────────────────────────────
   Nel bucket `media`, che e' pubblico ed e' gia' dove stanno tutte le
   foto dei tour (`media/wp/2021/09/...`, ereditate da WordPress). Non
   in `gallery`: quello e' delle foto delle guide, ha un limite di 12 MB
   e soprattutto ha una TABELLA dietro con approvazione e tag. Queste
   sono le foto del prodotto, vivono dentro `tour_content.blocks` e non
   hanno bisogno di nessuna coda -- le carica un admin, che e' anche chi
   approverebbe.

   ── 🔴 IL NOME DEL FILE NON PUO' PARLARE ─────────────────────────────
   `src/lib/galleria.ts` decide se una foto compare sulla scheda
   guardando il NOME DEL FILE: se somiglia a un mezzo o a uno sfondo la
   toglie sempre, se somiglia a un luogo la tiene solo quando quel luogo
   e' nominato nella pagina. E' il filtro che ha tolto 156 foto di
   riempimento da WordPress, e non sa distinguere una foto caricata
   apposta da una messa li' per pareggiare le gallerie.

   Quindi il nome e' un UUID: non somiglia a niente, cade nel ramo «nome
   che non dice niente» e viene tenuto. Lo slug del tour sta nella
   CARTELLA, dove serve a ritrovare i file e dove il filtro non guarda
   (`url.split('/').pop()`).

   Se un giorno si mettesse il nome del tour nel file, una foto caricata
   a mano per `private-tour-siena-and-san-gimignano` potrebbe sparire
   dalla scheda perche' il filtro la scambia per un luogo non nominato.
   Nessun errore, nessun avviso: semplicemente non si vede. */

const BUCKET_TOUR = 'media';

export type FirmaTour = { percorso: string; url: string };

export async function firmeTour(
  slug: string,
  quante: number
): Promise<{ ok: boolean; errore?: string; firme?: FirmaTour[] }> {
  /* Stessa guardia della pagina, e non per doppione: una server action
     si chiama con una POST al suo identificativo, senza passare da
     nessuna pagina. `chiAgisce()` ammette per difetto i soli ruoli di
     gestione, quindi una guida qui non entra. */
  const { errore } = await chiAgisce();
  if (errore) return { ok: false, errore };

  if (!Number.isInteger(quante) || quante < 1 || quante > 20) {
    return { ok: false, errore: 'Si caricano da 1 a 20 foto per volta.' };
  }
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return { ok: false, errore: 'Slug non valido.' };
  }

  const firme: FirmaTour[] = [];
  for (let i = 0; i < quante; i++) {
    const percorso = `tour/${slug}/${crypto.randomUUID()}.webp`;
    const f = await firmaCaricamento(BUCKET_TOUR, percorso);
    if ('errore' in f) return { ok: false, errore: f.errore };
    firme.push({ percorso: f.percorso, url: f.url });
  }
  return { ok: true, firme };
}

/** Le foto appena salite si AGGIUNGONO IN FONDO, mai in testa.
 *
 *  La prima foto e' la copertina: compare nell'elenco della home e nelle
 *  anteprime social. Se un caricamento la cambiasse da solo, chi aggiunge
 *  tre foto di dettaglio si ritroverebbe la copertina del tour cambiata
 *  senza averlo chiesto, e se ne accorgerebbe dalla home. Per cambiarla
 *  c'e' il trascinamento, che e' un gesto esplicito. */
export async function aggiungiFoto(
  slug: string,
  nuove: { storage_path: string; alt?: string }[]
): Promise<Esito & { quante?: number }> {
  const { errore } = await chiAgisce();
  if (errore) return { ok: false, errore };

  if (!nuove.length) return { ok: false, errore: 'Nessuna foto da aggiungere.' };

  const sb = await supabaseServer();

  const { data: tour } = await sb.from('tours').select('id').eq('slug', slug).maybeSingle();
  if (!tour) return { ok: false, errore: `Nessun tour con slug ${slug}.` };

  const { data: riga } = await sb
    .from('tour_content')
    .select('blocks')
    .eq('tour_id', tour.id)
    .eq('locale', LOCALE)
    .maybeSingle();
  if (!riga) return { ok: false, errore: `Nessun contenuto ${LOCALE} per ${slug}.` };

  const blocks = (riga.blocks ?? {}) as Record<string, unknown>;

  /* Si riparte da `fotoDi`, non da `blocks.gallery`: su 85 tour su 87
     `gallery` non esiste e le foto stanno nella sola lista `images`.
     Leggendo il campo sbagliato, il primo caricamento su quei tour
     cancellerebbe tutte le foto che c'erano. */
  const attuali = fotoDi(blocks as Blocchi);

  const pubblico = (p: string) =>
    supabase.storage.from(BUCKET_TOUR).getPublicUrl(p).data.publicUrl;

  const gia = new Set(attuali.map((f) => f.src));
  const aggiunte = nuove
    .filter((n) => typeof n.storage_path === 'string' && n.storage_path.trim())
    .map((n) => ({ src: pubblico(n.storage_path), alt: (n.alt ?? '').trim() || undefined }))
    /* Due clic sul pulsante non devono raddoppiare la stessa foto. */
    .filter((f) => !gia.has(f.src));

  if (!aggiunte.length) return { ok: false, errore: 'Queste foto c’erano già.' };

  const tutte = [...attuali, ...aggiunte];

  const nuoviBlocchi = {
    ...blocks,
    gallery: tutte,
    images: tutte.map((f) => f.src),
  };

  const { error } = await sb
    .from('tour_content')
    .update({ blocks: nuoviBlocchi })
    .eq('tour_id', tour.id)
    .eq('locale', LOCALE);
  if (error) return { ok: false, errore: error.message };

  for (const l of LOCALE_CODES) {
    revalidatePath(`/${l}/tour/${slug}`);
    revalidatePath(`/${l}`);
  }
  revalidatePath('/admin/foto');
  revalidatePath(`/admin/foto/${slug}`);

  return { ok: true, quante: aggiunte.length };
}
