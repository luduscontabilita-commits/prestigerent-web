/* IL PRIMO VIDEO PARTE DA SOLO, QUANDO ARRIVA A SCHERMO.
 *
 * Un video che va premuto non e' un video visto: e' una fotografia con
 * un triangolo sopra. Clarity conta 4,42% di sessioni con dead click e
 * un tempo attivo di 44 secondi -- in quei quarantaquattro secondi
 * nessuno decide di guardare un filmato, ma qualcosa che si muove da
 * solo lo guarda.
 *
 * ── SOLO IL PRIMO, E SOLO MUTO ──────────────────────────────────────
 * Il primo perche' e' quello scelto per convincere: gli altri stanno in
 * una striscia che si scorre, e farli partire tutti vorrebbe dire quattro
 * filmati che si muovono insieme mentre uno legge.
 *
 * Muto perche' NON C'E' ALTERNATIVA: ogni browser blocca la riproduzione
 * automatica con l'audio, e un video bloccato resta fermo sul primo
 * fotogramma -- cioe' peggio di prima, perche' non parte e nemmeno mostra
 * il pulsante. `muted` e `playsinline` non sono opzioni, sono le due
 * condizioni per cui la cosa funziona. I comandi restano: chi vuole
 * l'audio alza il volume, e a quel punto lo alza perche' HA DECISO di
 * guardare -- che e' esattamente il momento giusto.
 *
 * ── E SI FERMA QUANDO NON SI VEDE ───────────────────────────────────
 * Uscito dallo schermo si mette in pausa: un video che continua a girare
 * dove nessuno lo guarda consuma dati -- su una pagina il cui traffico e'
 * per il 79% da telefono -- e scarica la batteria per niente.
 *
 * ── E CHI NON VUOLE MOVIMENTO NON LO AVRA' ──────────────────────────
 * Con `prefers-reduced-motion` non parte niente. Non e' cortesia: per
 * qualcuno il movimento involontario e' un sintomo, non un fastidio.
 * E se la persona lo mette in pausa a mano, non riparte piu': una scelta
 * esplicita vale piu' di qualunque regola scritta qui.
 */
(function () {
  'use strict';

  var v = document.querySelector('video');
  if (!v) return;

  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) {}

  /* Senza IntersectionObserver non si sa quando entra a schermo: meglio
     lasciare il video com'era che farlo partire a caso. */
  if (!('IntersectionObserver' in window)) return;

  v.muted = true;                  /* obbligatorio: con l'audio nessun browser parte */
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.playsInline = true;
  v.loop = true;
  /* `preload="none"` impediva di avere i primi fotogrammi pronti, quindi
     alla comparsa restava nero per un attimo. Con "metadata" si scarica
     giusto l'inizio: il video vero parte quando serve. */
  if (v.getAttribute('preload') === 'none') v.setAttribute('preload', 'metadata');

  var fermatoAMano = false;
  v.addEventListener('pause', function () {
    /* la pausa che diamo noi uscendo dallo schermo non conta */
    if (!uscendo) fermatoAMano = true;
  });
  v.addEventListener('play', function () { fermatoAMano = false; });

  var uscendo = false;
  var occhio = new IntersectionObserver(function (voci) {
    voci.forEach(function (x) {
      if (x.isIntersecting && x.intersectionRatio >= 0.5) {
        if (fermatoAMano) return;
        var p = v.play();
        /* se il browser rifiuta lo stesso, non si insiste e non si
           scrive niente in console: resta il video com'era, coi comandi */
        if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) {
        uscendo = true;
        v.pause();
        uscendo = false;
      }
    });
  }, { threshold: [0, 0.5] });

  occhio.observe(v);
})();
