import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { getLocale, isLocale, LOCALES, DEFAULT_LOCALE, regiondoLocale } from '@/lib/locales';
import { RegiondoWidget } from '@/components/RegiondoWidget';

const SITE = 'https://prestigerent.com';

/* L'inglese vive senza prefisso, le altre lingue sotto /xx/.
 * Vale per i canonical, per gli hreflang e per qualunque link interno. */
function pathFor(locale: string, slug: string) {
  return locale === DEFAULT_LOCALE ? `/tour/${slug}/` : `/${locale}/tour/${slug}/`;
}

async function getTour(slug: string): Promise<TourRow | null> {
  const { data } = await supabase
    .from('tours')
    .select('id, slug, kind, regiondo_sku, status')
    .eq('slug', slug)
    .maybeSingle();
  return (data as TourRow) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const tour = await getTour(slug);
  if (!tour) return {};

  const product = tour.regiondo_sku
    ? await fetchProduct(tour.regiondo_sku, regiondoLocale(locale))
    : null;

  /* hreflang su tutte le lingue: senza, otto traduzioni della stessa pagina
     sembrano a Google otto pagine che si fanno concorrenza. */
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.htmlLang] = SITE + pathFor(l.code, slug);
  languages['x-default'] = SITE + pathFor(DEFAULT_LOCALE, slug);

  return {
    title: product?.name ?? slug,
    description: product?.shortDescription?.replace(/<[^>]+>/g, '').slice(0, 160),
    alternates: { canonical: SITE + pathFor(locale, slug), languages },
  };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const tour = await getTour(slug);
  if (!tour) notFound();

  const product = tour.regiondo_sku
    ? await fetchProduct(tour.regiondo_sku, regiondoLocale(locale))
    : null;

  const info = getLocale(locale);

  return (
    <main>
      <section className="hero" id="top">
        <span className="hero-loc">{info.label} · {tour.kind.replace('_', ' ')}</span>

        <h1 className="hero-title">{product?.name ?? slug.replace(/-/g, ' ')}</h1>

        {product?.shortDescription && (
          <p
            className="hero-sub"
            dangerouslySetInnerHTML={{ __html: product.shortDescription }}
          />
        )}

        {/* Prezzo e durata vengono da Regiondo a ogni rigenerazione: qui non
            sono scritti da nessuna parte, quindi non possono essere vecchi. */}
        {product?.price != null && (
          <p className="hero-dep">
            <b>from &euro;{product.price.toFixed(0)}</b>
            {product.durationHours ? ` · ${product.durationHours} hours` : null}
            {product.participants ? ` · ${product.participants}` : null}
          </p>
        )}
      </section>

      {product && (
        <section className="pr-sec alt" id="info">
          <div className="pr-wrap wide">
            {product.included && (
              <div className="pr-acc-body pr-prose">
                <h2 className="pr-title">Included</h2>
                <div dangerouslySetInnerHTML={{ __html: product.included }} />
              </div>
            )}
            {product.notIncluded && (
              <div className="pr-acc-body pr-prose">
                <h2 className="pr-title">Not included</h2>
                <div dangerouslySetInnerHTML={{ __html: product.notIncluded }} />
              </div>
            )}
            {product.pickup && <p className="pr-lead">{product.pickup}</p>}
          </div>
        </section>
      )}

      <section className="pr-sec" id="bookform">
        <div className="pr-wrap">
          {tour.regiondo_sku && product ? (
            <RegiondoWidget sku={tour.regiondo_sku} title={product.name} locale={locale} />
          ) : (
            /* I 38 tour senza prodotto: qui non si finge un calendario che non
               c'e', si chiede il preventivo. */
            <p className="pr-lead">
              This tour is arranged on request.{' '}
              <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
                Message us on WhatsApp
              </a>{' '}
              with your date and the number of guests.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
