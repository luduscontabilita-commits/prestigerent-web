import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { metaDi } from '@/lib/seo';
import { ContactSection } from '@/components/ContactSection';
import { grafo, breadcrumb, organization, hreflangDi } from '@/lib/schema';
import sezioni from '@/lib/faq-dati.json';
import '@/styles/home.css';

export const revalidate = 3600;

/* LE 145 DOMANDE, RIMESSE DOV'ERANO.
 *
 * `/faqs/` esisteva su WordPress da anni: centoquarantacinque domande con
 * le loro risposte -- bagagli, seggiolini, sedie a rotelle, rimborsi,
 * punti d'incontro, cosa fare se la nave non attracca, come si cambia una
 * data, chi risponde di domenica. Nel passaggio era diventata un redirect
 * verso /about-us/, che di quelle risposte non ne contiene una.
 *
 * Era il corpo di contenuto piu' grosso del sito, ed e' anche il piu'
 * utile: sono le domande che una persona si fa PRIMA di lasciare la
 * carta, e ognuna e' una ricerca che qualcuno fa su Google con parole
 * sue. Un redirect le ha fatte sparire tutte insieme.
 *
 * ── PERCHE' IL TESTO STA IN UN FILE E NON NEL DATABASE ─────────────────
 * Perche' e' testo che non cambia da solo: non ha una fonte viva come i
 * prezzi di Regiondo o le recensioni. Metterlo in tabella vorrebbe dire
 * una migrazione, una pagina di amministrazione e una query in piu' a
 * ogni visita, per un contenuto che si aggiorna due volte l'anno. Sta in
 * `src/lib/faq-dati.json`, estratto dal vecchio sito parola per parola.
 *
 * ── PERCHE' <details> E NON UN ACCORDION IN JAVASCRIPT ─────────────────
 * Le risposte sono nel codice della pagina anche a domanda chiusa: Google
 * e le AI le leggono comunque. Un accordion costruito in JavaScript le
 * nasconderebbe proprio a chi deve trovarle.
 */

type Voce = { d: string; r: string };
type Sezione = { titolo: string; voci: Voce[] };
const SEZIONI = sezioni as Sezione[];
const QUANTE = SEZIONI.reduce((n, s) => n + s.voci.length, 0);

/** Il testo di una risposta senza marcatura, per i dati strutturati. */
function nudo(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un'ancora stabile per ogni sezione, cosi' si puo' linkare una domanda. */
function ancora(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = await metaDi('/faqs/', 'en');
  return {
    /* 🔴 IL TITOLO DICE ANCHE DI COSA SI PARLA, non solo che tipo di
       pagina e'. "Frequently asked questions — Prestige Rent" descrive il
       contenitore: chi cerca su Google "tuscany tour luggage" o "italy
       tour wheelchair" non trova niente che gli somigli. Le parole che
       contano sono Italy e Tuscany, e nel titolo non c'erano. */
    title: m?.title ?? 'FAQ — Prestige Rent · Italy and Tuscany Tours',
    description:
      m?.description ??
      `Everything guests ask before booking: luggage, child seats, wheelchairs, ` +
        `refunds, meeting points, and what happens if your ship does not dock. ` +
        `${QUANTE} answers from the people who run the tours.`,
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? '/faqs/' : `/${l}/faqs/`),
      locale
    ),
  };
}

export default async function Faqs({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
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
                { nome: 'FAQs', path: '/faqs/' },
              ]),
              /* FAQPage: sono domande vere con risposte vere, scritte da
                 loro. E' esattamente il caso per cui questo tipo esiste. */
              {
                '@type': 'FAQPage',
                mainEntity: SEZIONI.flatMap((s) =>
                  s.voci.map((v) => ({
                    '@type': 'Question',
                    name: v.d,
                    acceptedAnswer: { '@type': 'Answer', text: nudo(v.r) },
                  }))
                ),
              },
            ])
          ),
        }}
      />

      <header className="ab-hero">
        <p className="ab-kicker">Florence &middot; since 2002</p>
        <h1>Frequently asked questions</h1>
        <p className="ab-lead">
          {QUANTE} answers to what guests actually ask us &mdash; luggage,
          child seats, wheelchairs, refunds, meeting points, and what happens
          if your ship does not dock. If yours is not here,{' '}
          <a href={p('/contact-us/')}>write to us</a> and a person will answer.
        </p>
      </header>

      {/* L'indice: con centoquarantacinque domande, arrivare in fondo
          scorrendo non e' navigare, e' rassegnarsi. */}
      <section className="pr-sec tight">
        <div className="pr-wrap">
          <nav className="faq-indice" aria-label="Sections">
            {SEZIONI.map((s) => (
              <a key={s.titolo} href={`#${ancora(s.titolo)}`}>
                {s.titolo} <span>{s.voci.length}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {SEZIONI.map((s) => (
        <section className="pr-sec tight" key={s.titolo} id={ancora(s.titolo)}>
          <div className="pr-wrap">
            <h2 className="faq-h2">{s.titolo}</h2>
            <div className="faq-lista">
              {s.voci.map((v, i) => (
                <details key={`${ancora(s.titolo)}-${i}`} className="faq-voce">
                  <summary>
                    <span>{v.d}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M6 9l6 6 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </summary>
                  {/* Il testo arriva dal vecchio sito, con la sua marcatura:
                      elenchi, grassetti e collegamenti erano parte della
                      risposta, non decorazione. */}
                  <div
                    className="faq-r"
                    dangerouslySetInnerHTML={{ __html: v.r }}
                  />
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      <ContactSection locale={locale} tour="FAQ page" />
    </main>
  );
}
