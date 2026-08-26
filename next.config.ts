import type { NextConfig } from 'next';

/* Finche' il sito nuovo e' in prova su nuovo-sito.prestigerent.com deve
 * restare FUORI da Google. Se venisse indicizzato, sarebbero 124 pagine
 * duplicate di quelle vive: Google dovrebbe scegliere quale delle due
 * mostrare, e nel dubbio ne penalizza entrambe. Si toglie SITE_NOINDEX il
 * giorno del passaggio, non prima.
 */
const noindex = process.env.SITE_NOINDEX !== 'false';

/* Le landing delle campagne (/lp/...) e la pagina di conferma su cui il
 * cliente atterra dopo aver pagato (/myb/) NON sono pagine di questo
 * progetto: sono file statici che un'altra persona aggiorna via FTP sul
 * vecchio hosting. Copiarli nel repo spezzerebbe quel flusso di lavoro, e
 * lasciarli fuori senza fare altro vuol dire 404 il giorno del passaggio:
 * si fermerebbero le campagne (3.645 euro al mese) e chi ha appena pagato
 * vedrebbe una pagina di errore. Restano dove sono e la richiesta viene
 * inoltrata: il visitatore continua a vedere prestigerent.com/lp/..., a
 * rispondere e' il vecchio server.
 *
 * L'indirizzo di quel server sta in una variabile e non scritto qui dentro
 * per due motivi. Il primo e' che oggi non serve: senza la variabile questo
 * file si comporta esattamente come prima. Il secondo e' che quell'indirizzo
 * NON puo' essere prestigerent.com -- il giorno del passaggio quel nome
 * punta a Vercel, e Vercel finirebbe per chiamare se' stesso all'infinito.
 * Va messo l'hostname diretto del vecchio hosting, o un sottodominio che
 * punta al suo IP.
 *
 * Si accetta il valore anche con https:// davanti e con la barra in fondo,
 * perche' e' come viene fuori copiandolo dalla barra del browser: senza
 * questa pulizia la destinazione diventerebbe https://https://... e ogni
 * landing risponderebbe errore.
 */
const hostLegacy = (process.env.LEGACY_HOST ?? '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

const nextConfig: NextConfig = {
  /* WordPress serve le pagine CON la barra finale: /tour/nome-tour/
     Next per default la toglie, e ogni indirizzo indicizzato risponderebbe
     308 invece di 200. Su 124 URL con anni di posizionamento non e' un
     dettaglio estetico: e' la regola numero uno della migrazione. */
  trailingSlash: true,

  images: {
    remotePatterns: [
      // le foto dei tour oggi stanno ancora su WordPress: si leggono da li'
      // finche' non sono state spostate su Supabase Storage
      { protocol: 'https', hostname: 'prestigerent.com' },
      { protocol: 'https', hostname: 'cdn.shortpixel.ai' },
      { protocol: 'https', hostname: 'oeipsfnbpaqkmwrxtcrn.supabase.co' },
    ],
  },
  /* I doppioni: due URL diverse per lo STESSO prodotto Regiondo.
     Non si cancellano -- esistono su WordPress da anni e sparire vorrebbe
     dire un 404 il giorno del passaggio -- si reindirizzano a quella buona
     con un 301, che e' anche il modo in cui si dice a Google quale delle due
     tenere. */
  async redirects() {
    return [
      {
        source: '/tour/siena-san-gimignano-the-tuscan-countryside-landing/',
        destination:
          '/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/',
        permanent: true,
      },
    ];
  },

  /* Senza LEGACY_HOST qui non nasce nessuna regola. E' voluto: finche' la
     variabile non c'e' -- cioe' oggi -- il sito si comporta come si e'
     sempre comportato, e non c'e' il rischio di regole a meta' che
     inoltrano da qualche parte che non esiste. Si accende aggiungendo la
     variabile su Vercel, il giorno del passaggio. */
  async rewrites() {
    if (!hostLegacy) return [];

    /* Due regole per cartella, e l'ordine conta. Con `trailingSlash: true`
       Next manda con un 308 ogni indirizzo senza estensione alla versione
       con la barra: chi chiede /myb arriva qui come /myb/. `/myb/:path*` lo
       prende lo stesso -- Next aggiunge da solo una barra finale opzionale
       a ogni `source` -- ma con la lista dei segmenti VUOTA, e la
       destinazione compilata diventerebbe .../myb, senza barra. Il vecchio
       server risponderebbe con un suo 301 verso .../myb/, e quel redirect
       arriva al browser: nella barra degli indirizzi comparirebbe
       l'hostname del vecchio hosting al posto di prestigerent.com, proprio
       davanti a chi ha appena pagato. La variante con la barra sta prima e
       si prende /myb/ e le sottocartelle conservando la barra; quella senza
       raccoglie i file, che la barra non ce l'hanno mai perche' Next
       gliela toglie (/lp/...-lan2.html, /lp/video/*.mp4, /lp/img/*). */
    const inoltra = (chiesto: string, sulVecchio: string) => [
      {
        source: `${chiesto}/:path*/`,
        destination: `https://${hostLegacy}${sulVecchio}/:path*/`,
      },
      {
        source: `${chiesto}/:path*`,
        destination: `https://${hostLegacy}${sulVecchio}/:path*`,
      },
    ];

    /* L'array semplice sono i rewrite "afterFiles": provati dopo i file
       veri e prima delle rotte dinamiche. Deve restare cosi'. Messi in
       `fallback` non scatterebbero mai, perche' prima passerebbe il
       catch-all /[locale]/[...percorso] -- e' esattamente lui che oggi
       risponde 404 sulle landing, con X-Matched-Path /[locale]/[...percorso]. */
    return [
      ...inoltra('/lp', '/lp'),
      ...inoltra('/myb', '/myb'),

      /* src/proxy.ts gira prima dei rewrite e mette davanti la lingua
         predefinita a tutto quello che non riconosce: quando la richiesta
         arriva qui non e' piu' /lp/tour.html ma /en/lp/tour.html. I .mp4 e
         i .jpg si salvano perche' il proxy li riconosce come file statici,
         l'.html no -- e sono proprio le quattro pagine su cui atterrano le
         campagne. Il prefisso viene tolto nella destinazione: sul vecchio
         hosting la cartella /en non esiste. ('en' e' DEFAULT_LOCALE di
         src/lib/locales.ts, ripetuto a mano perche' next.config non passa
         dall'alias @/.) La strada pulita e' escludere /lp e /myb nel proxy
         come gia' si fa per /admin e /auth: fatto quello, queste due righe
         diventano inutili e si possono togliere. */
      ...inoltra('/en/lp', '/lp'),
      ...inoltra('/en/myb', '/myb'),
    ];
  },

  async headers() {
    if (!noindex) return [];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
};

export default nextConfig;
