/* LE RECENSIONI DELLA LANDING, DAL VIVO INVECE CHE COPIATE.
 *
 * In pagina le sei carte ci sono gia', scritte a mano. Erano una COPIA
 * presa dalla scheda /tour/, e una copia invecchia: il 09/09/2026 la piu'
 * recente era del 28 luglio. Una recensione vecchia non dice "il tour e'
 * bello", dice "qui non passa piu' nessuno da un pezzo" -- ed e' l'unica
 * cosa che la prova sociale non deve mai far pensare.
 *
 * Questo file chiede le piu' recenti a /api/recensioni/ e sostituisce le
 * carte. Da oggi la landing non ha piu' una copia da ricordarsi di
 * rinfrescare: ha la stessa fonte della scheda.
 *
 * ── LE STATICHE RESTANO, E SERVONO ──────────────────────────────────
 * Si sostituisce SOLO se arrivano abbastanza recensioni buone. Se la rete
 * cade, se la rotta sbaglia, se il database e' lento, in pagina restano le
 * sei di prima: su una pagina che vive di prova, il caso peggiore deve
 * restare leggibile. Meglio una recensione di luglio che un buco.
 *
 * ── LA DATA CI RESTA ────────────────────────────────────────────────
 * "Fred P. · August 2026". Il mese e' quello che rende una recensione
 * controllabile, ed e' tutto il lavoro che la prova deve fare: senza data
 * torna a essere una frase che potrebbe aver scritto chiunque, cioe' la
 * stessa cosa che scrivono i concorrenti. Il rimedio a una recensione
 * vecchia non e' nascondere quando e' stata scritta, e' prenderne una piu'
 * fresca -- che e' esattamente quello che fa questo file.
 */
