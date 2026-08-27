import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { hreflangDi } from '@/lib/schema';
import '@/styles/home.css';
import '@/styles/legale.css';

/* LA PRIVACY POLICY.
 *
 * ── DOVE VA MESSO QUESTO FILE ───────────────────────────────────────
 * `src/app/[locale]/privacy-policy/page.tsx`. L'indirizzo deve essere
 * ESATTAMENTE /privacy-policy/ perche' e' quello che WordPress serve
 * oggi, e' nel footer di 124 pagine indicizzate ed e' la pagina che i
 * revisori di Google Ads e di Meta controllano a mano: cambiarlo
 * vorrebbe dire un 404 proprio li'.
 *
 * ── PERCHE' E' RISCRITTA DA ZERO E NON COPIATA ──────────────────────
 * Quella su prestigerent.com NON e' recuperabile:
 *   - cita la Direttiva 95/46 e il D.Lgs. 196/2003, cioe' la legge
 *     PRIMA del GDPR, in vigore fino al 25 maggio 2018;
 *   - nomina "Prestige Rent s.n.c.", che non e' la societa' che incassa
 *     oggi -- oggi e' Prestige Rent S.r.l.;
 *   - non elenca i dati raccolti, non elenca i destinatari, non dice i
 *     tempi di conservazione, non nomina Regiondo, GoHighLevel, Brevo,
 *     Google o Meta, e non parla di trasferimenti fuori dall'Unione.
 * Copiarla avrebbe voluto dire portarsi dietro il problema.
 *
 * ── I SEGNAPOSTO ────────────────────────────────────────────────────
 * Tutto quello che e' scritto [[DA COMPLETARE: ...]] e' un dato che NON
 * si trova da nessuna parte, ne' sul sito attuale ne' nel codice: sono
 * decisioni del titolare, non cose da indovinare. La pagina NON va
 * online finche' ne resta anche uno solo.
 */

const AGGIORNATA = '[[DA COMPLETARE: data di entrata in vigore, es. 1 September 2026]]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Privacy Policy — Prestige Rent',
    description:
      'How Prestige Rent S.r.l. collects, uses and protects your personal data when you visit this website, ask us for a quote or book a tour.',
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? '/privacy-policy/' : `/${l}/privacy-policy/`),
      locale
    ),
  };
}

