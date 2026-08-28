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

      /* ════════════════════════════════════════════════════════════════
         VENTI INDIRIZZI CHE OGGI RISPONDONO 200 SU prestigerent.com E CHE
         SUL SITO NUOVO NON ESISTONO.
         ════════════════════════════════════════════════════════════════

         Non sono pagine dimenticate: sono pagine che il sito nuovo ha
         deciso di non rifare (il carrello di WooCommerce, il Covid, le
         sitemap di Yoast) oppure categorie di WordPress che qui vivono a
         un altro indirizzo. In ogni caso, il giorno del passaggio
         risponderebbero 404 tutte insieme -- e un 404 non trasferisce
         niente, mentre un 301 porta a destinazione anche l'autorita'
         accumulata sull'indirizzo vecchio.

         `permanent: true` in Next vuol dire 308, non 301. Per Google e
         Bing i due sono la stessa cosa da anni (308 e' il 301 che non
         cambia il metodo della richiesta), e sono tutti GET: nessuna
         differenza pratica. Si tiene 308 anche per non avere due
         convenzioni diverse nello stesso file.

         La destinazione di ognuno e' motivata sulla riga sopra, e dove
         c'era da scegliere fra due pagine plausibili la scelta e' stata
         fatta guardando su Supabase DOVE STANNO DAVVERO quei tour
         (tabella `tour_categorie`), non a naso.

         🔴 UN CASO NON E' QUI, ED E' VOLUTO: la variante con le maiuscole
         di /tour/small-group-tour-to-Siena-San-Gimignano-.../. I `source`
         di Next e di Vercel NON distinguono le maiuscole -- verificato
         oggi con curl sul deploy pubblico chiedendo la regola qui sopra
         con una lettera cambiata, e ha risposto 308 lo stesso. Una regola
         scritta in maiuscolo prenderebbe quindi anche l'indirizzo in
         minuscolo, cioe' la pagina vera, e la manderebbe a se stessa:
         ciclo infinito sulla scheda che vale l'85% del fatturato. Il caso
         e' gestito dove il confronto fra stringhe e' vero, dentro
         src/app/[locale]/tour/[slug]/page.tsx, e li' vale per tutte e
         ottantasei le schede invece che per una sola.

         🔴 NON CI SONO /privacy-policy/, /cookie-policy/ e
         /terms-and-conditions/: quelle pagine si stanno scrivendo
         davvero. Un redirect messo qui le coprirebbe -- i redirect
         girano prima delle pagine -- e resterebbero irraggiungibili senza
         che nessuno capisca perche'.
         ──────────────────────────────────────────────────────────────── */

      /* IL VINO, CHE E' L'85% DEL FATTURATO.
         `wine-and-food-experiences` e' una categoria WooCommerce vera con
         dentro 7 tour, ma non e' fra le 35 di src/lib/categorie.ts.
         Controllato uno per uno su `tour_categorie`: tutti e 7 (Wine
         Experience, Wine & Food, Chianti privato, Montalcino, il mezzo
         giorno in Chianti e le due Siena-San Gimignano) stanno anche in
         `florence-tuscany`. Quindi /destinations/florence-tuscany/ e'
         l'unica pagina esistente che li contiene TUTTI. Le alternative
         perdevano pezzi: /small-group-tours/ ne ha solo 4 dei 7, e la
         home non e' una pagina di categoria. */
      { source: '/wine-and-food-experiences/', destination: '/destinations/florence-tuscany/', permanent: true },

      /* `other-tours` su WordPress ha dentro un tour solo (Tarquinia da
         Civitavecchia): e' il raccoglitore di cio' che non sta altrove.
         Il suo equivalente qui e' l'indice generale, che e' l'unica
         pagina che mostra tutto il catalogo. */
      { source: '/other-tours/', destination: '/tours-of-italy/', permanent: true },

      /* Due sottocategorie dei piccoli gruppi con dentro ESATTAMENTE gli
         stessi 4 tour di `small-group-tours` (verificato: le due liste
         coincidono). Erano un livello di menu in piu' che non filtrava
         niente: vanno alla pagina madre, che e' anche quella con piu'
         storia su Google. */
      { source: '/small-group-tours/florence/', destination: '/small-group-tours/', permanent: true },
      { source: '/small-group-tours/florence-and-tuscany-small-group-tours/', destination: '/small-group-tours/', permanent: true },

      /* Stessa storia sui privati: `florence-and-tuscany` ha 28 tour,
         esattamente quanti `private-tours`. */
      { source: '/private-tours/florence-and-tuscany/', destination: '/private-tours/', permanent: true },

      /* LE PAGINE DI SERVIZIO.
         Nessuna di queste esiste sul sito nuovo, e la piu' vicina e' la
         stessa per tutte: /about-us/ e' la pagina di identita' -- chi
         siamo, da quando, con che mezzi, i punteggi verificati e il
         modulo di contatto. Copre la domanda che si fa chi cercava le
         recensioni, i contatti o le rassicurazioni sulla sicurezza.
         Le FAQ generali non hanno una pagina propria: le risposte su
         disdetta, conferma e pagamento sono nelle schede tour e nella
         fascia di fiducia, che stanno anche su /about-us/. */
      { source: '/faqs/', destination: '/about-us/', permanent: true },
      /* /contact-us/ NON e' piu' un redirect: la pagina esiste, sta in
         src/app/[locale]/contact-us/page.tsx. Chi cerca "prestige rent
         contact" ha gia' deciso di scrivere, e mandarlo su /about-us/
         lo faceva ripartire da capo. */
      { source: '/reviews/', destination: '/about-us/', permanent: true },
      { source: '/security/', destination: '/about-us/', permanent: true },

      /* I mezzi: la flotta non ha piu' una pagina sua, ha una sezione
         nella home -- undici minibus, dieci Mercedes, le foto dei
         veicoli, con l'ancora #fleet gia' in pagina. Si manda li'
         direttamente al punto, non in cima. */
      { source: '/our-vehicles/', destination: '/#fleet', permanent: true },

      /* Il programma di affiliazione non esiste piu' come prodotto: chi
         ci arriva vuole parlare con qualcuno, e su /about-us/ c'e' il
         modulo. */
      { source: '/affiliate-program/', destination: '/about-us/', permanent: true },

      /* Il Covid nel 2026. La pagina e' stata tolta apposta anche dal
         piede (vedi il commento in src/components/Footer.tsx): su ogni
         pagina diceva "questa azienda non aggiorna il sito da cinque
         anni". Chi ci arriva da un link vecchio va alla home. */
      { source: '/covid-19/', destination: '/', permanent: true },

      /* WooCommerce: il carrello e la vetrina.
         Il carrello non ha equivalente -- qui si prenota dal calendario
         Regiondo dentro la scheda del tour -- e va alla home. La vetrina
         /shop/ era invece l'elenco di tutti i prodotti: il suo posto e'
         l'indice generale. */
      { source: '/cart/', destination: '/', permanent: true },
      { source: '/shop/', destination: '/tours-of-italy/', permanent: true },

      /* Il feed RSS di WordPress. Non c'e' un blog da alimentare: chi lo
         chiede e' un aggregatore, e va alla home. */
      { source: '/feed/', destination: '/', permanent: true },

      /* Un tour che su WordPress vive ANCHE alla radice, senza /tour/.
         Quello buono e' /tour/..., che e' la forma di tutte e ottantasei
         le schede ed e' quella nella sitemap. */
      { source: '/wine-food-experience-in-tuscany/', destination: '/tour/wine-food-experience-in-tuscany/', permanent: true },

      /* LE TRE SITEMAP DI YOAST. Le conosce Google, non un lettore: sono
         gli indirizzi da cui Search Console legge da anni. Qui la sitemap
         e' una sola, generata da src/app/sitemap.ts, e contiene tutto --
         home, /about-us/, le 35 categorie e gli 87 tour, con gli hreflang
         dentro. Lasciarle a 404 vorrebbe dire una sfilza di errori in
         Search Console proprio nella settimana del passaggio, cioe'
         quando serve poter distinguere i problemi veri. */
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/page-sitemap.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/product-sitemap.xml', destination: '/sitemap.xml', permanent: true },
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
      /* 🔴 LA REGOLA DELLA CARTELLA, SCRITTA PER ESTESO E PER PRIMA.
         Serve solo a /myb/ e /mp/: sono cartelle, e il vecchio server le
         vuole con la barra. Se arrivassero senza, risponderebbe con un suo
         301 verso la versione con la barra, e quel redirect arriva al
         browser: nella barra degli indirizzi comparirebbe l'hostname del
         vecchio hosting al posto di prestigerent.com, proprio davanti a
         chi ha appena pagato. Scritta senza `:path*` perche' un percorso
         esatto non e' ambiguo. */
      {
        source: `${chiesto}/`,
        destination: `https://${hostLegacy}${sulVecchio}/`,
      },
      /* TUTTO IL RESTO, SENZA BARRA IN FONDO.
         Prima qui c'era `${'${chiesto}'}/:path*​/` -- con la barra -- e stava
         PER PRIMA. Sembrava giusto e non lo era: Next aggiunge da se' una
         barra finale OPZIONALE a ogni `source`, quindi quella regola
         catturava anche gli indirizzi senza barra e compilava la
         destinazione CON la barra.
         Misurato il 27/08/2026 sul deploy pubblico:
             /lp/tasting-...-lan2.html  -> 404, 437.672 byte
         e il 404 di WordPress che tornava indietro dichiarava di aver
         ricevuto il nome del file con una barra attaccata in fondo.
         Sarebbero saltate insieme le quattro landing delle campagne
         (3.645 euro al mese), il logo su tutte e 123 le pagine, la foto
         grande della home e jQuery, da cui dipende il JavaScript delle
         landing. Nessuna di queste cose si vede provando il sito, perche'
         senza LEGACY_HOST le regole non nascono nemmeno. */
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

      /* 🔴 LE FOTO. Tutte e 794 le immagini dei tour -- 87 schede su 87,
         piu' la home e ogni griglia di categoria -- hanno l'indirizzo
         scritto per esteso su prestigerent.com/wp-content/. Non passano da
         next/image: sono <img> normali, quindi a chiederle e' il browser.
         Oggi funziona perche' quel nome e' ancora WordPress. Il giorno del
         passaggio quel nome e' QUESTO sito, che /wp-content/ non ce l'ha:
         senza queste due righe il sito va online e ogni pagina e' testo su
         fondo bianco. E non lo si scopre provando, perche' in prova
         funziona tutto -- e' la stessa forma d'errore del noindex.
         La toppa regge finche' i media non sono su Supabase Storage.

         /wp-includes serve alle landing, che da li' prendono jQuery: senza,
         il loro JavaScript si rompe a catena. */
      ...inoltra('/wp-content', '/wp-content'),
      ...inoltra('/wp-includes', '/wp-includes'),

      /* /mp/ e' la pagina del punto d'incontro, ed e' linkata da due posti
         che contano: dal piede di /myb/ -- cioe' da chi ha appena pagato e
         sta cercando dove ci si vede -- e da dentro il testo di quattro
         schede tour, fra cui le due Siena/San Gimignano che valgono l'85%
         del fatturato. Sul sito nuovo non esiste e nessuno l'aveva
         prevista: senza questa riga, il giorno del passaggio chi ha pagato
         cerca l'appuntamento e trova un errore. */
      ...inoltra('/mp', '/mp'),

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
      ...inoltra('/en/mp', '/mp'),
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
