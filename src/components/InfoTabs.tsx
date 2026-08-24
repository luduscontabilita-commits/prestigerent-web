'use client';

import { useState } from 'react';
import { Prosa } from './Prosa';

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
          <div className="pr-acc-body">
            {/* Le schede lunghe -- prezzi, informazioni importanti -- sono
                muri di testo come l'itinerario: stesso ritaglio, stessa
                formattazione. Sotto le 900 battute non serve. */}
            <Prosa
              html={tabs[k]}
              ritaglia={tabs[k].length > 900}
              etichetta="Read everything"
            />
          </div>
        </div>
      ))}
    </>
  );
}
