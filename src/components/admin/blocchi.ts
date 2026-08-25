import type { FotoAdmin } from './RiordinaFoto';

export type Blocchi = {
  name?: string;
  images?: string[];
  gallery?: FotoAdmin[];
};

/* LE FOTO DI UN TOUR, COME LE VEDE IL PANNELLO.
 *
 * Su 87 righe solo 2 hanno `gallery`: le altre hanno la sola lista di
 * indirizzi in `images`. La pagina del tour si comporta cosi' (gallery se
 * c'e', altrimenti images) e il pannello deve mostrare esattamente quello
 * che la pagina mostra, non una terza versione.
 *
 * Le eventuali foto presenti solo in `images` vengono comunque aggiunte in
 * fondo: se i due array si sono disallineati per una scrittura fatta a
 * mano, aprire questa pagina non deve essere il gesto che le cancella.
 */
export function fotoDi(blocks: Blocchi | null | undefined): FotoAdmin[] {
  const gallery = Array.isArray(blocks?.gallery) ? blocks.gallery.filter((f) => f?.src) : [];
  const images = Array.isArray(blocks?.images) ? blocks.images.filter(Boolean) : [];

  if (!gallery.length) return images.map((src) => ({ src }));

  const noti = new Set(gallery.map((f) => f.src));
  return [...gallery, ...images.filter((src) => !noti.has(src)).map((src) => ({ src }))];
}
