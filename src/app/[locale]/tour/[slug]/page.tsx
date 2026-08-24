import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { getLocale, isLocale, LOCALES, DEFAULT_LOCALE, regiondoLocale } from '@/lib/locales';
import { RegiondoWidget } from '@/components/RegiondoWidget';
import { InfoTabs } from '@/components/InfoTabs';
import { PhotoStrip, type Foto } from '@/components/PhotoStrip';
import { ContactSection } from '@/components/ContactSection';
import { pulisci, testo, utile, spezzaTitolo } from '@/lib/prosa';
import { breadcrumb, grafo, hreflangDi, organization, touristTrip, SITE as SITE_URL } from '@/lib/schema';
import { prezzoDi } from '@/lib/prezzi';
import '@/styles/home.css';

const SITE = SITE_URL;

/* Le 87 pagine (x 3 lingue) si generano in anticipo e si rigenerano ogni ora.
   Prima erano dinamiche: ogni visita interrogava Supabase e Regiondo, con un
   TTFB intorno al secondo. Il masterplan chiede LCP sotto i 2 secondi
   misurato da mobile negli Stati Uniti, e con la generazione a richiesta non
   ci si arriva. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const { data } = await supabase.from('tours').select('slug').eq('status', 'published');
  const slugs = (data ?? []) as { slug: string }[];
  return LOCALES.flatMap((l) => slugs.map((s) => ({ locale: l.code, slug: s.slug })));
}

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

  const { languages } = { languages: hreflangDi((l) => pathFor(l, slug)) };

  return {
    title: testo(res.contenuto.name) || slug,
    description: testo(res.contenuto.description).slice(0, 160),
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

  const nome = testo(contenuto.name) || slug.replace(/-/g, ' ');
  const foto = contenuto.images ?? [];
  /* "Read more" e' il link di WordPress finito nell'estrazione: compariva
     fra i punti forti come se fosse uno di essi. Si filtra qui e non nel
     database, cosi' vale anche per i contenuti che arriveranno domani. */
  const punti = (contenuto.highlights ?? []).filter(
    (p) => !/^(read more|leggi (tutto|di piu))/i.test(p.trim())
  );
  /* L'ordine delle schede lo decide la pagina, non l'ordine in cui sono
     state estratte da WordPress -- che metteva le FAQ per prime, cioe' la
     cosa piu' secondaria nel posto piu' importante. Si comincia da cosa e'
     incluso e quanto costa; le FAQ chiudono, a destra. */
  const ORDINE = ['INCLUDED', 'PRICES', 'IMPORTANT INFO', 'TIME / LOCATION', 'TOUR SCHEDULE'];
  const tutteLeSchede = contenuto.tabs ?? {};
  const schede = Object.fromEntries(
    Object.entries(tutteLeSchede).sort(([a], [b]) => {
      const pa = /^faq/i.test(a) ? 99 : ORDINE.indexOf(a.toUpperCase());
      const pb = /^faq/i.test(b) ? 99 : ORDINE.indexOf(b.toUpperCase());
      return (pa < 0 ? 50 : pa) - (pb < 0 ? 50 : pb);
    })
  );
  /* Il mosaico .hero-gallery e' nascosto sopra i 760px (sulla landing, li'
     c'era la striscia): usarlo da solo faceva sparire le foto su desktop.
     La striscia si costruisce sempre -- con le didascalie dove sono state
     scritte a mano, con le sole foto altrimenti. */
  const striscia: Foto[] =
    contenuto.gallery?.length
      ? contenuto.gallery
      : (contenuto.images ?? []).map((src) => ({ src, alt: contenuto.name ?? '' }));
  const prezzo = prezzoDi(product?.price, schede);

  const calendario = (
    <>
      <div className="bk-head">
        <h2 className="bk-title">Book this tour</h2>
        <p className="bk-sub">Pick your date and the number of guests.</p>
      </div>
      <div className="pr-tguar">
        <span><i aria-hidden="true">🛡️</i><b>Free cancellation</b> up to 24h</span>
        <span><i aria-hidden="true">⚡</i><b>Instant confirmation</b></span>
      </div>
      {tour.regiondo_sku && (
        <RegiondoWidget sku={tour.regiondo_sku} title={product?.name || nome} locale={locale} />
      )}
    </>
  );

  return (
    <main>
      {/* Due colonne: il contenuto a sinistra, il calendario appiccicato a
          destra. E' la disposizione della scheda tour del sito attuale, ed e'
          quella giusta -- il modulo resta sotto gli occhi mentre si legge,
          invece di stare in fondo dove bisogna cercarlo. Sotto la soglia
          torna una colonna sola e il calendario scende al suo posto. */}
      <div className="pg-cols">
      <div className="pg-main">
      <section className="hero" id="top">
        <span className="hero-loc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {tour.kind === 'private' ? 'Private tour' : tour.kind === 'small_group' ? 'Small group' : 'Prestige Rent'}
        </span>

        {/* L'accento in Fraunces va sul LUOGO, non sull'ultima parola: quasi
            ogni titolo finisce con "from Florence", e accentare la partenza
            invece della meta non dice niente. */}
        <h1 className="hero-title">
          {spezzaTitolo(nome).prima}
          <em className="hl place">{spezzaTitolo(nome).accento}</em>
          {spezzaTitolo(nome).dopo}
        </h1>

        {contenuto.description && <p className="hero-sub">{testo(contenuto.description)}</p>}

        {prezzo != null && (
          <p className="hero-dep">
            <b>from &euro;{prezzo.valore.toFixed(0)}</b>
            {product?.durationHours ? ` · ${product.durationHours} hours` : null}
            {utile(product?.participants) ? ` · ${utile(product?.participants)}` : null}
            {prezzo.fonte === 'wordpress' ? ' · price on request for your date' : null}
          </p>
        )}

        {/* Le recensioni appartengono a UN tour, non all'azienda: si mostrano
            solo dove sono davvero sue. */}
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

        {/* La striscia sta DENTRO l'hero, subito sotto il titolo, come sulla
            landing: non e' una sezione a se'. */}
        <PhotoStrip foto={striscia} />
      </section>


      {punti.length > 0 && (
        <section className="pr-sec tight" id="highlights">
          <div className="pr-wrap wide">
            <div className="pr-head">
              <h2 className="pr-title">Why you will <em className="hl place">remember it</em></h2>
            </div>
            <ul className="hl2-grid">
              {punti.map((p) => (
                <li className="hl2-item" key={p}>
                  <svg className="hl2-ico" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="currentColor" />
                    <path d="m6.8 12.3 3.3 3.3 7-7.2" fill="none" stroke="#fff"
                          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{testo(p)}</span>
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
              <h2 className="pr-title">
                <em className="hl place">
                  {tour.kind === 'private' ? 'Private tour' : tour.kind === 'small_group' ? 'Small group tour' : 'This tour'}
                </em>{' '}
                &mdash; everything you need to know
              </h2>
            </div>
            <InfoTabs tabs={schede} />
          </div>
        </section>
      )}

      {contenuto.itinerary && (
        <section className="pr-sec" id="itinerary">
          <div className="pr-wrap">
            <div className="pr-head">
              <h2 className="pr-title">The <em className="hl place">itinerary</em></h2>
            </div>
            {/* L'itinerario si legge tutto, come sul sito attuale: e' gia'
                spezzato in titoletti, e il ritaglio a 320px lo troncava a
                meta' di una frase. */}
            <div
              className="pr-prose"
              dangerouslySetInnerHTML={{ __html: pulisci(contenuto.itinerary) }}
            />
          </div>
        </section>
      )}

      </div>{/* /.pg-main */}

      <aside className="pg-rail" id="prRail" aria-label="Book this tour">
        <div className="pg-rail-in" id="bookform">{calendario}</div>
      </aside>

      <div className="pg-main-b">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            grafo([
              organization(),
              breadcrumb(locale, [
                { nome: 'Home', path: '/' },
                { nome: nome, path: `/tour/${slug}/` },
              ]),
              touristTrip({
                nome,
                descrizione: contenuto.description,
                url: SITE + pathFor(locale, slug),
                locale,
                immagini: foto,
                prezzo: prezzo?.valore ?? null,
                ore: product?.durationHours ?? null,
                tappe: punti.slice(0, 8),
              }),
            ])
          ),
        }}
      />

      <ContactSection />
      </div>{/* /.pg-main-b */}
      </div>{/* /.pg-cols */}
    </main>
  );
}
