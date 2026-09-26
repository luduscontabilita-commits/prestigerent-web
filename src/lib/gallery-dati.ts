/* LE LETTURE DELLA GALLERY.
 *
 * Le regole stanno in `gallery-tag.ts`, che non importa niente e per
 * questo si puo' provare. Qui ci sono le letture, e sono tre righe di
 * Supabase per pagina.
 *
 * ── 🔴 PERCHE' QUI NON C'E' `unstable_cache` ────────────────────────────
 * Il piano prevedeva `unstable_cache` con i tag `gallery` e
 * `gallery:<key>`, piu' `revalidateTag` dal pannello. Guardando il
 * progetto: non esiste NESSUNA cache di query, da nessuna parte. Le
 * pagine sono in ISR (`export const revalidate` -- home 900s, tour e
 * categorie 3600s) e le azioni del pannello chiamano `revalidatePath`
 * per far vedere subito una modifica. E' il modo di questo progetto, e
 * funziona gia'.
 *
 * Aggiungere una seconda cache DENTRO una pagina che e' gia' in cache non
 * fa risparmiare niente -- la query gira una volta per rigenerazione, non
 * una per visita -- e aggiunge un modo perche' i due strati dicano cose
 * diverse: la pagina rigenerata con i dati vecchi perche' il tag non era
 * stato invalidato e' un guasto che non si vede e non si spiega.
 *
 * Quindi: letture nude, e `revalidatePath` dal pannello sul percorso della
 * pagina toccata, che `gallery_tags.path` ha già scritto dentro.
 *
 * ── LE TRE LETTURE ─────────────────────────────────────────────────────
 * impostazioni, la riga del tag, le foto approvate. Tutte e tre su indice,
 * tutte e tre dentro una pagina che si rigenera una volta l'ora: unirle in
 * una funzione del database farebbe risparmiare millisecondi una volta
 * l'ora, e costerebbe una funzione SQL da mantenere.
 */

import { supabase } from './supabase';
import {
  decidi,
  ordina,
  titoloDi,
  type Criterio,
  type Esito,
  type Foto,
  type Impostazioni,
  type Tag,
} from './gallery-tag';

const CAMPI_IMPOSTAZIONI =
  'galleries_enabled,min_images,default_title,default_subtitle,default_title_tour,default_subtitle_tour,autoplay_speed,default_sort';

const CAMPI_TAG =
  'id,key,type,label,path,ref_id,senza_tour,is_orphan,custom_title,custom_subtitle,visibility_override,min_images_override,sort_override';

const CAMPI_FOTO =
  'image_id,bucket,storage_path,width,height,blur_data_url,alt,caption,taken_at,created_at,position,pinned';

/** Le impostazioni non esistono per definizione: la riga e' una sola e la
 *  crea la migrazione. Se manca -- database appena ripristinato, riga
 *  cancellata a mano -- si torna spento. Mai acceso per difetto: una
 *  gallery che compare da sola perche' una lettura e' andata male e' il
 *  tipo di guasto che nessuno collega alla causa. */
const SPENTA: Impostazioni = {
  galleries_enabled: false,
  min_images: 3,
  default_title: 'Moments from the *road*',
  default_subtitle: null,
  default_title_tour: 'On this tour, by our *guests*',
  default_subtitle_tour: null,
  autoplay_speed: 'medium',
  default_sort: 'manual',
};

export async function impostazioni(): Promise<Impostazioni> {
  const { data } = await supabase.from('gallery_settings').select(CAMPI_IMPOSTAZIONI).eq('id', 1).maybeSingle();
  return (data as Impostazioni | null) ?? SPENTA;
}

export async function tagDi(key: string): Promise<Tag | null> {
  const { data } = await supabase.from('gallery_tags').select(CAMPI_TAG).eq('key', key).maybeSingle();
  return (data as Tag | null) ?? null;
}

