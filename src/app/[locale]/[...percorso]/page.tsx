import type { Metadata } from 'next';
import { fotoVere, provaDi } from '@/lib/galleria';
import { affiancato, cambi } from '@/lib/cambi';
import { foto as ottimizza, fotoSet } from '@/lib/foto';
import { notFound } from 'next/navigation';
import { supabase, type TourRow } from '@/lib/supabase';
import { fetchProduct } from '@/lib/regiondo';
import { DEFAULT_LOCALE, isLocale, LOCALES, regiondoLocale } from '@/lib/locales';
import { CATEGORIE, categoriaDi, figlieDi } from '@/lib/categorie';
import { votiPerTour } from '@/lib/recensioni';
import { metaDi } from '@/lib/seo';
import { prezzoDi } from '@/lib/prezzi';
import { classeTitolo, puntiScheda } from '@/lib/punti';
import { testo } from '@/lib/prosa';
import { conAnni } from '@/lib/anni';
import { breadcrumb, grafo, hreflangDi, organization } from '@/lib/schema';
import { ogDiPagina } from '@/lib/og';
import { Premi } from '@/components/Premi';
import { ContactSection } from '@/components/ContactSection';
import '@/styles/home.css';

export const revalidate = 3600;

/* LE PAGINE DI CATEGORIA -- trentacinque indirizzi che esistono su
 * WordPress, sono nel menu, e sul sito nuovo non c'erano.
 *
 * Il giorno del passaggio avrebbero risposto 404 tutte insieme, comprese
 * /small-group-tours/ e /private-tours/ che sono le voci principali del
 * menu e le pagine con piu' storia dopo la home.
 *
 * Una sola pagina modello per tutte: cambia il filtro, non il codice.
 */

export function generateStaticParams() {
  const out: { locale: string; percorso: string[] }[] = [];
  for (const l of LOCALES) {
    for (const c of CATEGORIE) {
      out.push({ locale: l.code, percorso: c.path.split('/').filter(Boolean) });
    }
  }
  return out;
}

function daiParams(percorso: string[]) {
  return '/' + percorso.join('/') + '/';
}

/* Quanti tour ci sono davvero dentro una categoria.
 *
 * Serve solo a decidere se la pagina va nell'indice: e' la stessa lettura
 * che la pagina fa piu' sotto per riempirsi, e Next mette in cache la
 * richiesta, quindi non e' un giro in piu' verso il database.
 * `tours-of-italy` non e' una categoria WooCommerce -- e' l'indice
 * generale, e li' dentro ci sono tutti -- quindi non si conta. */
async function quantiTour(cat: string): Promise<number> {
  if (cat === 'tours-of-italy') return 1;
  const { data } = await supabase
    .from('tour_categorie')
    .select('tour_slug')
    .contains('categorie', [cat]);
  return (data ?? []).length;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; percorso: string[] }>;
}): Promise<Metadata> {
  /* `locale` serviva gia' qui sotto per il canonical ma non veniva
     estratto: il file non compilava proprio (TS2552). */
  const { locale, percorso } = await params;
  const c = categoriaDi(daiParams(percorso));
  if (!c) return {};
  /* Scritti uno per uno e conservati nella tabella `seo`: qui c'erano
     30 pagine su 35 SENZA description e 5 con un paragrafo intero al
     posto del meta, uno da 1.267 caratteri dove Google ne legge 155. */
  const m = await metaDi(c.path, 'en');

  /* 🔴 UNA CATEGORIA SENZA TOUR NON VA NELL'INDICE.
   *
   * Nove pagine -- i porti siciliani, Salerno, Amalfi, i transfer da
   * Napoli, Venezia -- rispondono 200 e mostrano "We are still adding the
   * pages for this section". Erano gia' state tolte dalla sitemap, ma
   * togliere una pagina dalla sitemap NON la toglie dall'indice: Google
   * ci arriva dai link interni, e il menu le linka da tutte e 114 le
   * pagine del sito. Trova pagine vuote, e le pagine vuote pesano sul
   * giudizio di tutto il dominio, non solo sul loro.
   *
   * Il conteggio si fa qui e non si indovina: la stessa lettura che
   * riempie la pagina piu' sotto. Il giorno in cui la categoria si
   * riempie, il noindex sparisce da solo -- che e' il motivo per cui non
   * si e' scritto un elenco di URL a mano. */
  const quanti = c.cat ? await quantiTour(c.cat) : 1;

  return {
    title: m?.title ?? `${c.titolo} — Prestige Rent`,
    description: m?.description ?? conAnni(c.intro).slice(0, 155),
    ...(quanti === 0 ? { robots: { index: false, follow: true } } : {}),
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? c.path : `/${l}${c.path}`),
      locale
    ),
    /* Titolo e testo dell'anteprima li mette Next da solo copiando i due
       campi qui sopra (vedi src/lib/og.ts); qui si aggiunge l'indirizzo
       pubblico giusto -- che Next da solo sbaglierebbe, perche' dentro
       l'applicazione l'inglese vive sotto /en/. La foto e' quella di
       ripiego: una pagina di categoria non ne ha una propria. */
    openGraph: ogDiPagina({
      locale,
      path: locale === DEFAULT_LOCALE ? c.path : `/${locale}${c.path}`,
    }),
  };
}

