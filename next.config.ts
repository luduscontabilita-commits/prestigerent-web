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
      /* ════════════════════════════════════════════════════════════════
         IL SITO RISPONDE A DUE INDIRIZZI DIVERSI: SE NE CHIUDE UNO.
         ════════════════════════════════════════════════════════════════

         Ogni progetto Vercel ha, oltre al dominio vero, un indirizzo
         tecnico -- qui `prestigerent-web.vercel.app`. Non e' un ambiente
         di prova: e' LA STESSA identica produzione, servita con un altro
         nome. Verificato, rispondeva 200 con `Allow: /` nel robots.

         Sono 124 pagine duplicate. C'e' gia' il `<link rel="canonical">`
         che indica prestigerent.com, ma il canonical e' un consiglio che
         Google puo' ignorare: la forma che non si discute e' il 308.

         🔴 QUESTA REGOLA TOCCA SOLO QUELL'HOST. `has` confronta il nome
         per intero: su prestigerent.com e www.prestigerent.com non si
         attiva mai, e non c'e' modo che il sito rimandi a se' stesso.
         Le anteprime di Vercel (nomi tipo `prestigerent-web-abc123...`)
         restano raggiungibili: hanno un altro nome, e Vercel ci mette da
         solo il noindex. */
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'prestigerent-web.vercel.app' }],
        destination: 'https://prestigerent.com/:path*',
        permanent: true,
      },

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

      /* 🔴 QUI C'ERA UN REDIRECT DA /wine-and-food-experiences/ VERSO
         /destinations/florence-tuscany/, ed e' stato tolto il 28/08/2026.
         La categoria esiste di nuovo (src/lib/categorie.ts): era una voce
         principale del menu di WordPress con una pagina sua, e mandarla
         altrove faceva sparire dal sito la parola con cui questa azienda
         viene cercata. Un redirect messo per semplificare non deve
         cancellare la categoria che vale l'85% del fatturato. */

      /* `other-tours` su WordPress ha dentro un tour solo (Tarquinia da
         Civitavecchia): e' il raccoglitore di cio' che non sta altrove.
         Il suo equivalente qui e' l'indice generale, che e' l'unica
         pagina che mostra tutto il catalogo. */
      { source: '/other-tours/', destination: '/tours-of-italy/', permanent: true },

      /* IL VECCHIO PERMALINK DI WOOCOMMERCE.
         Fino a oggi le categorie vivevano a due indirizzi: la forma
         pulita (`/cruise-port-tours/`) e quella con il prefisso
         (`/categoria-prodotto/cruise-port-tours/`). WordPress rimandava
         la seconda alla prima con un 301 suo, e nella sitemap di Yoast
         ci sono ancora TRENTA di quegli indirizzi -- che Google conosce.
         Quel redirect vive dentro WordPress: il giorno che lo si spegne
         sparisce, e quelle trenta diventano altrettanti 404 su URL che
         Google ha in indice da anni. Qui si rifa' la stessa cosa, una
         regola per tutte, cosi' non dipende piu' da lui. */
      /* 🔴 LA BARRA IN FONDO ALLA DESTINAZIONE NON E' UN DETTAGLIO.
         Senza, il redirect manda a `/destinations/florence-tuscany` e
         `trailingSlash: true` deve rimediare con un SECONDO 308. Due
         salti invece di uno su tutti e trenta gli indirizzi che Google
         conosce da anni: ogni salto in piu' e' autorita' che si disperde
         e tempo di scansione buttato. */
      { source: '/categoria-prodotto/:path*', destination: '/:path*/', permanent: true },

      /* Il singolare girava su materiali stampati prima che WordPress lo
         correggesse con un suo 301: qui si rifa' la stessa cosa, perche'
         quel 301 muore insieme a WordPress. */
      { source: '/guest-album/', destination: '/guest-albums/', permanent: true },

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
      /* 🔴 /faqs/ NON e' piu' un redirect: la pagina esiste, con tutte e
         145 le domande del vecchio sito. Mandarle su /about-us/ voleva
         dire far sparire il corpo di contenuto piu' grosso del sito. */
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
      /* ════════════════════════════════════════════════════════════════
         🔴 OTTANTASEI INDIRIZZI CHE IL 28 AGOSTO HANNO COMINCIATO A DARE 404.
         ════════════════════════════════════════════════════════════════

         `/product/<slug>/` e' il permalink di WooCommerce. Non e' un
         indirizzo morto: su WordPress rispondeva 301 verso
         `/tour/<slug>/` -- verificato su piu' slug -- quindi e' vivo da
         anni, e' linkato dall'esterno e ha accumulato autorita'.

         Quel 301 pero' viveva DENTRO WordPress ed e' morto con lui: dal
         giorno del passaggio tutti e ottantasei rispondono 404. E' lo
         stesso identico caso di `/categoria-prodotto/` qui sopra, che era
         stato previsto; questo no, perche' non compare in nessuna
         sitemap -- ed e' proprio per questo che nessun inventario lo
         aveva visto.

         Un 404 non trasferisce niente. Ogni giorno che resta cosi' e'
         posizionamento che si perde su indirizzi che valgono. */
      /* Con la barra in fondo, come per `/categoria-prodotto/` qui sopra:
         senza, `trailingSlash` deve rimediare con un secondo 308 e
         ottantasei indirizzi storici farebbero due salti invece di uno. */
      { source: '/product/:path*', destination: '/tour/:path*/', permanent: true },

      /* LA PAGINAZIONE DI WORDPRESS.
         `/categoria-prodotto/<cat>/page/2/`, `/shop/page/2/` e `/page/2/`
         rispondevano 200 con canonical proprio, quindi erano indicizzabili
         e sono in indice. Sul sito nuovo le categorie non sono paginate:
         la pagina intera esiste una volta sola. Si mandano tutte alla
         pagina senza numero, che e' dove sta ora quel contenuto.

         L'ordine conta: queste tre regole devono stare PRIMA di quelle
         generiche, altrimenti `/categoria-prodotto/:path*` cattura anche
         `page/2` e produce un indirizzo inesistente. */
      { source: '/categoria-prodotto/:cat*/page/:n', destination: '/:cat*/', permanent: true },
      { source: '/shop/page/:n', destination: '/tours-of-italy/', permanent: true },
      { source: '/page/:n', destination: '/', permanent: true },

      /* L'indice nudo dei tour: su WordPress rimandava a caso alla prima
         scheda, qui va dove ha senso. */
      { source: '/tour/', destination: '/tours-of-italy/', permanent: true },

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
      /* La quarta figlia di Yoast, dimenticata: elencava le 30 pagine di
         categoria e Search Console la conosce. */
      { source: '/product_cat-sitemap.xml', destination: '/sitemap.xml', permanent: true },
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

      /* 🔴 `/booking/` — SEGNALATO DA VIOLETA IL 30/08/2026, ROTTO.
         E' il link che l'ufficio manda ai clienti per far prenotare: non
         era nell'elenco delle pagine del vecchio host perche' non l'aveva
         nominato nessuno, e dal passaggio rispondeva 404. Chi lo riceveva
         non poteva prenotare, e nessuno di noi lo sapeva.
         Sul vecchio server c'e' ancora e risponde 200: si inoltra li',
         esattamente com'era. Non e' la soluzione definitiva — va rifatta
         come pagina del sito nuovo — ma rimette in piedi il link adesso,
         senza toccare niente altro. */
      ...inoltra('/booking', '/booking'),

      /* 🔴 IL MODULO DI /booking/ NON BASTA CHE SI APRA: DEVE POTER PARTIRE.
         La pagina e' un FluentForms di WordPress e spedisce in POST su
         `prestigerent.com/wp-admin/admin-ajax.php`. Quell'indirizzo sul
         sito nuovo non esiste: verificato il 30/08/2026, HTTP 404. Quindi
         anche rimessa in piedi la pagina, il cliente compilava tutto,
         premeva invia e non succedeva niente — senza nemmeno un errore.
         Peggio del 404 di prima, perche' l'errore era invisibile.

         Si inoltra SOLO `admin-ajax.php`, non tutta `/wp-admin/`: la
         bacheca di WordPress sotto prestigerent.com non ci deve stare.
         Stesso criterio per `/wp-json/`: passa solo il pezzo di
         FluentForms, non l'intera API — da `/wp-json/wp/v2/users` si
         legge l'elenco degli utenti, ed e' gia' una voce aperta nella
         lista della sicurezza. */
      {
        source: '/wp-admin/admin-ajax.php',
        destination: `https://${hostLegacy}/wp-admin/admin-ajax.php`,
      },
      {
        source: '/wp-json/fluentform/:path*',
        destination: `https://${hostLegacy}/wp-json/fluentform/:path*`,
      },

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

      /* 🔴 GLI ALBUM DELLE FOTO, CHE NESSUN INVENTARIO AVEVA CENSITO.
         `/guest-albums/?code=XXXX` e' il link che l'ospite riceve dopo il
         tour -- sul voucher, per email, sul cartoncino -- per scaricare le
         foto che la guida gli ha fatto. La pagina esiste su WordPress dal
         7/10/2024 e contiene una riga sola: lo script di Fotaflo, che
         legge il `code` dall'indirizzo e mostra l'album.
         Non era in nessuna sitemap ne' in nessun menu -- si raggiunge solo
         per link diretto -- e per questo era sfuggita a tutti i controlli
         del passaggio. Dal momento in cui il dominio e' passato a Vercel
         quel link dava 404, e a vederlo era solo l'ospite col voucher in
         mano: nessun avviso, nessun errore in Search Console.
         DEVE restare su prestigerent.com e non diventare un redirect:
         Fotaflo serve lo script solo se il referer e' esattamente quel
         dominio -- misurato, da www o da legacy risponde 401. */
      ...inoltra('/guest-albums', '/guest-albums'),

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
      ...inoltra('/en/guest-albums', '/guest-albums'),
      ...inoltra('/en/lp', '/lp'),
      ...inoltra('/en/myb', '/myb'),
    ];
  },

  async headers() {
    /* LE LANDING DELLE CAMPAGNE NON VANNO SU GOOGLE.
     *
     * `/lp/*` sono le pagine su cui atterrano gli annunci a pagamento:
     * `tasting-experience-in-tuscany-lan2.html` e la gemella di Siena e
     * San Gimignano, servite dal vecchio host attraverso i rewrite.
     * Dicono le stesse cose delle schede tour con parole quasi uguali, e
     * finche' restano indicizzabili le due versioni si contendono la
     * stessa ricerca: Google ne sceglie una e nel dubbio penalizza
     * entrambe. E' lo stesso difetto che aveva la pagina
     * `-landing` di WordPress, che il passaggio ha gia' chiuso.
     *
     * Il noindex NON tocca gli annunci: Google Ads porta traffico su una
     * pagina anche se e' esclusa dai risultati non pagati. Sono due cose
     * diverse e questa e' esattamente la configurazione che si consiglia
     * per le pagine pubblicitarie.
     *
     * Questa regola vale SEMPRE, anche a sito pubblicato -- percio' sta
     * prima del `return []` di `noindex`. */
    const soloLanding = [
      {
        source: '/lp/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      /* 🔴 `/mp/` MANCAVA, ed era l'unica pagina del vecchio host rimasta
         indicizzabile: rispondeva 200 senza nessun X-Robots-Tag. E' la
         pagina del punto d'incontro, e' linkata da `/myb/` e da quattro
         schede tour, ed e' contenuto sottile che ripete informazioni
         gia' presenti nelle schede -- cioe' esattamente la cosa che
         compete con loro nella stessa ricerca. */
      {
        source: '/mp/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];

    /* ════════════════════════════════════════════════════════════════
       GLI HEADER DI SICUREZZA, SU OGNI PAGINA E SEMPRE.
       ════════════════════════════════════════════════════════════════

       Prima di oggi il sito non ne mandava nessuno: misurato con
       `curl -sI https://prestigerent.com/`, l'unico presente era
       `Strict-Transport-Security`, che ci mette Vercel da solo.

       🔴 DA LEGGERE PRIMA DI TOCCARE QUESTO ELENCO: queste righe valgono
       ANCHE per le pagine che NON sono di questo progetto. `/lp/`,
       `/myb/`, `/mp/` e `/guest-albums/` sono HTML del vecchio WordPress
       che arrivano qui attraverso i rewrite piu' sopra, e Next applica
       gli header sul percorso CHIESTO, non su chi ha risposto.
       Verificato: `curl -sI https://prestigerent.com/lp/` restituisce il
       nostro `X-Robots-Tag` su un 404 di WordPress. Quindi ogni header
       messo qui deve reggere anche su quelle quattro pagine, che nessuno
       di noi ha scritto e su cui c'e' dentro di tutto (Cookiebot, Hotjar,
       GTM, Facebook, lo script di Fotaflo, script in linea ovunque).
       ──────────────────────────────────────────────────────────────── */
    const sicurezza = [
      {
        source: '/:path*',
        headers: [
          /* Il browser deve fidarsi del Content-Type dichiarato e non
             indovinare da solo guardando i primi byte. Senza questo, un
             file caricato come immagine ma che dentro contiene HTML puo'
             finire eseguito come pagina sul nostro dominio. Non ha
             controindicazioni: si rompe solo cio' che era gia' servito
             col tipo sbagliato. */
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          /* ── REFERRER-POLICY, IL PUNTO PIU' DELICATO ──────────────
             Il vincolo e' che il referer CONTINUI ad arrivare ai domini
             esterni: se sparisce, Google Ads e Meta perdono
             l'attribuzione e le conversioni si smettono di contare.

             `strict-origin-when-cross-origin` manda a un dominio
             esterno l'origine -- `https://prestigerent.com/` -- e non il
             percorso completo. Il referer c'e', ed e' quello che serve:
             chi lo controlla, controlla il DOMINIO. Vale in particolare
             per Fotaflo, che serve lo script degli album solo se il
             referer e' prestigerent.com (da www o da legacy risponde
             401): l'origine soddisfa quel controllo. Google Ads, GA4 e
             il pixel Meta non si appoggiano al referer per l'URL di
             pagina -- se lo mandano da soli nel proprio payload -- e
             il `gclid` viaggia nell'indirizzo, non qui.

             Perche' proprio questo valore e non un altro: e' GIA' il
             default di Chrome, Firefox e Safari. Cioe' e' esattamente
             il comportamento che il sito ha oggi, mentre le campagne
             funzionano. Scriverlo non cambia niente per i browser
             moderni -- copre quelli vecchi e rende esplicita una scelta
             che oggi e' in mano al browser.

             🔴 NON metterlo a `no-referrer` ne' a `same-origin`: quelli
             tolgono il referer ai domini esterni ed e' esattamente il
             modo di spegnere l'attribuzione. E nemmeno a
             `no-referrer-when-downgrade` o `unsafe-url`, che mandano
             fuori il percorso completo di ogni pagina: piu' permissivi
             di oggi, senza guadagnarci niente. */
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          /* ── CHI PUO' METTERE IL NOSTRO SITO DENTRO UN IFRAME ─────
             Attenzione a non confondere i due versi. Questi due header
             dicono chi puo' incorniciare NOI. Non toccano in alcun modo
             gli iframe che siamo NOI a incorporare: il calendario
             Regiondo, lo script Fotaflo su /guest-albums/ e il player
             YouTube di `Esperienza.tsx` continuano a funzionare
             identici, perche' li' l'iframe e' figlio, non padre.

             `SAMEORIGIN` e non `DENY`: DENY vieta l'iframe anche a noi
             stessi, e le quattro pagine del vecchio host che passano di
             qui non sono state scritte da noi. Il costo di sbagliare in
             quella direzione e' una pagina bianca davanti a chi ha
             appena pagato; il guadagno rispetto a SAMEORIGIN, in pratica
             nessuno.

             Che SAMEORIGIN vada bene su quelle pagine non e' una
             supposizione: `/myb/` lo manda GIA' per conto suo -- si vede
             con `curl -sI https://prestigerent.com/myb/` -- da prima di
             questa modifica, ed e' lo stesso valore, quindi nemmeno un
             doppione discorde.

             I due header dicono la stessa cosa a browser diversi:
             `X-Frame-Options` e' quello vecchio e universale,
             `frame-ancestors` e' quello standard e controlla tutta la
             catena degli iframe annidati, non solo il primo.

             🔴 QUESTA `Content-Security-Policy` CONTIENE DI PROPOSITO
             UNA SOLA DIRETTIVA. Non e' una CSP a meta' da completare:
             senza `default-src` non limita ne' script ne' connessioni,
             quindi non puo' rompere il tracciamento. Chi passasse di qui
             ad aggiungere `script-src` legga prima il blocco qui sotto. */
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },

          /* ── PERMISSIONS-POLICY: SOLO CIO' CHE NON SERVE DAVVERO ──
             Elencate le funzioni del browser che questo sito non usa in
             nessuna pagina (cercate: nel codice non compaiono ne'
             `geolocation` ne' `getUserMedia`). Un header che le nega e'
             una rete di sicurezza per il giorno in cui uno script di
             terze parti dentro GTM provasse a chiederle.

             🔴 COSA MANCA DALL'ELENCO, E PERCHE' DEVE CONTINUARE A
             MANCARE. Questo header e' un tetto: cio' che nega qui non
             puo' essere riconcesso dall'attributo `allow` di un iframe.

             - `payment` NON e' elencato. Il calendario Regiondo incassa
               dentro un iframe, e Apple Pay e Google Pay passano dalla
               Payment Request API. Negarlo qui vorrebbe dire togliere
               metodi di pagamento senza accorgersene, e l'errore si
               vedrebbe solo nel fatturato.
             - `autoplay` NON e' elencato: i video delle testimonianze e
               il player partono da soli.
             - `accelerometer` e `gyroscope` NON sono elencati: l'iframe
               di YouTube in `Esperienza.tsx` li chiede esplicitamente
               nel suo `allow`.
             - `browsing-topics` NON e' elencato: e' un segnale
               pubblicitario di Google, non un rischio di sicurezza, e
               qui si comprano annunci. */
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), usb=(), serial=(), midi=()',
          },

          /* ════════════════════════════════════════════════════════════
             LA CONTENT-SECURITY-POLICY COMPLETA NON C'E', ED E' UNA
             DECISIONE, NON UNA DIMENTICANZA.
             ════════════════════════════════════════════════════════════

             Una CSP vera (`default-src`/`script-src`/`connect-src`)
             sarebbe l'header piu' utile dell'elenco. Qui non si puo'
             scrivere in modo sicuro, per tre motivi indipendenti: ne
             basterebbe uno.

             1. I TAG STANNO DENTRO GTM, NON NEL REPO. Il contenitore
                `GTM-TL7VV3RL` carica Google Ads, Analytics, il pixel
                Meta e Clarity, e l'elenco lo decide chi amministra GTM
                -- che non e' chi scrive questo file. Una `script-src`
                congelata oggi vieterebbe il tag aggiunto domani da
                un'altra persona, in un'altra interfaccia. Il guasto
                arriverebbe settimane dopo la modifica, non ci sarebbe
                nessun errore visibile in pagina, e il sintomo sarebbe
                soltanto le conversioni che calano: la forma d'errore
                piu' cara e piu' lenta da diagnosticare che questo
                progetto possa produrre.

             2. GTM SI CARICA CON UNO SCRIPT IN LINEA.
                `src/components/Tracciamento.tsx` lo inietta con
                `<Script id="gtm">` e contenuto in linea. Senza
                `'unsafe-inline'` -- oppure senza un nonce propagato dal
                middleware a ogni risposta, che oggi non c'e' -- quello
                script non parte, e con lui non parte NIENTE del
                tracciamento. Ma una `script-src` con `'unsafe-inline'`
                non protegge quasi da nulla: si pagherebbe il rischio
                senza incassare il beneficio.

             3. LE PAGINE DEL VECCHIO HOST. Come scritto in cima, questi
                header valgono anche su `/lp/`, `/myb/`, `/mp/` e
                `/guest-albums/`, che sono HTML di WordPress pieno di
                script in linea, piu' Cookiebot, Hotjar e Fotaflo. Una
                CSP li spegnerebbe in blocco: sono le landing da 3.977
                click al mese, la pagina dei biglietti e quella del punto
                d'incontro.

             E perche' nemmeno in `Content-Security-Policy-Report-Only`:
             quella modalita' serve se qualcuno LEGGE i rapporti, cioe'
             se esiste un `report-uri` che li raccoglie. Qui non c'e' un
             endpoint che li riceva, quindi l'unico effetto sarebbe
             riempire la console dei visitatori di violazioni che nessuno
             guarda -- rumore, non sicurezza -- con in piu' il rischio
             che qualcuno in futuro tolga `-Report-Only` credendo di
             attivare una regola gia' collaudata.

             QUANDO SI POTRA' FARE, e in che ordine: prima si sposta il
             caricamento di GTM su un nonce generato nel proxy
             (`src/proxy.ts`), poi si mette la CSP in Report-Only con un
             endpoint che raccolga davvero, si lascia girare un mese
             sotto traffico vero -- comprese le landing a pagamento e un
             pagamento 3DS completo, che rimbalza sul dominio della banca
             e non su uno prevedibile -- e solo allora si toglie
             `-Report-Only`. Non e' un lavoro da fare insieme al
             passaggio del dominio. */
        ],
      },
    ];

    /* Finche' il sito e' in prova, l'intero dominio e' escluso.
       Gli header di sicurezza valgono in tutti e due i casi: non
       dipendono dall'indicizzazione. */
    if (!noindex) return [...soloLanding, ...sicurezza];
    return [
      ...soloLanding,
      ...sicurezza,
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
