import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { CATEGORIE } from '@/lib/categorie';
import { DEFAULT_LOCALE, LOCALES, PIU_LINGUE } from '@/lib/locales';
import { SITE } from '@/lib/schema';

/* La sitemap con dentro gli hreflang.
 *
 * Il masterplan (§5.3) e' netto: hreflang va **anche e soprattutto nella
 * sitemap XML**, non solo nei tag HTML. Le implementazioni solo-HTML sono la
 * causa piu' comune di fallimento internazionale, perche' un cluster
 * incoerente si nota solo a scala e nella sitemap e' verificabile.
 *
 * Regole rispettate qui QUANDO LE LINGUE SONO PIU' D'UNA: bidirezionalita'
 * (ogni lingua elenca tutte le altre), auto-referenza (ogni pagina include
 * se stessa) e `x-default` verso l'inglese. Oggi le lingue accese sono una
 * sola, quindi di hreflang non se ne scrive nessuno -- vedi `alternative()`
 * qui sotto e la nota in cima a src/lib/locales.ts.
 *
 * `lastMod` e' quello VERO preso dal database, non la data di build: una
 * sitemap che dichiara "tutto aggiornato oggi" a ogni pubblicazione perde
 * ogni valore diagnostico.
 */

export const revalidate = 3600;

function percorso(locale: string, path: string) {
  return locale === DEFAULT_LOCALE ? `${SITE}${path}` : `${SITE}/${locale}${path}`;
}

/* 🔴 Con una lingua sola non si scrive nessun `xhtml:link`.
 *
 * Finche' erano tre, ogni voce ne portava quattro (en-US, de-DE, it-IT e
 * x-default): 123 URL per 4 = 492 righe, che dichiaravano a Google 369
 * indirizzi distinti dove le pagine vere erano 123. Le 246 in /de/ e /it/
 * erano il testo inglese identico -- vedi la nota in cima a locales.ts.
 *
 * Restituire `undefined` invece di una mappa con una sola voce non e' un
 * dettaglio: un cluster hreflang che punta solo a se stesso e' rumore.
 * Quando `LINGUE_ATTIVE` torna a due, gli hreflang tornano da soli. */
function alternative(path: string): { languages: Record<string, string> } | undefined {
  if (!PIU_LINGUE) return undefined;

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
    {
      /* La pagina di identita'. Sul sito attuale non esiste -- /about-us/
         rimanda ai mezzi -- ed e' una delle ragioni per cui il sito sparisce
         sulle ricerche che non nominano un tour. */
      url: percorso(DEFAULT_LOCALE, '/about-us/'),
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: alternative('/about-us/'),
    },

    {
      url: percorso(DEFAULT_LOCALE, '/contact-us/'),
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: alternative('/contact-us/'),
    },

    /* Le pagine legali: sono raggiungibili dal piede di ogni pagina, non
       hanno noindex e Google le indicizza comunque. Dichiararle costa una
       riga e toglie l'incoerenza fra cio' che il sito espone e cio' che
       dichiara di esporre. */
    ...['/privacy-policy/', '/cookie-policy/', '/terms-and-conditions/'].map((p) => ({
      url: percorso(DEFAULT_LOCALE, p),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
      alternates: alternative(p),
    })),
  ];

  /* Le trentacinque pagine di categoria di WordPress. Erano nel menu e
     nell'indice di Google da anni, e sul sito nuovo non esistevano.

     🔴 MA QUELLE VUOTE NON SI DICHIARANO.

     Nove di queste categorie non hanno nemmeno un tour dentro -- sei lo
     sono anche su WordPress (Palermo, Messina, Taormina, Salerno,
     Amalfi/Positano, transfer diretti da Napoli), e la pagina mostra "We
     are still adding the pages for this section".

     La PAGINA deve restare: quelle URL esistono da anni e toglierle
     vorrebbe dire nove 404. Ma dichiararle nella sitemap e' un'altra cosa:
     e' chiedere a Google di indicizzare nove pagine senza contenuto, cioe'
     esattamente quello che Google chiama "thin content" e che non pesa
     solo su quelle nove -- abbassa la fiducia sul dominio intero.

     Chi ha il link ci arriva e trova la pagina. Google non ci viene
     mandato. Il giorno che la categoria si riempie, torna nella sitemap da
     sola, senza che nessuno debba ricordarsene. */
  const { data: appartenenze } = await supabase
    .from('tour_categorie')
    .select('categorie');
  const piene = new Set<string>();
  for (const r of (appartenenze ?? []) as { categorie: string[] | null }[]) {
    for (const c of r.categorie ?? []) piene.add(c);
  }

  for (const c of CATEGORIE) {
    /* "Tours of Italy" non e' una categoria WooCommerce ma una pagina che
       raccoglie: non ha un `cat` da cercare, e va tenuta. */
    /* 🔴 `/tours-of-italy/` NON E' UNA CATEGORIA VUOTA.
       La guardia qui sotto scarta le voci il cui `cat` non ha tour, e il
       commento sopra diceva che "Tours of Italy non ha un `cat` da
       cercare, e va tenuta". Il commento descriveva un dato che il dato
       non ha: in `categorie.ts` quella voce IL `cat` CE L'HA
       (`tours-of-italy`), e nessuna categoria WooCommerce si chiama
       cosi'. Risultato: la guardia la scartava, e la pagina indice che
       elenca tutti e 86 i tour -- linkata dal menu di ogni pagina, e
       destinazione di due redirect -- restava fuori dalla sitemap. */
    if (c.path !== '/tours-of-italy/' && c.cat && !piene.has(c.cat)) continue;
    voci.push({
      url: percorso(DEFAULT_LOCALE, c.path),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: alternative(c.path),
    });
  }

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