export default async function PrivacyPolicy({
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
        <h1>Privacy Policy</h1>
        <p className="lg-lead">
          This page explains what personal data Prestige Rent S.r.l. collects when you use
          this website, why we collect it, who else sees it and what you can ask us to do
          about it. It is written under the EU General Data Protection Regulation
          (Regulation 2016/679, &ldquo;GDPR&rdquo;), which applies to us because we are
          established in Italy &mdash; wherever in the world you are reading this from.
        </p>
        <p className="lg-date">Last updated: <mark>{AGGIORNATA}</mark></p>
      </header>

      <section className="lg-body">
        <h2>1. Who we are</h2>
        <p>
          The data controller is <strong>Prestige Rent S.r.l.</strong>, Via della Saggina
          98, 50145 Florence, Italy. VAT number 05745220482, registered with the Florence
          Register of Companies under REA no. FI 571489, share capital{' '}
          <mark>[[DA COMPLETARE: capitale sociale]]</mark>.
        </p>
        <p>
          You can reach us at <a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>{' '}
          or on <a href="tel:+39055286059">+39 055 286059</a>. For anything about your
          personal data, write to{' '}
          <mark>
            [[DA COMPLETARE: indirizzo email dedicato alla privacy, es.
            privacy@prestigerent.com &mdash; puo&rsquo; essere un alias di usa@]]
          </mark>
          .
        </p>
        <p>
          <mark>
            [[DA COMPLETARE: se il titolare nomina un DPO, nome e contatti vanno qui. Il
            sito attuale indica &ldquo;Mr. Saverio Festa&rdquo; come Data Protection
            Officer: va confermato o rimosso, perche&rsquo; per un&rsquo;azienda di queste
            dimensioni il DPO di norma NON e&rsquo; obbligatorio e dichiararlo senza averlo
            nominato formalmente e&rsquo; peggio che non averlo.]]
          </mark>
        </p>

        <h2>2. What we collect, and why</h2>

        <h3>When you send us a request through the contact form</h3>
        <p>
          We ask for your <strong>name</strong> and <strong>email address</strong>, which
          are required, and optionally your <strong>phone or WhatsApp number</strong>, the{' '}
          <strong>tour</strong> you are interested in, a <strong>date</strong>, the{' '}
          <strong>number of people</strong> and a free-text <strong>message</strong>. We
          also record the page you were on and the language you were reading in.
        </p>
        <p>
          We use this only to answer you and to prepare the quote you asked for. The legal
          basis is Article 6(1)(b) GDPR &mdash; steps taken at your request before entering
          into a contract. If you write something extra in the message box (an allergy, a
          wheelchair, a medical need) that may be special category data: we use it only to
          organise your day, on the basis of your explicit request under Article 9(2)(a),
          and we ask you not to send us more than we need to know.
        </p>

        <h3>When you book and pay</h3>
        <p>
          Bookings and payments do not happen on this website. The booking calendar you see
          on our tour pages is operated by <strong>Regiondo GmbH</strong> (Munich, Germany),
          and your name, contact details and payment are collected there, under Regiondo&rsquo;s
          own terms. We receive from Regiondo the booking details we need to run your tour.
          Legal basis: Article 6(1)(b) GDPR, performance of the contract.
        </p>

        <h3>When you contact us on WhatsApp, by phone or by email</h3>
        <p>
          We keep the conversation and the contact details it contains, so that whoever
          answers you next already knows what was said. Legal basis: Article 6(1)(b), or for
          general enquiries our legitimate interest in answering the people who write to us,
          Article 6(1)(f).
        </p>

        <h3>When you simply browse</h3>
        <p>
          Our hosting provider records the technical information every web server records
          &mdash; IP address, browser, pages requested, time &mdash; which we use to keep
          the site up and to stop abuse of the contact form. Legal basis: legitimate
          interest, Article 6(1)(f). Analytics and advertising cookies are a separate matter
          and are used only with your consent: see our{' '}
          <a href={p('/cookie-policy/')}>Cookie Policy</a>.
        </p>

        <h2>3. Who else sees your data</h2>
        <p>We do not sell your data and we do not rent it to anyone. We do share it with:</p>
        <ul>
          <li>
            <strong>Regiondo GmbH</strong> (Germany) &mdash; booking and payment platform.
          </li>
          <li>
            {/* Non e' un segnaposto: la regione e' un fatto verificabile, non una
                decisione. Il progetto `prestigerent-web` (oeipsfnbpaqkmwrxtcrn) sta su
                `eu-west-1`, cioe' Irlanda, letto dal pannello Supabase il 27/08/2026.
                Se un giorno il progetto viene spostato, questa riga va rifatta. */}
            <strong>Supabase</strong> &mdash; the database where contact-form requests are
            stored, hosted in Ireland, inside the European Union.
          </li>
          <li>
            <strong>Vercel Inc.</strong> (United States) &mdash; hosting of this website.
          </li>
          <li>
            <strong>HighLevel Inc.</strong> (United States) &mdash; the CRM our team uses to
            answer you. Your request is copied there so the person replying already has your
            tour, date and party size in front of them.
          </li>
          <li>
            <strong>Brevo</strong> (Sendinblue SAS, France) &mdash; email delivery.
          </li>
          <li>
            <strong>Google Ireland Ltd.</strong> and{' '}
            <strong>Meta Platforms Ireland Ltd.</strong> &mdash; measurement and advertising,
            and only if you accept the relevant cookies.
          </li>
          <li>
            Our drivers, guides, wineries and restaurants, limited to what they need to
            welcome you on the day.
          </li>
          <li>
            Accountants, insurers and lawyers, and public authorities where the law requires
            it.
          </li>
        </ul>

        <h2>4. Transfers outside the European Economic Area</h2>
        <p>
          Some of the providers above are established in the United States. Where that is
          the case the transfer is covered by the European Commission&rsquo;s Standard
          Contractual Clauses and, where the provider is certified, by the EU&ndash;US Data
          Privacy Framework. You can ask us for a copy of the safeguards in place by writing
          to the address in section 1.
        </p>

        <h2>5. How long we keep it</h2>
        <ul>
          <li>
            Contact-form requests that do not become a booking:{' '}
            <mark>[[DA COMPLETARE: periodo, tipicamente 24 mesi]]</mark>.
          </li>
          <li>
            Booking and customer records: 10 years from the end of the tax year, as Italian
            tax and accounting law requires.
          </li>
          <li>
            Messages on WhatsApp, email and in the CRM:{' '}
            <mark>[[DA COMPLETARE: periodo]]</mark>.
          </li>
          <li>Click identifiers stored in your browser (gclid and similar): 90 days.</li>
          <li>Cookies: for the lifetime shown in the Cookie Policy.</li>
        </ul>

        <h2>6. Your rights</h2>
        <p>
          Under Articles 15 to 22 GDPR you can ask us for a copy of your data, ask us to
          correct it, ask us to delete it, ask us to restrict or stop a particular use, and
          ask for it in a portable format. Where we rely on legitimate interest you can
          object. Where we rely on consent you can withdraw it at any time, and withdrawing
          it does not make what we did before unlawful.
        </p>
        <p>
          Write to the address in section 1 and we will answer within one month. If you are
          not satisfied you can complain to the Italian supervisory authority, the{' '}
          <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener">
            Garante per la protezione dei dati personali
          </a>
          , or to the authority where you live.
        </p>

        <h2>7. Children</h2>
        <p>
          This website is not addressed to children. Where children travel with you we
          receive their details from the adult who books, and we use them only to organise
          the tour &mdash; a child seat, a lunch, a headcount.
        </p>

        <h2>8. Automated decisions</h2>
        <p>
          We do not make decisions about you by automated means, and we do not profile you
          in a way that produces legal effects.
        </p>

        <h2>9. Changes to this policy</h2>
        <p>
          If we change how we use your data we will update this page and change the date at
          the top. Where the change is significant we will say so on the site.
        </p>
      </section>
    </main>
  );
}
