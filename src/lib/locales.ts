/* Le lingue del sito: inglese alla radice, tedesco e italiano in sottocartella.
 *
 * Erano otto. Il masterplan §5.5 le vieta: "10 lingue mediocri battute da 3
 * lingue eccellenti, sempre", e l'anti-pattern #10 e' letteralmente "aprire
 * 8 lingue insieme". La sequenza del documento e' EN -> DE -> IT, e un
 * mercato nuovo si apre solo quando il precedente ha almeno 20 pagine
 * indicizzate con impression stabili.
 *
 * L'inglese resta senza prefisso: le 124 URL esistenti hanno anni di
 * posizionamento e devono restare identiche.
 *
 * ── 🔴 PERCHE' OGGI E' ACCESO SOLO L'INGLESE ────────────────────────────
 * Il 27/08/2026, misurato sul database: `tour_content` ha 87 righe e sono
 * TUTTE `locale='en'` -- zero `de`, zero `it`. La tabella `seo` ha 122
 * righe, tutte `en`. Il codice multilingua funzionava benissimo, ma non
 * avendo niente da leggere serviva l'inglese: /de/ e /it/ rispondevano 200
 * con lo STESSO testo parola per parola (su 18.463 caratteri cambiavano due
 * parole, l'etichetta del selettore lingua).
 *
 * Erano 246 indirizzi (123 de + 123 it) dichiarati a Google come traduzioni
 * e serviti in inglese. Il sito vecchio era monolingua: non e' un'eredita'
 * da gestire, era un danno che ci stavamo creando adesso.
 *
 * Il titolare ha deciso: "non devi certo mettere stesso testo in inglese per
 * wine experience tedesco e italiano! Per ora se non ci sono le lingue
 * quelle pagine non le facciamo."
 *
 * ── 🔴 COME SI RIACCENDE UNA LINGUA ─────────────────────────────────────
 * PRIMA le traduzioni, POI la riga. Servono, per la lingua che si accende:
 *   1. le righe in `tour_content` con quel `locale` (una per tour);
 *   2. le righe in `seo` con quel `locale` (titolo e description);
 *   3. i testi del modulo sono GIA' pronti in `src/lib/testi.ts` (en/de/it).
 * Poi si aggiunge il codice a `LINGUE_ATTIVE` qui sotto: e' UNA riga, e da
 * sola rimette in piedi rotte, sitemap, hreflang, selettore e redirect.
 *
 * Sotto non e' stato cancellato NIENTE: il tipo `Locale`, la struttura
 * /[locale]/, le definizioni di de e it e i testi tradotti restano tutti al
 * loro posto, pronti.
 *
 * `regiondo` non e' sempre la traduzione ovvia della lingua: il widget di
 * prenotazione accetta solo alcuni locale. Provati uno per uno il 24/08/2026
 * su /widgets/booking/translations: en, es, pt, de, ja, zh rispondono
 * `status: 0` (ok), mentre **ru e ar rispondono `status: 1`** — Regiondo non
 * li ha. `it_IT` riprovato il 27/08/2026: funziona. Quei valori sono dati
 * verificati e restano scritti anche per le lingue spente, cosi' chi le
 * riaccende non deve ricontrollarli.
 */

export type Locale = 'en' | 'de' | 'it';

export const DEFAULT_LOCALE: Locale = 'en';

/* 🔴 QUESTA E' L'UNICA RIGA DA CAMBIARE PER ACCENDERE UNA LINGUA.
 *    Es. per riaprire il tedesco: ['en', 'de'].
 *    L'inglese non si toglie: e' la lingua alla radice. */
export const LINGUE_ATTIVE: Locale[] = ['en'];

export type LocaleInfo = {
  /** codice della cartella nell'URL: /de/tour/... */
  code: Locale;
  /** attributo lang= dell'HTML, con la variante regionale */
  htmlLang: string;
  /** come si chiama la lingua nella lingua stessa, per il selettore */
  label: string;
  /** locale accettato dal widget Regiondo, o null se non lo supporta */
  regiondo: string | null;
  /** l'arabo si scrive da destra a sinistra: cambia tutto il layout */
  dir: 'ltr' | 'rtl';
};

/** Tutte le lingue PREVISTE, accese o spente. Non e' l'elenco da usare per
 *  costruire pagine o link: serve solo a chi deve sapere che una lingua
 *  esiste sulla carta -- il proxy, per rispondere 301 invece che 404. */
export const LOCALES_PREVISTI: LocaleInfo[] = [
  { code: 'en', htmlLang: 'en-US', label: 'English',  regiondo: 'en_US', dir: 'ltr' },
  { code: 'de', htmlLang: 'de-DE', label: 'Deutsch',  regiondo: 'de_DE', dir: 'ltr' },
  { code: 'it', htmlLang: 'it-IT', label: 'Italiano', regiondo: 'it_IT', dir: 'ltr' },
];

/** Le lingue che il sito serve DAVVERO. Tutto quello che genera rotte,
 *  sitemap, hreflang e link passa di qui. */
export const LOCALES: LocaleInfo[] = LOCALES_PREVISTI.filter((l) =>
  LINGUE_ATTIVE.includes(l.code)
);

/** Le lingue previste ma spente: pubblicate un tempo, oggi da redirigere. */
export const LOCALES_SPENTI: LocaleInfo[] = LOCALES_PREVISTI.filter(
  (l) => !LINGUE_ATTIVE.includes(l.code)
);

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const LOCALE_CODES_SPENTI = LOCALES_SPENTI.map((l) => l.code);

/** Vero solo quando le lingue accese sono piu' di una. Con una lingua sola
 *  il selettore nell'intestazione non ha niente da selezionare e gli
 *  hreflang non hanno niente da collegare: si spengono da soli invece di
 *  restare li' come finta scelta. */
export const PIU_LINGUE = LOCALES.length > 1;

export function getLocale(code: string): LocaleInfo {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

export function isLocale(code: string): code is Locale {
  return (LOCALE_CODES as string[]).includes(code);
}

/** Vero per una lingua prevista ma spenta (`de`, `it` oggi): quelle URL
 *  sono state pubblicate e vanno redirette, non fatte scomparire in un 404. */
export function isLocaleSpento(code: string): boolean {
  return (LOCALE_CODES_SPENTI as string[]).includes(code);
}

/** Il locale da passare al widget: se Regiondo non ha la lingua si ripiega
 *  sull'inglese, che e' comunque la lingua in cui si svolgono i tour. */
export function regiondoLocale(code: string): string {
  return getLocale(code).regiondo ?? 'en_US';
}

/** Vero quando il calendario non potra' essere nella lingua della pagina.
 *  Serve a mostrare una riga onesta sopra il widget invece di lasciare
 *  l'utente a chiedersi perche' e' in inglese. */
export function bookingIsEnglishOnly(code: string): boolean {
  return getLocale(code).regiondo === null;
}
