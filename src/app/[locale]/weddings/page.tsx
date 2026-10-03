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
import { organization, breadcrumb, grafo, hreflangDi } from '@/lib/schema';
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
 * Approvata il 03/10/2026: indicizzata e nella sitemap, ma fuori dal menu
 * (si manda ai wedding planner via link).
 */

const BASE = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/';

const VIDEO: string | null = BASE + 'lp/video/weddings.mp4';
const POSTER = BASE + 'lp/video/weddings-poster.jpg';
/* La flotta davanti a una villa toscana (WebP 1600x872, 284 KB; c'e' anche
   `-800.webp`). Didascalia neutra: e' un'immagine illustrativa. */
const FLOTTA = BASE + 'lp/img/flotta-prestige-toscana.webp';
const COPERTINA = BASE + 'wp/2021/09/PVT-6.jpg';

/* I posti del van piu' grande (Sprinter, vedi /our-vehicles/) e dei bus.
   La tabella `azienda` ha quanti bus ci sono (`mezzi_minibus`) ma non i
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
    title: m?.title ?? 'Wedding Transport in Tuscany — chauffeurs & guest shuttles | Prestige Rent',
    description:
      m?.description ??
      'Private chauffeur service for destination weddings in Tuscany: the couple’s car, airport arrivals, ' +
        'guest shuttles on the day and tours for the guests. Our own cars and drivers, from Florence.',
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
            ])
          ),
        }}
      />

      <div className="wd-apertura">
      <header className="ab-hero">
        <p className="ab-kicker">Wedding transport in Italy</p>
        <h1>
          Every guest, in the right place, <em className="hl place">on time</em>
        </h1>
        <p className="ab-lead">
          Private chauffeur service for destination weddings in Tuscany and across Italy: the
          couple&rsquo;s car, guest arrivals, shuttles on the day, and the tours around it. One
          plan, one team, one person to call.
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
            aria-label="A proposal among the vineyards in Tuscany"
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
        <h2 className="wd-tit">Many solutions, one for every group</h2>
      </section>
      {/* L'immagine principale della sezione flotta. Sotto la piega: pigra
          (il comportamento predefinito di next/image senza `priority`). */}
      <figure className="vh-flotta">
        <Image
          src={FLOTTA}
          alt="Prestige Rent fleet: black Mercedes sedans, vans and minibuses at a Tuscan villa"
          width={1600}
          height={872}
          loading="lazy"
          sizes="(max-width: 1180px) 100vw, 1140px"
        />
        <figcaption>Our fleet: Mercedes sedans, vans and minibuses</figcaption>
      </figure>
      <section className="ab-cols">
        <article>
          <h2>For the couple</h2>
          <p>A Mercedes sedan for the couple, the parents and VIP guests.</p>
        </article>
        <article>
          <h2>For families</h2>
          <p>Mercedes vans with up to {POSTI_VAN} seats, for families and small groups.</p>
        </article>
        <article>
          <h2>For all the guests</h2>
          <p>
            {a?.mezzi_minibus ?? 11} coaches with {POSTI_BUS} seats each, so a whole guest
            list moves together.
          </p>
        </article>
      </section>

      <section className="ab-cols">
        <article>
          <h2>Nothing subcontracted</h2>
          <p>Our own cars, our own English-speaking drivers, one dispatch team.</p>
        </article>
        <article>
          <h2>One contact for you</h2>
          <p>One plan for the whole wedding, one person to call on the day.</p>
        </article>
        <article>
          <h2>We answer the same day</h2>
          <p>Send a date and a guest count, and you have a transport plan.</p>
        </article>
        <article>
          <h2>Where we work</h2>
          <p>Florence and all of Tuscany, Rome, Venice, Milan and most of Italy.</p>
        </article>
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
        <p className="ab-kicker">Working together</p>
        <h2 className="wd-tit">From a date to a transport plan</h2>
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
