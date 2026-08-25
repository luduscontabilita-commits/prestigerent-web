'use client';

import { useState } from 'react';
import type { Recensione } from '@/lib/recensioni';

/* LA SINGOLA RECENSIONE.
 *
 * Regola: il testo non si taglia MAI in modo definitivo. Una recensione
 * che finisce con i puntini sembra inventata -- e' proprio il taglio a
 * dare quell'impressione, perche' una recensione vera finisce, una finta
 * finisce a meta'.
 *
 * Quindi: sotto una certa lunghezza si mostra tutta e basta. Sopra, si
 * mostra un pezzo con un pulsante che la apre QUI, senza cambiare pagina
 * e senza perdere una parola. Chi vuole leggere legge; chi scorre non si
 * trova un muro di testo.
 *
 * Il limite e' generoso di proposito: quasi tutte le recensioni restano
 * intere e il pulsante compare solo sulle poche lunghissime.
 */
const LUNGA = 460;

const STELLE = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
const MESI = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function quando(d: string | null) {
  if (!d) return null;
  const [a, m] = d.split('-');
  return `${MESI[Number(m) - 1]} ${a}`;
}

const NOMI: Record<string, string> = {
  tripadvisor: 'Tripadvisor',
  google: 'Google',
  viator: 'Viator',
  getyourguide: 'GetYourGuide',
};

export function RecensioneCard({
  r,
  linkabile,
}: {
  r: Recensione;
  linkabile: boolean;
}) {
  const [aperta, setAperta] = useState(false);
  const lunga = r.testo.length > LUNGA;
  const mostrata = !lunga || aperta ? r.testo : r.testo.slice(0, LUNGA).replace(/\s+\S*$/, '');

  return (
    <figure className={'rv-card' + (aperta ? ' aperta' : '')}>
      <div className="rv-card-top">
        {/* l'iniziale al posto della foto: da' un volto alla riga e rende
            la scheda piu' simile a una recensione vera che a una citazione */}
        <span className="rv-avatar" aria-hidden="true">{r.autore.trim()[0]}</span>
        <span className="rv-stars" aria-label={`${r.voto} out of 5`}>{STELLE(r.voto)}</span>
        <span className={'rv-src rv-src-' + r.fonte}>{NOMI[r.fonte] ?? r.fonte}</span>
      </div>

      {r.titolo && <strong className="rv-card-t">{r.titolo}</strong>}

      <blockquote>
        {mostrata}
        {lunga && !aperta && <span className="rv-fade">&hellip;</span>}
      </blockquote>

      {lunga && (
        <button type="button" className="rv-piu" onClick={() => setAperta(!aperta)}>
          {aperta ? 'Show less' : 'Read the full review'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={aperta ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
      )}

      <figcaption>
        {r.autore}
        {r.paese && <span> &middot; {r.paese}</span>}
        {r.data && <span> &middot; {quando(r.data)}</span>}
      </figcaption>

      {/* Il collegamento all'originale. E' quello che separa "vera" da
          "sembra vera": chi ha un dubbio ci clicca una volta, non lo rifa'
          mai piu', e da quel momento crede anche a tutte le altre. */}
      {r.url_fonte && linkabile && (
        <a className="rv-verif" href={r.url_fonte} target="_blank" rel="noopener nofollow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Verify it on {NOMI[r.fonte]}
        </a>
      )}
    </figure>
  );
}
