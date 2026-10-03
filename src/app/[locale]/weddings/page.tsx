import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { prezzoDi, unitaDi, type Unita } from '@/lib/prezzi';
import { isLocale, DEFAULT_LOCALE, regiondoLocale } from '@/lib/locales';
import { riprova } from '@/lib/riprova';
import { metaDi } from '@/lib/seo';
import { testo } from '@/lib/prosa';
import { foto as ottimizza, fotoSet } from '@/lib/foto';
import { affiancato, cambi } from '@/lib/cambi';
import { ogDiPagina } from '@/lib/og';
import { FasciaFiducia } from '@/components/Riprova';
import { ContactSection } from '@/components/ContactSection';
import { organization, breadcrumb, grafo, hreflangDi, SITE, ORG_ID } from '@/lib/schema';
import { ANNO_FONDAZIONE } from '@/lib/anni';
import '@/styles/home.css';

export const revalidate = 3600;

/* LA PAGINA DEI MATRIMONI -- BOZZA (02/10/2026).
 *
 * Testi e struttura vengono dalla brochure gia' approvata
 * (`out/brochure/prestige-rent-weddings.html` nel progetto outbound): i
 * tre momenti, la giornata tipo, i tour per gli invitati, Cortine.
 * Tolte apposta tre frasi ancora da confermare con la proprieta':
 * "one host on board per group", "drivers stand by on site",
 * "luxury cars on request". Non rimetterle senza via libera.
 *
 * ── I PREZZI ─────────────────────────────────────────────────────────
 * I trasporti del matrimonio NON hanno cifre: sono sempre su misura, e la
 * pagina dice "tailored quote, same day". I prezzi che si vedono sono
 * solo quelli dei tour e dei transfer per gli invitati, e arrivano da
 * Regiondo esattamente come nelle pagine di categoria: riga in `tours`
 * (per lo SKU) -> `fetchProduct` -> `prezzoDi`. Nessun importo scritto qui.
 *
 * ── IL VIDEO ─────────────────────────────────────────────────────────
 * L'originale `Wedding Proposal.mp4` pesava 24,8 MB: troppo per il repo.
 * Compresso (H.264 720x1280, senza audio, faststart, 6,2 MB) e caricato
 * su Supabase Storage accanto ai video delle landing (`media/lp/video/`),
 * con il fotogramma di copertina. E' VERTICALE: per questo sta accanto
 * al titolo e non a tutta larghezza, dove andrebbe tagliato.
 *
 * ── PUBBLICAZIONE ────────────────────────────────────────────────────
 * Approvata il 03/10/2026: indicizzata e nella sitemap. Dal 03/10/2026 e' anche
 * nel menu (pannello Transfers, colonna "Chauffeur service") e nel footer.
 * Stesso giorno: title/description/H1 per "wedding chauffeur Tuscany",
 * nodi Service e FAQPage, sezioni navette e localita', FAQ.
 */

const BASE = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/';

const VIDEO: string | null = BASE + 'lp/video/weddings.mp4';
const POSTER = BASE + 'lp/video/weddings-poster.jpg';
/* La flotta davanti a una villa toscana (WebP 1600x872, 284 KB; c'e' anche
   `-800.webp`). Didascalia neutra: e' un'immagine illustrativa. */
const FLOTTA = BASE + 'lp/img/flotta-prestige-toscana.webp';
const COPERTINA = BASE + 'wp/2021/09/PVT-6.jpg';

/* I posti del van piu' grande (Sprinter, vedi /our-vehicles/) e dei bus.
   Il NUMERO dei bus non si scrive (03/10/2026, decisione della proprieta':
   "11" fa sembrare piccoli). La tabella `azienda` ha quanti bus ci sono ma non i
   posti: questi due numeri vengono dalla proprieta' (02/10/2026). */
const POSTI_VAN = 8;
const POSTI_BUS = 25;

/** "393338424047" -> "+39 333 842 4047" */
function numeroLeggibile(w: string): string {
  const n = w.replace(/\D/g, '');
  return n.startsWith('39') ? `+39 ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`;
}

