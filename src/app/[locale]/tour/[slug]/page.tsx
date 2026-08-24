import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { getLocale, isLocale, LOCALES, DEFAULT_LOCALE, regiondoLocale } from '@/lib/locales';
import { RegiondoWidget } from '@/components/RegiondoWidget';
import { InfoTabs } from '@/components/InfoTabs';
import { PhotoStrip, type Foto } from '@/components/PhotoStrip';
import { ContactSection } from '@/components/ContactSection';
import '@/styles/home.css';

const SITE = 'https://prestigerent.com';

/* Da dove viene cosa, e perche':
 *
 *  - Regiondo  -> prezzo, durata, disponibilita'. Fatti commerciali, sempre
 *                 freschi, mai ricopiati a mano.
 *  - Supabase  -> testi, punti forti, foto, schede. Recuperati dalle pagine
 *                 WordPress attuali, perche' i campi di marketing di Regiondo
 *                 su piu' prodotti sono segnaposto ("Highlight 1, 2, 3").
 *
 * Se un giorno un prezzo comparisse in Supabase, e' un errore da correggere.
 */

type Contenuto = {
  name?: string;
  description?: string;
  images?: string[];
  highlights?: string[];
  itinerary?: string;
  tabs?: Record<string, string>;
  /* Solo dove le foto sono state scelte a mano, con etichetta e
     sottotitolo: una didascalia scritta vende, un nome di file no. */
  gallery?: Foto[];
};

function pathFor(locale: string, slug: string) {
  return locale === DEFAULT_LOCALE ? `/tour/${slug}/` : `/${locale}/tour/${slug}/`;
}

async function getTour(slug: string, locale: string) {
  const { data } = await supabase
    .from('tours')
    .select('id, slug, kind, regiondo_sku, status, rating, reviews_count, reviews_source, tour_content(locale, blocks, title, meta_description)')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;

  const righe = (data as unknown as { tour_content?: { locale: string; blocks: Contenuto }[] })
    .tour_content ?? [];
  /* Finche' le traduzioni non ci sono, si mostra l'inglese invece di una
     pagina vuota: meglio la lingua sbagliata che il nulla. */
  const c = righe.find((r) => r.locale === locale) ?? righe.find((r) => r.locale === 'en');

  return { tour: data as unknown as TourRow, contenuto: (c?.blocks ?? {}) as Contenuto };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const res = await getTour(slug, locale);
  if (!res) return {};

  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.htmlLang] = SITE + pathFor(l.code, slug);
  languages['x-default'] = SITE + pathFor(DEFAULT_LOCALE, slug);

  return {
    title: res.contenuto.name ?? slug,
    description: res.contenuto.description?.slice(0, 160),
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

  const res = await getTour(slug, locale);
  if (!res) notFound();

  const { tour, contenuto } = res;
  const product = tour.regiondo_sku
    ? await fetchProduct(tour.regiondo_sku, regiondoLocale(locale))
    : null;

  const nome = contenuto.name ?? slug.replace(/-/g, ' ');
  const foto = contenuto.images ?? [];
  const punti = contenuto.highlights ?? [];
  const schede = contenuto.tabs ?? {};
  const striscia = contenuto.gallery ?? [];

  return (
    <main>
      <section className="hero" id="top">
        <a className="logo" href="/">
          <span className="logo-name">
            <strong>Prestige Rent</strong>
            <small>Tours &amp; Transfers in Italy</small>
          </span>
        </a>

        <span className="hero-loc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {tour.kind === 'private' ? 'Private tour' : tour.kind === 'small_group' ? 'Small group' : 'Prestige Rent'}
        </span>

        <h1 className="hero-title">{nome}</h1>

        {contenuto.description && <p className="hero-sub">{contenuto.description}</p>}

        {product?.price != null && (
          <p className="hero-dep">
            <b>from &euro;{product.price.toFixed(0)}</b>
            {product.durationHours ? ` · ${product.durationHours} hours` : null}
            {product.participants ? ` · ${product.participants}` : null}
          </p>
        )}

        {/* Le recensioni appartengono a UN tour, non all'azienda: si mostrano
            solo dove sono davvero sue. Attribuire a un prodotto le recensioni
            di un altro e', per Google, un segnale ingannevole. */}
        {tour.rating != null && tour.reviews_count != null && (
          <div className="trust">
            <span className="t-item">
              <span className="stars-img" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <i className="star" key={i} />)}
              </span>
              <span>
                <b>{tour.rating}</b> · {tour.reviews_count.toLocaleString('en-US')} reviews
                {tour.reviews_source ? ` on ${tour.reviews_source}` : ''}
              </span>
            </span>
          </div>
        )}

        {striscia.length === 0 && foto.length > 0 && (
          <div className="hero-gallery" aria-label="Tour photos">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="g-hero" src={foto[0]} alt={nome} loading="eager" decoding="async" />
            {foto.slice(1, 13).reduce<string[][]>((cols, f, i) => {
              if (i % 2 === 0) cols.push([]);
              cols[cols.length - 1].push(f);
              return cols;
            }, []).map((col, i) => (
              <div className="g-col" key={i}>
                {col.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f} src={f} alt={nome} loading="lazy" decoding="async" />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {striscia.length > 0 && (
        <section className="pr-sec tight" id="photos">
          <div className="pr-wrap wide">
            <PhotoStrip foto={striscia} />
          </div>
        </section>
      )}

      {punti.length > 0 && (
        <section className="pr-sec tight" id="highlights">
          <div className="pr-wrap wide">
            <div className="pr-head">
              <h2 className="pr-title">Highlights</h2>
            </div>
            <ul className="hl2-grid">
              {punti.map((p) => (
                <li className="hl2-item" key={p}>
                  <svg className="hl2-ico" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="currentColor" />
                    <path d="m6.8 12.3 3.3 3.3 7-7.2" fill="none" stroke="#fff"
                          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className="pr-tguar">
              <span><i aria-hidden="true">🛡️</i><b>Free cancellation</b> up to 24h — 100% refund</span>
              <span><i aria-hidden="true">⚡</i><b>Instant confirmation</b></span>
              <span><i aria-hidden="true">🏷️</i><b>Best price</b> when you book direct</span>
            </div>
          </div>
        </section>
      )}

      {Object.keys(schede).length > 0 && (
        <section className="pr-sec alt" id="info">
          <div className="pr-wrap wide">
            <div className="pr-head">
              <h2 className="pr-title">Everything you need to know</h2>
            </div>
            <InfoTabs tabs={schede} />
          </div>
        </section>
      )}

      {contenuto.itinerary && (
        <section className="pr-sec" id="itinerary">
          <div className="pr-wrap">
            <div className="pr-head">
              <h2 className="pr-title">Itinerary</h2>
            </div>
            <div className="pr-prose" dangerouslySetInnerHTML={{ __html: contenuto.itinerary }} />
          </div>
        </section>
      )}

      <section className="pr-sec alt" id="bookform">
        <div className="pr-wrap">
          <div className="bk-head">
            <h2 className="bk-title">Book this tour</h2>
            <p className="bk-sub">Pick your date and the number of guests.</p>
          </div>
          {tour.regiondo_sku && product ? (
            <RegiondoWidget sku={tour.regiondo_sku} title={product.name || nome} locale={locale} />
          ) : (
            <p className="pr-lead">
              This tour is arranged on request.{' '}
              <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
                Message us on WhatsApp
              </a>{' '}
              with your date and the number of guests, and we will send you the price.
            </p>
          )}
        </div>
      </section>

      <ContactSection />
    </main>
  );
}