/** Le foto APPROVATE di una pagina. La vista `gallery_public` filtra da
 *  se' su `status = 'approvata'`, e sotto c'e' comunque la RLS: da questa
 *  chiave non si arriva a una foto in attesa nemmeno sbagliando la query. */
export async function fotoDi(key: string): Promise<Foto[]> {
  const { data } = await supabase
    .from('gallery_public')
    .select(CAMPI_FOTO)
    .eq('tag_key', key)
    .order('pinned', { ascending: false })
    .order('position', { ascending: true });
  return (data as Foto[] | null) ?? [];
}

/** L'indirizzo pubblico di una foto approvata. Le approvate stanno sempre
 *  nel bucket `gallery`, che e' pubblico -- il vincolo
 *  `gallery_images_stato_bucket` lo garantisce nel database -- quindi qui
 *  non serve nessun URL firmato. */
export function urlFoto(f: Pick<Foto, 'bucket' | 'storage_path'>): string {
  return supabase.storage.from(f.bucket).getPublicUrl(f.storage_path).data.publicUrl;
}

export type Gallery = {
  tag: Tag;
  esito: Esito;
  foto: Foto[];
  titolo: string;
  sottotitolo: string | null;
  criterio: Criterio;
  velocita: Impostazioni['autoplay_speed'];
};

/**
 * TUTTO QUELLO CHE SERVE A UNA PAGINA, o `null` se non deve rendere
 * niente.
 *
 * Torna `null` in tre casi diversi che per la pagina sono lo stesso caso:
 * il tag non esiste nel registro (pagina esclusa, o registro non ancora
 * sincronizzato), la regola dice di no, oppure non ci sono foto. Chi
 * chiama fa `if (!g) return null` e non deve conoscere nessuno dei tre.
 *
 * Il pannello NON usa questa: usa `decidi()` e `ordina()` direttamente sui
 * dati che ha gia', perche' deve poter mostrare anche i casi in cui la
 * gallery NON si vede, e il motivo.
 */
export async function galleryDi(key: string): Promise<Gallery | null> {
  const [imp, tag] = await Promise.all([impostazioni(), tagDi(key)]);
  if (!tag) return null;

  /* Le foto si leggono anche quando l'interruttore e' spento, perche'
     servono a contare: la soglia si misura sulle approvate, e senza il
     numero non si sa dire "2 su 3". E' una lettura su indice che torna
     una lista corta. */
  const foto = await fotoDi(key);
  const esito = decidi(imp, tag, foto.length);
  if (!esito.visibile) return null;

  const criterio = tag.sort_override ?? imp.default_sort;
  const { titolo, sottotitolo } = titoloDi(imp, tag);

  return {
    tag,
    esito,
    foto: ordina(foto, criterio, tag.key, undefined),
    titolo,
    sottotitolo,
    criterio,
    velocita: imp.autoplay_speed,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   LE CHIAVI, per chi le deve comporre
   ═══════════════════════════════════════════════════════════════════

   Stanno qui e non scritte a mano nei template: `'tour:' + slug` in tre
   file diversi e' tre occasioni di scriverlo con la maiuscola sbagliata,
   e l'errore non darebbe un'eccezione -- darebbe una gallery che non
   compare, senza nessun messaggio. */

export const chiaveHome = 'home';
export const chiaveTour = (slug: string) => `tour:${slug}`;

/** Per una pagina di categoria o di porto: la chiave nasce dall'ultimo
 *  pezzo dell'indirizzo, e il prefisso dice di che tipo e'. La stessa
 *  regola di `registro()` in gallery-tag.ts. */
export function chiavePercorso(path: string): string {
  const pezzi = path.split('/').filter(Boolean);
  const ultimo = pezzi[pezzi.length - 1] ?? '';
  const tipo = pezzi.length > 1 && pezzi[0] === 'cruise-port-tours' ? 'port' : 'cat';
  return `${tipo}:${ultimo}`;
}
