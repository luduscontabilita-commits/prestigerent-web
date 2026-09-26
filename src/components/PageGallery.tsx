import { galleryDi, urlFoto } from '@/lib/gallery-dati';
import { entranoTutte, pezziTitolo, titoloPiano } from '@/lib/gallery-tag';
import { GalleryStriscia, type FotoStriscia } from './GalleryStriscia';
import '@/styles/gallery.css';

/* LA GALLERY DI UNA PAGINA, in una riga per chi la usa.
 *
 *     <PageGallery tag={chiaveTour(slug)} />
 *
 * e' tutto quello che i tre template aggiungono. Ogni decisione -- se si
 * vede, che titolo ha, in che ordine, se scorre -- sta qui e in
 * `gallery-tag.ts`, non nelle pagine: era la condizione del piano, e serve
 * a non avere tre copie della stessa regola che col tempo divergono.
 *
 * ── 🔴 SE NON DEVE VEDERSI, NON RENDE NIENTE ───────────────────────────
 * `null`, non un contenitore vuoto e non una sezione con il solo titolo.
 * Con l'interruttore generale spento -- com'e' adesso -- questo componente
 * e' presente in tre template e non produce un byte di HTML: si puo'
 * pubblicare senza che nessun visitatore veda niente, ed e' esattamente il
 * modo in cui si prova in produzione prima di accendere.
 *
 * ── I CASI IN CUI TORNA `null` ─────────────────────────────────────────
 * Sono quattro e per la pagina sono lo stesso caso: il tag non e' nel
 * registro (pagina esclusa come /transfers/, o registro non ancora
 * sincronizzato), l'interruttore e' spento, la pagina e' disattivata, le
 * foto approvate sono sotto soglia.
 */
export async function PageGallery({ tag }: { tag: string }) {
  const g = await galleryDi(tag);
  if (!g) return null;

  const foto: FotoStriscia[] = g.foto.map((f) => ({
    id: f.image_id,
    url: urlFoto(f),
    width: f.width,
    height: f.height,
    alt: f.alt,
    caption: f.caption,
    colore: f.blur_data_url,
  }));

  /* CI STANNO TUTTE? Si misura sul server con le proporzioni salvate,
     prima che una sola immagine sia stata scaricata.
     1280 e' la larghezza di riferimento: `.film` occupa tutta la finestra
     (solo `.film-head` e' limitata a 760px), e su uno schermo piu' stretto
     le foto non ci staranno comunque. Decidere qui -- e non nel browser --
     e' quello che tiene identico l'HTML del server e quello che React si
     aspetta: vedi la nota sui cloni in GalleryStriscia. */
  const scorre = !entranoTutte(g.foto, 1280);

  const piano = titoloPiano(g.titolo);

  return (
    <section className="film-section pr-gallery" aria-label={piano}>
      <div className="film-head">
        <h2 className="film-title">
          {/* `*parola*` diventa la parola accentata, con le stesse classi
              del resto del sito. Niente HTML da una stringa scritta nel
              pannello: si rendono dei pezzi, quindi un `<script>` nel
              titolo resta testo. */}
          {pezziTitolo(g.titolo).map((p, i) =>
            p.accento ? (
              <em className="hl place" key={i}>{p.testo}</em>
            ) : (
              <span key={i}>{p.testo}</span>
            )
          )}
        </h2>
        {g.sottotitolo && <p className="film-sub">{g.sottotitolo}</p>}
      </div>

      <GalleryStriscia foto={foto} scorre={scorre} velocita={g.velocita} etichetta={piano} />
    </section>
  );
}
