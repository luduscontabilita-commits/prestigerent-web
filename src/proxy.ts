import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_CODES } from '@/lib/locales';

/* L'inglese sta alla radice, le altre lingue in sottocartella.
 *
 *    /tour/private-tour-siena-and-san-gimignano/      -> inglese
 *    /es/tour/private-tour-siena-and-san-gimignano/   -> spagnolo
 *
 * Non e' una preferenza estetica: e' la condizione per non perdere
 * posizionamento. Le 124 URL del sito attuale non hanno prefisso di lingua,
 * e devono restare **identiche** al carattere. Se l'inglese finisse sotto
 * /en/ servirebbero 124 redirect e si brucerebbe l'autorita' accumulata in
 * anni su ognuna.
 *
 * Dentro l'app tutte le pagine vivono comunque sotto /[locale]/: qui si
 * riscrive l'indirizzo interno senza toccare quello che vede l'utente.
 */

const PUBLIC_FILE = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|mp4|webm|vtt|txt|xml|json|css|js|woff2?)$/i;

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /* Il pannello e il ritorno dal link di accesso NON sono pagine del
       sito: non hanno lingua, non devono finire sotto /[locale]/ e non
       devono mai essere riscritti. Senza questa riga /admin diventerebbe
       /en/admin e non esisterebbe. */
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    /* LE LANDING E LA PAGINA DI CONFERMA NON SONO PAGINE DI QUESTO SITO.
     *
     * `/lp/...` sono le quattro landing su cui atterrano tutte le campagne
     * Google Ads, e `/myb/...` e' la pagina che il cliente riceve per email
     * dopo aver prenotato. Vivono sul vecchio hosting e ci restano: le
     * modifica un'altra persona via FTP, e portarle qui dentro romperebbe
     * il suo modo di lavorare.
     *
     * Senza questa riga finivano sotto /en/ e quindi nel nulla, perche' la
     * lista dei file pubblici qui sopra non contempla `.html` -- e nessuno
     * se ne sarebbe accorto finche' un cliente non avesse cliccato un
     * annuncio. Escluse qui, i rewrite di next.config.ts le inoltrano al
     * vecchio hosting mantenendo l'indirizzo identico.
     *
     * Oggi, senza LEGACY_HOST impostata, questa riga non cambia niente:
     * quei percorsi semplicemente non esistono e danno 404 come prima. */
    pathname.startsWith('/lp/') ||
    pathname === '/lp' ||
    pathname.startsWith('/myb/') ||
    pathname === '/myb' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const first = pathname.split('/')[1];

  /* Gia' su una lingua esplicita: se qualcuno arriva su /en/... lo si manda
     alla versione senza prefisso, altrimenti la stessa pagina esisterebbe a
     due indirizzi e Google dovrebbe scegliere quale ignorare. */
  if (first === DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    const rest = pathname.slice(DEFAULT_LOCALE.length + 1);
    url.pathname = rest && rest !== '/' ? rest : '/';
    return NextResponse.redirect(url, 308);
  }

  if (LOCALE_CODES.includes(first as never)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
