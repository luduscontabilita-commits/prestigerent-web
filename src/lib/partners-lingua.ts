import { cookies, headers } from 'next/headers';
import { COOKIE_LINGUA, type Lingua } from './partners-testi';

/* LA LINGUA DELL'AREA PARTNER, letta sul server.
 *
 * 1. Il cookie `partners_lang`, scritto dal selettore EN/IT
 *    (SelettoreLingua): la scelta della persona vince su tutto.
 * 2. Altrimenti la lingua del browser: chi ha il telefono in italiano
 *    vede l'italiano gia' alla prima visita.
 * 3. Altrimenti l'inglese: i partner sono per lo piu' esteri.
 *
 * Un cookie e non un pezzo di indirizzo (/partners/it/...) per una
 * ragione pratica: gli indirizzi dell'area sono gia' nelle email partite
 * e nei preferiti, e la stessa pagina deve aprirsi nella lingua giusta da
 * qualunque link. Solo per l'area partner: il sito pubblico ha le sue
 * lingue nell'indirizzo (src/lib/locales.ts). */
export async function linguaPartner(): Promise<Lingua> {
  const scelta = (await cookies()).get(COOKIE_LINGUA)?.value;
  if (scelta === 'it' || scelta === 'en') return scelta;
  const browser = (await headers()).get('accept-language') ?? '';
  return /^\s*it\b/i.test(browser) ? 'it' : 'en';
}
