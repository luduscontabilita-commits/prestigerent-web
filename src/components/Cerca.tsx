'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { SearchBar, type Partenza } from '@/components/SearchBar';
import { HomeTours, type SchedaTour } from '@/components/HomeTours';

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
export function Cerca({ tours, partenze }: { tours: SchedaTour[]; partenze: Partenza[] }) {
  const [filtro, setFiltro] = useState<{ da: string; persone: number; tipo?: string } | null>(null);
  const [dove, setDove] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setDove(document.getElementById('lista-tour'));
  }, []);

  const lista = <HomeTours tours={tours} filtro={filtro} />;

  return (
    <>
      <SearchBar partenze={partenze} onCerca={setFiltro} />
      {dove ? createPortal(lista, dove) : lista}
    </>
  );
}
