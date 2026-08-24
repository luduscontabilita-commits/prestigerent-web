import { LOCALES, DEFAULT_LOCALE, getLocale } from './locales';

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
    foundingDate: '2002',
    description:
      'Tours and private transfers across Italy with our own fleet and our own English-speaking drivers, based in Florence since 2002.',
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
  ore?: number | null;
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
  /* Durata in formato ISO 8601: 8 ore -> PT8H */
  if (opts.ore) t.subjectOf = { '@type': 'CreativeWork', abstract: `${opts.ore} hours` };
  if (opts.prezzo != null) {
    t.offers = {
      '@type': 'Offer',
      price: opts.prezzo.toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: opts.url,
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

export function hreflangDi(path: (locale: string) => string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l.htmlLang] = SITE + path(l.code);
  languages['x-default'] = SITE + path(DEFAULT_LOCALE);
  return languages;
}
