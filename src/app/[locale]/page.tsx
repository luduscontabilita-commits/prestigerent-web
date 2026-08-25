import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { DEFAULT_LOCALE, isLocale, LOCALES, regiondoLocale } from '@/lib/locales';
import { HomeTours, type SchedaTour } from '@/components/HomeTours';
import { prezzoDi } from '@/lib/prezzi';
import { ContactSection } from '@/components/ContactSection';
import { Recensioni } from '@/components/Recensioni';
import { fonti, inEvidenza } from '@/lib/recensioni';
import { riprova } from '@/lib/riprova';
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
  const [leFonti, leRecensioni, d] = await Promise.all([
    fonti(),
    inEvidenza(6),
    riprova(),
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
    };
  });

  /* La foto dell'hero e' quella della home attuale di prestigerent.com,
     non la prima immagine che capita fra gli 87 tour: e' scelta, ed e'
     gia' quella che il cliente riconosce. */
  const foto =
    'https://prestigerent.com/wp-content/uploads/2025/07/Tuscany_wine_experience-scaled.jpg';

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
          <h1 className="hm-title">
            Tours and transfers across Italy,<br />with your own driver
          </h1>
          <p className="hm-sub">
            Private days and small-group departures from Florence and the cruise ports.
            We own the vehicles and employ the drivers &mdash; so we come and get you
            wherever you are staying, at the hour you choose. Every tour books online,
            with instant confirmation.
          </p>
          <div className="hm-badges">
            {d.voto != null && (
              <span>
                <i>⭐</i> <b>{d.voto.toFixed(1)}</b> ·{' '}
                {d.totale.toLocaleString('en-US')} verified reviews
              </span>
            )}
            <span><i>🏆</i> Travellers&rsquo; Choice 2026</span>
            <span><i>🚐</i> {az?.mezzi_minibus} minibuses &amp; our {az?.mezzi_auto}</span>
            <span><i>🛡️</i> Free cancellation up to 24h</span>
          </div>
        </div>
      </section>

      <div className="pr-wrap wide" style={{ position: 'relative', zIndex: 3 }}>
        <HomeTours tours={tours} partenze={PARTENZE} />
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

      <Recensioni
        fonti={leFonti}
        recensioni={leRecensioni}
        titolo="Twenty-four years, one reputation"
      />

      <ContactSection />

      <section className="pr-sec tight" style={{ textAlign: 'center' }}>
        <p className="pr-lead" style={{ fontSize: '.85rem' }}>
          {LOCALES.map((l) => (
            <span key={l.code} style={{ marginInlineEnd: 12 }}>
              <a href={l.code === DEFAULT_LOCALE ? '/' : `/${l.code}/`}>{l.label}</a>
            </span>
          ))}
        </p>
      </section>
    </main>
  );
}
