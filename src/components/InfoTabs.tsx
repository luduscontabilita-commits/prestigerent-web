'use client';

import { useId, useState } from 'react';
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

  /* LE SCHEDE E I PANNELLI NON ERANO COLLEGATI.
   *
   * C'erano i ruoli giusti -- tablist, tab, tabpanel -- ma nessun filo
   * fra loro: il `tab` non diceva quale pannello comanda e il pannello
   * non diceva da quale scheda prende il nome. Per un lettore di schermo
   * erano due cose separate messe una sotto l'altra: si sente "FAQ'S,
   * scheda, selezionata" e poi, piu' avanti, un pannello anonimo che
   * potrebbe essere di chiunque. E' il pezzo che rende un tablist
   * navigabile davvero, non solo etichettato.
   *
   * Gli id li fa `useId()` e non una stringa scritta a mano: le schede
   * si chiamano "Prices", "FAQ'S", "Good to know" -- nomi che arrivano
   * dal database, con apostrofi e spazi dentro -- e su una pagina che
   * mostrasse due gruppi di schede due id uguali si scontrerebbero. */
  const uid = useId();
  const idTab = (k: string) => `${uid}t${keys.indexOf(k)}`;
  const idPan = (k: string) => `${uid}p${keys.indexOf(k)}`;

  if (!keys.length) return null;

  return (
    <>
      <div className="pr-tabs" role="tablist" aria-label="Tour information">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={idTab(k)}
            aria-controls={idPan(k)}
            className={'pr-tab' + (k === attiva ? ' is-on' : '')}
            aria-selected={k === attiva}
            onClick={() => setAttiva(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {keys.map((k) => (
        <div
          key={k}
          className="pr-tabp"
          role="tabpanel"
          id={idPan(k)}
          aria-labelledby={idTab(k)}
          /* Il pannello e' lungo e ha dentro dei link: senza `tabIndex`
             chi non usa il mouse non ci puo' portare il fuoco, e su un
             pannello che scorre non lo puo' nemmeno scorrere con le
             frecce. Solo quello aperto: gli altri sono `hidden` e un
             elemento nascosto che si puo' mettere a fuoco e' peggio che
             uno che non si puo' raggiungere. */
          tabIndex={k === attiva ? 0 : undefined}
          hidden={k !== attiva}
        >
          {/* Nella scheda FAQ le domande sono accordion apribili; tutto il
              resto e' testo normale, SENZA ritaglio: la scheda dei prezzi
              tagliata a meta' da una sfumatura era la cosa peggiore della
              pagina. Chi apre "Prezzi" vuole vedere i prezzi, non un
              bottone. */}
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
