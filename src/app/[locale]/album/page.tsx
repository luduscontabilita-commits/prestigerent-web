import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { metaDi } from '@/lib/seo';
import { organization, breadcrumb, grafo, hreflangDi } from '@/lib/schema';
import { fotoDi, urlFoto } from '@/lib/gallery-dati';
import { CHIAVE_ALBUM, ordina } from '@/lib/gallery-tag';
import { AlbumGriglia } from '@/components/AlbumGriglia';
import type { FotoStriscia } from '@/components/GalleryStriscia';
import '@/styles/home.css';
import '@/styles/gallery.css';

/* L'ALBUM DEGLI OSPITI: TUTTE LE FOTO COL TAG "album".
 *
 * Chiesto dalla proprieta' il 28/09/2026. Tre decisioni prese quel giorno:
 *
 *  1. SEMPRE VISIBILE, SENZA LE REGOLE DELLE GALLERY. Qui non passano
 *     `galleryDi()` ne' `decidi()`: niente interruttore generale, niente
 *     soglia minima, niente override di pagina, niente titolo o ordine
 *     dalle impostazioni. Per questo la pagina non compare nemmeno in
 *     «Pagine» nel pannello.
 *
 *  2. MA SOLO FOTO APPROVATE. `fotoDi()` legge da `gallery_public`, che
 *     filtra `status = 'approvata'` nel database. L'approvazione non e'
 *     un'impostazione di visualizzazione: e' la tutela contro una foto
 *     sbagliata o una persona che non ha dato il consenso.
 *
 *  3. DALLA PIU' RECENTE, per data di scatto (o di caricamento, se la foto
 *     non ce l'ha): e' l'ordine che ci si aspetta da un album. Usa la
 *     stessa `ordina()` delle gallery, quindi le foto "fissate all'inizio"
 *     restano in testa anche qui.
 *
 * L'aggiornamento: ogni approvazione, correzione o eliminazione chiama
 * `rinfresca()` con il percorso dei tag della foto, e il percorso del tag
 * album e' `/album/`. La pagina si rigenera da sola, senza deploy. L'ora di
 * `revalidate` e' solo la rete di sicurezza. */

export const revalidate = 3600;

const PERCORSO = '/album/';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const m = await metaDi(PERCORSO, 'en');
  return {
    title: m?.title ?? 'Our guests’ album — real days on the road with Prestige Rent',
    description:
      m?.description ??
      'Photos from real tours and transfers in Italy, taken by our guides: ' +
      'wineries, hill towns, cruise-port days and the people who shared them with us.',
    alternates: hreflangDi(
      (l) => (l === DEFAULT_LOCALE ? PERCORSO : `/${l}${PERCORSO}`),
      locale
    ),
  };
}

export default async function Album({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const foto: FotoStriscia[] = ordina(await fotoDi(CHIAVE_ALBUM), 'newest', CHIAVE_ALBUM).map(
    (f) => ({
      id: f.image_id,
      url: urlFoto(f),
      width: f.width,
      height: f.height,
      alt: f.alt,
      caption: f.caption,
      colore: f.blur_data_url,
    })
  );

  return (
    <main className="ab">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            grafo([
              organization(),
              breadcrumb(locale, [
                { nome: 'Home', path: '/' },
                { nome: 'Our guests’ album', path: PERCORSO },
              ]),
            ])
          ),
        }}
      />

      <header className="ab-hero">
        <p className="ab-kicker">Prestige Rent &middot; on the road</p>
        <h1>
          Our guests&rsquo; <em className="hl place">album</em>
        </h1>
        <p className="ab-lead">
          Real days on the road with Prestige Rent, in the photos taken by our guides.
        </p>
      </header>

      {/* Senza foto la pagina resta raggiungibile dal footer e dalla sitemap:
          una frase, non un buco. */}
      {foto.length ? (
        <AlbumGriglia foto={foto} />
      ) : (
        <p className="album-vuoto">The first photos from our guides are on their way.</p>
      )}

      {/* 🔴 IL CONSENSO. Scelto dalla proprieta' il 28/09/2026 nella forma
          breve. Tutte le persone ritratte hanno dato il consenso a essere
          fotografate e pubblicate: la frase lo dichiara. */}
      <p className="album-nota">
        All guests appearing in these photos gave their consent to be photographed and to have
        the pictures published on this website.
      </p>
    </main>
  );
}
