import { LOCALES, DEFAULT_LOCALE, PIU_LINGUE, getLocale } from './locales';
import { ANNO_FONDAZIONE } from './anni';

export const SITE = 'https://prestigerent.com';

/* Un solo `@id` per entita', riusato ovunque per riferimento (§7.3 del
 * masterplan). Ridefinire l'Organization su 124 pagine non la rafforza: la
 * moltiplica, e per una macchina diventano entita' diverse.
 *
 * Gli LLM non raccomandano URL, raccomandano ENTITA'. Se "Prestige Rent" non
 * e' un'entita' stabile e disambiguata, il modello non ha nulla da nominare.
 */
export const ORG_ID = `${SITE}/#organization`;

/* `sameAs` e' il modo in cui si dice a una macchina "questi profili sono la
 * stessa entita'". Solo profili verificati: uno sbagliato confonde invece di
 * chiarire. Wikidata, LinkedIn e Trustpilot mancano ancora -- vedi §6.2. */
const SAME_AS = [
  'https://www.tripadvisor.com/Attraction_Review-g187895-d2157589-Reviews-Prestige_Rent-Florence_Tuscany.html',
  'https://www.getyourguide.com/prestige-rent-tours-in-italy-s8058/',
  'https://www.facebook.com/prestigerent/',
];

export function organization() {
  return {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: 'Prestige Rent',
    url: `${SITE}/`,
    /* Non scritto a mano: e' la stessa cifra che vede il sito. Un
     * `foundingDate` che smentisce il "since" stampato in pagina e' il
     * genere di incoerenza che una macchina nota subito. */
    foundingDate: String(ANNO_FONDAZIONE),
    description:
      `Tours and private transfers across Italy with our own fleet and our own English-speaking drivers, based in Florence since ${ANNO_FONDAZIONE}.`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Della Saggina 98',
      addressLocality: 'Florence',
      addressRegion: 'Tuscany',
      postalCode: '50145',
      addressCountry: 'IT',
    },
    telephone: '+39-055-286059',
    email: 'usa@prestigerent.com',
    areaServed: [
      { '@type': 'City', name: 'Florence' },
      { '@type': 'City', name: 'Siena' },
      { '@type': 'City', name: 'Livorno' },
      { '@type': 'City', name: 'La Spezia' },
      { '@type': 'City', name: 'Civitavecchia' },
      { '@type': 'AdministrativeArea', name: 'Tuscany' },
    ],
    knowsLanguage: ['en', 'de', 'it'],
    sameAs: SAME_AS,
  };
}

/* Le briciole di pane servono su OGNI pagina (§7.1). Non sono decorazione:
 * dicono alla macchina dov'e' la pagina nella gerarchia, ed e' quello che
 * permette di rispettare "mai piu' di 3 clic dalla home" (§8.2). */
export function breadcrumb(locale: string, parti: { nome: string; path: string }[]) {
  const base = locale === DEFAULT_LOCALE ? SITE : `${SITE}/${locale}`;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: parti.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nome,
      item: `${base}${p.path}`,
    })),
  };
}

/* `TouristTrip` e' il tipo giusto per un tour, non `Product` (§7.1).
 * `LimoService`, che girava nel documento di partenza, NON esiste su
 * schema.org: un tipo inventato viene ignorato e a volte invalida l'intero
 * blocco JSON-LD. */
