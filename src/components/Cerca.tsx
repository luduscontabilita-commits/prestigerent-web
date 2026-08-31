'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { SearchBar, type Partenza } from '@/components/SearchBar';
import { HomeTours, type SchedaTour } from '@/components/HomeTours';
import type { Cambi } from '@/lib/cambi';

/* Tiene insieme il modulo di ricerca e la lista dei tour.
 *
 * Servono due posti diversi nella pagina: il modulo sopra la foto, la
 * lista molto piu' in basso. Ma condividono un filtro solo, quindi lo
 * stato deve stare in un componente che li contiene entrambi -- e la
 * lista si disegna dove le spetta con un portale, invece di trascinare
 * mezza home dentro l'hero.
 *
 * Prima del montaggio il portale non esiste: la lista si disegna comunque
 * qui e ci resta se il browser non esegue JavaScript. Cosi' i link ai
 * tour sono nel codice della pagina anche per chi la scansiona.
 */
export function Cerca({
  tours,
  partenze,
  cambio,
}: {
  tours: SchedaTour[];
  partenze: Partenza[];
  /* i cambi del giorno: li legge il server, qui passano e basta */
  cambio: Cambi | null;
}) {
  const [filtro, setFiltro] = useState<{ da: string; persone: number; tipo?: string } | null>(null);
  const [dove, setDove] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setDove(document.getElementById('lista-tour'));
  }, []);

  const lista = <HomeTours tours={tours} filtro={filtro} cambio={cambio} />;

  return (
    <>
      {/* 🔴 IL MODULO DI RICERCA E' SPENTO, NON CANCELLATO.
       *
       * Occupava mezzo schermo sopra la foto -- tre pastiglie e un
       * pulsante -- e la foto e' quello che si vende. Si riaccende
       * togliendo il commento, e torna esattamente com'era.
       *
       * ⚠️ NON si toglie il componente `Cerca` dalla home per spegnerlo:
       * la lista dei tour la disegna LUI, con un portale dentro
       * `#lista-tour`. Togliendolo sparirebbero anche i tour, ed e' un
       * effetto che non si vede leggendo la home -- il portale rende la
       * dipendenza invisibile da fuori.
       *
       * Resta anche `filtro`, che senza il modulo vale sempre null: la
       * lista si comporta come se nessuno avesse cercato niente, che e'
       * il caso di partenza. */}
      {/* <SearchBar partenze={partenze} onCerca={setFiltro} /> */}
      {dove ? createPortal(lista, dove) : lista}
    </>
  );
}
