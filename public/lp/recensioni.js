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

  fetch('/api/recensioni/?tour=' + encodeURIComponent(MIO) + '&n=6', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var v = j && j.recensioni;
      /* Meno di quattro non vale il cambio: si finirebbe per svuotare un
         blocco pieno per rimpiazzarlo con due carte, che sembra un guasto
         anche quando non lo e'. */
      if (!v || v.length < 4) return;
      var nuovo = document.createDocumentFragment();
      for (var i = 0; i < v.length; i++) nuovo.appendChild(carta(v[i]));
      griglia.textContent = '';
      griglia.appendChild(nuovo);
    })
    .catch(function () {
      /* Restano le carte statiche. Nessun errore in console: non e'
         successo niente di male, e' solo non successo niente. */
    });
})();
