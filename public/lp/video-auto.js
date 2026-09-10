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

  /* 🔴 NON "il primo video della pagina": QUELLO DICHIARATO.
     La regola comoda era sbagliata -- su tre landing su quattro il primo
     video e' una scheda della striscia che scorre, e quella striscia
     clona le schede per l'anello infinito: partiva un filmato dentro un
     carosello in movimento, o un clone fuori schermo. */
  var v = document.querySelector('video[data-auto]');
  if (!v) return;

  /* 🔴 E NON SU TELEFONO. Questo mancava, ed era il difetto piu' caro:
     un video da 7 MB che parte da solo dove arriva il 79% del traffico e
     i dati li paga chi guarda. Su un telefono il filmato lo si avvia
     quando lo si vuole. */
  try { if (!matchMedia('(min-width: 900px)').matches) return; } catch (e) { return; }

  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) {}

  /* Senza IntersectionObserver non si sa quando entra a schermo: meglio
     lasciare il video com'era che farlo partire a caso. */
  if (!('IntersectionObserver' in window)) return;

  /* 🔴 SI PROVA CON L'AUDIO. Quasi sempre il browser rifiuta -- finche'
     la persona non ha toccato la pagina e' una regola di Chrome, Safari e
     Firefox insieme -- e allora si riparte muti chiedendo l'audio con un
     pulsante. Provare e basta vorrebbe dire un video che non parte, cioe'
     peggio di prima. */
  v.muted = false;
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

  /* IL PULSANTE DELL'AUDIO: acceso e spento, non a senso unico. Chi vuole
     silenzio lo ha in un tocco -- era l'altra meta' della richiesta. */
  var suono = document.createElement('button');
  suono.type = 'button';
  suono.className = 'vid-audio';
  suono.hidden = true;
  function scriviSuono() {
    suono.textContent = v.muted ? '🔇  Sound on' : '🔊  Sound off';
    suono.setAttribute('aria-label', v.muted ? 'Turn the sound on' : 'Turn the sound off');
  }
  suono.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    v.muted = !v.muted;
    if (!v.muted && v.paused) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    scriviSuono();
  });
  var cornice = v.parentNode;
  if (cornice) {
    cornice.appendChild(suono);
    var st = document.createElement('style');
    /* 🔴 GRANDE E CENTRATO. Era una pastiglia da 0,78rem incollata
       all'angolo in basso a sinistra: su una colonna da 232px
       spariva contro il video. Il pulsante dell'audio non e' un
       dettaglio -- e' l'unico modo di sentire quello che la persona
       nel video sta dicendo, cioe' tutto il motivo per cui il video
       sta li'. Centrato in basso e piu' grande si vede subito, e il
       dito lo prende al primo colpo anche su uno schermo tattile. */
    st.textContent = '.vid-audio{position:absolute;left:50%;bottom:14px;z-index:4;'
      + 'transform:translateX(-50%);white-space:nowrap;'
      + 'display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border:0;'
      + 'border-radius:999px;background:rgba(15,20,26,.85);color:#FFF;cursor:pointer;'
      + 'font:inherit;font-size:1rem;font-weight:800;letter-spacing:.02em;'
      + 'box-shadow:0 6px 18px rgba(0,0,0,.35);}'
      + '.vid-audio:hover{background:rgba(15,20,26,.96);}'
      + '@media (max-width:520px){.vid-audio{font-size:.9rem;padding:10px 18px;}}';
    document.head.appendChild(st);
  }

  /* 🔴 ECCO PERCHE' NON SI POTEVA NEMMENO ALZARE IL VOLUME.
     Sopra il video c'e' `.vid-play`, il pulsante grande, che si nasconde
     solo quando la cornice prende la classe `is-playing` -- classe messa
     dallo script del carosello quando PREMI tu. Partendo da soli non
     arrivava mai: quel pulsante restava sopra, si prendeva i clic, e i
     comandi del video sotto erano irraggiungibili. Adesso la mettiamo. */
  v.addEventListener('playing', function () {
    if (cornice && cornice.classList) cornice.classList.add('is-playing');
    suono.hidden = !v.muted;
    scriviSuono();
  });

  var uscendo = false;
  var occhio = new IntersectionObserver(function (voci) {
    voci.forEach(function (x) {
      if (x.isIntersecting && x.intersectionRatio >= 0.5) {
        if (fermatoAMano) return;
        var p = v.play();
        if (p && p.catch) p.catch(function () {
          /* rifiutato per via dell'audio: si riparte muti e lo si chiede */
          v.muted = true;
          suono.hidden = false;
          scriviSuono();
          var q = v.play();
          if (q && q.catch) q.catch(function () {});
        });
      } else if (!v.paused) {
        uscendo = true;
        v.pause();
        uscendo = false;
      }
    });
  }, { threshold: [0, 0.5] });

  occhio.observe(v);
})();