/* I tour per gli invitati, per slug: il nome, la foto, la durata e il
   prezzo li dicono il database e Regiondo. L'ordine e' quello della
   brochure -- Chianti, Siena e San Gimignano, Cinque Terre, Val d'Orcia --
   e poi gli arrivi. */
const GITE = [
  'wine-food-experience-in-tuscany',
  'wine-experience-in-tuscany',
  'small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence',
  'private-tour-to-chianti-wineries',
  'private-tour-siena-and-san-gimignano',
  'private-cinque-terre-from-florence',
  'montalcino-pienza-and-montepulciano',
];
const ARRIVI = [
  'transfer-airport-to-florence',
  'transfer-pisa-airport-to-florence',
  'transfer-florence-train-station',
];

const MOMENTI = [
  {
    n: '01',
    titolo: 'Arrivals',
    righe: [
      'Every guest met by name at Florence, Pisa or Rome airport, or at the train station',
      'Transfers to hotels and villas, timed to each flight',
      'Long transfers between cities: Rome, Venice, Milan',
    ],
  },
  {
    n: '02',
    titolo: 'The wedding day',
    righe: [
      'The couple in a Mercedes sedan',
      'Family in Mercedes vans',
      'Guests on our 25-seat coaches, timed around the ceremony, the photos and the last dance',
    ],
  },
  {
    n: '03',
    titolo: 'The days around it',
    righe: [
      'Welcome-day and post-wedding tours for the guests',
      "Chianti wineries, Siena, San Gimignano, Cinque Terre, Val d'Orcia",
      'A welcome dinner or tasting at our own winery',
    ],
  },
];

/* La giornata tipo della brochure, senza le due promesse da confermare
   (l'accompagnatore a bordo e gli autisti in attesa sul posto). */
const GIORNATA = [
  { ora: '14:30', cosa: 'Guest pickup', come: 'Coaches at each hotel, timed so every group arrives together' },
  { ora: '15:30', cosa: 'Arrival at the villa', come: 'Guests seated before the couple arrives' },
  { ora: '15:45', cosa: 'The couple', come: "Mercedes sedan from the bride's hotel, timed with the photographer" },
  { ora: '16:00', cosa: 'Ceremony', come: 'Return times agreed in advance with you and the venue' },
  { ora: '22:00', cosa: 'First returns', come: 'Vans for families with children and older guests' },
  { ora: '00:30', cosa: 'Last dance', come: "Coaches back to every hotel; the couple's car on call" },
];

/* SEO (03/10/2026): le localita' per cui si cercano i trasporti dei
   matrimoni. Finiscono in `areaServed` del nodo Service e nella sezione
   "Weddings across Tuscany". Solo posti dove lavoriamo davvero (tour e
   transfer esistenti). */
const LUOGHI = [
  'Florence',
  'Siena',
  'Chianti',
  "Val d'Orcia",
  'San Gimignano',
  'Lucca',
  'Cortona',
  'Montepulciano',
];

/* Le FAQ: solo cose gia' dette nella pagina (niente promesse nuove).
   Le stesse domande vanno nel nodo FAQPage dei dati strutturati. */
const FAQ: [string, string][] = [
  [
    'How much does wedding transportation in Tuscany cost?',
    'Every wedding is quoted on its own, because it depends on the date, the number of guests, the venues and the hotels. Send us the basics and we usually send a transport plan with a tailored quote the same day.',
  ],
  [
    'Do you use your own cars and drivers?',
    'Yes. The Mercedes sedans, vans, minibuses and coaches are our own, and so are the English-speaking drivers. Nothing is subcontracted, and one dispatch team coordinates every vehicle on the day.',
  ],
  [
    'Can you shuttle guests between several hotels and the wedding villa?',
    'Yes. Coaches pick up guests at each hotel, timed so every group arrives together before the ceremony. At night, vans take families and older guests back first, and the last coaches leave after the last dance.',
  ],
  [
    'Which areas of Tuscany do you cover?',
    "Florence and all of Tuscany: Siena, Chianti, Val d'Orcia, San Gimignano, Lucca, Cortona, Montepulciano and the villas and castles in between. We also work in Rome, Venice, Milan and most of Italy.",
  ],
  [
    'Can you also handle airport arrivals and tours for our guests?',
    'Yes. We meet guests at Florence, Pisa or Rome airport and at the train station, and we run welcome-day and post-wedding tours to the Chianti wineries, Siena, San Gimignano, Cinque Terre and Val d’Orcia, all in the same transport plan.',
  ],
];

