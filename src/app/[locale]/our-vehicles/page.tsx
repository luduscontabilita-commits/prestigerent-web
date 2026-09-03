import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { riprova } from '@/lib/riprova';
import { metaDi } from '@/lib/seo';
import { FasciaFiducia } from '@/components/Riprova';
import { ContactSection } from '@/components/ContactSection';
import { organization, breadcrumb, grafo, hreflangDi } from '@/lib/schema';
import '@/styles/home.css';

export const revalidate = 3600;

/* LA PAGINA DEI MEZZI.
 *
 * ── PERCHE' ESISTE, E PERCHE' NON E' UN COPIA-INCOLLA ───────────────
 * Sul sito vecchio (`/our-vehicles/`) c'era, ed e' una delle poche pagine
 * di identita' che quel sito aveva: quattro Mercedes con le capienze.
 * Serve piu' di quanto sembri, e per due ragioni diverse.
 *
 * La prima e' commerciale: chi prenota un privato o un transfer per
 * quattro persone con le valigie ha UNA domanda -- ci stiamo? Una pagina
 * che risponde con un numero chiude quella domanda; una che non c'e'
 * costa una email, e spesso il cliente non la scrive.
 *
 * La seconda e' che questa pagina dice una cosa che i concorrenti non
 * possono dire: i mezzi sono NOSTRI. Chi vende tour in Toscana per lo piu'
 * non possiede un veicolo -- prende la prenotazione e la passa a chi e'
 * libero quella mattina. Elencare i propri mezzi con le capienze e' la
 * prova che non si sta facendo quello.
 *
 * ── COSA HO CAMBIATO DAL VECCHIO, E PERCHE' ─────────────────────────
 * Il vecchio diceva "Sedan, Executive Sedans, MPVs, minivans, minibuses
 * and cars": sei parole per quattro mezzi, e tre di quelle parole un
 * americano non le usa. Qui i mezzi sono quattro e si chiamano col nome
 * che ha in mente chi legge, con la capienza accanto.
 *
 * La riga sulle aree pedonali l'ho tenuta e messa in evidenza: e' l'unica
 * cosa in tutta la pagina che risolve un problema vero -- il centro di
 * Firenze e' chiuso al traffico, e un mezzo che non ci puo' entrare ti
 * lascia a piedi lontano dall'albergo con le valigie.
 *
 * ── LA CAPIENZA E' UN NUMERO, NON UNA PROMESSA ──────────────────────
 * Il vecchio metteva "Maximum capacity: 4 people, 2 suitcases" e poi una
 * nota che diceva l'opposto: "per piu' comodita' ne consigliamo 3". Due
 * numeri diversi per la stessa domanda lasciano il cliente a indovinare.
 * Qui il numero massimo resta -- e' quello che serve per capire se ci
 * stanno -- e il consiglio sta accanto, non sotto, come consiglio.
 */

const MEZZI = [
  {
    nome: 'Mercedes E Class',
    tipo: 'Sedan',
    persone: 4,
    valigie: 2,
    bagagli: 2,
    consiglio: 'Most comfortable with up to 3 adults, or 3 adults and a child.',
    foto: 'wp/2021/09/Mercedes-Benz-Classe-E-black.png',
  },
  {
    nome: 'Mercedes S Class',
    tipo: 'Executive sedan',
    persone: 4,
    valigie: 2,
    bagagli: 2,
    consiglio: 'Most comfortable with up to 3 adults, or 3 adults and a child.',
    foto: 'wp/2021/09/Mercedes-Benz-Classe-S-black.png',
  },
  {
    nome: 'Mercedes V Class',
    tipo: 'MPV',
    persone: 6,
    valigie: 6,
    bagagli: 6,
    consiglio: null,
    foto: 'wp/2021/09/Mercedes-Benz-Classe-V-black.png',
  },
  {
    nome: 'Mercedes Sprinter',
    tipo: 'Minivan',
    persone: 8,
    valigie: 8,
    bagagli: 8,
    consiglio: null,
    foto: 'wp/2021/09/Mercedes-Benz-sprinter-minivan-black.png',
  },
];

const BASE = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = await metaDi('/our-vehicles/', 'en');
  return {
    title: m?.title ?? 'Our Vehicles — Mercedes fleet, our own, in Florence',
    description:
      m?.description ??
      'Four Mercedes we own and maintain ourselves: E and S Class for up to 4, ' +
      'V Class for 6, Sprinter for 8. Allowed into the pedestrian centre of Florence, ' +
      'so we pick you up at the door.',
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? '/our-vehicles/' : `/${l}/our-vehicles/`),
      locale
    ),
  };
}