export function touristTrip(opts: {
  nome: string;
  descrizione?: string;
  url: string;
  locale: string;
  immagini?: string[];
  prezzo?: number | null;
  durata?: string | null;
  tappe?: string[];
}) {
  const t: Record<string, unknown> = {
    '@type': 'TouristTrip',
    name: opts.nome,
    url: opts.url,
    inLanguage: getLocale(opts.locale).htmlLang,
    provider: { '@id': ORG_ID },
  };
  if (opts.descrizione) t.description = opts.descrizione;
  if (opts.immagini?.length) t.image = opts.immagini.slice(0, 6);
  /* La durata arriva gia' scritta per il lettore ("15 minutes", "8 hours"):
     la costruisce `durataInParole` in regiondo.ts, che l'unita' di Magento
     la legge davvero. Qui si ricopia, non si reinterpreta. */
  if (opts.durata) t.subjectOf = { '@type': 'CreativeWork', abstract: opts.durata };
  if (opts.prezzo != null) {
    t.offers = {
      '@type': 'Offer',
      price: opts.prezzo.toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: opts.url,
      /* Lo aveva il WordPress e qui mancava: senza, l'offerta risulta
         incompleta. Vedi `fraUnAnno()` in fondo al file. */
      priceValidUntil: fraUnAnno(),
      seller: { '@id': ORG_ID },
    };
  }
  if (opts.tappe?.length) {
    t.itinerary = {
      '@type': 'ItemList',
      itemListElement: opts.tappe.map((nome, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: { '@type': 'TouristAttraction', name: nome },
      })),
    };
  }
  return t;
}

/* Un solo blocco JSON-LD per pagina, con @graph: piu' blocchi separati sono
 * piu' difficili da validare e non aggiungono nulla. */
export function grafo(nodi: unknown[]) {
  return { '@context': 'https://schema.org', '@graph': nodi };
}

/* 🔴 Restituisce l'oggetto `alternates` INTERO, canonical compreso.
 *
 * Prima restituiva solo la mappa delle lingue, e due pagine su tre la
 * passavano cosi' com'era a `alternates:`. Next accetta senza protestare
 * le chiavi che non conosce -- `Metadata['alternates']` non e' un tipo
 * chiuso -- quindi TypeScript non diceva niente, non c'era nessun errore
 * a video, e il risultato era che home, /about-us/ e tutte e 35 le
 * categorie uscivano SENZA canonical e SENZA hreflang. Verificato con
 * curl: il canonical c'era solo sulle 86 schede tour, che erano le uniche
 * a comporre l'oggetto a mano.
 *
 * Ora la funzione restituisce la forma giusta e basta: chi la usa non
 * puo' piu' sbagliarsi, perche' non c'e' piu' un passaggio da fare.
 * Il parametro e' la funzione che, data una lingua, dice a che indirizzo
 * sta quella pagina in quella lingua. */
/* 🔴 CON UNA LINGUA SOLA GLI HREFLANG NON SI SCRIVONO, IL CANONICAL SI'.
 *
 * Un cluster hreflang che punta solo a se stesso non dice niente a Google:
 * e' rumore, e per un periodo ha detto anche una bugia -- collegava /de/ e
 * /it/ come traduzioni di pagine che erano lo stesso testo inglese.
 * Il canonical invece serve SEMPRE, ed e' proprio il motivo per cui questa
 * funzione esiste (vedi la nota qui sopra): senza, home, /about-us/ e le 35
 * categorie tornerebbero a uscire senza. Quindi qui sotto cade `languages`,
 * mai `canonical`.
 *
 * Il giorno che si riaccende una lingua in `LINGUE_ATTIVE` gli hreflang
 * tornano da soli, bidirezionali e con x-default, senza toccare niente. */
export function hreflangDi(
  path: (locale: string) => string,
  locale: string = DEFAULT_LOCALE
) {
  const canonical = SITE + path(locale);
  if (!PIU_LINGUE) return { canonical };

  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.htmlLang] = SITE + path(l.code);
  languages['x-default'] = SITE + path(DEFAULT_LOCALE);
  return { canonical, languages };
}

/* ─────────────────────────────────────────────────────────────────────
   DA QUI IN GIU': I NODI AGGIUNTI PER LA GALLERIA DEI RISULTATI
   ARRICCHITI DI GOOGLE.
   ───────────────────────────────────────────────────────────────────── */