type Riga = TourRow & {
  tour_content?: { locale: string; meta_description: string | null; blocks: Record<string, unknown> }[];
};

export default async function Categoria_({
  params,
}: {
  params: Promise<{ locale: string; percorso: string[] }>;
}) {
  const { locale, percorso } = await params;
  if (!isLocale(locale)) notFound();

  const cat = categoriaDi(daiParams(percorso));
  if (!cat) notFound();

  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);

  /* Chi sta in questa categoria lo dice WooCommerce, non un elenco di
     parole: `contains` sull'array delle categorie del tour. */
  const [{ data: appartiene }, { data }, voti] = await Promise.all([
    supabase.from('tour_categorie').select('tour_slug').contains('categorie', [cat.cat]),
    supabase
      .from('tours')
      .select('id, slug, kind, regiondo_sku, status, rating, reviews_count, reviews_source, tour_content(locale, meta_description, blocks)')
      .eq('status', 'published'),
    votiPerTour(),
  ]);

  const dentro = new Set((appartiene ?? []).map((x) => x.tour_slug));
  const righe = (data ?? []) as unknown as Riga[];
  /* "Tours of Italy" non e' una categoria WooCommerce: e' la pagina che
     mostra tutto. Su WordPress fa lo stesso -- e' l'indice generale. */
  const scelti = cat.cat === 'tours-of-italy' ? righe : righe.filter((r) => dentro.has(r.slug));

  /* I prezzi tutti insieme, non uno dopo l'altro: in fila sarebbero
     decine di attese sommate su una pagina sola. */
  /* Si chiedeva gia' il prodotto a Regiondo per il prezzo e si buttava via
     tutto il resto: la durata era li' dentro, nella stessa risposta, e la
     scheda di categoria era l'unica del sito a non mostrarla. Nessuna
     chiamata in piu'. */
  const daRegiondo = new Map<string, { prezzo: number | null; ore: string | null }>();
  await Promise.all(
    scelti
      .filter((r) => r.regiondo_sku)
      .map(async (r) => {
        const pr = await fetchProduct(r.regiondo_sku!, regiondoLocale(locale));
        if (pr)
          daRegiondo.set(r.slug, {
            prezzo: prezzoDi(pr.price, {})?.valore ?? null,
            ore: pr.durationLabel,
          });
      })
  );

  /* i cambi del giorno, dal server, in cache 24 ore: la pagina resta
     statica e il browser non chiede niente in piu' */
  const cambio = await cambi();

  const figlie = figlieDi(cat.path);
  const briciole = [{ nome: 'Home', path: '/' }];
  if (cat.padre) {
    const pa = categoriaDi(cat.padre);
    if (pa) briciole.push({ nome: pa.titolo, path: pa.path });
  }
  briciole.push({ nome: cat.titolo, path: cat.path });

  return (
    <main className="ct">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(grafo([organization(), breadcrumb(locale, briciole)])),
        }}
      />

      <nav className="ct-bric" aria-label="Breadcrumb">
        {briciole.map((b, i) => (
          <span key={b.path}>
            {i > 0 && <i>/</i>}
            {i === briciole.length - 1 ? <b>{b.nome}</b> : <a href={p(b.path)}>{b.nome}</a>}
          </span>
        ))}
      </nav>

      <header className="ct-head">
        <h1>{cat.titolo}</h1>
        <p>{conAnni(cat.intro)}</p>
        {/* Il paragrafo che parla alla persona invece che ai motori. Sta
            sotto l'intro e non al suo posto: la riga secca la legge chi
            scorre e finisce nei risultati di Google, questa la legge chi
            sta scegliendo con due schede aperte. */}
        {cat.prosa && cat.prosa.length > 0 && (
          <div className="ct-prosa">
            {/* 🔴 IL FILO SOPRA L'ULTIMA RIGA SOLO SE C'E' QUALCOSA DA
                STACCARE. Dove il testo e' un paragrafo solo, quello e'
                anche l'ultimo: si prendeva il filo sopra la testa e in
                pagina restava una riga orizzontale sospesa fra il titolo e
                il testo, che sembrava un errore di impaginazione. */}
            {cat.prosa.map((riga, i) => (
              <p
                key={i}
                className={
                  cat.prosa!.length > 1 && i === cat.prosa!.length - 1
                    ? 'ct-prosa-fine'
                    : undefined
                }
              >
                {conAnni(riga)}
              </p>
            ))}
          </div>
        )}
      </header>

      {figlie.length > 0 && (
        <div className="ct-figlie">
          {figlie.map((f) => (
            <a key={f.path} href={p(f.path)}>
              {f.titolo}
            </a>
          ))}
        </div>
      )}

      {scelti.length > 0 ? (
        <div className="ct-griglia">
          {scelti.map((r) => {
            const c = r.tour_content?.find((x) => x.locale === locale) ?? r.tour_content?.[0];
            const b = (c?.blocks ?? {}) as {
              name?: string;
              gallery?: { src: string }[];
              images?: string[];
              highlights?: string[];
              tabs?: Record<string, string>;
            };
            const nome = testo(b.name ?? r.slug.replace(/-/g, ' '));
            /* Stesso filtro della home e della scheda: vedi lib/galleria.ts. */
            const foto = b.gallery?.[0]?.src ?? fotoVere(b.images, provaDi(r.slug, b))[0];
            const q = voti[r.slug];
            const rg = daRegiondo.get(r.slug);
            /* Le stesse due o tre righe della home, dalla stessa funzione:
               una griglia che dice altro dall'altra e' come se parlasse di
               due prodotti diversi. Vedi src/lib/punti.ts. */
            const punti = puntiScheda(b);
            return (
              <a className="ct-card" key={r.slug} href={p(`/tour/${r.slug}/`)}>
                <div className="ct-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {foto && (
                    <img
                      /* Le 35 pagine di categoria scaricavano 2,36 MB di
                         foto a piena risoluzione per mostrarle dentro
                         schede larghe 380 pixel: era il pezzo piu' pesante
                         rimasto in tutto il sito. */
                      src={ottimizza(foto, 640)}
                      srcSet={fotoSet(foto, [640, 828, 1200])}
                      sizes="(max-width: 700px) 92vw, (max-width: 1180px) 46vw, 380px"
                      alt={nome}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  {/* 🔴 LA FASCIA "TOP EXPERIENCE", E CHI SE LA MERITA.
                      Non e' un elenco scritto a mano: la prende chi ha
                      almeno mille recensioni su una piattaforma sola. Cosi'
                      non va aggiornata, e soprattutto non si puo' mettere
                      per simpatia -- il giorno che un tour cresce se la
                      prende da solo, e se calasse la perderebbe.
                      Mille e non cento: sotto quella soglia "top" non e'
                      un giudizio, e' una decorazione. Oggi la prendono in
                      tre, e sono i tre che vendono. */}
                  {q && q.quante >= 1000 && (
                    <span className="ct-top" aria-hidden="true">
                      <b>Top experience</b>
                    </span>
                  )}
                  <h3 className={classeTitolo('ct-nome', nome)}>{nome}</h3>
                </div>
                <div className="ct-body">
                  {/* durata, posti e recensioni su una riga sola */}
                  <div className="hm-fatti">
                    {rg?.ore ? <span className="hm-durata">{rg.ore}</span> : null}
                    {q && (
                      <span className="hm-voto">
                        <i className="hm-stars" aria-hidden="true">
                          {'★★★★★'.slice(0, Math.round(q.voto))}
                          {'☆☆☆☆☆'.slice(0, 5 - Math.round(q.voto))}
                        </i>
                        <b>{q.voto.toFixed(1)}</b>
                        <em>
                          {q.quante.toLocaleString('en-US')} reviews {q.dove}
                        </em>
                      </span>
                    )}
                  </div>

                  {c?.meta_description && (
                    <p className="hm-sommario">{testo(c.meta_description)}</p>
                  )}

                  {punti.length > 0 && (
                    <ul className="hm-hl">
                      {punti.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  )}

                  <div className="hm-price">
                    {rg?.prezzo != null ? (
                      <>
                        <small>from</small>
                        <b>&euro;{rg.prezzo.toFixed(0)}</b>
                        {/* solo le cifre: la fonte non ci sta in una scheda
                            e usciva tagliata a meta'. Sta sulla scheda del
                            tour, dove c'e' spazio per dirla intera. */}
                        {affiancato(rg.prezzo, cambio) && (
                          <em className="hm-price-cambio">{affiancato(rg.prezzo, cambio)}</em>
                        )}
                      </>
                    ) : (
                      <span className="ask">Price on request</span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="ct-vuoto">
          We are still adding the pages for this section. Meanwhile,{' '}
          <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
            message us on WhatsApp
          </a>{' '}
          and we will tell you straight away what we run from here.
        </p>
      )}

      <Premi />
      {/* Il titolo della categoria entra nel modulo come se fosse il nome
          di un tour: cosi' l'oggetto dell'email dice "Cinque Terre" o
          "Wine & food" invece di un generico "Richiesta dal sito", e chi
          risponde sa gia' di cosa si parla senza aprire il messaggio.
          Sul sito vecchio funzionava cosi' ed e' comodo. */}
      <ContactSection locale={locale} tour={cat.titolo} />
    </main>
  );
}
