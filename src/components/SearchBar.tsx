'use client';

import { useState } from 'react';

/* IL MODULO DI RICERCA sopra la piega.
 *
 * Trasforma un curioso in qualcuno che ha dichiarato un'intenzione, ed e'
 * l'elemento che converte di piu' su un sito di tour. Qui serve piu' che ai
 * concorrenti: il catalogo e' diviso per PUNTO DI PARTENZA -- Firenze, ma
 * anche i porti di Livorno, La Spezia, Civitavecchia e Napoli -- e oggi
 * trovare "i tour da Livorno" e' praticamente impossibile.
 *
 * ── PERCHE' NON C'E' LA DATA ────────────────────────────────────────
 * C'era, e non filtrava niente: un campo che si compila e viene ignorato.
 * Peggio ancora, prometteva un controllo che non facevamo -- si sceglie il
 * 30 agosto, si vedono i risultati, si apre un tour e il calendario dice
 * "non disponibile". L'abbiamo portato fin li' facendogli credere che
 * avessimo guardato, e la delusione arriva DOPO che si era convinto: il
 * momento peggiore possibile.
 *
 * Al suo posto il tipo di tour, che e' un filtro vero. La data torna il
 * giorno che sincronizzeremo la disponibilita' da Regiondo, e allora
 * filtrera' davvero.
 *
 * Tre campi grandi e un pulsante, come sui siti che funzionano. Ogni campo
 * ha la sua etichetta sopra e non un segnaposto dentro: il segnaposto
 * sparisce appena si scrive, e chi torna sul modulo non sa piu' cosa aveva
 * compilato.
 */

export type Partenza = { valore: string; etichetta: string };

const TIPI = [
  { valore: '', etichetta: 'Any kind of tour' },
  { valore: 'small_group', etichetta: 'Small group day tours' },
  { valore: 'private', etichetta: 'Private tours' },
  { valore: 'cruise', etichetta: 'Cruise port tours' },
  { valore: 'transfer', etichetta: 'Transfers' },
];

export function SearchBar({
  partenze,
  onCerca,
}: {
  partenze: Partenza[];
  onCerca: (p: { da: string; persone: number; tipo: string }) => void;
}) {
  const [da, setDa] = useState('');
  const [tipo, setTipo] = useState('');
  const [persone, setPersone] = useState(2);

  return (
    <form
      className="hm-search"
      onSubmit={(e) => {
        e.preventDefault();
        onCerca({ da, persone, tipo });
        document.getElementById('tours')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      <div className="hm-f">
        <label htmlFor="hm-da">Departing from</label>
        <select id="hm-da" value={da} onChange={(e) => setDa(e.target.value)}>
          <option value="">Anywhere in Italy</option>
          {partenze.map((p) => (
            <option key={p.valore} value={p.valore}>
              {p.etichetta}
            </option>
          ))}
        </select>
      </div>

      <div className="hm-f">
        <label htmlFor="hm-tp">Kind of tour</label>
        <select id="hm-tp" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPI.map((t) => (
            <option key={t.valore} value={t.valore}>
              {t.etichetta}
            </option>
          ))}
        </select>
      </div>

      <div className="hm-f">
        <label htmlFor="hm-px">Guests</label>
        <select id="hm-px" value={persone} onChange={(e) => setPersone(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 12, 20, 25].map((n) => (
            <option key={n} value={n}>
              {n === 25 ? '20 or more' : n === 1 ? '1 guest' : `${n} guests`}
            </option>
          ))}
        </select>
      </div>

      <button className="hm-go" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Find tours
      </button>
    </form>
  );
}
