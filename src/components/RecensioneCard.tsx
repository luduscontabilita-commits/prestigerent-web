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

export function RecensioneCard({ r }: { r: Recensione }) {
  const [aperta, setAperta] = useState(false);
  const lunga = r.testo.length > LUNGA;
  const mostrata = !lunga || aperta ? r.testo : r.testo.slice(0, LUNGA).replace(/\s+\S*$/, '');

  return (
    <figure className={'rv-card' + (aperta ? ' aperta' : '')}>
      <div className="rv-card-top">
        {/* l'iniziale al posto della foto: da' un volto alla riga e rende
            la scheda piu' simile a una recensione vera che a una citazione */}
        <span className="rv-avatar" aria-hidden="true">{r.autore.trim()[0]}</span>
        {/* `role="img"` non e' pignoleria: senza un ruolo che preveda un
            nome, su uno <span> nudo l'`aria-label` viene ignorato e resta
            solo il contenuto, cioe' cinque caratteri "★" e "☆" letti uno
            per uno. Il voto -- la sola cosa che quelle stelle vogliono
            dire -- non arrivava. Con `img` il lettore di schermo annuncia
            "5 out of 5, immagine" e smette di sillabare i simboli. In
            pagina non cambia niente: le stelle restano disegnate come
            prima. */}
        <span className="rv-stars" role="img" aria-label={`${r.voto} out of 5`}>{STELLE(r.voto)}</span>
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

      {/* NIENTE LINK QUI, ed e' una decisione, non una dimenticanza.

          Tripadvisor e' di proprieta' di Viator, e la pagina-prodotto del
          tour ha sopra il pulsante che prenota ATTRAVERSO Viator. Sei
          link in fondo a sei schede sono sei uscite verso l'intermediario
          che si trattiene il 25-30% -- partendo da un visitatore che era
          gia' qui.

          E soprattutto: quel link non porta alla singola recensione,
          porta all'elenco di tutte. Per verificare quella di Rosharnie
          bisognerebbe scorrere e cercarsela. Quindi sei link compravano
          esattamente la stessa credibilita' di uno.

          La verifica resta, ma in un punto solo: il badge in cima, che
          dice "Read them on Tripadvisor". Una porta dichiarata, dove chi
          legge non ha ancora deciso niente -- non sei porte accanto al
          calendario di prenotazione.

          Quando arriveranno le recensioni Google il problema sparisce: la
          pagina delle recensioni di Google non vende niente, e li' il link
          per recensione si potra' rimettere senza contropartite. */}
    </figure>
  );
}
