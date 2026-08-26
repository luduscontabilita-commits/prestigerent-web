'use client';

import { useEffect, useState } from 'react';

/* LO SFONDO DELL'HERO CHE CAMBIA DA SOLO.
 *
 * Non e' un carosello e non deve sembrarlo: niente pallini, niente frecce,
 * niente da cliccare. Chi arriva sta leggendo il titolo e compilando la
 * ricerca -- se si accorge del cambio, il cambio e' fatto male.
 *
 * Il vincolo vero non e' grafico, e' di velocita': questa foto e' l'elemento
 * piu' grande dello schermo, quindi e' lei che Google cronometra (LCP). Da qui
 * discendono tutte le scelte che seguono, e sono tre.
 */

/* 1. QUANDO PARTE LA GIOSTRA.
 *
 * Chrome smette di aggiornare la misura solo al primo tocco: una dissolvenza
 * fatta partire troppo presto rischia di finire dentro la finestra in cui sta
 * ancora decidendo, e il punteggio peggiora senza che nulla sia piu' lento
 * davvero. Sei secondi sono ben oltre qualunque tempo di carico plausibile,
 * e nessuno se ne accorge: chi guarda sta ancora leggendo il titolo. */
const ARMA_DOPO = 6000;

/* 2. OGNI QUANTO. Sette secondi: piu' corto sembra un'insegna al neon, piu'
 * lungo e chi compila la ricerca non vede mai la seconda foto. */
const OGNI = 7000;

/* `alt` vale solo per la prima. Le altre cinque escono con `alt=""`: sono
 * decorazione, e far annunciare a un lettore di schermo sei paesaggi uno
 * dopo l'altro non aiuta nessuno. */
export function HeroFoto({ foto, alt }: { foto: string[]; alt: string }) {
  /* `viva` non e' solo "l'animazione e' accesa": e' anche l'interruttore che
   * MONTA le foto dalla seconda in poi. Prima di quel momento nel documento
   * c'e' una sola immagine, quindi il browser non ha alternative su cui
   * spendere banda mentre sta scaricando quella che verra' cronometrata. */
  const [viva, setViva] = useState(false);
  const [quale, setQuale] = useState(0);

  /* Dentro l'effetto si usa il NUMERO delle foto, non l'array: l'elenco e'
     scritto a mano nella pagina e viene ricreato a ogni render, quindi
     metterlo fra le dipendenze farebbe rimontare i timer di continuo. */
  const quante = foto.length;

  useEffect(() => {
    if (quante < 2) return;
    /* 3. CHI HA CHIESTO DI NON VEDERE ANIMAZIONI non le vede e non paga
     * nemmeno le foto in piu': si esce prima di montarle. Il CSS ha lo
     * stesso blocco, ma li' l'immagine sarebbe gia' stata scaricata. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const nato = performance.now();
    let primo = 0;
    let giro = 0;
    let annulla: (() => void) | null = null;

    const avvia = () => {
      setViva(true);
      /* I sei secondi si contano dal montaggio, non da adesso: se la pagina
         ci ha messo quattro secondi a caricare, l'attesa residua e' due, non
         altri sei. Il minimo e' garantito, l'attesa inutile no. */
      const manca = Math.max(0, ARMA_DOPO - (performance.now() - nato));
      primo = window.setTimeout(() => {
        setQuale((n) => (n + 1) % quante);
        giro = window.setInterval(() => setQuale((n) => (n + 1) % quante), OGNI);
      }, manca);
    };

    /* Dopo `load` E in un momento in cui il filo principale e' libero: le
       altre cinque foto non devono contendere la rete alla prima ne' fare da
       tappo davanti all'idratazione della ricerca. Il `timeout` e' la rete di
       sicurezza per le pagine che non stanno mai ferme. */
    const quandoLibero = () => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(avvia, { timeout: 2000 });
        annulla = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(avvia, 400);
        annulla = () => window.clearTimeout(id);
      }
    };

    if (document.readyState === 'complete') quandoLibero();
    else window.addEventListener('load', quandoLibero, { once: true });

    return () => {
      window.removeEventListener('load', quandoLibero);
      annulla?.();
      window.clearTimeout(primo);
      window.clearInterval(giro);
    };
  }, [quante]);

  return (
    <div className={viva ? 'hm-hero-bg viva' : 'hm-hero-bg'}>
      {foto.map((src, n) => {
        if (n > 0 && !viva) return null;
        const classe = n === quale ? 'hm-hero-foto on' : 'hm-hero-foto';
        /* La prima esce gia' dal server con la classe `on` addosso: senza
           JavaScript, e nel mezzo secondo prima dell'idratazione, l'hero e'
           esattamente quello di prima -- una foto, ferma, opaca. */
        if (n === 0) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} className={classe} src={src} alt={alt} fetchPriority="high" />
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} className={classe} src={src} alt="" loading="lazy" decoding="async" />
        );
      })}
    </div>
  );
}
