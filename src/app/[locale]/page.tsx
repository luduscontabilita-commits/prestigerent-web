import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { DEFAULT_LOCALE, isLocale, LOCALES } from '@/lib/locales';

/* Indice provvisorio: serve a navigare le 87 pagine mentre si costruisce.
 * La home vera arrivera' dopo, quando i template saranno definiti. */

export const revalidate = 3600;

function pathFor(locale: string, slug: string) {
  return locale === DEFAULT_LOCALE ? `/tour/${slug}/` : `/${locale}/tour/${slug}/`;
}

const KIND_LABEL: Record<string, string> = {
  small_group: 'Small group',
  private: 'Private tours',
  cruise: 'Cruise port tours',
  transfer: 'Transfers',
  other: 'Other',
};

export default async function Index({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { data } = await supabase
    .from('tours')
    .select('id, slug, kind, regiondo_sku, status')
    .order('kind')
    .order('slug');

  const tours = (data ?? []) as TourRow[];
  const byKind = new Map<string, TourRow[]>();
  for (const t of tours) {
    if (!byKind.has(t.kind)) byKind.set(t.kind, []);
    byKind.get(t.kind)!.push(t);
  }

  return (
    <main className="pr-sec">
      <div className="pr-wrap wide">
        <div className="pr-head">
          <h1 className="pr-title">Prestige Rent — {tours.length} tour</h1>
          <p className="pr-lead">
            Indice di lavorazione. {tours.filter((t) => t.regiondo_sku).length} tour
            leggono prezzo e contenuti da Regiondo, {tours.filter((t) => !t.regiondo_sku).length}{' '}
            sono a preventivo.
          </p>
          <p className="pr-lead" style={{ fontSize: '.85rem' }}>
            {LOCALES.map((l) => (
              <span key={l.code} style={{ marginInlineEnd: 10 }}>
                <Link href={l.code === DEFAULT_LOCALE ? '/' : `/${l.code}`}>{l.label}</Link>
              </span>
            ))}
          </p>
        </div>

        {[...byKind.entries()].map(([kind, list]) => (
          <section key={kind} style={{ marginTop: 26 }}>
            <h2 className="pr-title" style={{ fontSize: '1.3rem' }}>
              {KIND_LABEL[kind] ?? kind} <small style={{ opacity: 0.5 }}>({list.length})</small>
            </h2>
            <ul className="pr-prose">
              {list.map((t) => (
                <li key={t.id}>
                  <Link href={pathFor(locale, t.slug)}>{t.slug.replace(/-/g, ' ')}</Link>
                  {t.regiondo_sku ? null : (
                    <span style={{ color: '#C8102E', fontSize: '.78rem' }}> — a preventivo</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
