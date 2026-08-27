import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { hreflangDi } from '@/lib/schema';
import '@/styles/home.css';
import '@/styles/legale.css';

/* LA COOKIE POLICY.
 *
 * ── DOVE VA MESSO QUESTO FILE ───────────────────────────────────────
 * `src/app/[locale]/cookie-policy/page.tsx`. Indirizzo identico a
 * WordPress: /cookie-policy/.
 *
 * ── PERCHE' NON SI POTEVA COPIARE QUELLA ATTUALE ────────────────────
 * Su prestigerent.com quella pagina contiene UNA riga:
 *     [cmplz-document type="cookie-statement" region="eu"]
 * cioe' uno shortcode di un plugin WordPress (Complianz) che non e'
 * nemmeno il sistema di consenso che il sito usa davvero -- il banner
 * vero e' Cookiebot. Lo shortcode non viene neanche interpretato: chi
 * apre quella pagina oggi legge la parentesi quadra. Non c'e' niente da
 * portare via.
 *
 * ── L'ELENCO DEI COOKIE ─────────────────────────────────────────────
 * Qui sotto c'e' l'elenco per CATEGORIA, che e' quello che serve
 * all'utente. L'elenco nominale, cookie per cookie con durata e
 * fornitore, lo genera Cookiebot da solo scansionando il sito: e' il
 * modo giusto di tenerlo aggiornato, perche' scritto a mano invecchia
 * al primo tag nuovo aggiunto in GTM. Quando il dominio nuovo e' in
 * produzione si lancia una scansione dal pannello Cookiebot e si
 * incolla qui lo script della dichiarazione (`CookieDeclaration`) al
 * posto del segnaposto in fondo.
 */

const AGGIORNATA = '[[DA COMPLETARE: data di entrata in vigore]]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Cookie Policy — Prestige Rent',
    description:
      'What cookies this website uses, what each one is for, and how to accept, refuse or change your mind at any time.',
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? '/cookie-policy/' : `/${l}/cookie-policy/`),
      locale
    ),
  };
}

export default async function CookiePolicy({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);

  return (
    <main className="lg">
      <header className="lg-hero">
        <h1>Cookie Policy</h1>
        <p className="lg-lead">
          A cookie is a small file a website leaves in your browser so it can recognise it
          later. This page lists what we use, what each kind is for, and how to change your
          mind. Nothing except the strictly necessary cookies is set before you tell us it
          is fine.
        </p>
        <p className="lg-date">Last updated: <mark>{AGGIORNATA}</mark></p>
      </header>

      <section className="lg-body">
        <h2>Who is responsible</h2>
        <p>
          Prestige Rent S.r.l., Via della Saggina 98, 50145 Florence, Italy. VAT 05745220482,
          REA FI 571489. Questions:{' '}
          <a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>. How we handle
          personal data in general is described in our{' '}
          <a href={p('/privacy-policy/')}>Privacy Policy</a>.
        </p>

        <h2>The four categories</h2>

        <h3>Strictly necessary</h3>
        <p>
          These make the site work: they remember your consent choice, your light or dark
          theme, and they protect the contact form from abuse. They are set without asking,
          because without them there is no website to consent to. Legal basis: Article 122
          of the Italian Privacy Code, which exempts technical cookies from consent.
        </p>

        <h3>Preferences</h3>
        <p>
          These remember choices you made &mdash; your language, for instance &mdash; so you
          do not have to make them again. Set only with your consent.
        </p>

        <h3>Statistics</h3>
        <p>
          Google Analytics 4 (Google Ireland Ltd.), loaded through Google Tag Manager. We
          use it to count how many people read a page, which pages they leave from, and
          which country they read from. Set only with your consent; if you refuse, Google
          receives no analytics cookie at all.
        </p>

        <h3>Marketing</h3>
        <p>
          Google Ads (Google Ireland Ltd.) and the Meta pixel (Meta Platforms Ireland Ltd.),
          both loaded through Google Tag Manager, and cookies set by{' '}
          <strong>Regiondo GmbH</strong> inside the booking calendar embedded on our tour
          pages. These let us know that an advertisement led to a booking, and let us show
          our tours again to someone who looked at them. Set only with your consent.
        </p>

        <h2>If you refuse</h2>
        <p>
          The site works normally: you can read every page, use the booking calendar and
          send us a request. We still count visits in an aggregated, non-identifying way
          through Google Consent Mode, and we do not receive advertising identifiers about
          you. Google Consent Mode is set to redact advertising data and to pass campaign
          identifiers in the address bar rather than in a cookie.
        </p>

        <h2>Changing your mind</h2>
        <p>
          Use the <strong>Cookie preferences</strong> link at the bottom of any page: it
          reopens the banner and your new choice takes effect immediately. You can also
          delete cookies from your browser settings &mdash; in Chrome, Safari, Firefox and
          Edge the option is under Privacy.
        </p>

        <h2>Full list of cookies</h2>
        <p>
          <mark>[[DA COMPLETARE: incollare qui lo script della dichiarazione Cookiebot
          (CookieDeclaration) dopo la prima scansione del dominio in produzione. Fino ad
          allora l&rsquo;elenco nominale non esiste, e inventarlo sarebbe peggio che
          lasciarlo mancante.]]</mark>
        </p>
      </section>
    </main>
  );
}
