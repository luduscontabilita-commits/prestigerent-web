/* Le lingue del sito: inglese (alla radice), tedesco, italiano.
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
 * `regiondo` non e' sempre la traduzione ovvia della lingua: il widget di
 * prenotazione accetta solo alcuni locale. Provati uno per uno il 24/08/2026
 * su /widgets/booking/translations: en, es, pt, de, ja, zh rispondono
 * `status: 0` (ok), mentre **ru e ar rispondono `status: 1`** — Regiondo non
 * li ha. Su quelle due lingue la pagina e' tradotta e il solo calendario
 * resta in inglese: e' un limite loro, non nostro, e va detto a chi guarda
 * la pagina invece di far finta di niente.
 */

export type Locale = 'en' | 'de' | 'it';

export const DEFAULT_LOCALE: Locale = 'en';

export type LocaleInfo = {
  /** codice della cartella nell'URL: /es/tour/... */
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

export const LOCALES: LocaleInfo[] = [
  { code: 'en', htmlLang: 'en-US', label: 'English',  regiondo: 'en_US', dir: 'ltr' },
  { code: 'de', htmlLang: 'de-DE', label: 'Deutsch',  regiondo: 'de_DE', dir: 'ltr' },
  { code: 'it', htmlLang: 'it-IT', label: 'Italiano', regiondo: 'it_IT', dir: 'ltr' },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);

export function getLocale(code: string): LocaleInfo {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

export function isLocale(code: string): code is Locale {
  return LOCALE_CODES.includes(code as Locale);
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
