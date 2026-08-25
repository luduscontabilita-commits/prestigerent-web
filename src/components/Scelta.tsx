'use client';

import { useEffect, useRef, useState } from 'react';

/* UN MENU A TENDINA NOSTRO, al posto di <select>.
 *
 * Il <select> nativo si puo' vestire solo per la parte chiusa: la lista
 * che si apre la disegna il sistema operativo, ed e' un rettangolo grigio
 * squadrato con la riga blu di Windows. Sopra una foto, accanto a
 * pastiglie bianche arrotondate, sembra un pezzo di un altro sito.
 *
 * Questo invece e' un pulsante piu' un elenco: stesso raggio, stessa
 * ombra, colore del marchio sulla voce scelta.
 *
 * Resta usabile da tastiera -- frecce, Invio, Esc, Home/Fine -- e si
 * annuncia come listbox, perche' un menu che si guida solo col mouse
 * taglia fuori chi naviga in altro modo.
 *
 * Niente librerie: sono ottanta righe e pesano zero. Una libreria per
 * questo aggiungerebbe decine di kB su ogni pagina del sito.
 */

export type Opzione = { valore: string; etichetta: string };

export function Scelta({
  id,
  etichetta,
  opzioni,
  valore,
  onCambia,
}: {
  id: string;
  etichetta: string;
  opzioni: Opzione[];
  valore: string;
  onCambia: (v: string) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [attivo, setAttivo] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const scelta = opzioni.find((o) => o.valore === valore) ?? opzioni[0];

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener('mousedown', fuori);
    return () => document.removeEventListener('mousedown', fuori);
  }, [aperto]);

  const apri = () => {
    setAttivo(Math.max(0, opzioni.findIndex((o) => o.valore === valore)));
    setAperto(true);
  };

  const tasti = (e: React.KeyboardEvent) => {
    if (!aperto) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        apri();
      }
      return;
    }
    if (e.key === 'Escape') return setAperto(false);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCambia(opzioni[attivo].valore);
      return setAperto(false);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAttivo((i) => Math.min(opzioni.length - 1, i + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAttivo((i) => Math.max(0, i - 1));
    }
    if (e.key === 'Home') setAttivo(0);
    if (e.key === 'End') setAttivo(opzioni.length - 1);
  };

  return (
    <div className={'sc' + (aperto ? ' is-open' : '')} ref={box}>
      <button
        type="button"
        id={id}
        className="sc-btn"
        aria-haspopup="listbox"
        aria-expanded={aperto}
        onClick={() => (aperto ? setAperto(false) : apri())}
        onKeyDown={tasti}
      >
        <span className="sc-lab">{etichetta}</span>
        <span className="sc-val">{scelta?.etichetta}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aperto && (
        <ul className="sc-menu" role="listbox" aria-labelledby={id} tabIndex={-1}>
          {opzioni.map((o, i) => (
            <li
              key={o.valore}
              role="option"
              aria-selected={o.valore === valore}
              className={(o.valore === valore ? 'is-sel ' : '') + (i === attivo ? 'is-att' : '')}
              onMouseEnter={() => setAttivo(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onCambia(o.valore);
                setAperto(false);
              }}
            >
              {o.etichetta}
              {o.valore === valore && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