const PASSI = [
  ['Send us the basics.', 'Wedding date, number of guests, the venue and the hotels. A rough idea is enough to start.'],
  ['We send a transport plan and a quote.', 'Vehicles, timings and drivers for arrivals, the wedding day and any tours, usually the same day.'],
  ['We refine it with you.', 'Final guest list, flight times, the timeline from your schedule. One person follows your wedding from start to finish.'],
  ['On the day, we run it.', 'Our dispatch team coordinates every vehicle; you have one number to call.'],
];

type Riga = {
  slug: string;
  kind: string;
  regiondo_sku: string | null;
  tour_content?: { locale: string; meta_description: string | null; blocks: Record<string, unknown> }[];
};

type Scheda = {
  slug: string;
  nome: string;
  foto: string | null;
  sommario: string | null;
  ore: string | null;
  prezzo: number | null;
  unita: Unita;
};

async function schede(slugs: string[], locale: string): Promise<Scheda[]> {
  const { data } = await supabase
    .from('tours')
    .select('slug, kind, regiondo_sku, tour_content(locale, meta_description, blocks)')
    .in('slug', slugs)
    .eq('status', 'published');
  const righe = (data ?? []) as unknown as Riga[];

  /* Tutti insieme, come nelle categorie: in fila sarebbero dieci attese sommate. */
  const fuori = await Promise.all(
    righe.map(async (r) => {
      const c = r.tour_content?.find((x) => x.locale === locale) ?? r.tour_content?.find((x) => x.locale === 'en');
      const b = (c?.blocks ?? {}) as { name?: string; images?: string[]; tabs?: Record<string, string> };
      const pr = r.regiondo_sku ? await fetchProduct(r.regiondo_sku, regiondoLocale(locale)) : null;
      return {
        slug: r.slug,
        nome: testo(pr?.name || b.name || r.slug.replace(/-/g, ' ')),
        foto: b.images?.[0] ?? null,
        sommario: c?.meta_description ? testo(c.meta_description) : null,
        ore: pr?.durationLabel ?? null,
        /* Solo Regiondo: niente ripiego sulla scheda PRICES di WordPress.
           Su questa pagina un prezzo vecchio farebbe piu' danno di
           "Price on request", e tutti questi tour lo SKU ce l'hanno. */
        prezzo: prezzoDi(pr?.price, {})?.valore ?? null,
        unita: unitaDi(b.tabs, r.kind),
      } satisfies Scheda;
    })
  );
  return slugs.map((s) => fuori.find((x) => x.slug === s)).filter((x): x is Scheda => !!x);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = await metaDi('/weddings/', 'en');
  return {
    /* SEO 03/10/2026: title <= 60 e description <= 155 caratteri. Se un
       giorno si scrive una riga in `seo` per /weddings/, vince quella. */
    title: m?.title ?? 'Tuscany Wedding Chauffeur & Guest Shuttles | Prestige Rent',
    description:
      m?.description ??
      'Wedding chauffeur service in Tuscany: a Mercedes for the couple, guest shuttles from villas ' +
        `and hotels, airport transfers. Own fleet, Florence since ${ANNO_FONDAZIONE}.`,
    alternates: hreflangDi((l) => (l === DEFAULT_LOCALE ? '/weddings/' : `/${l}/weddings/`), locale),
    openGraph: ogDiPagina({
      locale,
      path: locale === DEFAULT_LOCALE ? '/weddings/' : `/${locale}/weddings/`,
      foto: POSTER,
    }),
  };
}