export default async function Mezzi({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const d = await riprova();
  const a = d.azienda;

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
                { nome: 'Our vehicles', path: '/our-vehicles/' },
              ]),
            ])
          ),
        }}
      />

      <header className="ab-hero">
        <p className="ab-kicker">
          {a?.citta ?? 'Florence'} &middot; our own fleet
        </p>
        <h1>
          The cars are <em className="hl place">ours</em>
        </h1>
        <p className="ab-lead">
          Not rented for the day, not sub-contracted to whoever is free that morning.
          We own them, we garage them here, and we maintain them ourselves &mdash;
          which is why we can tell you exactly which one will be at your hotel.
        </p>
      </header>

      {/* %s LA FOTO DELLA FLOTTA INTERA, e non e' decorazione.
          Chiesta dalla proprieta' -- sul sito vecchio stava in cima a
          questa pagina -- e vale piu' delle quattro schede messe insieme:
          dieci mezzi veri, in fila nel loro piazzale, con le targhe. Le
          quattro foto qui sotto sono immagini di catalogo Mercedes, che
          chiunque puo' scaricare; questa no, e dice la sola cosa che i
          concorrenti non possono dire -- che i mezzi sono suoi.

          Sotto il titolo e non dietro, con la scritta sopra: il cielo di
          questa foto e' bianco, e un testo chiaro sopra un cielo bianco
          non si legge. Scurirla con un velo per far stare la scritta
          significherebbe rovinare l'unica cosa che la foto deve fare,
          cioe' farsi guardare.

          `priority`: e' l'immagine grande in cima, quella che decide
          quanto la pagina SEMBRA veloce. Senza, Next la carica pigra e
          resta un rettangolo grigio per mezzo secondo. */}
      <figure className="vh-flotta">
        <Image
          src={BASE + 'wp/2021/09/our-veichles-bg.jpg'}
          alt="The Prestige Rent fleet lined up: Mercedes V Class, E Class, S Class, Sprinter vans and a minibus"
          width={1920}
          height={1080}
          priority
          sizes="(max-width: 1180px) 100vw, 1140px"
        />
        <figcaption>
          Our fleet, in our yard in Florence. Every vehicle on this page is one of these.
        </figcaption>
      </figure>

      <FasciaFiducia dati={d} />

      {/* 🔴 LA COSA CHE RISOLVE UN PROBLEMA VERO, e va detta prima delle
          altre. Il centro di Firenze e' chiuso al traffico: un mezzo che
          non ci puo' entrare ti lascia a piedi lontano dall'albergo con le
          valigie. Chi ha problemi a camminare, o viaggia con due bambini,
          questa e' l'unica riga della pagina che gli interessa. */}
      <section className="vh-nota">
        <p>
          <b>All our vehicles up to 8 passengers are allowed into the pedestrian
          centre of Florence.</b> That means door to door: we stop at your hotel,
          not at the edge of the restricted area with your luggage.
        </p>
      </section>

      <section className="vh-mezzi">
        {MEZZI.map((m) => (
          <article key={m.nome} className="vh-card">
            <div className="vh-foto">
              <Image
                src={BASE + m.foto}
                alt={`${m.nome} — ${m.tipo} for up to ${m.persone} passengers`}
                width={520}
                height={300}
                sizes="(max-width: 760px) 92vw, 460px"
              />
            </div>
            <div className="vh-testo">
              <p className="vh-tipo">{m.tipo}</p>
              <h2>{m.nome}</h2>
              <ul className="vh-dati">
                <li>
                  <b>{m.persone}</b> passengers
                </li>
                <li>
                  <b>{m.valigie}</b> suitcases
                </li>
                <li>
                  <b>{m.bagagli}</b> carry-ons
                </li>
              </ul>
              {m.consiglio && <p className="vh-consiglio">{m.consiglio}</p>}
            </div>
          </article>
        ))}
      </section>

      <section className="ab-cols">
        <article>
          <h2>Only full-option Mercedes</h2>
          <p>
            Air conditioning, leather seats, ABS and ESP, front and side airbags,
            satellite navigation and WiFi on board. Cleaned and sanitised between
            services, fully insured and licensed under Italian law.
          </p>
        </article>
        <article>
          <h2>The driver is our employee</h2>
          <p>
            On our payroll, season after season &mdash; not a freelancer found that
            morning. It is the same reason the same names keep coming back in the
            reviews: you get the person we chose, not the one who was available.
          </p>
        </article>
        <article>
          <h2>Not sure which one fits?</h2>
          <p>
            Tell us how many you are and how much luggage you have, and we will say
            which vehicle you need &mdash; and if two would be cheaper than one, we
            will say that too. A real person answers, usually within a few hours.
          </p>
        </article>
      </section>

      <ContactSection tour="Our vehicles" locale={locale} />
    </main>
  );
}
