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
