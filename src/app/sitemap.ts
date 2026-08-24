import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/locales';
import { SITE } from '@/lib/schema';

/* La sitemap con dentro gli hreflang.
 *
 * Il masterplan (§5.3) e' netto: hreflang va **anche e soprattutto nella
 * sitemap XML**, non solo nei tag HTML. Le implementazioni solo-HTML sono la
 * causa piu' comune di fallimento internazionale, perche' un cluster
 * incoerente si nota solo a scala e nella sitemap e' verificabile.
 *
 * Regole rispettate qui: bidirezionalita' (ogni lingua elenca tutte le
 * altre), auto-referenza (ogni pagina include se stessa) e `x-default` verso
 * l'inglese.
 *
 * `lastMod` e' quello VERO preso dal database, non la data di build: una
 * sitemap che dichiara "tutto aggiornato oggi" a ogni pubblicazione perde
 * ogni valore diagnostico.
 */

export const revalidate = 3600;

function percorso(locale: string, path: string) {
  return locale === DEFAULT_LOCALE ? `${SITE}${path}` : `${SITE}/${locale}${path}`;
}

function alternative(path: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.htmlLang] = percorso(l.code, path);
  languages['x-default'] = percorso(DEFAULT_LOCALE, path);
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from('tours')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('slug');

  const tours = (data ?? []) as { slug: string; updated_at: string }[];

  const voci: MetadataRoute.Sitemap = [
    {
      url: percorso(DEFAULT_LOCALE, '/'),
      changeFrequency: 'daily',
      priority: 1,
      alternates: alternative('/'),
    },
  ];

  for (const t of tours) {
    voci.push({
      url: percorso(DEFAULT_LOCALE, `/tour/${t.slug}/`),
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: alternative(`/tour/${t.slug}/`),
    });
  }

  return voci;
}