(function () {
  'use strict';

  var TAG = document.currentScript;
  var MIO = (TAG && TAG.getAttribute('data-tour')) || '';
  if (!MIO) return;

  var griglia = document.querySelector('.lp-rvs-grid');
  if (!griglia) return;

  var MESI = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];

  function quando(iso) {
    /* La data si spezza a mano invece di passare da `new Date`: una data
       secca tipo "2026-08-22" viene letta come mezzanotte UTC, e a ovest
       di Greenwich diventa il giorno prima -- cioe' il mese sbagliato per
       chi prenota dagli Stati Uniti, che e' quasi tutto il traffico. */
    var p = String(iso || '').split('-');
    if (p.length < 2) return '';
    var m = parseInt(p[1], 10);
    if (!(m >= 1 && m <= 12)) return '';
    return MESI[m - 1] + ' ' + p[0];
  }

  function stelle(v) {
    var n = Math.max(0, Math.min(5, Math.round(v || 5)));
    return new Array(n + 1).join('★') + new Array(5 - n + 1).join('☆');
  }

  /* Tutto con textContent: i testi li scrivono i clienti, e un testo che
     arriva da fuori non si consegna mai a innerHTML. */
  function carta(r) {
    var fig = document.createElement('figure');
    fig.className = 'lp-rv';

    var top = document.createElement('div');
    top.className = 'lp-rv-top';

    var ini = document.createElement('span');
    ini.className = 'lp-rv-ini';
    ini.setAttribute('aria-hidden', 'true');
    ini.textContent = (r.autore || '?').trim().charAt(0);

    var st = document.createElement('span');
    st.className = 'lp-rv-star';
    st.setAttribute('role', 'img');
    st.setAttribute('aria-label', (r.voto || 5) + ' out of 5');
    st.textContent = stelle(r.voto);

    var src = document.createElement('span');
    src.className = 'lp-rv-src';
    src.textContent = r.fonte || 'Verified booking';

    top.appendChild(ini); top.appendChild(st); top.appendChild(src);
    fig.appendChild(top);

    if (r.titolo) {
      var t = document.createElement('strong');
      t.textContent = r.titolo;
      fig.appendChild(t);
    }

    var q = document.createElement('blockquote');
    q.textContent = r.testo || '';
    fig.appendChild(q);

    var cap = document.createElement('figcaption');
    var d = quando(r.data);
    cap.textContent = (r.autore || '') + (d ? ' · ' + d : '');
    fig.appendChild(cap);

    return fig;
  }

  /* ── LE SCHEDE SI MUOVONO DA SOLE ─────────────────────────────────
   *
   * Ferme, una fila che "sborda" a destra chiede di essere trascinata --
   * e quasi nessuno lo fa: sul telefono forse, col mouse quasi mai.
   * Muovendosi dicono da sole che ce n'e' delle altre.
   *
   * VANNO NEL SENSO OPPOSTO alla striscia delle foto, che scorre gia' e
   * sposta il contenuto verso sinistra (`scrollLeft += velocita`). Due
   * fasce che scivolano nello stesso verso sembrano una ripetizione; in
   * senso contrario sembrano due cose diverse, ed e' quello che sono.
   *
   * L'anello e' senza cuciture perche' le schede si CLONANO una volta:
   * arrivati alla fine dell'originale si torna a zero e nessuno vede il
   * salto. I cloni sono nascosti ai lettori di schermo, altrimenti le
   * recensioni verrebbero lette due volte.
   *
   * E SI FERMA QUANDO SERVE: col mouse sopra, appena qualcuno trascina o
   * gira la rotellina, e sempre con `prefers-reduced-motion`. Sopra un
   * testo da leggere, un movimento che non si lascia interrompere e'
   * peggio del non muoversi affatto.
   */
  function muovi() {
    var fermo = false;
    try { fermo = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    if (fermo) return;

    var carte = [].slice.call(griglia.children);
    if (carte.length < 3) return;          /* poche: non c'e' niente da scorrere */

    for (var i = 0; i < carte.length; i++) {
      var c = carte[i].cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      griglia.appendChild(c);
    }
    griglia.classList.add('va-da-sola');

    var giro = 0;
    function misura() {
      giro = carte.length ? griglia.children[carte.length].offsetLeft
                          - griglia.children[0].offsetLeft : 0;
    }
    misura();
    addEventListener('resize', misura);

    /* Si parte da meta' anello: andando all'indietro, da zero il primo
       fotogramma sarebbe gia' un salto. */
    griglia.scrollLeft = giro;

    var VELOCITA = 0.4;   /* piu' lenta delle foto: qui si legge */
    var pausa = false, ridai;
    function sospendi(ms) {
      pausa = true;
      clearTimeout(ridai);
      if (ms) ridai = setTimeout(function () { pausa = false; }, ms);
    }
    griglia.addEventListener('pointerenter', function () { sospendi(0); });
    griglia.addEventListener('pointerleave', function () { pausa = false; });
    griglia.addEventListener('pointerdown', function () { sospendi(6000); });
    griglia.addEventListener('wheel', function () { sospendi(6000); }, { passive: true });
    griglia.addEventListener('touchstart', function () { sospendi(6000); }, { passive: true });

    (function battito() {
      if (!pausa && giro > 0) {
        griglia.scrollLeft -= VELOCITA;
        if (griglia.scrollLeft <= 0) griglia.scrollLeft += giro;
      }
      requestAnimationFrame(battito);
    })();
  }

  fetch('/api/recensioni/?tour=' + encodeURIComponent(MIO) + '&n=6', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var v = j && j.recensioni;
      /* Meno di quattro non vale il cambio: si finirebbe per svuotare un
         blocco pieno per rimpiazzarlo con due carte, che sembra un guasto
         anche quando non lo e'. */
      if (v && v.length >= 4) {
        var nuovo = document.createDocumentFragment();
        for (var i = 0; i < v.length; i++) nuovo.appendChild(carta(v[i]));
        griglia.textContent = '';
        griglia.appendChild(nuovo);
      }
      /* IL PUNTEGGIO: SCRITTO DAL DATABASE, NON A MANO.
         In pagina c'era "8,167", che nel frattempo era diventato 8.250 in
         tabella e 8.306 su Viator: il numero piu' importante della pagina
         invecchiava da solo. E stava sotto il logo Tripadvisor mentre e'
         di Viator -- attribuire la credenziale piu' forte alla
         piattaforma sbagliata e' un errore che, se qualcuno lo verifica,
         si porta dietro tutto il resto.
         Il ripiego in pagina resta "8,000+": vero comunque, e non
         invecchia. Meglio dire meno del vero che un numero preciso e
         sbagliato. */
      var pu = j && j.punteggio;
      if (pu && pu.quante > 0) {
        var NOMI = { viator:'Viator', tripadvisor:'Tripadvisor', google:'Google',
                     getyourguide:'GetYourGuide', regiondo:'direct bookings' };
        var quanti = String(pu.quante).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        [].forEach.call(document.querySelectorAll('[data-quante]'), function (el) {
          el.textContent = quanti;
        });
        [].forEach.call(document.querySelectorAll('[data-voto]'), function (el) {
          el.textContent = String(pu.voto);
        });
        var nome = NOMI[pu.fonte] || pu.fonte;
        [].forEach.call(document.querySelectorAll('[data-fonte]'), function (el) {
          el.textContent = ' on ' + nome;
        });
        /* Il logo si spegne se non e' la piattaforma giusta: un marchio
           sbagliato accanto a un numero vero e' peggio di nessun marchio. */
        var logo = document.querySelector('[data-logo]');
        if (logo && pu.fonte !== 'tripadvisor') logo.hidden = true;
      }

      /* Il movimento parte DOPO aver deciso il contenuto: partendo prima
         si clonerebbero le schede statiche e poi si sostituirebbero,
         lasciando in fila i cloni di recensioni che non ci sono piu'. */
      muovi();
    })
    .catch(function () {
      /* Restano le carte statiche, e si muovono lo stesso: la rete caduta
         non e' un motivo per lasciare ferma la pagina. */
      muovi();
    });
})();
