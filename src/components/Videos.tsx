'use client';

import { useRef } from 'react';

export type Video = {
  src: string;
  poster: string;
  alt?: string;
  label?: string;
  caption?: string;
};

/* La striscia dei video, con il markup della landing (.film-vids /
 * .slide-vid).
 *
 * `preload="none"` piu' il poster: finche' nessuno preme play non si scarica
 * un byte di video. Non e' un dettaglio -- questi filmati pesano fra 3 e 12
 * MB l'uno, e sei di essi caricati in automatico affosserebbero la pagina
 * proprio sul primo impatto.
 *
 * `data-noloop` sulla landing: qui non si clona e non si scorre da soli. Un
 * clone sarebbe lo stesso filmato due volte, e lo scorrimento automatico
 * porterebbe via il video mentre si cerca di premere play.
 *
 * Alla pressione di play si fermano gli altri: due audio insieme nella stessa
 * striscia sono solo fastidio.
 */
export function Videos({ video }: { video: Video[] }) {
  const box = useRef<HTMLDivElement>(null);

  const scorri = (verso: 1 | -1) => {
    const el = box.current;
    if (el) el.scrollBy({ left: verso * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const play = (e: React.MouseEvent<HTMLButtonElement>) => {
    const fig = e.currentTarget.closest('figure');
    const v = fig?.querySelector('video');
    if (!v) return;
    document.querySelectorAll<HTMLVideoElement>('.slide-vid video').forEach((o) => {
      if (o !== v && !o.paused) o.pause();
    });
    v.play().catch(() => {});
    fig?.classList.add('is-playing');
  };

  if (!video.length) return null;

  return (
    <section id="videos" className="film-section">
      <div className="film-head">
        <h2 className="film-title">
          A day with us, <em className="hl place">on camera</em>
        </h2>
        <p className="film-sub">Short clips filmed on our own tours &mdash; drag to see them all.</p>
      </div>

      <div className="film-wrap">
        <div className="film film-vids" id="filmVids" data-noloop ref={box} aria-label="Video gallery">
          <div className="film-track">
            {video.map((v) => (
              <figure className="slide slide-vid" key={v.src}>
                <video controls preload="none" playsInline poster={v.poster} aria-label={v.alt || v.caption || ''}>
                  <source src={v.src} type="video/mp4" />
                  Your browser cannot play this video.
                </video>
                <button className="vid-play" type="button" aria-label="Play this video" onClick={play}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                  </svg>
                </button>
                {(v.label || v.caption) && (
                  <figcaption>
                    {v.label && <span dangerouslySetInnerHTML={{ __html: v.label }} />}
                    {v.caption && <b dangerouslySetInnerHTML={{ __html: v.caption }} />}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>

        <button className="film-btn prev" type="button" aria-label="Previous videos" onClick={() => scorri(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button className="film-btn next" type="button" aria-label="Next videos" onClick={() => scorri(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}