/* `priceValidUntil` vuole una data, e il vecchio sito ce l'aveva. Senza,
 * Search Console segnala l'offerta come incompleta; con una data nel
 * PASSATO Google smette proprio di mostrare il prezzo -- che e' peggio di
 * non averla messa.
 *
 * Si calcola a un anno da oggi e non si scrive a mano proprio per questo:
 * una costante scritta nel codice scade in silenzio, e nessuno se ne
 * accorge finche' il prezzo non e' gia' sparito dallo snippet. Le pagine
 * si rigenerano ogni ora (`revalidate = 3600`), quindi la data resta
 * sempre a dodici mesi di distanza da sola. */
export function fraUnAnno(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/* 🔴 `Product` IN PARALLELO A `TouristTrip`, NELLO STESSO @graph.
 *
 * `TouristTrip` e' il tipo semanticamente giusto per una gita, e resta.
 * Ma **non e' nella galleria dei risultati arricchiti di Google**: con
 * quello soltanto, nello snippet non compaiono ne' il prezzo ne' le
 * stelle. Il WordPress che stiamo sostituendo usava `Product` + `Offer` e
 * nella galleria ci arrivava: passare al tipo "piu' corretto" senza
 * questo nodo vorrebbe dire vincere la disputa semantica e perdere il
 * prezzo nello snippet su ottantasei pagine.
 *
 * Due tipi per la stessa cosa dentro un solo `@graph` sono leciti -- e'
 * esattamente a questo che serve `@graph` -- e hanno `@id` diversi, quindi
 * per una macchina non sono un doppione ma due descrizioni della stessa
 * pagina.
 *
 * 🔴 `aggregateRating` SI COSTRUISCE SOLO DAI NUMERI CHE STANNO SCRITTI
 * SULLA PAGINA. Non e' scrupolo: le linee guida di Google dicono che il
 * voto dev'essere visibile al lettore, e un voto dichiarato solo nel
 * JSON-LD e' motivo di penalizzazione manuale. Chi chiama passa `voto` e
 * `quante` SOLO quando li sta anche stampando; se non li stampa, passa
 * null e il nodo esce senza stelle. */
export function product(opts: {
  nome: string;
  descrizione?: string;
  url: string;
  immagini?: string[];
  prezzo?: number | null;
  /** il voto STAMPATO sulla pagina, o null se la pagina non lo mostra */
  voto?: number | null;
  /** quante recensioni, STAMPATE sulla pagina */
  quante?: number | null;
}) {
  const p: Record<string, unknown> = {
    '@type': 'Product',
    /* `@id` diverso da quello del TouristTrip: sono due nodi, non uno
       ripetuto due volte. */
    '@id': `${opts.url}#product`,
    name: opts.nome,
    url: opts.url,
    brand: { '@id': ORG_ID },
  };
  if (opts.descrizione) p.description = opts.descrizione;
  if (opts.immagini?.length) p.image = opts.immagini.slice(0, 6);

  if (opts.prezzo != null) {
    p.offers = {
      '@type': 'Offer',
      price: opts.prezzo.toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: opts.url,
      priceValidUntil: fraUnAnno(),
      seller: { '@id': ORG_ID },
    };
  }

  /* `reviewCount` sotto 1 non e' un dato, e' un campo vuoto: Google
     scarta l'intero nodo se il conteggio non e' positivo. */
  if (opts.voto != null && opts.quante != null && opts.quante > 0) {
    p.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: opts.voto,
      reviewCount: opts.quante,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return p;
}

/* Il nodo `WebSite`: dice a una macchina che le 123 pagine sono UN sito
 * con un nome, e non 123 documenti sciolti che capitano sullo stesso
 * dominio. Va in coppia con `Organization`, a cui rimanda per `@id`
 * invece di ridescriverla. */
export function sitoWeb(locale: string = DEFAULT_LOCALE) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: `${SITE}/`,
    name: 'Prestige Rent',
    inLanguage: getLocale(locale).htmlLang,
    publisher: { '@id': ORG_ID },
  };
}
