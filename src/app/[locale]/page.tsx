import ReactDOM from 'react-dom';
import { foto as ottimizza } from '@/lib/foto';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { DEFAULT_LOCALE, isLocale, LOCALES, PIU_LINGUE, regiondoLocale } from '@/lib/locales';
import { HomeTours, type SchedaTour } from '@/components/HomeTours';
import { HeroFoto } from '@/components/HeroFoto';
import { PrimoAlMondo } from '@/components/PrimoAlMondo';
import { Destinazioni } from '@/components/Destinazioni';
import { Cerca } from '@/components/Cerca';
import { prezzoDi } from '@/lib/prezzi';
import { puntiScheda } from '@/lib/punti';
import { ContactSection } from '@/components/ContactSection';
import { Recensioni } from '@/components/Recensioni';
import { Premi } from '@/components/Premi';
import { fonti, inEvidenza, votiPerTour } from '@/lib/recensioni';
import { riprova, tuttiIConteggi } from '@/lib/riprova';
import { VideoTestimonianze } from '@/components/VideoTestimonianze';
import { Servizi } from '@/components/Servizi';
import { Esperienza } from '@/components/Esperienza';
import { Perche } from '@/components/Perche';
import { metaDi } from '@/lib/seo';
import { ogDiPagina } from '@/lib/og';
import { grafo, hreflangDi, organization, sitoWeb } from '@/lib/schema';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const m = await metaDi('/', 'en');
  const percorso = (x: string) => (x === DEFAULT_LOCALE ? '/' : `/${x}/`);
  return {
    title: m?.title ?? 'Private Tours from Florence & Chianti — Prestige Rent',
    description:
      m?.description ??
      'Private day tours from Florence into Chianti, Siena and San Gimignano, with your own driver and hotel pickup. Our own cars, our own English-speaking guides.',
    /* 🔴 LA HOME NON AVEVA IL CANONICAL. Le schede tour, /about-us/ e le
       trentacinque categorie lo hanno perche' chiamano `hreflangDi`; qui
       la chiamata non c'era proprio, e la pagina piu' importante del sito
       usciva senza canonical e senza hreflang -- in tre lingue, cioe' tre
       home che si contendono la stessa ricerca. */
    alternates: hreflangDi(percorso, l),
    /* La foto dell'hero e' la prima cosa che si vede aprendo il sito: e'
       giusto che sia anche quella che si vede quando il link viene
       incollato in chat. E' la stessa `FOTO[0]` di qui sotto, nel taglio
       leggero -- vedi src/lib/og.ts. */
    openGraph: ogDiPagina({ locale: l, path: percorso(l) }),
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { data } = await supabase
    .from('tours')
    .select('id, slug, kind, regiondo_sku, status, rating, reviews_count, reviews_source, tour_content(locale, meta_description, blocks)')
    .eq('status', 'published')
    .order('kind');

  type Riga = TourRow & {
    tour_content?: { locale: string; meta_description: string | null; blocks: Record<string, unknown> }[];
  };
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
  const prezzi = new Map<string, { prezzo: number | null; ore: string | null }>();
  await Promise.all(
    righe
      .filter((r) => r.regiondo_sku)
      .map(async (r) => {
        const p = await fetchProduct(r.regiondo_sku!, regiondoLocale(locale));
        if (p) prezzi.set(r.slug, { prezzo: p.price, ore: p.durationLabel });
      })
  );

  /* I conteggi arrivano come elenco, uno per tour: si trasformano in
     dizionario una volta sola invece di cercarli dentro l'array ottantasette
     volte. */
  const perSlug = new Map(conteggi.map((c) => [c.tour_slug, c]));

  const tours: SchedaTour[] = righe.map((r) => {
    const riga =
      r.tour_content?.find((x) => x.locale === locale) ??
      r.tour_content?.find((x) => x.locale === 'en');
    const c = riga?.blocks as
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
      /* NON `c.highlights`: quello e' l'elenco lungo di WordPress, che
         comincia con la riga sulla sanificazione dei veicoli. `puntiScheda`
         ne ricava due o tre righe corte su cosa si vede e si fa in QUESTA
         giornata, e restituisce l'elenco vuoto dove non c'e' niente da
         dire -- i transfer punto-a-punto. Vedi src/lib/punti.ts. */
      punti: puntiScheda(c),
      /* La riga di prosa sotto la durata. E' la meta description, che
         esiste su tutte e 87 le schede ed e' gia' scritta per essere letta
         da sola in 126-154 caratteri: non serve scriverne un'altra. */
      descrizione: riga?.meta_description ?? null,
      prezzo: prezzo?.valore ?? null,
      ore: p?.ore ?? null,
      partenza: partenzaDa(r.slug),
      maxOspiti: maxOspiti(r.kind),
      /* Gli stessi voti che il menu mostra. `votiPerTour` sceglie gia' da
         se' la piattaforma piu' forte di quel tour e scarta chi ha meno di
         tre recensioni, quindi qui non c'e' nessuna soglia da rifare --
         e nemmeno nessuna somma: il numero e' di UNA piattaforma, e
         `dove` dice quale, perche' si possa andare a controllarlo. */
      voto: voti[r.slug]?.voto ?? null,
      quante: voti[r.slug]?.quante ?? null,
      dove: voti[r.slug]?.dove ?? null,
      oggi: perSlug.get(r.slug)?.oggi ?? null,
    };
  });

  /* LE FOTO DELL'HERO: SEI, SCELTE A MANO, UNA PER LUOGO.
   *
   * Sono la prima immagine di sei tour precisi, non "la prima delle 87 righe":
   * ogni riga dice da quale slug arriva. L'indirizzo pero' e' copiato qui e
   * non letto da `tours[].foto`, di proposito: chi riordina le immagini di un
   * tour dal pannello sta sistemando quella pagina, non sceglie lo sfondo
   * della home, e non deve poterlo cambiare senza saperlo. Se una di queste
   * sei deve cambiare, si cambia qui.
   *
   * La prima resta quella della home di prestigerent.com: e' l'unica che il
   * cliente riconosce, ed e' quella che il browser cronometra (vedi sotto).
   *
   * SCARTATE PERCHE' TROPPO CHIARE A SINISTRA. Il titolo e' bianco e sta a
   * sinistra; sopra la foto c'e' la velatura di `.hm-hero-bg::after`, che a
   * sinistra copre bene ma su telefono ritaglia il centro della foto, dove
   * la velatura e' molto piu' leggera. Misurato il contrasto del bianco su
   * ogni candidata in quel ritaglio: `Cinque-Terre5-1.jpg` (la prima di
   * `private-cinque-terre-from-florence`) sta a 2,5:1 contro il 3,8:1 della
   * foto attuale -- mare e cielo occupano mezza inquadratura -- e
   * `firenze-cupola.jpg` a 3,4:1. Al loro posto: la prima del tour delle
   * Cinque Terre da La Spezia e la cattedrale di Firenze, che sulla stessa
   * misura stanno a 3,9:1 e 8,3:1. */
  /* IL PUNTO DI FUOCO (`fuoco`) -- DOVE STA IL SOGGETTO, IN PERCENTUALE.
   *
   * Su telefono la foto non e' piu' una striscia centrale (vedi home.css, il
   * blocco a max-width:760px: la scatola diventa quadrata), ma un quadrato
   * ritagliato da una foto orizzontale butta via da un terzo a meta' della
   * larghezza -- e il ritaglio parte dal centro, che e' il posto sbagliato in
   * tre casi su sei. Misurato su ognuna dove sta davvero il soggetto:
   *
   *   48%  Tuscany_wine_experience -- il gruppo sta fra il 18% e il 78%,
   *        centro vero al 48%. E' largo piu' della finestra (49%), quindi
   *        qualcuno ai bordi si taglia comunque: meglio simmetrico.
   *    8%  Sam-Domenico-Church -- la chiesa sta tutta a SINISTRA (2-65%) e
   *        la cupola del Duomo al 75-83%. Nella finestra (67%) ci sta la
   *        chiesa INTERA oppure la cupola, non tutte e due: si tiene quella
   *        che l'immagine promette. Col centro non si vedeva ne' l'una ne'
   *        l'altra -- coda della chiesa, alberi, e mezza cupola.
   *   44%  PVT-6 -- il vignaiolo e' al 32-64%, la faccia al 45%.
   *  auto  firenze-cattedrale -- facciata a tutto campo, non c'e' un
   *        soggetto da centrare: resta 'center'.
   *   72%  pisa-torre -- la torre e' al 56-80%. Col centro la finestra
   *        arriva al 78% e ne mostrava il fianco sinistro tagliato: e'
   *        questo il caso che il titolare ha visto. Al 72% la finestra e'
   *        31-87% e la torre ci sta dentro con aria da tutte e due i lati.
   *   34%  Cinque-Terre9 -- il paese e' allo 0-68%, la meta' destra e' mare
   *        aperto. Al 34% la finestra e' 11-77%: paese tutto, un po' di mare.
   *
   * La percentuale VERTICALE resta `center` su tutte: nel quadrato l'altezza
   * viene mostrata intera, quindi non c'e' niente da scegliere. Serve solo
   * l'orizzontale, ed e' un valore solo che vale a ogni larghezza -- sul
   * desktop la scatola e' cosi' larga che la foto ci sta tutta e la
   * percentuale non sposta nulla. */
  const FOTO = [
    {
      /* wine-experience-in-tuscany -- e' la foto della home di oggi.
       *
       * E' L'UNICA CHE PASSA DA /render/image/. L'originale e' il file di
       * WordPress: 2560px e 756 KB, ed e' l'immagine che Google cronometra
       * (LCP) sul telefono, dove ne servono al massimo 1600 di larghezza.
       * Chiesta a 1920 esce in webp a 307 KB -- il 59% in meno, e 1920 e'
       * abbastanza per non ingrandire nemmeno su un desktop grande, quindi
       * non si perde nitidezza da nessuna parte.
       *
       * 1920x947 e' il RAPPORTO DELL'ORIGINALE (2560x1262 = 2,028): con
       * `resize=cover` il server toglie un pixel di larghezza e nient'altro.
       * Non e' un ritaglio -- il ritaglio lo fa `object-fit` nel browser,
       * dove sappiamo quant'e' larga la finestra e dove sta il soggetto.
       *
       * 🔴 QUESTO INDIRIZZO E' LO STESSO CHE VA NEL `preload` QUI SOTTO.
       * Se si cambia uno dei due e non l'altro, il browser scarica due
       * immagini invece di una e il tempo raddoppia: e' esattamente il
       * contrario di quello che il preload serve a fare.
       *
       * Le altre cinque restano l'originale: pesano dai 44 ai 232 KB, e
       * ripassate da /render/image/ alla loro dimensione nativa TRE DELLE
       * CINQUE diventano piu' pesanti, non piu' leggere (Siena 109->159 KB,
       * Cinque Terre 110->163). Non si cronometrano -- si montano a pagina
       * caricata -- quindi non c'e' niente da guadagnare e qualcosa da
       * perdere. */
      src: 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/render/image/public/media/wp/2025/07/Tuscany_wine_experience-scaled.jpg?width=1920&height=947&resize=cover&quality=68',
      /* se la trasformazione delle immagini venisse spenta sul progetto
         Supabase, l'indirizzo qui sopra risponderebbe in errore: `HeroFoto`
         rimette questo. Pesante, non rotto -- come fa il menu. */
      ripiego:
        'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2025/07/Tuscany_wine_experience-scaled.jpg',
      fuoco: '48% center',
    },
    {
      /* private-tour-siena-and-san-gimignano -- Siena */
      src: 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2021/09/Sam-Domenico-Church-Siena.jpg',
      fuoco: '8% center',
    },
    {
      /* private-tour-to-chianti-wineries -- il Chianti e il vino */
      src: 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2021/09/PVT-6.jpg',
      fuoco: '44% center',
    },
    {
      /* florence-and-pisa-from-livorno-tour -- Firenze */
      src: 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2021/09/firenze-cattedrale.jpg',
      fuoco: 'center',
    },
    {
      /* private-tour-pisa-from-florence -- Pisa */
      src: 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2021/03/pisa-torre.jpg',
      fuoco: '72% center',
    },
    {
      /* tour-to-cinque-terre-from-la-spezia -- le Cinque Terre */
      src: 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2021/09/Cinque-Terre9.jpg',
      fuoco: '34% center',
    },
  ];

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
   * un preload di un'immagine che non c'e' e' peggio che nessun preload.
   *
   * SI CHIEDE SOLO LA PRIMA, e le altre cinque nemmeno si nominano. Un
   * preload e' una precedenza, e cinque precedenze sono zero precedenze: sei
   * richieste ad alta priorita' in partenza insieme si rubano la banda a
   * vicenda e la prima -- l'unica che viene cronometrata -- arriverebbe
   * dopo, non prima. Le altre se le prende `HeroFoto` a pagina caricata. */
  /* 🔴 IL PRELOAD DEVE CHIEDERE ESATTAMENTE CIO' CHE POI SI USA.
   *
   * `HeroFoto` ora serve la foto attraverso l'ottimizzatore, quindi
   * prenotare qui l'indirizzo originale voleva dire scaricarla DUE volte:
   * 314 KB in anticipo che non vengono usati, piu' quella vera. Un
   * preload che punta altrove non e' una precedenza, e' un raddoppio. */
  ReactDOM.preload(ottimizza(FOTO[0].src, 1920), { as: 'image', fetchPriority: 'high' });

  return (
    <main>
      {/* 🔴 LA HOME NON AVEVA NESSUN BLOCCO JSON-LD.
          Le schede tour ce l'hanno, le trentacinque categorie ce l'hanno,
          /about-us/ ce l'ha. La home no -- ed e' la pagina che una
          macchina legge per prima quando le si chiede "chi e' Prestige
          Rent". Senza `Organization` qui, l'entita' e' descritta ovunque
          tranne che al suo indirizzo principale.
          `WebSite` sta in coppia con lei e dice che le 123 pagine sono un
          sito solo con un nome, non 123 documenti sciolti.
          Niente `BreadcrumbList` qui: sulla home avrebbe una voce sola,
          cioe' la home stessa, e una briciola di pane che non porta da
          nessuna parte e' rumore, non struttura. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(grafo([organization(), sitoWeb(locale)])),
        }}
      />

      <section className="hm-hero">
        <HeroFoto foto={FOTO} alt="Tuscany" />
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
          {/* 🔴 QUELLO SPAZIO NON E' UN VEZZO: `{' '}`.
              L'`<em>` e' `display:block` (home.css), quindi a schermo le
              due righe erano gia' separate e a occhio non si vedeva
              niente. Ma JSX butta via l'a-capo fra un testo e il tag che
              segue, e nel documento le due stringhe finivano attaccate:
              Google, che legge il testo e non il disegno, trovava
              "chauffeur servicefrom Florence" nell'H1 della home -- una
              parola che non esiste, proprio dove sta la promessa
              principale del sito. Uno spazio esplicito rimette la parola
              al suo posto senza spostare un pixel: fra due blocchi lo
              spazio non si vede. */}
          {/* 🔴 IL TITOLO DICE ANCHE DOVE SI ARRIVA, NON SOLO DA DOVE SI PARTE.
              "from Florence, through Chianti and Tuscany" descriveva un
              terzo del catalogo: ci sono Roma, Venezia, Milano, la costiera
              amalfitana e i porti da crociera, cioe' i giri piu' cari.
              Chi cerca "private transfer Florence to Rome" leggeva un
              titolo che parlava di Chianti e si convinceva di essere sul
              sito sbagliato.
              Piu' corto anche di misura: la riga in corsivo occupava due
              righe intere sul telefono e spingeva la foto fuori dallo
              schermo. */}
          <h1 className="hm-title">
            Private tours, transfers &amp; chauffeur service{' '}
            <em>across Italy, from Florence</em>
          </h1>
          {/* 🔴 SESSANTA PAROLE SOPRA LA FOTO, SU UNO SCHERMO DA 390 PIXEL.
              Misurato con i font veri (Manrope 600, 16px, interlinea 1,6):
              54 parole, OTTO righe su un iPhone da 390 e NOVE su un Android
              da 360 -- 205 e 230 pixel di testo, che sommati al titolo
              facevano 441 e 466 pixel, cioe' il 52% e il 63% dell'altezza
              dello schermo occupati da parole prima ancora di vedere la
              ricerca. E' il "un po' troppo testo" del titolare, ed era anche
              peggio di come lo raccontava.

              LA VERSIONE CORTA NON E' UN SECONDO PARAGRAFO: e' questo, con
              tre pezzi spenti. Gli span di classe hm-piu spariscono
              sotto i 760px (home.css) e quello che resta e':

                "Your own car, your own driver, your own hours. We own the
                 vehicles and employ the people: English-speaking drivers
                 and guides. Hotel pickup in Florence."

              25 parole, QUATTRO righe sia a 390 sia a 360.

              PERCHE' NON DUE PARAGRAFI, uno per il telefono e uno per il
              desktop: sarebbero due copie dello stesso testo nel documento,
              e Google le legge tutte e due -- nel punto piu' importante
              della pagina piu' importante del sito. Cosi' invece la frase e'
              scritta una volta sola e sul telefono se ne legge un pezzo.

              QUELLO CHE NON SI PUO' SPEGNERE, e infatti non e' dentro
              nessuno span: "we own the vehicles and employ the people". E'
              la ragione per cui uno prenota qui invece che su Viator -- se
              sparisce sul telefono, sparisce proprio dove serve. Via invece
              "fluent" (lo dice gia' "English-speaking"), l'elenco dei
              luoghi (sono nel titolo, due righe sopra) e "several of them
              native speakers, working with us season after season", che e'
              la prova del punto, non il punto. */}
          {/* 🔴 UNA RIGA, NON QUATTRO.
           *
           * Qui c'erano venticinque parole sul telefono e cinquantaquattro
           * sul desktop: quattro righe di testo bianco sopra la
           * fotografia, prima ancora di vedere la ricerca. Erano tutte
           * vere e tutte utili, ma dette in quel punto costavano la foto
           * -- e la foto e' quello che si vende.
           *
           * Resta la frase che nessun intermediario puo' scrivere: i
           * mezzi sono nostri e gli autisti sono nostri dipendenti. Il
           * resto -- il ritiro in hotel, l'inglese, le ore libere -- non
           * sparisce: scende nella fascia chiara sotto la foto, dove si
           * legge meglio e non costa niente all'immagine. */}
          <p className="hm-sub">
            Our own vehicles, our own English-speaking drivers &mdash;{' '}
            <b>employed by us, not subcontracted</b>.
          </p>

          {/* I FATTI AL POSTO DELLE PAROLE.
              Tre cose verificabili su una riga sola, che occupano meno di
              una frase e dicono di piu': da quanto esistono, quanti
              clienti, e che si puo' disdire. Il numero dei clienti viene
              da `azienda.clienti_serviti`, come ovunque. */}
          <p className="hm-fatti-riga">
            <span>★ {Number(az?.voto_medio ?? 4.9).toFixed(1)}</span>
            {az?.clienti_serviti != null && (
              <span>{Math.round(az.clienti_serviti / 1000)}k+ guests</span>
            )}
            <span>Since {az?.anno_fondazione ?? 2002}</span>
            <span>Free cancellation 24h</span>
          </p>

          {/* Il modulo di ricerca STA QUI, sulla foto: e' la prima cosa
              che si puo' fare. Sotto, in mezzo al bianco, lo trovava solo
              chi scorreva. */}
          <Cerca tours={tours} partenze={PARTENZE} />

        </div>
      </section>

      {/* SUBITO SOTTO LA FOTO, come sul sito WordPress: e' la prima cosa
          che si legge dopo la promessa, e l'unica che non la scriviamo noi. */}
      <PrimoAlMondo />

      {/* 🔴 QUESTA ROBA STAVA SOPRA LA FOTO, ED E' SCESA QUI.
       *
       * Sull'immagine c'erano sette blocchi: occhiello, titolo, tre righe
       * di sottotitolo, quattro righe di riconoscimenti, il modulo di
       * ricerca e due pulsanti. Per tenerli tutti leggibili serviva 0,80
       * di nero sopra la fotografia -- cioe' si spegneva la foto per far
       * entrare il testo, e la foto e' meta' di quello che si vende.
       *
       * Il conflitto sembrava fra SEO ed estetica, e non lo era: Google
       * legge il documento, non il disegno. Un titolo sotto l'immagine
       * vale quanto uno sovrapposto, e queste quattro righe qui sotto
       * pesano per Google esattamente come pesavano prima.
       *
       * Sopra la foto restano le tre cose che devono stare li': il
       * titolo, una riga di sottotitolo e il modulo di ricerca -- cioe'
       * cosa vendiamo e come si comincia. Il resto si legge meglio su
       * fondo chiaro, che e' la condizione normale per leggere.
       */}
      <section className="hm-sotto" aria-label="Why book with us">
        <div className="hm-sotto-in">
          {/* La riga della fiducia risponde alle tre obiezioni di chi
              arriva da un annuncio -- e' vero? posso disdire? chi mi
              porta? -- prima che cominci a scorrere. */}
          <div className="hm-badges">
            {/* 🔴 UN NUMERO SOLO, E QUELLO DEI CLIENTI.
                Qui c'era "4.9 from 14,005 verified reviews": il terzo
                conteggio di recensioni del sito, diverso dagli altri due
                perche' calcolato su un'altra base. Tre cifre che parlano
                della stessa cosa e non coincidono non convincono, si
                smentiscono -- ed e' lo stesso motivo per cui e' uscito
                dal footer e dalle schede tour.
                Il voto resta, il conteggio diventa quello dei clienti:
                e' l'unico che nessun'altra parte della pagina puo'
                contraddire. Viene da `azienda.clienti_serviti`, quindi
                si cambia in un posto solo. */}
            {az?.clienti_serviti != null && (
              <span>
                <i>⭐</i> <b>{Number(az.voto_medio ?? 4.9).toFixed(1)}</b> from{' '}
                {Math.round(az.clienti_serviti / 1000)}k+ guests since{' '}
                {az.anno_fondazione ?? 2002}
              </span>
            )}
            <span><i>🏆</i> Viator Experience Award &amp; Travelers&rsquo; Choice</span>
            <span><i>🛡️</i> Free cancellation up to 24 hours</span>
            <span><i>🚐</i> Our own {az?.mezzi_minibus} minibuses, our own drivers</span>
          </div>

          <div className="hm-cta">
            <a className="primo" href="#tours">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
              Explore tours
            </a>
            {/* 🔴 PORTA AL MODULO, NON A WHATSAPP.
                Mandava fuori dal sito, e chi esce per scrivere su WhatsApp
                spesso non torna: la richiesta resta a meta' e non ne
                rimane traccia da nessuna parte. Il modulo invece arriva
                nella posta, si puo' rileggere, e il messaggio parte gia'
                con il servizio compilato.
                WhatsApp resta comunque a un tocco: c'e' il pulsante verde
                in testata su ogni pagina, e la barra in basso sul
                telefono. Non si perde niente, si smette solo di
                accompagnare fuori chi stava per lasciare un contatto. */}
            <a className="secondo" href="#contact">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.8L3 21l1.9-5.1A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
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

        {/* LE DESTINAZIONI SUBITO DOPO I TOUR.
            Le pastiglie sopra rispondono a "che tipo di giro", queste a
            "dove sono / dove vado" -- ed e' la domanda che si fa chi non
            ha ancora deciso niente. Sul sito WordPress erano sulla home
            con la foto e il nome sopra; qui non esistevano proprio, e le
            trovava solo chi apriva il menu sapendo gia' di cercarle. */}
        <Destinazioni
          tours={tours}
          p={(path) => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`)}
        />
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
          {/* 🔴 QUI C'ERA "Travelers' Choice 2026 · verified on Tripadvisor,
              August 2026". Tolta il 29/08/2026.
              La tesi era giusta -- dire da dove viene un numero lo rende
              verificabile -- ma la riga faceva l'opposto: una data
              scritta a mano invecchia da sola, e fra tre mesi "August
              2026" avrebbe detto al lettore che il dato e' vecchio,
              proprio sotto i numeri che devono convincerlo. I premi
              stanno gia' due sezioni piu' su, con i marchi emessi dalle
              piattaforme, che sono la prova vera. */}
        </div>
      </section>

      {/* I SEI SERVIZI, ripresi dalla home vecchia.
          Qui e non piu' in basso: chi arriva da una ricerca stretta
          ("transfer per il porto di Livorno") non sa che questa azienda
          fa anche i piccoli gruppi e il vino, e dopo la lista dei tour
          e' il primo momento in cui la domanda "cos'altro fanno" se la
          pone davvero. Sono anche le sei pagine con piu' storia su
          Google dopo la home, e da qui la ricevono. */}
      <Servizi locale={locale} />

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
              {/* 🔴 PUNTAVA A UNA SCHEDA SOLA.
                  "See the private tours" portava su
                  /tour/private-tour-siena-and-san-gimignano/, cioe' UN
                  tour dei ventotto -- e chi cercava i privati si trovava
                  su Siena e San Gimignano senza capire perche'. Va
                  all'indice della categoria. */}
              <a className="cta" href={locale === DEFAULT_LOCALE ? '/private-tours/' : `/${locale}/private-tours/`}>
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
              your party, and why we can enter the restricted historic centers.
            </p>
          </div>

          {/* I numeri della flotta vengono dal database, non da qui.
              Erano scritti a mano, e quello delle auto diceva 10 mentre
              sono 8: e' una promessa al cliente, e stava nell'unico posto
              dove nessuno sarebbe andato a correggerlo. */}
          <div className="hm-fleet-count">
            <div><b>{az?.mezzi_minibus ?? 11}</b><span>25-seat minibuses</span></div>
            <div><b>{az?.mezzi_auto_numero ?? 8}</b><span>Mercedes cars &amp; vans</span></div>
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
                <img src={`https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/wp/2021/09/${file}`} alt={nome} loading="lazy" />
                <em>{tipo}</em>
                <b>{nome}</b>
                <span>{pax}</span>
              </figure>
            ))}
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="photo" src="https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/Piazzale-Montelungo-minibuses-2022.webp" alt="Prestige Rent 25-seat minibuses in Florence" loading="lazy" />
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
      {/* IL VIDEO ISTITUZIONALE. E' l'unico punto della home dove i
          mezzi e i posti si vedono in movimento, e prepara le facce che
          arrivano subito dopo. L'iframe non c'e' finche' non si clicca:
          vedi la nota dentro il componente. */}
      <Esperienza />

      {/* LE CINQUE PROMESSE. Le recensioni dicono che il tour e' bello;
          questo blocco risponde alle domande che uno si fa prima di
          lasciare la carta -- e se cambia il volo, chi mi risponde di
          domenica, siete voi o rivendete. Nel passaggio da WordPress era
          sparito ed era l'unico posto dove quelle risposte c'erano. */}
      <Perche
        voto={d.voto}
        totale={d.totale}
        posizione={az?.classifica_posizione}
        su={az?.classifica_su}
        categoria={az?.classifica_categoria}
        anni={d.anni}
      />

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

      <ContactSection locale={locale} />

      {/* Le lingue in fondo alla pagina.
          Non e' un doppione del selettore in alto: quello lo cerca chi sa
          gia' di volerlo, questo lo trova chi arriva in fondo e non ha
          capito. La bandiera si riconosce prima della parola, e chi
          cerca la propria lingua guarda proprio quella. */}
      {/* 🔴 "Also available in" con una lingua sola diceva il falso: la
          pagina non e' disponibile in altre lingue, e la riga elencava
          soltanto quella in cui il lettore stava gia' leggendo. Sparisce
          finche' non c'e' davvero una seconda lingua. */}
      {PIU_LINGUE && (
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
      )}
    </main>
  );
}
