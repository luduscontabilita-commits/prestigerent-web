'use client';

import { useState } from 'react';
import { Prosa } from './Prosa';
import { Faq } from './Faq';
import { pulisci } from '@/lib/prosa';

/* Le schede informative, con la grafica della landing (.pr-tabs / .pr-tabp).
 * Sulla landing erano gestite da uno script che accendeva e spegneva
 * l'attributo hidden; qui lo fa React, ma le classi restano identiche cosi'
 * il CSS ereditato funziona senza ritocchi.
 *
 * I pannelli non selezionati restano montati (hidden) invece di essere tolti
 * dal DOM: cosi' il testo c'e' comunque nel sorgente, e Google lo legge. Una
 * scheda "Prezzi" che esiste solo dopo un clic, per un motore di ricerca non
 * esiste affatto.
 */
export function InfoTabs({ tabs }: { tabs: Record<string, string> }) {
  const keys = Object.keys(tabs).filter((k) => tabs[k]?.trim());
  const [attiva, setAttiva] = useState(keys[0] ?? '');

  if (!keys.length) return null;

  return (
    <>
      <div className="pr-tabs" role="tablist" aria-label="Tour information">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            className={'pr-tab' + (k === attiva ? ' is-on' : '')}
            aria-selected={k === attiva}
            onClick={() => setAttiva(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {keys.map((k) => (
        <div key={k} className="pr-tabp" role="tabpanel" hidden={k !== attiva}>
          {/* Le FAQ diventano accordion; tutto il resto e' testo normale,
              SENZA ritaglio: la scheda dei prezzi tagliata a meta' da una
              sfumatura era la cosa peggiore della pagina. Chi apre "Prezzi"
              vuole vedere i prezzi, non un bottone. */}
          {/^faq/i.test(k) ? (
            <Faq html={tabs[k]} />
          ) : (
            <div
              className="pr-acc-body pr-prose"
              dangerouslySetInnerHTML={{ __html: pulisci(tabs[k]) }}
            />
          )}
        </div>
      ))}
    </>
  );
}
