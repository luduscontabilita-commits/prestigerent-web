'use client';

import { useState } from 'react';

/* Il testo lungo con la stessa formattazione delle landing.
 *
 * Sulla landing l'itinerario e' `.pr-prose.pr-clamp`: alto al massimo 320px,
 * con una sfumatura in fondo e il bottone "Show the full itinerary". Quella
 * regola pero' e' scritta come `.js .pr-clamp`, e la classe `js` la mette uno
 * script della landing che qui non esiste: senza, il ritaglio non scattava e
 * l'itinerario restava un muro di testo. Da qui il "dozzinale".
 *
 * Qui lo stato lo tiene React e le classi restano identiche, cosi' il CSS
 * ereditato funziona senza ritocchi. Il testo completo resta SEMPRE nel
 * sorgente anche da chiuso: nascosto con il CSS, non tolto dal DOM -- un
 * itinerario che esiste solo dopo un clic, per un motore di ricerca non
 * esiste affatto.
 */
export function Prosa({
  html,
  etichetta = 'Show the full itinerary',
  ritaglia = true,
}: {
  html: string;
  etichetta?: string;
  ritaglia?: boolean;
}) {
  const [aperto, setAperto] = useState(false);

  if (!html?.trim()) return null;

  if (!ritaglia) {
    return <div className="pr-prose" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <>
      <div
        className={'pr-prose pr-clamp' + (aperto ? ' open' : '')}
        style={
          aperto
            ? undefined
            : { maxHeight: 320, overflow: 'hidden', position: 'relative' }
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!aperto && (
        <div
          aria-hidden="true"
          style={{
            marginTop: -120,
            height: 120,
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(255,255,255,0), #fff 88%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div className="pr-more-row" style={{ display: 'block' }}>
        <button
          className="pr-more"
          type="button"
          aria-expanded={aperto}
          onClick={() => setAperto(!aperto)}
        >
          <span>{aperto ? 'Show less' : etichetta}</span>
          <svg
            className="pr-chev"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={aperto ? { transform: 'rotate(180deg)' } : undefined}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </>
  );
}
