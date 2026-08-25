import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { riprova } from '@/lib/riprova';
import { metaDi } from '@/lib/seo';
import { fonti, inEvidenza } from '@/lib/recensioni';
import { FasciaFiducia } from '@/components/Riprova';
import { Recensioni } from '@/components/Recensioni';
import { Premi } from '@/components/Premi';
import { ContactSection } from '@/components/ContactSection';
import { organization, breadcrumb, grafo, hreflangDi } from '@/lib/schema';
import '@/styles/home.css';

export const revalidate = 3600;

/* LA PAGINA "CHI SIAMO", che sul sito attuale NON ESISTE: /about-us/
 * rimanda alla pagina dei mezzi.
 *
 * Non e' una dimenticanza qualsiasi. Il baseline diceva che il sito ha 87
 * pagine di prodotto e zero pagine di identita', ed e' per questo che
 * scompare sulle ricerche che non nominano un tour ("private driver
 * Tuscany", "chi porta a Siena da Firenze"). Un'AI a cui si chiede "chi e'
 * Prestige Rent" oggi deve indovinare.
 *
 * Questa pagina e' la definizione canonica dell'entita' (masterplan §6.1):
 * chi siamo, da quando, con che mezzi, con che persone, con che numeri --
 * tutti verificabili.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [d, m] = await Promise.all([riprova(), metaDi('/about-us/', 'en')]);
  const anni = d.anni ?? 20;
  return {
    title: m?.title ?? `About Prestige Rent — Florence tour operator since ${d.azienda?.anno_fondazione ?? 2002}`,
    description: m?.description ??
      `We are a Florence company running our own minibuses and cars with our own employed ` +
      `drivers and guides — ${anni} years, ${d.totale.toLocaleString('en-US')} verified ` +
      `reviews, ${d.voto?.toFixed(1)} average. Not a broker, not a marketplace.`,
    alternates: hreflangDi((l) =>
      l === DEFAULT_LOCALE ? '/about-us/' : `/${l}/about-us/`
    ),
  };
}

export default async function ChiSiamo({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [d, leFonti, leRecensioni] = await Promise.all([riprova(), fonti(), inEvidenza(6)]);
  const a = d.azienda;
  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);

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
                { nome: 'About us', path: '/about-us/' },
              ]),
            ])
          ),
        }}
      />

      <header className="ab-hero">
        <p className="ab-kicker">Florence &middot; since {a?.anno_fondazione}</p>
        <h1>
          The people who actually <em className="hl place">drive you</em>
        </h1>
        <p className="ab-lead">
          Most companies selling Tuscany tours do not own a vehicle and do not employ a
          single guide. They take your booking and pass it to whoever is available that
          morning. We are the ones who show up.
        </p>
      </header>

      <FasciaFiducia dati={d} />

      <section className="ab-cols">
        <article>
          <h2>Our own vehicles, not a phone number</h2>
          <p>
            We own and maintain {a?.mezzi_minibus} minibuses and our {a?.mezzi_auto},
            garaged here in {a?.citta}. When you book a tour with us, you already know
            which company will be at your hotel — because it is the same one that took
            your money.
          </p>
        </article>
        <article>
          <h2>Our drivers and guides are our staff</h2>
          <p>
            They are employees, on our payroll, working with us season after season. That
            is why the same names keep coming back in the reviews below. A broker cannot
            promise you that, because a broker does not know who will turn up either.
          </p>
        </article>
        <article>
          <h2>{d.anni} years, one family, one city</h2>
          <p>
            We started in {a?.anno_fondazione} and we have been doing the same thing since:
            taking people out of Florence and into Tuscany, and bringing them back. Today
            we are {d.classifica?.replace('#', 'number ')} on Tripadvisor.
          </p>
        </article>
        <article>
          <h2>You can book directly</h2>
          <p>
            You will find us on Viator, GetYourGuide and Tripadvisor, and those bookings
            are welcome. But booking here reaches us directly &mdash; same tour, same
            vehicle, same guide, and you can talk to us before you pay.
          </p>
        </article>
      </section>

      <Premi />
      <Recensioni
        fonti={leFonti}
        recensioni={leRecensioni}
        titolo="Twenty-four years of guests"
      />

      <section className="ab-nap">
        <h2>Where to find us</h2>
        <p>
          <strong>Prestige Rent S.R.L.</strong>
          <br />
          {a?.indirizzo}
          <br />
          <a href={`tel:${a?.telefono?.replace(/\s/g, '')}`}>{a?.telefono}</a> &middot;{' '}
          <a href={`mailto:${a?.email}`}>{a?.email}</a>
        </p>
        <p className="ab-links">
          <a href={p('/')}>All our tours</a>
        </p>
      </section>

      <ContactSection />
    </main>
  );
}
