'use client';

import { useState } from 'react';
import { foto as ottimizza, fotoSet } from '@/lib/foto';
import { rapporto } from '@/lib/gallery-tag';
import { Lightbox, type FotoStriscia } from './GalleryStriscia';

/* LA GRIGLIA DI /album/.
 *
 * ── RIGHE "GIUSTIFICATE", NON UN MOSAICO A COLONNE ─────────────────────
 * Le foto arrivano dal telefono delle guide, verticali e orizzontali
 * mescolate, e devono restare INTERE e proporzionate (stessa regola delle
 * gallery nelle pagine). Due modi di farlo:
 *   - colonne CSS (`column-count`): proporzioni perfette, ma l'ordine si
 *     legge dall'alto in basso colonna per colonna, e "dalla piu' recente"
 *     diventa un ordine che nessuno riconosce;
 *   - righe giustificate: ogni riga ha un'altezza sola e ogni foto e'
 *     larga quanto dicono le sue proporzioni. L'ordine si legge come un
 *     testo, da sinistra a destra.
 * Si usa il secondo, in solo CSS: ogni foto ha `flex-grow` e `flex-basis`
 * proporzionali al suo rapporto larghezza/altezza, e `aspect-ratio` fa il
 * resto -- in una riga le larghezze crescono in proporzione, quindi le
 * altezze restano uguali. L'ultima riga non si stira (vedi `::after` in
 * gallery.css).
 *
 * Il rapporto passa da `rapporto()`, che tiene le foto fra 9:16 e 2:1 come
 * nelle gallery: una panoramica 4:1 non diventa una striscia alta un dito.
 *
 * ── PERCHE' E' UN COMPONENTE CLIENT ────────────────────────────────────
 * Solo per il lightbox, che e' lo stesso delle gallery (`Lightbox`
 * esportato da GalleryStriscia.tsx). La griglia in se' e' HTML statico,
 * arriva gia' disegnata dal server. */
export function AlbumGriglia({ foto }: { foto: FotoStriscia[] }) {
  const [aperta, setAperta] = useState<number | null>(null);

  return (
    <>
      <ul className="album-griglia" aria-label="Guest photos">
        {foto.map((f, i) => {
          const r = rapporto(f);
          return (
            <li
              key={f.id}
              className="album-foto"
              style={{ ['--r' as string]: r.toFixed(4), background: f.colore ?? undefined }}
            >
              <button
                type="button"
                className="album-apri"
                onClick={() => setAperta(i)}
                /* la descrizione puo' mancare (28/09/2026): allora solo il numero */
                aria-label={`Open photo ${i + 1} of ${foto.length}${f.alt ? `: ${f.alt}` : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ottimizza(f.url, 828)}
                  srcSet={fotoSet(f.url, [640, 828, 1200])}
                  /* Larghezza a schermo = altezza della riga x rapporto, con
                     margine perche' le righe si allargano per riempire lo
                     spazio. Foto per foto: una verticale non scarica la
                     misura di un'orizzontale. */
                  sizes={`(max-width: 560px) ${Math.round(r * 210)}px, ${Math.round(r * 380)}px`}
                  width={f.width}
                  height={f.height}
                  alt={f.alt}
                  loading={i < 6 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <Lightbox foto={foto} aperta={aperta} chiudi={() => setAperta(null)} vai={setAperta} />
    </>
  );
}
