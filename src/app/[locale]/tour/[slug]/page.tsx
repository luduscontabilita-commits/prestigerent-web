import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { getLocale, isLocale, LOCALES, DEFAULT_LOCALE, regiondoLocale } from '@/lib/locales';
import { RegiondoWidget } from '@/components/RegiondoWidget';
import { InfoTabs } from '@/components/InfoTabs';
import { PhotoStrip, type Foto } from '@/components/PhotoStrip';
import { Videos } from '@/components/Videos';
import { videoDi } from '@/lib/video';
import { StickyBook } from '@/components/StickyBook';
import { ContactSection } from '@/components/ContactSection';
import { Recensioni } from '@/components/Recensioni';
import { Premi } from '@/components/Premi';
import { FasciaFiducia } from '@/components/Riprova';
import { punteggiDi, recensioniDi } from '@/lib/recensioni';
import { pulisci, testo, utile, spezzaTitolo } from '@/lib/prosa';
import { ripulisciPunti } from '@/lib/punti';
import { badgeIncluso } from '@/lib/inclusi';
import { breadcrumb, grafo, hreflangDi, organization, product as prodottoJsonLd, touristTrip, SITE as SITE_URL } from '@/lib/schema';
import { ogDiPagina } from '@/lib/og';
import { prezzoDi, unitaDi } from '@/lib/prezzi';
import { metaDi } from '@/lib/seo';
import { prenotazioniDi, disponibilitaDi, riprova } from '@/lib/riprova';
import { Urgenza } from '@/components/Urgenza';
import { Diretto } from '@/components/Diretto';
import '@/styles/home.css';

const SITE = SITE_URL;

/* Le 87 pagine (x 3 lingue) si generano in anticipo e si rigenerano ogni ora.
   Prima erano dinamiche: ogni visita interrogava Supabase e Regiondo, con un
   TTFB intorno al secondo. Il masterplan chiede LCP sotto i 2 secondi
   misurato da mobile negli Stati Uniti, e con la generazione a richiesta non
   ci si arriva. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const { data } = await supabase.from('tours').select('slug').eq('status', 'published');
  const slugs = (data ?? []) as { slug: string }[];
  return LOCALES.flatMap((l) => slugs.map((s) => ({ locale: l.code, slug: s.slug })));
}

/* Da dove viene cosa, e perche':
 *
 *  - Regiondo  -> prezzo, durata, disponibilita'. Fatti commerciali, sempre
 *                 freschi, mai ricopiati a mano.
 *  - Supabase  -> testi, punti forti, foto, schede. Recuperati dalle pagine
 *                 WordPress attuali, perche' i campi di marketing di Regiondo
 *                 su piu' prodotti sono segnaposto ("Highlight 1, 2, 3").
 *
 * Se un giorno un prezzo comparisse in Supabase, e' un errore da correggere.
 */

type Contenuto = {
  name?: string;
  description?: string;
  images?: string[];
  highlights?: string[];
  itinerary?: string;
  tabs?: Record<string, string>;
  /* Titolo scritto a mano per la vendita, con i suoi accenti in Fraunces e
     il tratto sotto la parola chiave. Quando c'e' vince sul nome del
     prodotto WordPress, che dice cos'e' ma non perche' sceglierlo. */
  titolo_html?: string;
  /* `videos` NON STA PIU' QUI. Era un elenco JSON ricopiato per intero su
     ogni tour che lo mostra, e con quattro copie era gia' andata storta:
     sulle due giornate in cantina era finita la lista di Siena. Adesso i
     filmati stanno nel catalogo `video_clip` e si agganciano ai tour per
     tema -- vedi `src/lib/video.ts` e la migrazione 20260827. */
  /* Solo dove le foto sono state scelte a mano, con etichetta e
     sottotitolo: una didascalia scritta vende, un nome di file no. */
  gallery?: Foto[];
};

function pathFor(locale: string, slug: string) {
  return locale === DEFAULT_LOCALE ? `/tour/${slug}/` : `/${locale}/tour/${slug}/`;
}

