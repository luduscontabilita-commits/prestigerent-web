'use client';

import { useEffect, useState } from 'react';

/* La barra fissa in basso con prezzo e pulsante, come sulla landing.
 *
 * Compare quando l'hero e' uscito di scena e il calendario NON e' a schermo:
 * mostrarla mentre il modulo di prenotazione e' gia' visibile sarebbe un
 * doppione che copre la pagina.
 *
 * Sopra i 1180px il calendario sta nella colonna appiccicata a destra ed e'
 * sempre sotto gli occhi: li' la barra non serve e resta nascosta dal CSS
 * della landing, che la mostra solo sotto i 760px. Qui la soglia si allarga
 * a 1179px, perche' fra 760 e 1180 il calendario e' in fondo alla pagina e
 * senza barra bisogna cercarlo.
 */
export function StickyBook({
  titolo,
  prezzo,
  unita,
}: {
  titolo: string;
  prezzo: number | null;
  unita: string;
}) {
  const [mostra, setMostra] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('top');
    const form = document.getElementById('bookform');
    if (!hero || !form || !('IntersectionObserver' in window)) return;

    let heroFuori = false;
    let formDentro = false;
    const aggiorna = () => setMostra(heroFuori && !formDentro);

    const o1 = new IntersectionObserver(
      (e) => {
        heroFuori = !e[0].isIntersecting;
        aggiorna();
      },
      { threshold: 0 }
    );
    const o2 = new IntersectionObserver(
      (e) => {
        formDentro = e[0].isIntersecting;
        aggiorna();
      },
      { threshold: 0 }
    );
    o1.observe(hero);
    o2.observe(form);
    return () => {
      o1.disconnect();
      o2.disconnect();
    };
  }, []);

  return (
    <div className={'pr-sticky pr-sticky-tour' + (mostra ? ' show' : '')} id="prSticky">
      <div className="pr-sticky-info">
        <div className="pr-sticky-title">{titolo}</div>
        {prezzo != null && (
          <div className="pr-sticky-price">
            <span className="from">from</span> <b>&euro;{prezzo.toFixed(0)}</b>{' '}
            <span className="per">{unita}</span>
          </div>
        )}
      </div>
      <a className="cta" href="#bookform">
        BOOK NOW
      </a>
    </div>
  );
}
