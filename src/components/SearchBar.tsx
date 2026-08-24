'use client';

import { useState } from 'react';

/* Il modulo di ricerca sopra la piega.
 *
 * E' l'elemento che converte di piu' su un sito di tour, perche' trasforma
 * un curioso in qualcuno che ha dichiarato un'intenzione. E qui serve piu'
 * che ai concorrenti: il catalogo Prestige e' diviso per PUNTO DI PARTENZA
 * (Firenze, ma anche i porti di Livorno, La Spezia, Civitavecchia, Napoli) e
 * oggi trovare "i tour da Livorno" e' praticamente impossibile.
 *
 * Per ora filtra la lista qui sotto: la ricerca vera per data arrivera'
 * quando ci sara' la disponibilita' di Regiondo per tutti i prodotti.
 */

export type Partenza = { valore: string; etichetta: string };

export function SearchBar({
  partenze,
  onCerca,
}: {
  partenze: Partenza[];
  onCerca: (p: { da: string; persone: number }) => void;
}) {
  const [da, setDa] = useState('');
  const [persone, setPersone] = useState(2);
  const oggi = new Date().toISOString().slice(0, 10);

  return (
    <form
      className="hm-search"
      onSubmit={(e) => {
        e.preventDefault();
        onCerca({ da, persone });
        document.getElementById('tours')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      <div className="hm-f">
        <label htmlFor="hm-da">Departing from</label>
        <select id="hm-da" value={da} onChange={(e) => setDa(e.target.value)}>
          <option value="">Anywhere in Italy</option>
          {partenze.map((p) => (
            <option key={p.valore} value={p.valore}>{p.etichetta}</option>
          ))}
        </select>
      </div>

      <div className="hm-f">
        <label htmlFor="hm-px">Guests</label>
        <select id="hm-px" value={persone} onChange={(e) => setPersone(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 12, 20, 25].map((n) => (
            <option key={n} value={n}>{n === 25 ? '20+' : n}</option>
          ))}
        </select>
      </div>

      <div className="hm-f">
        <label htmlFor="hm-dt">Date</label>
        <input id="hm-dt" type="date" defaultValue={oggi} min={oggi} />
      </div>

      <button className="hm-go" type="submit">Find tours</button>
    </form>
  );
}
