import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { riprova } from '@/lib/riprova';
import { metaDi } from '@/lib/seo';
import { Premi } from '@/components/Premi';
import { ContactSection } from '@/components/ContactSection';
import { organization, breadcrumb, grafo, hreflangDi } from '@/lib/schema';
import '@/styles/home.css';

export const revalidate = 3600;

/* LA PAGINA DEI CONTATTI.
 *
 * /contact-us/ esiste su WordPress da anni ed e' indicizzata. Nel primo
 * giro di redirect era finita su /about-us/, con un ragionamento che
 * sembrava sensato -- "i contatti stanno gia' li' in fondo" -- ma che
 * sbaglia il punto: chi cerca "prestige rent contact" o clicca "Contact"
 * nel menu ha gia' deciso di scrivere. Portarlo su una pagina che
 * racconta chi siamo lo fa ripartire da capo.
 *
 * E' anche la pagina che Google e le AI leggono per sapere se questa
 * azienda esiste davvero: indirizzo, telefono, partita IVA e licenza in
 * chiaro, gli stessi dati che stanno nel piede e nei dati strutturati.
 *
 * Il modulo e' lo stesso di tutto il sito (ContactSection) e da qui manda
 * l'email con oggetto "Richiesta dal sito · Contact page": vedi
 * src/lib/posta.ts.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [d, m] = await Promise.all([riprova(), metaDi('/contact-us/', 'en')]);
  const a = d.azienda;
  return {
    title: m?.title ?? 'Contact us — Prestige Rent, Florence',
    description:
      m?.description ??
      `Talk to the people who actually run the tours. Office in Florence — ` +
        `${a?.telefono ?? '+39 055 286059'}, WhatsApp, or the form on this page. ` +
        `We answer every request, and our emergency line is open 24/7.`,
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? '/contact-us/' : `/${l}/contact-us/`),
      locale
    ),
  };
}

export default async function Contatti({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const d = await riprova();
  const a = d.azienda;
  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);
  const tel = a?.telefono?.replace(/\s/g, '') ?? '+39055286059';

  return (
    <main className="ab">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            grafo([
              organization(),
              breadcrumb(locale, [
                { nome: 'Home', path: '/' },
                { nome: 'Contact us', path: '/contact-us/' },
              ]),
            ])
          ),
        }}
      />

      <header className="ab-hero">
        <p className="ab-kicker">Florence &middot; since {a?.anno_fondazione}</p>
        <h1>Contact us</h1>
        <p className="ab-lead">
            You will be speaking with the company that runs the tours &mdash; not
            with an agency that resells them. The office is in Florence and
            answers in English; if you are already travelling, the emergency
          number on your voucher is answered 24/7.
        </p>
      </header>

      <section className="pr-sec">
        <div className="pr-wrap">

          <div className="cu-vie">
            <a className="cu-via" href={`https://wa.me/${a?.whatsapp ?? '393338424047'}`}
               target="_blank" rel="noopener">
              <span className="cu-eti">WhatsApp</span>
              <strong>Message us</strong>
              <span className="cu-nota">Usually the fastest way to get an answer.</span>
            </a>

            <a className="cu-via" href={`tel:${tel}`}>
              <span className="cu-eti">Phone</span>
              <strong>{a?.telefono}</strong>
              <span className="cu-nota">
                Office hours, Florence time (CET). Out of hours, use WhatsApp or the form.
              </span>
            </a>

            <a className="cu-via" href={`mailto:${a?.email}`}>
              <span className="cu-eti">Email</span>
              <strong>{a?.email}</strong>
              <span className="cu-nota">Every request gets a reply from a person.</span>
            </a>
          </div>

          {/* L'indirizzo per esteso, con i dati che rendono l'azienda
              verificabile: sono gli stessi del piede e dei dati
              strutturati, e non si scrivono in due posti diversi. */}
          <address className="cu-sede">
            <strong>Prestige Rent S.R.L.</strong>
            <br />
            {a?.indirizzo}
            <br />
            VAT IT05745220482 &middot; Tuscany Region travel agency and tour
            operator licence
            <br />
            <span className="cu-nota">
              This is our office, not a meeting point. Tours leave from the point
              written on your voucher &mdash;{' '}
              <a href="https://prestigerent.com/mp/" target="_blank" rel="noopener">
                see the meeting points
              </a>
              .
            </span>
          </address>

          <p className="ab-links">
            <a href={p('/about-us/')}>Who we are</a> &middot;{' '}
            <a href={p('/')}>All our tours</a>
          </p>
        </div>
      </section>

      <Premi />

      {/* Il modulo, con la pagina di provenienza scritta nell'oggetto
          dell'email: chi risponde vede subito che arriva da qui e non da
          una scheda tour. */}
      <ContactSection locale={locale} tour="Contact page" />
    </main>
  );
}
