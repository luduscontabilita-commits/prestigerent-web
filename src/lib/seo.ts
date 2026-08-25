import { supabase } from '@/lib/supabase';

/* I title e le description vengono dalla tabella `seo`, non dal codice.
 *
 * Cosi' si correggono dal pannello senza ripubblicare il sito, e -- cosa
 * che conta di piu' -- si vedono tutti insieme in una tabella invece che
 * sparsi in ottantasette file. Il 40% dei title di WordPress e' tagliato
 * da Google proprio perche' nessuno li ha mai visti tutti in fila.
 *
 * Se la riga non c'e', chi chiama usa il suo testo di ripiego: una pagina
 * senza meta e' un problema, una pagina che non si apre e' un disastro.
 */
export type Meta = { title: string | null; description: string | null };

export async function metaDi(percorso: string, locale = 'en'): Promise<Meta | null> {
  const { data } = await supabase
    .from('seo')
    .select('title,description')
    .eq('percorso', percorso)
    .eq('locale', locale)
    .maybeSingle();
  return (data as Meta) ?? null;
}
