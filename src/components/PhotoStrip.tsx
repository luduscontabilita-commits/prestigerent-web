'use client';

import { useRef } from 'react';

export type Foto = { src: string; alt?: string; label?: string; caption?: string };

/* La striscia di foto della landing, rifatta senza il suo script.
 *
 * Sulla landing lo scorrimento era gestito a mano (trascinamento, inerzia,
 * frecce): un centinaio di righe di JavaScript. Qui lo fa il CSS con
 * scroll-snap, che sul telefono e' anche piu' fluido perche' e' lo
 * scorrimento nativo del sistema. Le frecce servono solo col mouse, dove
 * non c'e' il dito.
 */
export function PhotoStrip({ foto }: { foto: Foto[] }) {
  const box = useRef<HTMLDivElement>(null);

  const scorri = (verso: 1 | -1) => {
    const el = box.current;
    if (el) el.scrollBy({ left: verso * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!foto.length) return null;

  return (
    <div className="tr-strip-wrap">
      <div className="tr-strip" ref={box}>
        {foto.map((f) => (
          <figure key={f.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.src} alt={f.alt || f.caption || ''} loading="lazy" decoding="async" />
            {(f.label || f.caption) && (
              <figcaption>
                {f.label && <span>{f.label}</span>}
                {f.caption && <b>{f.caption}</b>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <button type="button" className="tr-arrow prev" aria-label="Previous photos" onClick={() => scorri(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <button type="button" className="tr-arrow next" aria-label="Next photos" onClick={() => scorri(1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}
