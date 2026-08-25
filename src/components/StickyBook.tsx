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
    const form = document.getElementById('bookform');
    if (!('IntersectionObserver' in window)) return;

    /* PRIMA COMPARIVA TROPPO TARDI: aspettava che l'INTERA immagine di
       testata fosse uscita dallo schermo, e su un telefono l'hero e' alto
       quanto lo schermo -- quindi per la prima schermata e mezza non
       c'era modo di prenotare senza risalire.
       Ora bastano 300px: appena si comincia a scorrere davvero, il
       prezzo e il pulsante sono li'. */
    let scorso = false;
    let formDentro = false;
    const aggiorna = () => setMostra(scorso && !formDentro);

    const alloScroll = () => {
      const ora = window.scrollY > 300;
      if (ora !== scorso) {
        scorso = ora;
        aggiorna();
      }
    };
    window.addEventListener('scroll', alloScroll, { passive: true });
    alloScroll();

    /* Il calendario a schermo la fa sparire: mostrarla mentre il modulo
       di prenotazione e' gia' visibile e' un doppione che copre la
       pagina. */
    let o: IntersectionObserver | null = null;
    if (form) {
      o = new IntersectionObserver(
        (e) => {
          formDentro = e[0].isIntersecting;
          aggiorna();
        },
        { threshold: 0 }
      );
      o.observe(form);
    }

    return () => {
      window.removeEventListener('scroll', alloScroll);
      o?.disconnect();
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
      {/* Due modi di agire, non uno. Chi e' convinto prenota; chi ha un
          dubbio scrive -- e senza il secondo pulsante quel dubbio diventa
          una scheda chiusa. Il CSS della landing prevede gia' questo
          bottone (.pr-sticky-wa). */}
      <a
        className="pr-sticky-wa"
        href="https://wa.me/393338424047"
        target="_blank"
        rel="noopener"
        aria-label="Ask us on WhatsApp"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.26-8.25" />
        </svg>
      </a>

      <a className="cta" href="#bookform">
        BOOK NOW
      </a>
    </div>
  );
}