export default async function Matrimoni({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);
  const [d, gite, arrivi, cambio] = await Promise.all([
    riprova(),
    schede(GITE, locale),
    schede(ARRIVI, locale),
    cambi(),
  ]);
  const a = d.azienda;

  const griglia = (elenco: Scheda[]) => (
    <div className="ct-griglia">
      {elenco.map((s) => (
        <a className="ct-card" key={s.slug} href={p(`/tour/${s.slug}/`)}>
          <div className="ct-img">
            {s.foto && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ottimizza(s.foto, 640)}
                srcSet={fotoSet(s.foto, [640, 828, 1200])}
                sizes="(max-width: 700px) 92vw, (max-width: 1180px) 46vw, 380px"
                alt={s.nome}
                loading="lazy"
                decoding="async"
              />
            )}
            <h3 className="ct-nome">{s.nome}</h3>
          </div>
          <div className="ct-body">
            {s.ore && (
              <div className="hm-fatti">
                <span className="hm-durata">{s.ore}</span>
              </div>
            )}
            {s.sommario && <p className="hm-sommario">{s.sommario}</p>}
            <div className="hm-price">
              {s.prezzo != null ? (
                <>
                  <small>from</small>
                  <b>&euro;{s.prezzo.toFixed(0)}</b>
                  <small>{s.unita}</small>
                  {affiancato(s.prezzo, cambio) && (
                    <em className="hm-price-cambio">{affiancato(s.prezzo, cambio)}</em>
                  )}
                </>
              ) : (
                <span className="ask">Price on request</span>
              )}
            </div>
          </div>
        </a>
      ))}
    </div>
  );

  return (
    <main className="ab wd">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            grafo([
              organization(),
              breadcrumb(locale, [
                { nome: 'Home', path: '/' },
                { nome: 'Weddings', path: '/weddings/' },
              ]),
              /* Il servizio, senza offerte ne' prezzi: i trasporti dei
                 matrimoni sono sempre su misura. */
              {
                '@type': 'Service',
                '@id': `${SITE}/weddings/#service`,
                name: 'Wedding chauffeur and guest transportation in Tuscany',
                serviceType: 'Wedding transportation',
                url: `${SITE}/weddings/`,
                provider: { '@id': ORG_ID },
                description:
                  'Chauffeur-driven Mercedes cars for the couple, vans, minibuses and coaches for the guests, airport arrivals and guest tours for destination weddings in Tuscany. Own vehicles and drivers, no subcontractors.',
                areaServed: [
                  { '@type': 'AdministrativeArea', name: 'Tuscany' },
                  ...LUOGHI.map((n) => ({ '@type': 'Place', name: `${n}, Tuscany, Italy` })),
                ],
              },
              {
                '@type': 'FAQPage',
                mainEntity: FAQ.map(([q, r]) => ({
                  '@type': 'Question',
                  name: q,
                  acceptedAnswer: { '@type': 'Answer', text: r },
                })),
              },
            ])
          ),
        }}
      />

      <div className="wd-apertura">
      <header className="ab-hero">
        <p className="ab-kicker">Every guest, in the right place, on time</p>
        <h1>
          Wedding chauffeur &amp; guest transportation <em className="hl place">in Tuscany</em>
        </h1>
        <p className="ab-lead">
          Private chauffeur service for destination weddings in Florence, Chianti, Siena and the
          Tuscan countryside: the couple&rsquo;s car, guest arrivals, shuttles on the day and the
          tours around it. Our own vehicles and drivers, from Florence since {ANNO_FONDAZIONE}.
        </p>
        <p className="wd-cta">
          <a className="wd-btn" href="#richiesta">Ask for a transport plan</a>
          <span>Tailored quote, same day</span>
        </p>
      </header>

      {/* IL VIDEO IN APERTURA: muto, in loop, parte da solo (i browser
          lasciano partire da soli solo i video muti). Se `VIDEO` torna
          null resta la sola foto, senza riquadri vuoti. */}
      <figure className="wd-video">
        {VIDEO ? (
          <video
            src={VIDEO}
            poster={POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="A wedding proposal among the vineyards in Tuscany"
          />
        ) : (
          <Image
            src={COPERTINA}
            alt="Tuscan countryside in Chianti, where many of our weddings take place"
            width={1600}
            height={900}
            priority
            sizes="(max-width: 1180px) 100vw, 1080px"
          />
        )}
      </figure>
      </div>

      <FasciaFiducia dati={d} />

      <section className="wd-sez">
        <p className="ab-kicker">What we do</p>
        <h2 className="wd-tit">Three moments of a wedding, one transport plan</h2>
        <p className="wd-intro">
          Moving 80 guests between three hotels, a villa on a country road and a dinner that ends
          after midnight is the part of a destination wedding that keeps planners up at night. It
          is what we do every season, from our base in {a?.citta ?? 'Florence'}.
        </p>
        <div className="wd-momenti">
          {MOMENTI.map((m) => (
            <article key={m.n}>
              <span className="wd-n">{m.n}</span>
              <h3>{m.titolo}</h3>
              <ul>
                {m.righe.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="wd-prezzo">Tailored quote, same day</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">Our fleet</p>
        <h2 className="wd-tit">The wedding fleet: from the couple&rsquo;s car to the guest coaches</h2>
        <p className="wd-intro">
          Mercedes E Class and S Class sedans, V Class and Sprinter vans, minibuses and coaches,
          all owned and maintained by us. See every model on{' '}
          <a href={p('/our-vehicles/')}>our vehicles</a> page.
        </p>
      </section>
      {/* L'immagine principale della sezione flotta. Sotto la piega: pigra
          (il comportamento predefinito di next/image senza `priority`). */}
      <figure className="vh-flotta">
        <Image
          src={FLOTTA}
          alt="Prestige Rent wedding fleet: black Mercedes sedans, vans and minibuses at a Tuscan villa"
          width={1600}
          height={872}
          loading="lazy"
          sizes="(max-width: 1180px) 100vw, 1140px"
        />
        <figcaption>Our fleet: Mercedes sedans, vans and minibuses</figcaption>
      </figure>
      <section className="ab-cols">
        <article>
          <h3>For the couple</h3>
          <p>
            Wedding car hire with a chauffeur: a Mercedes E Class or S Class for the couple, the
            parents and VIP guests.
          </p>
        </article>
        <article>
          <h3>For families</h3>
          <p>
            Mercedes V Class and Sprinter vans with up to {POSTI_VAN} seats, for families and small
            groups.
          </p>
        </article>
        <article>
          <h3>For all the guests</h3>
          <p>
            Minibuses and {POSTI_BUS}-seat coaches for all the guests, so a whole guest list moves
            together.
          </p>
        </article>
      </section>

      <section className="ab-cols">
        <article>
          <h3>Nothing subcontracted</h3>
          <p>Our own cars, our own English-speaking drivers, one dispatch team.</p>
        </article>
        <article>
          <h3>One contact for you</h3>
          <p>One plan for the whole wedding, one person to call on the day.</p>
        </article>
        <article>
          <h3>We answer the same day</h3>
          <p>Send a date and a guest count, and you have a transport plan.</p>
        </article>
        <article>
          <h3>Where we work</h3>
          <p>Florence and all of Tuscany, Rome, Venice, Milan and most of Italy.</p>
        </article>
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">Guest shuttles</p>
        <h2 className="wd-tit">Shuttles for your guests, from hotels and villas to the venue</h2>
        <p className="wd-intro">
          Guests are often split between hotels in Florence or Siena and villas out in the
          countryside, and the venue sits at the end of a narrow country road. We plan a pickup at
          every hotel, so all the guests arrive together before the ceremony, and we take them back
          in groups through the evening: vans for families and older guests first, coaches after
          the last dance. Arriving guests are met at the airport or the train station with our{' '}
          <a href={p('/transfers/direct-transfers/florence-direct-transfers/')}>
            Florence transfers
          </a>{' '}
          and driven straight to where they are staying.
        </p>
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">Where we drive</p>
        <h2 className="wd-tit">Weddings in Florence, Siena, Chianti and across Tuscany</h2>
        <p className="wd-intro">
          A city wedding in Florence, a villa in the Chianti hills, a castle near Siena or a
          farmhouse in Val d&rsquo;Orcia: we know these roads because our tours run on them, to <a href={p('/tour/private-tour-to-chianti-wineries/')}>the Chianti wineries</a>,{' '}
          <a href={p('/tour/private-tour-siena-and-san-gimignano/')}>Siena and San Gimignano</a>,{' '}
          <a href={p('/tour/private-tour-of-lucca-from-florence/')}>Lucca</a> and{' '}
          <a href={p('/tour/tour-to-montepulciano-and-cortona/')}>Montepulciano and Cortona</a>.
          Pickup and return times are agreed in advance with you and the venue.
        </p>
        <p className="wd-luoghi">
          {LUOGHI.map((l) => (
            <span key={l}>{l}</span>
          ))}
          <span>Villas &amp; castles</span>
        </p>
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">How a wedding day runs</p>
        <h2 className="wd-tit">An example: a villa wedding in Chianti</h2>
        <p className="wd-intro">
          80 guests in three hotels in Florence, ceremony and dinner at a villa in the Chianti
          hills. Every wedding is planned around its own timeline; this is how a typical day looks.
        </p>
        <ol className="wd-giornata">
          {GIORNATA.map((g) => (
            <li key={g.ora}>
              <b>{g.ora}</b>
              <strong>{g.cosa}</strong>
              <span>{g.come}</span>
            </li>
          ))}
        </ol>
        <p className="wd-nota">
          Times are an example. We build the plan with you from the real timeline, guest list and
          venues.
        </p>
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">Tours for the guests</p>
        <h2 className="wd-tit">The days before and after the wedding</h2>
        <p className="wd-intro">
          Welcome-day and post-wedding tours your guests can book directly, or that we fold into
          the same transport plan.
        </p>
        {griglia(gite)}
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">Arrivals</p>
        <h2 className="wd-tit">Airport and station transfers</h2>
        {griglia(arrivi)}
      </section>

      <section className="wd-cortine">
        <div className="wd-cortine-foto">
          <Image
            src={BASE + 'lp/img/CORTINE_CIBO_2.jpg'}
            alt="Oak barrels in the cellar of Cortine, our winery in Chianti Classico"
            width={1052}
            height={790}
            sizes="(max-width: 760px) 92vw, 460px"
          />
        </div>
        <div>
          <p className="ab-kicker">Cortine &middot; our winery in Chianti Classico</p>
          <h2 className="wd-tit">A welcome dinner among the vineyards</h2>
          <p>
            Our own estate in the heart of Chianti Classico. It works well for a welcome dinner, a
            rehearsal evening or a private tasting with the whole group, with transport for every
            guest included in the same plan.
          </p>
        </div>
      </section>

      <section className="wd-sez">
        <p className="ab-kicker">How to book</p>
        <h2 className="wd-tit">From a date to a transport plan, in four steps</h2>
        <ol className="wd-passi">
          {PASSI.map(([t, x]) => (
            <li key={t}>
              <b>{t}</b> {x}
            </li>
          ))}
        </ol>
        <p className="wd-citazione">
          One plan, one team, one person to call: so you can focus on the wedding, not on the
          shuttles.
        </p>
        <p className="wd-contatti">
          <a href={`tel:${(a?.telefono ?? '+39 055 286059').replace(/\s/g, '')}`}>
            <span>Phone</span>
            <b>{a?.telefono ?? '+39 055 286059'}</b>
          </a>
          <a href={`https://wa.me/${a?.whatsapp ?? '393338424047'}`} target="_blank" rel="noopener">
            <span>WhatsApp</span>
            <b>{numeroLeggibile(a?.whatsapp ?? '393338424047')}</b>
          </a>
        </p>
      </section>

      {/* Le FAQ, con lo stesso markup di /faqs/: `<details>` nativo, il
          testo resta nel sorgente. Le stesse voci sono nel nodo FAQPage. */}
      <section className="wd-sez">
        <p className="ab-kicker">Questions</p>
        <h2 className="wd-tit">Wedding transportation in Tuscany: common questions</h2>
        <div className="faq-lista wd-faq">
          {FAQ.map(([q, r]) => (
            <details key={q} className="faq-voce">
              <summary>
                <span>{q}</span>
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
              <div className="faq-r">
                <p>{r}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <ContactSection
        locale={locale}
        tour="Wedding transport: date, venues, guest hotels, arrival airports, tours or dinners around the wedding"
        maxPersone={500}
        intestazione={{
          occhiello: 'Tailored quote, same day',
          titolo: 'Ask for a ',
          accento: 'transport plan',
          titoloCoda: '',
          sottotitolo:
            'Send the date, the number of guests, the ceremony and reception venues, the guest hotels and the arrival airports. A rough idea is enough to start.',
        }}
      />
    </main>
  );
}
