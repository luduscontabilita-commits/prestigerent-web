'use client';

import { useFilm } from './useFilm';
import { foto as ottimizza, fotoSet } from '@/lib/foto';

export type Foto = { src: string; alt?: string; label?: string; caption?: string };

/* La striscia foto, con il markup ESATTO della landing (.film-wrap / .film /
 * .film-track / .slide), non una mia versione.
 *
 * Su mobile la landing usa `.hero-gallery` (mosaico che diventa carosello a
 * swipe con scroll-snap) e nasconde `.film`; sopra i 760px fa l'opposto. Si
 * rendono entrambe, come fa lei: e' il CSS a scegliere.
 *
 * LO SCORRIMENTO AUTOMATICO. Sulla landing scorre da sola SOLO la striscia
 * desktop -- il commento in landing.css lo dice ("drag + frecce + drift") --
 * mentre su telefono resta il carosello a swipe con lo scatto sulle foto.
 * Qui si fa la stessa cosa, e non e' solo fedelta': su mobile
 * `scroll-snap-type:x mandatory` combatterebbe contro lo scorrimento
 * automatico foto per foto, e sarebbe batteria bruciata per un effetto
 * peggiore. La striscia desktop e' dentro `.hero-film`, che su telefono e'
 * `display:none`: l'IntersectionObserver dentro `useFilm` non la vede mai e
 * il ciclo di animazione li' non parte proprio.
 *
 * I CLONI. Per scorrere all'infinito senza mai arrivare al capolinea le
 * diapositive si scrivono due volte, la seconda con `aria-hidden`. Sulla
 * landing i cloni li fa il JavaScript con cloneNode; qui si scrivono nel
 * markup, cosi' stanno gia' nell'HTML servito e la striscia non cambia
 * lunghezza sotto le mani un istante dopo il caricamento.
 */
export function PhotoStrip({ foto }: { foto: Foto[] }) {
  const { proprieta, scorri, fermo, alterna, motoRidotto } = useFilm({
    auto: true,
    originali: foto.length,
  });

  if (!foto.length) return null;

  /* Si clona solo se c'e' qualcosa da far scorrere. Con una o due foto la
     striscia non arriva a riempire lo schermo: i cloni si vedrebbero tutti
     insieme accanto agli originali, cioe' la stessa foto due volte. */
  const cicla = foto.length >= 3;
  const diapositive = cicla ? [...foto, ...foto] : foto;

  return (
    <>
      {/* MOBILE: il mosaico che il CSS trasforma in carosello a swipe */}
      <div className="hero-gallery" aria-label="Tour photos">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="g-hero" src={ottimizza(foto[0].src, 1200, 78)}
             srcSet={fotoSet(foto[0].src, [640, 828, 1200], 78)} sizes="100vw"
             alt={foto[0].alt || ''} loading="eager" fetchPriority="high" decoding="async" />
        {foto.slice(1, 13).reduce<Foto[][]>((cols, f, i) => {
          if (i % 2 === 0) cols.push([]);
          cols[cols.length - 1].push(f);
          return cols;
        }, []).map((col, i) => (
          <div className="g-col" key={i}>
            {col.map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.src} src={ottimizza(f.src, 640)} srcSet={fotoSet(f.src, [400, 640, 828])}
                   sizes="(max-width: 700px) 48vw, 320px"
                   alt={f.alt || ''} loading="lazy" decoding="async" />
            ))}
          </div>
        ))}
      </div>

      {/* DESKTOP: la striscia a tutta larghezza, come sulla landing */}
      <div className="film-section hero-film" aria-label="Tour photo highlights">
        <div className="film-wrap">
          <div
            className="film"
            {...proprieta}
            role="group"
            aria-roledescription="carousel"
            aria-label="Tour photo gallery"
          >
            <div className="film-track">
              {diapositive.map((f, i) => {
                const clone = i >= foto.length;
                return (
                  <figure
                    className="slide"
                    key={`${f.src}-${i}`}
                    aria-hidden={clone || undefined}
                    /* aria-roledescription + "3 di 18": e' cosi' che un
                       lettore di schermo annuncia dove ci si trova senza
                       che serva una zona che parla a ogni pixel di
                       scorrimento. */
                    aria-roledescription={clone ? undefined : 'slide'}
                    aria-label={clone ? undefined : `${i + 1} of ${foto.length}`}
                  >
                    {/* SOLO LA PRIMA SI CARICA SUBITO. Sta in cima alla
                        pagina, sotto il titolo, ed e' quasi sempre
                        l'immagine piu' grande dello schermo: e' lei
                        l'LCP. Le altre diciassette arrivano quando
                        servono -- e i cloni non arrivano quasi mai,
                        perche' hanno lo stesso indirizzo e il browser li
                        ha gia' in cache. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      /* La striscia e' alta poco piu' di 300px: chiedere
                         l'originale a piena risoluzione era il grosso dei
                         megabyte della home. */
                      src={ottimizza(f.src, i === 0 ? 1200 : 828, i === 0 ? 78 : 74)}
                      srcSet={fotoSet(f.src, [640, 828, 1200], i === 0 ? 78 : 74)}
                      sizes="(max-width: 700px) 88vw, 460px"
                      alt={clone ? '' : f.alt || f.caption || ''}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                      decoding="async"
                    />
                    {(f.label || f.caption) && (
                      <figcaption>
                        {f.label && <span>{f.label}</span>}
                        {f.caption && <b>{f.caption}</b>}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>

          <button className="film-btn prev" type="button" aria-label="Previous photos" onClick={() => scorri(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button className="film-btn next" type="button" aria-label="Next photos" onClick={() => scorri(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>

          {/* Il comando dello scorrimento automatico.
              Non compare quando `prefers-reduced-motion` e' attivo: li' non
              si muove niente da solo, e un pulsante per fermare una cosa
              ferma e' solo confusione. */}
          {cicla && !motoRidotto && (
            <button
              className="film-auto"
              type="button"
              onClick={alterna}
              aria-pressed={fermo}
              aria-label={fermo ? 'Let the photos scroll by themselves' : 'Stop the photos from scrolling by themselves'}
            >
              {fermo ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
              )}
            </button>
          )}

          {/* Il suggerimento "drag" sparisce appena l'utente ha capito da
              solo, cioe' alla prima interazione -- come sulla landing. */}
          <div className={fermo ? 'film-hint hide' : 'film-hint'}>&lsaquo; &nbsp;drag&nbsp; &rsaquo;</div>
        </div>

        {/* Lo stato detto a voce. Una zona `polite` non interrompe: parla
            quando il lettore di schermo ha finito la frase in corso. Il
            testo cambia solo quando cambia lo stato, quindi non c'e' il
            rischio della zona che chiacchiera da sola. */}
        {cicla && !motoRidotto && (
          <p className="film-stato" role="status" aria-live="polite">
            {fermo ? 'Photos paused' : 'Photos scrolling automatically'}
          </p>
        )}
      </div>
    </>
  );
}
