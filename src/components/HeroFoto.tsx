'use client';

import { useEffect, useState } from 'react';
import { foto as ottimizza, fotoSet } from '@/lib/foto';

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
/* OGNI FOTO PORTA CON SE' IL SUO PUNTO DI FUOCO.
 *
 * Non e' una stringa in piu' per gusto: da quando su telefono la scatola
 * della foto e' quadrata (home.css), un'immagine orizzontale ci entra
 * tagliata di meta' larghezza, e "meta' presa dal centro" e' il taglio
 * sbagliato per la torre di Pisa, per la chiesa di Siena e per le Cinque
 * Terre -- il soggetto sta da una parte. Il valore e' misurato foto per
 * foto e sta scritto accanto all'indirizzo, in page.tsx, dove si vede
 * insieme a quale foto e'.
 *
 * `ripiego` c'e' solo sulla prima, ed e' l'originale su Storage: quella
 * passa da /render/image/ per pesare un terzo, e se un giorno la
 * trasformazione delle immagini venisse spenta sul progetto l'indirizzo
 * risponderebbe in errore. Con il ripiego l'hero torna pesante; senza,
 * resterebbe bianco. E' lo stesso patto del menu (`miniatura` in
 * src/lib/menu.ts). */
export type FotoHero = { src: string; fuoco: string; ripiego?: string };

export function HeroFoto({ foto, alt }: { foto: FotoHero[]; alt: string }) {
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
      {foto.map((f, n) => {
        if (n > 0 && !viva) return null;

        /* LA PILA, NON LO SCAMBIO.
         *
         * `passi` e' quanti cambi fa questa foto era quella in primo piano:
         * 0 e' quella di adesso, 1 quella appena scavalcata, e cosi' via
         * all'indietro fino in fondo al mazzo. Il modulo serve al giro di
         * boa, quando dall'ultima si torna alla prima.
         *
         * Da qui esce l'ordine di impilamento: la piu' recente sta sopra a
         * tutte. Cosi' la nuova non ha bisogno che quella sotto si tolga di
         * mezzo -- le si mette davanti. E' tutta la differenza fra una
         * dissolvenza che si vede e una che non si vede: se le due foto si
         * scambiano l'opacita' a meta' strada stanno tutte e due a mezzo, e
         * due veli al 50% non fanno un muro -- si vede attraverso fino allo
         * sfondo della pagina, che qui e' chiaro. Con il velo scuro sopra il
         * risultato e' un lampo torbido esattamente a meta' transizione. */
        const passi = (quale - n + quante) % quante;

        /* `sotto` e' la penultima: resta OPACA per tutto il tempo in cui la
           nuova le sta salendo davanti, e solo dopo puo' sparire. E' lei il
           fondo pieno che impedisce di vedere attraverso. */
        const classe =
          passi === 0 ? 'hm-hero-foto on' : passi === 1 ? 'hm-hero-foto sotto' : 'hm-hero-foto';

        /* Lo `z-index` sta qui e non nel CSS perche' dipende da quante foto
           passa la pagina: e' l'unica cosa che il foglio di stile non puo'
           sapere da solo. Nessuna misura, nessun ridisegno -- solo l'ordine
           in cui la scheda grafica sovrappone livelli che ha gia' pronti. */
        /* `objectPosition` sta accanto allo `z-index` per lo stesso motivo:
           non e' grafica del foglio di stile, e' un dato di QUESTA foto. Non
           costa niente -- il browser sposta il ritaglio di un'immagine che ha
           gia', senza rimisurare la pagina. */
        const pila = { zIndex: quante - passi, objectPosition: f.fuoco };

        /* La prima esce gia' dal server con la classe `on` addosso: senza
           JavaScript, e nel mezzo secondo prima dell'idratazione, l'hero e'
           esattamente quello di prima -- una foto, ferma, opaca. */
        if (n === 0) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.src}
              className={classe}
              style={pila}
              /* L'hero e' a schermo pieno, quindi si chiede grande -- ma
                 in WebP, che sulla stessa foto pesa un terzo del JPG. E'
                 l'immagine che decide il tempo di caricamento percepito:
                 vale la pena servirla bene, non solo prima. */
              src={ottimizza(f.src, 1920)}
              srcSet={fotoSet(f.src, [828, 1200, 1920])}
              sizes="100vw"
              alt={alt}
              fetchPriority="high"
              onError={(e) => {
                /* UNA VOLTA SOLA. Il segno sta nel DOM e non in una
                   variabile: React non toglie il proprio gestore assegnando
                   `img.onerror = null` -- quello e' un'altra cosa -- e senza
                   il segno un ripiego che a sua volta fallisce si
                   rimetterebbe da capo all'infinito.
                   NOTA ONESTA: se l'immagine fallisce PRIMA che la pagina si
                   idrati, questo gestore non c'e' ancora e nessuno la
                   sostituisce. Copre il caso probabile, non tutti. */
                const img = e.currentTarget;
                if (!f.ripiego || img.dataset.ripiego === 'si') return;
                img.dataset.ripiego = 'si';
                img.src = f.ripiego;   /* il ripiego resta l'originale: se l'ottimizzatore e' il problema, passarci di nuovo non aiuta */
              }}
            />
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.src}
            className={classe}
            style={pila}
            src={ottimizza(f.src, 1200)}
            srcSet={fotoSet(f.src, [828, 1200, 1920])}
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
          />
        );
      })}
    </div>
  );
}
