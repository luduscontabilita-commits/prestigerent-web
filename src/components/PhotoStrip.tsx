'use client';

import { useRef } from 'react';

export type Foto = { src: string; alt?: string; label?: string; caption?: string };

/* La striscia foto, con il markup ESATTO della landing (.film-wrap / .film /
 * .film-track / .slide), non una mia versione.
 *
 * Il CSS ereditato fa gia' quasi tutto: `.film` ha `overflow-x:auto`, quindi
 * scorre da sola con il dito e con il trackpad. Della cinquantina di righe di
 * JavaScript della landing servono solo le frecce, che sul desktop non hanno
 * alternativa.
 *
 * Su mobile la landing usa `.hero-gallery` (mosaico che diventa carosello a
 * swipe) e nasconde `.film`; sopra i 760px fa l'opposto. Si rendono
 * entrambe, come fa lei: e' il CSS a scegliere.
 */
export function PhotoStrip({ foto }: { foto: Foto[] }) {
  const box = useRef<HTMLDivElement>(null);

  const scorri = (verso: 1 | -1) => {
    const el = box.current;
    if (el) el.scrollBy({ left: verso * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (!foto.length) return null;

  return (
    <>
      {/* MOBILE: il mosaico che il CSS trasforma in carosello a swipe */}
      <div className="hero-gallery" aria-label="Tour photos">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="g-hero" src={foto[0].src} alt={foto[0].alt || ''} loading="eager" decoding="async" />
        {foto.slice(1, 13).reduce<Foto[][]>((cols, f, i) => {
          if (i % 2 === 0) cols.push([]);
          cols[cols.length - 1].push(f);
          return cols;
        }, []).map((col, i) => (
          <div className="g-col" key={i}>
            {col.map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.src} src={f.src} alt={f.alt || ''} loading="lazy" decoding="async" />
            ))}
          </div>
        ))}
      </div>

      {/* DESKTOP: la striscia a tutta larghezza, come sulla landing */}
      <div className="film-section hero-film" aria-label="Tour photo highlights">
        <div className="film-wrap">
          <div className="film" ref={box} aria-label="Tour photo gallery">
            <div className="film-track">
              {foto.map((f) => (
                <figure className="slide" key={f.src}>
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
          </div>

          <button className="film-btn prev" type="button" aria-label="Previous photos" onClick={() => scorri(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button className="film-btn next" type="button" aria-label="Next photos" onClick={() => scorri(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div className="film-hint">&lsaquo; &nbsp;drag&nbsp; &rsaquo;</div>
        </div>
      </div>
    </>
  );
}
