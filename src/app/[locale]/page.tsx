import ReactDOM from 'react-dom';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { DEFAULT_LOCALE, isLocale, LOCALES, regiondoLocale } from '@/lib/locales';
import { HomeTours, type SchedaTour } from '@/components/HomeTours';
import { Cerca } from '@/components/Cerca';
import { prezzoDi } from '@/lib/prezzi';
import { ContactSection } from '@/components/ContactSection';
import { Recensioni } from '@/components/Recensioni';
import { Premi } from '@/components/Premi';
import { fonti, inEvidenza, votiPerTour } from '@/lib/recensioni';
import { riprova, tuttiIConteggi } from '@/lib/riprova';
import { VideoTestimonianze } from '@/components/VideoTestimonianze';
import { metaDi } from '@/lib/seo';
import type { Metadata } from 'next';
import '@/styles/home.css';

/* La home si rigenera ogni ora: i prezzi arrivano da Regiondo, quindi non
   possono essere congelati alla compilazione, ma nemmeno richiesti a ogni
   visita (49 chiamate per visitatore). */
export const revalidate = 3600;

const PARTENZE = [
  { valore: 'florence', etichetta: 'Florence' },
  { valore: 'livorno', etichetta: 'Livorno (cruise port)' },
  { valore: 'la-spezia', etichetta: 'La Spezia (cruise port)' },
  { valore: 'civitavecchia', etichetta: 'Civitavecchia (Rome port)' },
  { valore: 'naples', etichetta: 'Naples (cruise port)' },
];

/* Da dove parte un tour si capisce dallo slug: e' l'unica fonte che abbiamo
   oggi, ed e' affidabile perche' gli slug nominano sempre il porto. */
function partenzaDa(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes('livorno')) return 'livorno';
  if (s.includes('la-spezia')) return 'la-spezia';
  if (s.includes('civitavecchia')) return 'civitavecchia';
  if (s.includes('naples') || s.includes('pompeii') || s.includes('sorrento') || s.includes('amalfi'))
    return 'naples';
  return 'florence';
}

/* Quante persone ci stanno. Non e' un dato di Regiondo: si ricava dal tipo,
   ed e' quello che permette di non mostrare un privato da 8 a chi e' in
   dodici. Va sostituito con il dato vero quando ci sara'. */
function maxOspiti(kind: string): number | null {
  if (kind === 'small_group') return 25;
  if (kind === 'private') return 8;
  return null;
}

/* La home punta alle chiavi che la gente cerca davvero -- "private tours
   Florence", "Tuscany small group", "Chianti wine tour" -- non alla parola
   "Home", che e' quello che c'e' scritto oggi su WordPress e che non cerca
   nessuno. */
/* Le bandiere stanno qui e non in `locales.ts`: quel file descrive come
   funzionano le lingue (prefisso, direzione del testo, codice Regiondo),
   non come si disegnano. */
const BANDIERA: Record<string, string> = { en: '🇬🇧', de: '🇩🇪', it: '🇮🇹' };

