import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { ContactSection } from '@/components/ContactSection';
import { GalleriaFotaflo } from '@/components/GalleriaFotaflo';
import { organization, breadcrumb, grafo, hreflangDi } from '@/lib/schema';
import '@/styles/home.css';

export const revalidate = 3600;

/* LE FOTO DEI CLIENTI VERI.
 *
 * ── PERCHE' UNA PAGINA E NON UN RIQUADRO IN HOME ────────────────────
 * Il widget di Fotaflo funziona solo su indirizzi che qualcuno ha
 * autorizzato a mano nel loro pannello: serve UN indirizzo preciso, e
 * quello e' questo. Da qui, quando ci saranno foto davvero, si potra'
 * portarne una striscia anche in home -- ma allora andra' autorizzata
 * anche la home.
 *
 * ── PERCHE' VALE LA PENA ────────────────────────────────────────────
 * Sono le uniche fotografie del sito in cui si vedono clienti veri e
 * riconoscibili, scattate dalle guide durante i tour. Tutto il resto e'
 * paesaggio: bello, ma intercambiabile con qualunque altro operatore
 * toscano. Queste no.
 *
 * ── 🔴 NON E' LA PAGINA DEGLI ALBUM PRIVATI ─────────────────────────
 * `/guest-albums/?code=XXXX` e' un'altra cosa: l'album personale che il
 * singolo ospite apre col codice ricevuto dopo il tour, e sta ancora sul
 * vecchio WordPress. Quella e' privata e riservata a chi c'era; questa e'
 * pubblica e mostra una selezione. Non vanno unite.
 *
 * ── COSA MANCA PERCHE' SI VEDA QUALCOSA ─────────────────────────────
 * Due cose, tutte e due dentro Fotaflo e nessuna nel codice:
 *   1. questo indirizzo va aggiunto fra gli "Authorized URLs" del Gallery
 *      widget -- oggi l'elenco e' vuoto e la galleria risponde 404;
 *   2. le foto vanno marcate come pubblicabili nella galleria: chiedendola
 *      adesso torna il solo foglio di stile, cioe' nessuna immagine.
 * Finche' non ci sono, la pagina mostra il testo e basta, senza buchi.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Photos from our tours — Prestige Rent',
    description:
      'Real photographs taken by our guides during the tours: the cellars, the hills, and the people who were there.',
    alternates: hreflangDi((l) => (l === DEFAULT_LOCALE ? '/guest-photos/' : `/${l}/guest-photos/`), locale),
    robots: { index: true, follow: true },
    openGraph: { title: 'Photos from our tours', type: 'website' },
  };
}

export default async function FotoDegliOspiti({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            grafo([
              organization(),
              breadcrumb(locale, [
                { nome: 'Home', path: '/' },
                { nome: 'Photos from our tours', path: '/guest-photos/' },
              ]),
            ]),
          ),
        }}
      />

      <section className="pr-sec">
        <div className="pr-wrap wide">
          <div className="pr-head">
            <p className="hm-occhiello">Taken on the day</p>
            <h1 className="pr-title">Photos from our tours</h1>
            <p className="pr-lead hm-sotto-nobile">
              Our guides take photographs while the day is happening — in the cellars,
              on the hill roads, at the table. These are real guests on real departures,
              not stock pictures of Tuscany.
            </p>
          </div>

          <GalleriaFotaflo />

          <p className="pr-lead" style={{ marginTop: 28 }}>
            Were you on one of our tours? Your own album is separate and private —
            open it with the code on the card your guide gave you, at{' '}
            <a href={p('/guest-albums/')}>guest albums</a>.
          </p>
        </div>
      </section>

      <ContactSection locale={locale} tour="Photos page" />
    </main>
  );
}
