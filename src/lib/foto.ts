/* LE FOTO, SERVITE DELLA DIMENSIONE GIUSTA.
 *
 * ── IL PROBLEMA, MISURATO ───────────────────────────────────────────────
 * Il 28/08/2026 la home scaricava **9,54 MB di immagini**: 78 file, di cui
 * 55 JPG a piena risoluzione. `firenze-cattedrale.jpg` pesa 232 KB e
 * viene mostrata dentro una scheda larga 380 pixel -- si scarica cinque
 * volte quello che serve, e su una connessione mobile lo si aspetta.
 *
 * ── PERCHE' NON `next/image` ────────────────────────────────────────────
 * Sarebbe la strada maestra, ma cambierebbe il modo in cui ogni foto si
 * dispone in pagina: `next/image` impone il suo contenitore, e la grafica
 * di queste schede e' quella collaudata sulla landing a pagamento, che non
 * si riscrive per un'ottimizzazione. Qui si prende solo il PEZZO utile --
 * l'ottimizzatore di Vercel, che e' gia' configurato in `next.config.ts`
 * ma non lo usava nessuno -- e si lascia il markup dov'e'.
 *
 * ── COSA FA ─────────────────────────────────────────────────────────────
 * Riscrive l'indirizzo di una foto facendolo passare da `/_next/image`,
 * che la ridimensiona e la converte in WebP o AVIF secondo cio' che il
 * browser dichiara di capire. Misurato sulla stessa foto:
 *
 *     originale ............ 232 KB  jpeg
 *     larghezza 640 ......... 61 KB  webp   (-74%)
 *     larghezza 1200 ....... 185 KB  webp
 *
 * ── LE LARGHEZZE ────────────────────────────────────────────────────────
 * Sono poche apposta. Ogni combinazione di indirizzo e larghezza e' una
 * trasformazione che Vercel calcola una volta e poi tiene in cache: con
 * cinque misure fisse si resta nell'ordine delle centinaia, con una misura
 * per ogni schermo si andrebbe nelle migliaia.
 */

/* 🔴 LE MISURE NON SI INVENTANO.
 *
 * L'ottimizzatore di Vercel accetta SOLO le larghezze e le qualita' che
 * conosce, e a tutto il resto risponde 400. Non e' scritto da nessuna
 * parte in modo evidente e si scopre rompendo le immagini in produzione:
 * la prima versione di questo file chiedeva `w=400` e `q=74`, e tredici
 * foto della home sono uscite bianche.
 *
 * Queste sono le `deviceSizes` predefinite di Next, cioe' le uniche
 * ammesse finche' `next.config.ts` non ne dichiara altre. */
const MISURE = [640, 750, 828, 1080, 1200, 1920] as const;

/** L'unica qualita' ammessa dal profilo predefinito. Chiederne un'altra
 *  -- anche 74, anche 78 -- fa rispondere 400. */
const QUALITA = 75;

/** Gli host che `next.config.ts` autorizza: fuori da questi l'ottimizzatore
 *  risponde 400, quindi l'indirizzo si lascia com'e'. */
const AMMESSI = [
  'oeipsfnbpaqkmwrxtcrn.supabase.co',
  'prestigerent.com',
  'cdn.shortpixel.ai',
];

function ottimizzabile(url: string): boolean {
  if (!url || url.startsWith('data:')) return false;
  /* Alcune foto arrivano gia' dal ridimensionatore di Supabase
     (`/storage/v1/render/image/...`): sono gia' servite della misura
     giusta, e farle passare da un secondo ottimizzatore e' lavoro
     doppio per lo stesso risultato. */
  if (url.includes('/render/image/')) return false;
  if (url.startsWith('/')) return true;
  try {
    return AMMESSI.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * L'indirizzo di una foto alla larghezza voluta.
 * Se la foto non e' ottimizzabile torna l'indirizzo originale, cosi' il
 * chiamante non deve mai chiedersi se puo' usarla.
 */
export function foto(url: string | null | undefined, larghezza = 828): string {
  if (!url || !ottimizzabile(url)) return url ?? '';
  /* si sale alla misura fissa piu' vicina: chiedere 700 quando esistono
     640 e 828 creerebbe una terza trasformazione per niente */
  const w = MISURE.find((m) => m >= larghezza) ?? MISURE[MISURE.length - 1];
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${QUALITA}`;
}

/**
 * Il `srcset`: lo stesso indirizzo a piu' misure, cosi' il browser sceglie
 * da se' in base allo schermo e alla densita'. Va sempre insieme a un
 * `sizes` che dica quanto sara' larga la foto in pagina, altrimenti il
 * browser assume tutta la finestra e scarica la piu' grande.
 */
export function fotoSet(
  url: string | null | undefined,
  larghezze: readonly number[] = [640, 828, 1200]
): string | undefined {
  if (!url || !ottimizzabile(url)) return undefined;
  return larghezze.map((w) => `${foto(url, w)} ${w}w`).join(', ');
}
