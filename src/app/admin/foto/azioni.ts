'use server';

import { revalidatePath } from 'next/cache';
import { chiAgisce, supabaseServer } from '@/lib/auth';
import { LOCALE_CODES } from '@/lib/locales';
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