export async function generateMetadata(): Promise<Metadata> {
  const m = await metaDi('/', 'en');
  return {
    title: m?.title ?? 'Private Tours from Florence & Chianti — Prestige Rent',
    description:
      m?.description ??
      'Private day tours from Florence into Chianti, Siena and San Gimignano, with your own driver and hotel pickup. Our own cars, our own English-speaking guides.',
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { data } = await supabase
    .from('tours')
    .select('id, slug, kind, regiondo_sku, status, rating, reviews_count, reviews_source, tour_content(locale, blocks)')
    .eq('status', 'published')
    .order('kind');

  type Riga = TourRow & { tour_content?: { locale: string; blocks: Record<string, unknown> }[] };
  const righe = (data ?? []) as unknown as Riga[];

  /* Tutti i numeri della riprova sociale da una fonte sola: si
     cambia la riga `azienda` e cambiano home, footer, chi siamo e
     ogni pagina tour nello stesso momento. */
  /* `voti` e `conteggi` sono gia' calcolati e gia' mostrati altrove -- i
     voti nel menu e su ogni pagina di categoria, i conteggi nell'API delle
     prenotazioni -- e la home era l'unica lista di tour del sito a non
     usarli. Due letture in piu' dentro lo stesso Promise.all: nessuna
     attesa aggiuntiva, perche' vanno in parallelo con le altre. */
  const [leFonti, leRecensioni, d, voti, conteggi] = await Promise.all([
    fonti(),
    inEvidenza(6),
    riprova(),
    votiPerTour(),
    tuttiIConteggi(),
  ]);
  const az = d.azienda;

  /* I prezzi si chiedono a Regiondo tutti insieme, non uno dopo l'altro:
     in fila sarebbero 49 attese sommate. */
  const prezzi = new Map<string, { prezzo: number | null; ore: number | null }>();
  await Promise.all(
    righe
      .filter((r) => r.regiondo_sku)
      .map(async (r) => {
        const p = await fetchProduct(r.regiondo_sku!, regiondoLocale(locale));
        if (p) prezzi.set(r.slug, { prezzo: p.price, ore: p.durationHours });
      })
  );

  /* I conteggi arrivano come elenco, uno per tour: si trasformano in
     dizionario una volta sola invece di cercarli dentro l'array ottantasette
     volte. */
  const perSlug = new Map(conteggi.map((c) => [c.tour_slug, c]));

  const tours: SchedaTour[] = righe.map((r) => {
    const c = (r.tour_content?.find((x) => x.locale === locale) ??
      r.tour_content?.find((x) => x.locale === 'en'))?.blocks as
      | { name?: string; images?: string[]; highlights?: string[]; tabs?: Record<string, string> }
      | undefined;
    const p = prezzi.get(r.slug);
    /* Se Regiondo non ha il prodotto, il prezzo si legge dalla scheda PRICES
       di WordPress: c'e' su tutte e 87 le pagine. Senza questo, un terzo del
       catalogo diceva "Price on request" pur avendo il listino scritto. */
    const prezzo = prezzoDi(p?.prezzo, c?.tabs);
    return {
      slug: r.slug,
      href: locale === DEFAULT_LOCALE ? `/tour/${r.slug}/` : `/${locale}/tour/${r.slug}/`,
      nome: c?.name ?? r.slug.replace(/-/g, ' '),
      kind: r.kind,
      foto: c?.images?.[0] ?? null,
      punti: c?.highlights ?? [],
      prezzo: prezzo?.valore ?? null,
      ore: p?.ore ?? null,
      partenza: partenzaDa(r.slug),
      maxOspiti: maxOspiti(r.kind),
      /* Gli stessi voti che il menu mostra da sempre. `votiPerTour` fa gia'
         da se' la media pesata fra le piattaforme e scarta chi ha meno di
         tre recensioni, quindi qui non c'e' nessuna soglia da rifare. */
      voto: voti[r.slug]?.voto ?? null,
      quante: voti[r.slug]?.quante ?? null,
      oggi: perSlug.get(r.slug)?.oggi ?? null,
    };
  });

  /* La foto dell'hero e' quella della home attuale di prestigerent.com,
     non la prima immagine che capita fra gli 87 tour: e' scelta, ed e'
     gia' quella che il cliente riconosce. */
  const foto =
    'https://prestigerent.com/wp-content/uploads/2025/07/Tuscany_wine_experience-scaled.jpg';

  /* SI CHIEDE LA FOTO PRIMA DI AVER LETTO LA PAGINA.
   *
   * L'immagine dell'hero e' l'elemento piu' grande dello schermo, quindi e'
   * lei a decidere il punteggio di velocita' che Google misura. Con il solo
   * `fetchPriority="high"` sul tag il browser la scopre tardi: prima deve
   * leggere tutto il corpo della pagina fino a trovarla. Dichiarandola qui
   * parte insieme al foglio di stile, con qualche centinaio di millisecondi
   * di vantaggio -- su telefono, dove il collegamento e' lento, e' la
   * differenza fra vedere la foto e vedere un rettangolo grigio.
   *
   * Sta in questa pagina e non nel layout perche' vale solo per la home:
   * un preload di un'immagine che non c'e' e' peggio che nessun preload. */
  ReactDOM.preload(foto, { as: 'image', fetchPriority: 'high' });

  return (
    <main>
      <section className="hm-hero">
        <div className="hm-hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {foto && <img src={foto} alt="Tuscany" fetchPriority="high" />}
        </div>
        <div className="hm-hero-in">
          <span className="hm-kicker">
            ★ {az?.citta}, since {az?.anno_fondazione} · our own fleet
          </span>
          {/* Le parole che la gente cerca davvero: "private tour Florence",
              "Chianti wine tour", "Tuscany from Florence". I transfer NON
              stanno nel titolo -- ci sono, si vendono, ma non e' li' che
              si guadagna, e il titolo ha spazio per una cosa sola. */}
          {/* "Chauffeur" e non "driver": in America e' la parola del
              servizio premium, quella che cerca chi e' disposto a spendere
              -- e lo scontrino medio da Google e' 300 euro, non 89. */}
          <h1 className="hm-title">
            Private tours, transfers &amp; chauffeur service
            <em>from Florence, through Chianti and Tuscany</em>
          </h1>
          <p className="hm-sub">
            Your own car, your own driver, your own hours &mdash; through the Chianti
            wineries, Siena and San Gimignano. We own the vehicles and employ the
            people: <b>fluent English-speaking drivers and guides</b>, several of them
            native speakers, working with us season after season. We collect you at
            your hotel in Florence, or anywhere in Italy.
          </p>
          {/* La riga della fiducia risponde alle tre obiezioni di chi
              arriva da un annuncio -- e' vero? posso disdire? chi mi
              porta? -- prima che cominci a scorrere. */}
          <div className="hm-badges">
            {d.voto != null && (
              <span>
                <i>⭐</i> <b>{d.voto.toFixed(1)}</b> from{' '}
                {d.totale.toLocaleString('en-US')} verified reviews
              </span>
            )}
            <span><i>🏆</i> Viator Experience Award &amp; Travellers&rsquo; Choice</span>
            <span><i>🛡️</i> Free cancellation up to 24 hours</span>
            <span><i>🚐</i> Our own {az?.mezzi_minibus} minibuses, our own drivers</span>
          </div>

          {/* Il modulo di ricerca STA QUI, sulla foto: e' la prima cosa
              che si puo' fare. Sotto, in mezzo al bianco, lo trovava solo
              chi scorreva. */}
          <Cerca tours={tours} partenze={PARTENZE} />

          <div className="hm-cta">
            <a className="primo" href="#tours">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              Explore tours
            </a>
            <a className="secondo" href="https://wa.me/393338424047" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.26-8.25" />
              </svg>
              Ask us anything
            </a>
          </div>
        </div>
      </section>

      {/* I PREMI SUBITO SOTTO LA RICERCA, non a meta' pagina.
          Sono medaglie emesse da Viator e Tripadvisor: rispondono da sole
          alla domanda "e voi chi siete" nel punto esatto in cui uno se la
          fa, cioe' appena finito di leggere il titolo. Piu' in basso le
          vedeva solo chi scorreva. */}
      <Premi />

      <div className="pr-wrap wide" style={{ position: 'relative', zIndex: 3 }}>
        {/* qui atterra la lista, disegnata da Cerca con un portale */}
        <div id="lista-tour" />
      </div>

      {/* La prova sociale con la FONTE linkata. Un numero senza fonte e' una
          affermazione; con la fonte e' una prova, e le AI citano i numeri
          attribuiti. Verificati sulla scheda Tripadvisor il 24/08/2026:
          non e' il "#1 su 967" che girava nei riassunti, e' un #2 su 248 --
          che pero' e' vero, e un secondo posto vero vale piu' di un primo
          posto falso. */}
      <section className="pr-sec tight" id="proof">
        <div className="pr-wrap wide">
          <div className="hm-proof">
            <div><b>{d.voto?.toFixed(1)}</b><span>average out of 5</span></div>
            <div><b>{d.totale.toLocaleString('en-US')}</b><span>verified traveller reviews</span></div>
            <div>
              <b>#{az?.classifica_posizione}</b>
              <span>of {az?.classifica_su} {az?.classifica_categoria?.toLowerCase()}</span>
            </div>
            <div><b>{d.anni}</b><span>years, since {az?.anno_fondazione}</span></div>
          </div>
          <p className="hm-proof-src">
            Travellers&rsquo; Choice 2026 ·{' '}
            <a href="https://www.tripadvisor.com/Attraction_Review-g187895-d2157589-Reviews-Prestige_Rent-Florence_Tuscany.html"
               target="_blank" rel="noopener">
              verified on Tripadvisor
            </a>, August 2026
          </p>
        </div>
      </section>

      <section className="pr-sec">
        <div className="pr-wrap wide">
          <div className="hm-band">
            <div>
              <h2>Would you rather have the day to yourselves?</h2>
              <p>
                On a private tour nobody else is in the vehicle. You choose the hour you
                leave, we collect you at your hotel, apartment or villa &mdash; and if you
                are staying somewhere else in Italy, we come and get you there too.
              </p>
              <a className="cta" href={locale === DEFAULT_LOCALE ? '/tour/private-tour-siena-and-san-gimignano/' : `/${locale}/tour/private-tour-siena-and-san-gimignano/`}>
                See the private tours
              </a>
            </div>
            <ul>
              <li>Your party only &mdash; up to 8 per car</li>
              <li>A driver who speaks fluent English</li>
              <li>Pick-up wherever you are staying</li>
              <li>Change the plan on the day</li>
              <li>One price for the whole party</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="pr-sec alt" id="fleet">
        <div className="pr-wrap wide">
          <div className="pr-head" style={{ marginBottom: 16 }}>
            <p className="pr-kicker">Our fleet</p>
            <h2 className="pr-title">We own the vehicles</h2>
            <p className="pr-lead">
              Not a marketplace reselling someone else&rsquo;s coach: the cars are ours and
              the drivers are our employees. That is why we can send the right vehicle for
              your party, and why we can enter the restricted historic centres.
            </p>
          </div>

          <div className="hm-fleet-count">
            <div><b>11</b><span>25-seat minibuses</span></div>
            <div><b>10</b><span>Mercedes cars &amp; vans</span></div>
            <div><b>25</b><span>guests in one vehicle</span></div>
          </div>

          <div className="hm-fleet">
            {[
              ['Mercedes-Benz-Classe-E-black.png', 'Mercedes E-Class', 'Up to 4 guests', 'Sedan'],
              ['Mercedes-Benz-Classe-S-black.png', 'Mercedes S-Class', 'Up to 4 guests', 'Luxury sedan'],
              ['Mercedes-Benz-Classe-V-black.png', 'Mercedes V-Class', 'Up to 6 guests', 'MPV'],
              ['Mercedes-Benz-sprinter-minivan-black.png', 'Mercedes Sprinter', 'Up to 8 guests', 'Minivan'],
            ].map(([file, nome, pax, tipo]) => (
              <figure key={file}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://prestigerent.com/wp-content/uploads/2021/09/${file}`} alt={nome} loading="lazy" />
                <em>{tipo}</em>
                <b>{nome}</b>
                <span>{pax}</span>
              </figure>
            ))}
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="photo" src="https://prestigerent.com/lp/img/Piazzale-Montelungo-minibuses-2022.webp" alt="Prestige Rent 25-seat minibuses in Florence" loading="lazy" />
              <em>Minibus</em>
              <b>25-seat coach</b>
              <span>Eleven in our fleet</span>
            </figure>
          </div>
        </div>
      </section>

      {/* I VOLTI, PRIMA DELLE RECENSIONI SCRITTE.
          Un testo firmato "Sarah, US" lo si puo' inventare, e chi legge lo
          sa: e' per questo che le recensioni scritte convincono meno di
          quanto costano. Un ospite che parla in camera, girato col suo
          telefono, non si falsifica -- e prepara chi legge a credere alle
          righe che vengono subito dopo. */}
      <VideoTestimonianze />

      {/* Il totale arriva da `riprova()` e non si ricalcola dentro il
          componente: prima la stessa pagina stampava 12.563 nella fascia
          qui sopra e 7.142 qui, ed erano lo stesso numero contato in due
          modi. Chi se ne accorge non crede piu' a nessuno dei due. */}
      <Recensioni
        fonti={leFonti}
        recensioni={leRecensioni}
        totale={d.totale}
        titolo="Twenty-four years, one reputation"
      />

      <ContactSection />

      {/* Le lingue in fondo alla pagina.
          Non e' un doppione del selettore in alto: quello lo cerca chi sa
          gia' di volerlo, questo lo trova chi arriva in fondo e non ha
          capito. La bandiera si riconosce prima della parola, e chi
          cerca la propria lingua guarda proprio quella. */}
      <section className="lng">
        <p className="lng-t">Also available in</p>
        <div className="lng-in">
          {LOCALES.map((l) => (
            <a
              key={l.code}
              href={l.code === DEFAULT_LOCALE ? '/' : `/${l.code}/`}
              hrefLang={l.htmlLang}
              className={l.code === locale ? 'is-on' : undefined}
            >
              <span aria-hidden="true">{BANDIERA[l.code] ?? '🌐'}</span>
              {l.label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