async function getTour(slug: string, locale: string) {
  const { data } = await supabase
    .from('tours')
    .select('id, slug, kind, regiondo_sku, status, rating, reviews_count, reviews_source, tour_content(locale, blocks, title, meta_description)')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;

  const righe = (data as unknown as {
    tour_content?: { locale: string; blocks: Contenuto; meta_description?: string | null }[];
  }).tour_content ?? [];
  /* Finche' le traduzioni non ci sono, si mostra l'inglese invece di una
     pagina vuota: meglio la lingua sbagliata che il nulla. */
  const c = righe.find((r) => r.locale === locale) ?? righe.find((r) => r.locale === 'en');

  return {
    tour: data as unknown as TourRow,
    contenuto: (c?.blocks ?? {}) as Contenuto,
    /* La description scritta a mano su WordPress. La query la chiedeva gia'
       ma nessuno la leggeva: vedi la nota in `generateMetadata`. */
    metaScritta: c?.meta_description ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const res = await getTour(slug, locale);
  if (!res) return {};

  const alternates = hreflangDi((l) => pathFor(l, slug), locale);

  /* Il title e la description arrivano dalla tabella `seo`, dove si
     vedono tutti insieme e si correggono dal pannello. Se la riga non
     c'e' si usa quello calcolato qui sotto: una pagina senza meta e' un
     problema, una pagina che non si apre e' un disastro. */
  const meta = await metaDi(`/tour/${slug}/`, 'en');

  return {
    title: meta?.title || testo(res.contenuto.name) || slug,
    /* `meta_description` E' IL SECONDO RIPIEGO, NON IL PRIMO SCARTO.
       `getTour` la legge gia' da `tour_content` -- sono le description
       scritte a mano su WordPress, 82 diverse su 87 righe -- e finora
       veniva letta e buttata via: se la riga in `seo` fosse mancata, la
       pagina sarebbe caduta sul corpo del testo troncato a 160 caratteri
       invece che sul meta scritto apposta. Oggi le righe in `seo` ci sono
       tutte, quindi questo ramo non si vede; e' la rete per quando non ci
       saranno (una lingua nuova, un tour nuovo). */
    description:
      meta?.description ||
      testo(res.metaScritta) ||
      testo(res.contenuto.description).slice(0, 160),
    alternates,
    /* La PRIMA FOTO DEL TOUR, non la foto della home: chi incolla in chat
       il link di Siena deve vedere Siena. Se la scheda non ha immagini si
       ripiega da sola sulla foto della home -- vedi src/lib/og.ts. */
    openGraph: ogDiPagina({
      locale,
      path: pathFor(locale, slug),
      foto: res.contenuto.images?.[0],
    }),
  };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const res = await getTour(slug, locale);
  if (!res) {
    /* 🔴 LO STESSO INDIRIZZO SCRITTO CON LE MAIUSCOLE.
     *
     * Su WordPress /tour/small-group-tour-to-Siena-San-Gimignano-.../
     * risponde 200 da anni ed e' linkato in giro; qui gli slug si cercano
     * su Supabase con `eq`, che le maiuscole le distingue, e la pagina
     * cadeva nel 404.
     *
     * PERCHE' NON UN REDIRECT IN next.config.ts, che sarebbe il posto
     * naturale: **Next e Vercel confrontano i `source` senza distinguere
     * le maiuscole**. Verificato oggi sul deploy pubblico, chiedendo la
     * regola che c'e' gia' scritta con una lettera cambiata:
     *
     *   /tour/SIENA-san-gimignano-the-tuscan-countryside-landing/  ->  308
     *
     * Ha risposto lo stesso. Quindi una regola con `source` in maiuscolo
     * prenderebbe ANCHE l'indirizzo in minuscolo -- cioe' la pagina vera,
     * quella che vale l'85% del fatturato -- e la manderebbe a se stessa:
     * ciclo infinito, pagina irraggiungibile, e ce se ne accorge dal
     * fatturato. path-to-regexp compila con `sensitive: false`
     * (node_modules/next/dist/lib/build-custom-route.js).
     *
     * Qui invece il confronto e' un confronto fra stringhe, e il ciclo e'
     * impossibile per costruzione: si reindirizza SOLO se la versione
     * minuscola e' diversa da quella chiesta. Vale per tutte e ottantasei
     * le schede, non solo per quella che qualcuno ha notato. */
    const minuscolo = slug.toLowerCase();
    if (minuscolo !== slug) permanentRedirect(pathFor(locale, minuscolo));
    notFound();
  }

  const { tour, contenuto } = res;
  /* Regiondo e le recensioni si leggono INSIEME, non una dopo l'altra:
     sono due richieste indipendenti e in fila costerebbero il doppio del
     tempo su ogni pagina. */
  const [product, fiducia, leRecensioni] = await Promise.all([
    tour.regiondo_sku
      ? fetchProduct(tour.regiondo_sku, regiondoLocale(locale))
      : Promise.resolve(null),
    /* QUI PRIMA C'ERA `fonti()` DA SOLO, e su 124 pagine mancava tutto il
       resto: il voto d'azienda, il totale multi-piattaforma, gli anni dal
       2002, il "#2 of 248", i minibus di proprieta'. La pagina tour mostrava
       solo i numeri del singolo prodotto -- ed e' proprio la pagina su cui
       si atterra da Google e su cui si prenota, cioe' l'unica in cui la
       domanda "di chi mi sto fidando" viene davvero fatta.

       Si chiama `riprova()` e non `fonti()` perche' `riprova()` le fonti le
       legge gia' dentro di se' e le restituisce in `fiducia.fonti`: tenere
       tutte e due sarebbe la stessa lettura fatta due volte su ogni pagina,
       e nulla garantirebbe che i due risultati coincidano. */
    riprova(),
    recensioniDi(slug),
  ]);
  /* Dipende dalle fonti d'azienda, quindi non puo' stare nel Promise.all
     sopra. Le prende da `fiducia`: nessuna query in piu'. */
  const iPunteggi = await punteggiDi(slug, fiducia.fonti);
  const [quante, laDisp, video] = await Promise.all([
    prenotazioniDi(slug),
    disponibilitaDi(slug),
    /* I filmati di QUESTO tour, presi dal catalogo. Torna un elenco vuoto
       per la maggior parte dei tour, ed e' voluto: la sezione non si
       mostra affatto invece di riciclare i filmati di un'altra giornata. */
    videoDi(slug),
  ]);

  const nome = testo(contenuto.name) || slug.replace(/-/g, ' ');
  const foto = contenuto.images ?? [];
  /* Qui l'elenco resta lungo -- chi e' su questa pagina ha gia' scelto e
     legge anche le condizioni -- ma passa da `ripulisciPunti`, che toglie
     due cose:
       - "Read more", il link di WordPress finito nell'estrazione, che
         compariva fra i punti forti come se fosse uno di essi;
       - la riga sulla sanificazione dei veicoli, che su 55 schede su 87
         era il PRIMO punto, e con lei l'occhiello "Safe for money!" che le
         faceva da gemello: tolta la prima, la seconda resta sola e suona
         strana, mentre l'informazione che porta -- la cancellazione
         gratuita -- e' buona e va tenuta.
     Si filtra qui e non nel database, cosi' vale anche per i contenuti che
     arriveranno domani dallo stesso WordPress. Vedi src/lib/punti.ts. */
  const punti = ripulisciPunti(contenuto.highlights ?? []);
  /* L'ordine delle schede lo decide la pagina, non l'ordine in cui sono
     state estratte da WordPress -- che metteva le FAQ per prime, cioe' la
     cosa piu' secondaria nel posto piu' importante. Si comincia da cosa e'
     incluso e quanto costa; le FAQ chiudono, a destra. */
  const ORDINE = ['INCLUDED', 'PRICES', 'IMPORTANT INFO', 'TIME / LOCATION', 'TOUR SCHEDULE'];
  const tutteLeSchede = contenuto.tabs ?? {};
  const schede = Object.fromEntries(
    Object.entries(tutteLeSchede).sort(([a], [b]) => {
      const pa = /^faq/i.test(a) ? 99 : ORDINE.indexOf(a.toUpperCase());
      const pb = /^faq/i.test(b) ? 99 : ORDINE.indexOf(b.toUpperCase());
      return (pa < 0 ? 50 : pa) - (pb < 0 ? 50 : pb);
    })
  );
  /* Il mosaico .hero-gallery e' nascosto sopra i 760px (sulla landing, li'
     c'era la striscia): usarlo da solo faceva sparire le foto su desktop.
     La striscia si costruisce sempre -- con le didascalie dove sono state
     scritte a mano, con le sole foto altrimenti. */
  const striscia: Foto[] =
    contenuto.gallery?.length
      ? contenuto.gallery
      : (contenuto.images ?? []).map((src) => ({ src, alt: contenuto.name ?? '' }));
  /* I tre punti dell'hero, ricavati dai dati e non scritti a mano.
   *
   * Il secondo -- quello che promette qualcosa di compreso nel prezzo --
   * lo decide `badgeIncluso` leggendo l'elenco "Included" della scheda,
   * voce per voce. Prima bastava che la parola comparisse da qualche
   * parte nel blocco, e la pagina si contraddiceva da sola: vedi il
   * commento in testa a `src/lib/inclusi.ts`. Se non c'e' niente di vero
   * da dire, il posto resta vuoto. */
  const usp: { icona: string; testo: string }[] = [
    { icona: '🛡️', testo: 'Free cancellation up to 24 hours' },
  ];
  const compreso = badgeIncluso(tutteLeSchede);
  if (compreso) usp.push(compreso);
  if (tour.kind === 'private' || tour.kind === 'transfer') {
    usp.push({ icona: '🚐', testo: 'We collect you where you are staying' });
  } else if (tour.kind === 'cruise') {
    usp.push({ icona: '🚢', testo: 'Back on board before all aboard, guaranteed' });
  } else if (tour.kind === 'small_group') {
    usp.push({ icona: '👥', testo: 'Never more than 25 guests' });
  }

  const prezzo = prezzoDi(product?.price, schede);

  /* 🔴 IL VOTO PER `aggregateRating`, E DA DOVE PUO' VENIRE.
   *
   * Regola non negoziabile di Google: il voto dichiarato nei dati
   * strutturati dev'essere VISIBILE a chi legge la pagina. Un voto che sta
   * solo nel JSON-LD e' motivo di penalizzazione manuale -- si perderebbe
   * molto piu' delle stelle che si vorrebbero guadagnare. Quindi qui non
   * si inventa niente: si guarda cosa la pagina sta gia' stampando.
   *
   * Due fonti, in quest'ordine:
   *
   *  1. `tour.rating` e `tour.reviews_count`, che l'hero stampa qui sopra
   *     alla lettera ("4,9 · 1.810 reviews on Viator"). E' il caso piu'
   *     pulito: il numero nel JSON-LD e' lo stesso carattere per carattere.
   *     Oggi pero' quelle due colonne sono piene su UNA riga di 86.
   *
   *  2. i punteggi DI QUESTO TOUR che il blocco `Recensioni` qui sotto
   *     mostra uno per piattaforma. `punteggiDi` li marca con
   *     `suQuestoTour`, e sono 20 schede su 86. Su 18 di quelle la
   *     piattaforma e' una sola, quindi il numero passa di peso, identico
   *     a quello scritto. Sulle altre due (Siena in piccolo gruppo e Wine
   *     Experience) le piattaforme sono tre e si fa la media pesata sul
   *     numero di recensioni -- che non e' una media inventata qui: e'
   *     esattamente quella di `votiPerTour()`, cioe' il voto che il sito
   *     stampa gia' per lo stesso tour nel menu e sulla scheda della
   *     pagina di categoria da cui si arriva.
   *
   * Nessun rischio di contare due volte le stesse recensioni: le righe per
   * tour sono di Viator, GetYourGuide e Regiondo, e Tripadvisor non c'e'
   * (il suo numero e' gia' dentro quello di Viator -- e' il motivo per cui
   * `punteggiDi` guarda dentro le etichette prima di affiancare i badge
   * d'azienda). */
  const suQuestoTour = iPunteggi.filter(
    (f) => f.suQuestoTour && f.voto_medio != null && f.quante != null
  );
  const recDaPiattaforme = suQuestoTour.reduce((s, f) => s + f.quante!, 0);
  const voto =
    tour.rating != null && tour.reviews_count != null
      ? { valore: tour.rating, quante: tour.reviews_count }
      : recDaPiattaforme > 0
        ? {
            valore:
              Math.round(
                (suQuestoTour.reduce((s, f) => s + f.voto_medio! * f.quante!, 0) /
                  recDaPiattaforme) *
                  10
              ) / 10,
            quante: recDaPiattaforme,
          }
        : null;

  const calendario = (
    <>
      <div className="bk-head">
        <h2 className="bk-title">Book this tour</h2>
        <p className="bk-sub">Pick your date and the number of guests.</p>
      </div>
      <div className="pr-tguar">
        <span><i aria-hidden="true">🛡️</i><b>Free cancellation</b> up to 24h</span>
        <span><i aria-hidden="true">⚡</i><b>Instant confirmation</b></span>
      </div>
      {/* L'ultimo centimetro prima della decisione: quante prenotazioni
          oggi, quante questa settimana, quanti posti per partenza. Tutto
          da Regiondo, niente inventato. */}
      <Urgenza
        conta={quante}
        disp={laDisp}
        posti={tour.kind === 'small_group' ? 25 : null}
      />
      {tour.regiondo_sku && (
        <RegiondoWidget sku={tour.regiondo_sku} title={product?.name || nome} locale={locale} />
      )}
      {/* SOTTO il calendario, non sopra: chi ha gia' scelto la data non
          va interrotto. Serve a chi arriva in fondo senza decidersi, ed
          e' li' che il confronto con Viator si vince o si perde. */}
      <Diretto whatsapp="https://wa.me/393338424047" />
    </>
  );

  return (
    <main>
      {/* Due colonne: il contenuto a sinistra, il calendario appiccicato a
          destra. E' la disposizione della scheda tour del sito attuale, ed e'
          quella giusta -- il modulo resta sotto gli occhi mentre si legge,
          invece di stare in fondo dove bisogna cercarlo. Sotto la soglia
          torna una colonna sola e il calendario scende al suo posto. */}
      <div className="pg-cols">
      <div className="pg-main">
      <section className="hero" id="top">
        <span className="hero-loc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {tour.kind === 'private' ? 'Private tour' : tour.kind === 'small_group' ? 'Small group' : 'Prestige Rent'}
        </span>

        {/* L'accento in Fraunces va sul LUOGO, non sull'ultima parola: quasi
            ogni titolo finisce con "from Florence", e accentare la partenza
            invece della meta non dice niente. */}
        {contenuto.titolo_html ? (
          <h1
            className="hero-title"
            dangerouslySetInnerHTML={{ __html: contenuto.titolo_html }}
          />
        ) : (
          <h1 className="hero-title">
            {spezzaTitolo(nome).prima}
            <em className="hl place">{spezzaTitolo(nome).accento}</em>
            {spezzaTitolo(nome).dopo}
          </h1>
        )}

        {contenuto.description && <p className="hero-sub">{testo(contenuto.description)}</p>}

        {prezzo != null && (
          <p className="hero-dep">
            <b>from &euro;{prezzo.valore.toFixed(0)}</b>
            {product?.durationLabel ? ` · ${product.durationLabel}` : null}
            {utile(product?.participants) ? ` · ${utile(product?.participants)}` : null}
            {prezzo.fonte === 'wordpress' ? ' · price on request for your date' : null}
          </p>
        )}

        {/* Le recensioni appartengono a UN tour, non all'azienda: si mostrano
            solo dove sono davvero sue. */}
        {tour.rating != null && tour.reviews_count != null && (
          <div className="trust">
            <span className="t-item">
              <span className="stars-img" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => <i className="star" key={i} />)}
              </span>
              <span>
                <b>{tour.rating}</b> · {tour.reviews_count.toLocaleString('en-US')} reviews
                {tour.reviews_source ? ` on ${tour.reviews_source}` : ''}
              </span>
            </span>
          </div>
        )}

        {/* I TRE PUNTI SOTTO IL TITOLO.
            Rispondono alle tre domande che si fa chi arriva da un annuncio
            -- posso disdire? cosa e' compreso? chi mi viene a prendere? --
            prima che cominci a scorrere. Chi non trova quelle risposte
            subito non scorre: chiude.

            NON sono scritti a mano uguali per tutti: si ricavano dal tipo
            di tour e da cosa dice davvero la scheda "included". Promettere
            il pranzo in cantina su un transfer per l'aeroporto farebbe
            danno, non conversione. */}
        {/* LE PRENOTAZIONI VERE, prese da Regiondo. Non "12 persone
            stanno guardando": quello si smaschera ricaricando due volte,
            e chi lo smaschera smette di credere anche ai numeri veri che
            ci sono sulla stessa pagina. Sotto le dieci non si scrive:
            "3 prenotazioni questa settimana" lavora contro. */}
        {quante && quante.ultimi_7 >= 10 && (
          <p className="pr-caldo">
            <span aria-hidden="true">🔥</span>
            <b>{quante.ultimi_7}</b> people booked this tour in the last 7 days
            {quante.persone_7 > quante.ultimi_7 ? ` — ${quante.persone_7} guests in total` : ''}
          </p>
        )}

        {usp.length > 0 && (
          <ul className="pr-usp">
            {usp.map((u) => (
              <li key={u.testo}>
                <span aria-hidden="true">{u.icona}</span>
                {u.testo}
              </li>
            ))}
          </ul>
        )}

        {/* La striscia sta DENTRO l'hero, subito sotto il titolo, come sulla
            landing: non e' una sezione a se'. */}
        <PhotoStrip foto={striscia} />
      </section>


      {/* L'ITINERARIO STA QUI, fra le foto e i video, e non e' un
          dettaglio di impaginazione: e' l'ordine in cui uno decide.
          Le foto dicono "che bel posto", l'itinerario dice "ecco cosa si
          fa dalle 8 alle 18", i video mostrano com'e' andata davvero.
          Prima stava in fondo, dopo recensioni e schede informative: ci
          arrivava solo chi aveva gia' deciso, cioe' chi non ne aveva
          bisogno. */}
      {contenuto.itinerary && (
        <section className="pr-sec" id="itinerary">
          <div className="pr-wrap">
            <div className="pr-head">
              <h2 className="pr-title">The <em className="hl place">itinerary</em></h2>
            </div>
            {/* L'itinerario si legge tutto, come sul sito attuale: e' gia'
                spezzato in titoletti, e il ritaglio a 320px lo troncava a
                meta' di una frase. */}
            <div
              className="pr-prose"
              dangerouslySetInnerHTML={{ __html: pulisci(contenuto.itinerary) }}
            />
          </div>
        </section>
      )}

      {video.length > 0 && <Videos video={video} />}

      {/* Le recensioni PRIMA del calendario, non dopo: chi ha ancora
          un dubbio lo risolve qui, un attimo prima di scegliere la
          data. Metterle in fondo vuol dire mostrarle a chi ha gia'
          deciso, cioe' a chi non ne aveva bisogno. */}
      {/* I premi PRIMA dei punteggi: sono immagini emesse dalle
          piattaforme, quindi rispondono da soli alla domanda "questi
          numeri chi me li garantisce". Poi vengono i numeri, poi le
          recensioni, poi il calendario. */}
      <Premi />

      {/* I NUMERI DELL'AZIENDA, e stanno esattamente qui.
       *
       * Il posto non e' scelto per riempire un buco: e' il punto in cui la
       * domanda cambia. Fin qui il lettore ha chiesto "com'e' questa
       * giornata" -- foto, itinerario, video -- e ha finito di leggere.
       * Da qui in avanti chiede "e chi me la vende?", perche' il calendario
       * gli sta accanto sulla colonna di destra e il prossimo gesto e'
       * mettere una carta di credito.
       *
       * Non in cima: sopra, nell'hero, ci sono gia' il voto e le recensioni
       * di QUESTO tour. Due fasce di numeri attaccate non si sommano, si
       * annullano -- chi ne legge dieci non ne ricorda nessuno, e il
       * confronto fra "4,9 su 1.810" e "4,9 su 12.590" a due centimetri di
       * distanza sembra un errore invece che due cose diverse.
       *
       * Fra i premi e le recensioni, invece, l'ordine si legge da solo e
       * completa quello gia' scritto qui sotto: i loghi delle piattaforme
       * dicono CHI garantisce, questi numeri dicono QUANTO, le recensioni
       * dicono COSA -- e poi si prenota.
       *
       * `compatta` perche' qui la colonna e' stretta (il calendario si
       * prende 400px fissi): con la spaziatura piena le cinque voci
       * andrebbero a capo su tre righe e la fascia diventerebbe un muro. */}
      {/* La fascia sta dentro un `pr-sec tight`, non nuda: `.rp-band` e'
          centrata ma non ha margini laterali propri, e appoggiata
          direttamente sulla colonna toccherebbe i bordi dello schermo sul
          telefono -- dove passa la maggior parte di questo traffico. */}
      <section className="pr-sec tight" aria-label="Why guests trust Prestige Rent">
        <div className="pr-wrap wide">
          <FasciaFiducia dati={fiducia} compatta />
        </div>
      </section>

      {/* Niente prop `totale` qui, ed e' voluto: `Recensioni` sa sommare da
          se' le fonti che riceve, e su questa pagina sono quelle del SINGOLO
          tour. Passargli il totale d'azienda (12.590) sotto il titolo delle
          recensioni di questo tour vorrebbe dire attribuire a una giornata
          le recensioni di ventiquattro anni. Il totale d'azienda ha il suo
          posto, ed e' la fascia qui sopra. */}
      <Recensioni fonti={iPunteggi} recensioni={leRecensioni} />

      {punti.length > 0 && (
        <section className="pr-sec tight" id="highlights">
          <div className="pr-wrap wide">
            <div className="pr-head">
              <h2 className="pr-title">Why you will <em className="hl place">remember it</em></h2>
            </div>
            <ul className="hl2-grid">
              {punti.map((p) => (
                <li className="hl2-item" key={p}>
                  <svg className="hl2-ico" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="12" fill="currentColor" />
                    <path d="m6.8 12.3 3.3 3.3 7-7.2" fill="none" stroke="#fff"
                          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{testo(p)}</span>
                </li>
              ))}
            </ul>

            <div className="pr-tguar">
              <span><i aria-hidden="true">🛡️</i><b>Free cancellation</b> up to 24h — 100% refund</span>
              <span><i aria-hidden="true">⚡</i><b>Instant confirmation</b></span>
              <span><i aria-hidden="true">🏷️</i><b>Best price</b> when you book direct</span>
            </div>
          </div>
        </section>
      )}

      {Object.keys(schede).length > 0 && (
        <section className="pr-sec alt" id="info">
          <div className="pr-wrap wide">
            <div className="pr-head">
              <h2 className="pr-title">
                <em className="hl place">
                  {tour.kind === 'private' ? 'Private tour' : tour.kind === 'small_group' ? 'Small group tour' : 'This tour'}
                </em>{' '}
                &mdash; everything you need to know
              </h2>
            </div>
            <InfoTabs tabs={schede} />
          </div>
        </section>
      )}

      </div>{/* /.pg-main */}

      <aside className="pg-rail" id="prRail" aria-label="Book this tour">
        <div className="pg-rail-in" id="bookform">{calendario}</div>
      </aside>

      <div className="pg-main-b">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            grafo([
              organization(),
              breadcrumb(locale, [
                { nome: 'Home', path: '/' },
                { nome: nome, path: `/tour/${slug}/` },
              ]),
              touristTrip({
                nome,
                /* `testo()` e non il campo grezzo: su 6 schede su 87 la
                   descrizione contiene ancora entita' HTML (&amp;) prese da
                   WordPress, e nel JSON-LD uscirebbero cosi' come sono. */
                descrizione: testo(contenuto.description),
                url: SITE + pathFor(locale, slug),
                locale,
                immagini: foto,
                prezzo: prezzo?.valore ?? null,
                durata: product?.durationLabel ?? null,
                tappe: punti.slice(0, 8),
              }),
              /* 🔴 `Product` ACCANTO A `TouristTrip`, non al suo posto.
               *
               * `TouristTrip` descrive bene cos'e' una gita, ma non e' nella
               * galleria dei risultati arricchiti di Google: con quello solo,
               * nello snippet non compaiono ne' il prezzo ne' le stelle su
               * nessuna delle ottantasei schede. Il WordPress che stiamo
               * sostituendo usava `Product` + `Offer` e ci arrivava.
               *
               * `voto` e `quante` sono ESATTAMENTE i due numeri stampati
               * nell'hero qui sopra, sotto la stessa condizione: se la
               * pagina non li mostra, qui non si dichiarano. Google chiede
               * che il voto sia visibile a chi legge, e un voto che sta solo
               * nel JSON-LD e' un motivo di penalizzazione manuale -- si
               * perderebbe molto piu' di quello che si guadagna. */
              prodottoJsonLd({
                nome,
                descrizione: testo(contenuto.description),
                url: SITE + pathFor(locale, slug),
                immagini: foto,
                prezzo: prezzo?.valore ?? null,
                voto: voto?.valore ?? null,
                quante: voto?.quante ?? null,
              }),
            ])
          ),
        }}
      />

      <ContactSection locale={locale} tour={nome} />
      </div>{/* /.pg-main-b */}

      <StickyBook
        titolo={nome}
        prezzo={prezzo?.valore ?? null}
        unita={unitaDi(tutteLeSchede, tour.kind)}
      />
      </div>{/* /.pg-cols */}
    </main>
  );
}
