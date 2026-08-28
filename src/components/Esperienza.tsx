'use client';

import { useState } from 'react';

/* "WHAT TO EXPECT" -- il video istituzionale, ripreso dalla home vecchia.
 *
 * E' l'unico posto in tutta la home dove si vedono i mezzi, le strade e i
 * posti in movimento. Le foto dei tour mostrano il prodotto; questo mostra
 * la giornata.
 *
 * ── PERCHE' NON C'E' UN <iframe> ────────────────────────────────────────
 * Un iframe di YouTube in pagina si porta dietro mezzo megabyte di
 * JavaScript e, soprattutto, prende contatto con Google PRIMA che chi
 * legge abbia toccato niente. Con il banner del consenso appena fatto
 * (src/components/Consenso.tsx) sarebbe una contraddizione in pagina: si
 * chiede il permesso e intanto si e' gia' partiti.
 *
 * Quindi qui c'e' una facciata: la copertina e' un file nostro, servito
 * dal nostro dominio, e l'iframe nasce SOLO al clic sul play. Fino a quel
 * momento verso Google non parte una richiesta. Al clic si usa
 * youtube-nocookie.com, che e' anche quello che il sito vecchio aveva
 * gia' impostato (`yt_privacy: yes` nelle opzioni di Elementor).
 *
 * Effetto collaterale gradito: la home pesa un decimo.
 */

const VIDEO = 'XHOxmfbhWPw';

export function Esperienza() {
  const [parte, setParte] = useState(false);

  return (
    <section className="pr-sec alt" id="what-to-expect" aria-labelledby="wte-t">
      <div className="pr-wrap wide">
        <div className="wte">
          <div className="wte-testo">
            <p className="wte-occhiello">Prestige Rent experience</p>
            <h2 id="wte-t">What to expect</h2>
            <p>Stunning locations, unforgettable experiences, lifetime memories.</p>
            <p>
              Top quality service, flexibility, and meticulous attention to your
              comfort and safety.
            </p>
          </div>

          <div className="wte-video">
            {parte ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${VIDEO}?autoplay=1&rel=0`}
                title="Prestige Rent Italy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <button
                type="button"
                className="wte-play"
                onClick={() => setParte(true)}
                aria-label="Play the video: Prestige Rent Italy"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/servizi/video-prestige-rent.webp"
                  width={1280}
                  height={720}
                  loading="lazy"
                  decoding="async"
                  alt=""
                />
                <span className="wte-tri" aria-hidden="true">
                  <svg viewBox="0 0 68 48" width="68" height="48">
                    <path
                      d="M66.5 7.7a8.6 8.6 0 0 0-6-6C55.2 0 34 0 34 0S12.8 0 7.5 1.7a8.6 8.6 0 0 0-6 6A90 90 0 0 0 0 24a90 90 0 0 0 1.5 16.3 8.6 8.6 0 0 0 6 6C12.8 48 34 48 34 48s21.2 0 26.5-1.7a8.6 8.6 0 0 0 6-6A90 90 0 0 0 68 24a90 90 0 0 0-1.5-16.3z"
                      fill="#f00"
                    />
                    <path d="M27 34V14l18 10z" fill="#fff" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
