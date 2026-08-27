import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { DEFAULT_LOCALE, isLocale, LOCALES, regiondoLocale } from '@/lib/locales';
import { CATEGORIE, categoriaDi, figlieDi } from '@/lib/categorie';
import { votiPerTour } from '@/lib/recensioni';
import { metaDi } from '@/lib/seo';
import { prezzoDi } from '@/lib/prezzi';
import { testo } from '@/lib/prosa';
import { breadcrumb, grafo, hreflangDi, organization } from '@/lib/schema';
import { ogDiPagina } from '@/lib/og';
import { Premi } from '@/components/Premi';
import { ContactSection } from '@/components/ContactSection';
import '@/styles/home.css';

export const revalidate = 3600;

/* LE PAGINE DI CATEGORIA -- trentacinque indirizzi che esistono su
 * WordPress, sono nel menu, e sul sito nuovo non c'erano.
 *
 * Il giorno del passaggio avrebbero risposto 404 tutte insieme, comprese
 * /small-group-tours/ e /private-tours/ che sono le voci principali del
 * menu e le pagine con piu' storia dopo la home.
 *
 * Una sola pagina modello per tutte: cambia il filtro, non il codice.
 */

export function generateStaticParams() {
  const out: { locale: string; percorso: string[] }[] = [];
  for (const l of LOCALES) {
    for (const c of CATEGORIE) {
      out.push({ locale: l.code, percorso: c.path.split('/').filter(Boolean) });
    }
  }
  return out;
}

function daiParams(percorso: string[]) {
  return '/' + percorso.join('/') + '/';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; percorso: string[] }>;
}): Promise<Metadata> {
  /* `locale` serviva gia' qui sotto per il canonical ma non veniva
     estratto: il file non compilava proprio (TS2552). */
  const { locale, percorso } = await params;
  const c = categoriaDi(daiParams(percorso));
  if (!c) return {};
  /* Scritti uno per uno e conservati nella tabella `seo`: qui c'erano
     30 pagine su 35 SENZA description e 5 con un paragrafo intero al
     posto del meta, uno da 1.267 caratteri dove Google ne legge 155. */
  const m = await metaDi(c.path, 'en');
  return {
    title: m?.title ?? `${c.titolo} — Prestige Rent`,
    description: m?.description ?? c.intro.slice(0, 155),
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? c.path : `/${l}${c.path}`),
      locale
    ),
    /* Titolo e testo dell'anteprima li mette Next da solo copiando i due
       campi qui sopra (vedi src/lib/og.ts); qui si aggiunge l'indirizzo
       pubblico giusto -- che Next da solo sbaglierebbe, perche' dentro
       l'applicazione l'inglese vive sotto /en/. La foto e' quella di
       ripiego: una pagina di categoria non ne ha una propria. */
    openGraph: ogDiPagina({
      locale,
      path: locale === DEFAULT_LOCALE ? c.path : `/${locale}${c.path}`,
    }),
  };
}

type Riga = TourRow & { tour_content?: { locale: string; blocks: Record<string, unknown> }[] };

export default async function Categoria_({
  params,
}: {
  params: Promise<{ locale: string; percorso: string[] }>;
}) {
  const { locale, percorso } = await params;
  if (!isLocale(locale)) notFound();

  const cat = categoriaDi(daiParams(percorso));
  if (!cat) notFound();

  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);

  /* Chi sta in questa categoria lo dice WooCommerce, non un elenco di
     parole: `contains` sull'array delle categorie del tour. */
  const [{ data: appartiene }, { data }, voti] = await Promise.all([
    supabase.from('tour_categorie').select('tour_slug').contains('categorie', [cat.cat]),
    supabase
      .from('tours')
      .select('id, slug, kind, regiondo_sku, status, rating, reviews_count, reviews_source, tour_content(locale, blocks)')
      .eq('status', 'published'),
    votiPerTour(),
  ]);

  const dentro = new Set((appartiene ?? []).map((x) => x.tour_slug));
  const righe = (data ?? []) as unknown as Riga[];
  /* "Tours of Italy" non e' una categoria WooCommerce: e' la pagina che
     mostra tutto. Su WordPress fa lo stesso -- e' l'indice generale. */
  const scelti = cat.cat === 'tours-of-italy' ? righe : righe.filter((r) => dentro.has(r.slug));

  /* I prezzi tutti insieme, non uno dopo l'altro: in fila sarebbero
     decine di attese sommate su una pagina sola. */
  const prezzi = new Map<string, number | null>();
  await Promise.all(
    scelti
      .filter((r) => r.regiondo_sku)
      .map(async (r) => {
        const pr = await fetchProduct(r.regiondo_sku!, regiondoLocale(locale));
        if (pr) prezzi.set(r.slug, prezzoDi(pr.price, {})?.valore ?? null);
      })
  );

  const figlie = figlieDi(cat.path);
  const briciole = [{ nome: 'Home', path: '/' }];
  if (cat.padre) {
    const pa = categoriaDi(cat.padre);
    if (pa) briciole.push({ nome: pa.titolo, path: pa.path });
  }
  briciole.push({ nome: cat.titolo, path: cat.path });

  return (
    <main className="ct">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(grafo([organization(), breadcrumb(locale, briciole)])),
        }}
      />

      <nav className="ct-bric" aria-label="Breadcrumb">
        {briciole.map((b, i) => (
          <span key={b.path}>
            {i > 0 && <i>/</i>}
            {i === briciole.length - 1 ? <b>{b.nome}</b> : <a href={p(b.path)}>{b.nome}</a>}
          </span>
        ))}
      </nav>

      <header className="ct-head">
        <h1>{cat.titolo}</h1>
        <p>{cat.intro}</p>
      </header>

      {figlie.length > 0 && (
        <div className="ct-figlie">
          {figlie.map((f) => (
            <a key={f.path} href={p(f.path)}>
              {f.titolo}
            </a>
          ))}
        </div>
      )}

      {scelti.length > 0 ? (
        <div className="ct-griglia">
          {scelti.map((r) => {
            const c = r.tour_content?.find((x) => x.locale === locale) ?? r.tour_content?.[0];
            const b = (c?.blocks ?? {}) as { name?: string; gallery?: { src: string }[]; images?: string[] };
            const nome = testo(b.name ?? r.slug.replace(/-/g, ' '));
            const foto = b.gallery?.[0]?.src ?? b.images?.[0];
            const q = voti[r.slug];
            const pr = prezzi.get(r.slug);
            return (
              <a className="ct-card" key={r.slug} href={p(`/tour/${r.slug}/`)}>
                <div className="ct-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {foto && <img src={foto} alt={nome} loading="lazy" decoding="async" />}
                </div>
                <div className="ct-body">
                  <strong>{nome}</strong>
                  {q && (
                    <span className="ct-voto">
                      ★ {q.voto.toFixed(1)} <i>{q.quante.toLocaleString('en-US')} reviews</i>
                    </span>
                  )}
                  {pr != null && (
                    <span className="ct-prezzo">
                      from <b>&euro;{pr.toFixed(0)}</b>
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="ct-vuoto">
          We are still adding the pages for this section. Meanwhile,{' '}
          <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
            message us on WhatsApp
          </a>{' '}
          and we will tell you straight away what we run from here.
        </p>
      )}

      <Premi />
      <ContactSection locale={locale} />
    </main>
  );
}
