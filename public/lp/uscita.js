/* L'ULTIMO RICHIAMO, QUANDO IL MOUSE ESCE DALLA PAGINA.
 *
 * E' una RETE, non una leva: non convince chi resta, recupera qualcuno
 * che stava gia' andandosene. Va giudicato per quello -- se aumenta le
 * prenotazioni e' un di piu', se infastidisce chi stava comprando e' un
 * danno. Per questo tutto qui dentro e' scritto per non dare fastidio.
 *
 * ── SOLO SU COMPUTER, E NON E' UNA DIMENTICANZA ─────────────────────
 * Il gesto che lo fa partire e' il mouse che esce dal bordo ALTO dello
 * schermo, cioe' verso la barra delle schede o la X. Su un telefono quel
 * gesto non esiste: quello che gli somiglia -- il dito che va verso
 * l'alto -- e' semplicemente scorrere. Chi lo fa comparire anche li'
 * finisce per aprirlo mentre uno legge, ed e' il modo piu' rapido di
 * trasformare una rete in un fastidio. Il telefono ha gia' la barra
 * "prenota" appiccicata in basso, che fa lo stesso lavoro senza rubare
 * lo schermo.
 *
 * ── QUATTRO REGOLE, E OGNUNA TOGLIE UN MODO DI SBAGLIARE ────────────
 * 1. NON PRIMA DI 20 SECONDI. Chi chiude dopo tre secondi ha capito di
 *    essere sulla pagina sbagliata: fermarlo non serve, e un riquadro in
 *    faccia appena arrivato e' la definizione di finestra molesta.
 * 2. NON SE NON HA GUARDATO NIENTE. Serve almeno un po' di scorrimento:
 *    senza, e' un passaggio, non una visita.
 * 3. UNA VOLTA SOLA PER VISITA, e mai piu' se lo chiude. Chi ha detto no
 *    una volta lo ha detto per tutte.
 * 4. MAI SE STA GIA' PRENOTANDO. Se il calendario e' sotto gli occhi o
 *    la persona ha gia' copiato il codice, quello che stiamo per dirle
 *    lo sta gia' facendo -- e interromperla e' l'unico errore che qui
 *    costa davvero soldi.
 *
 * ── E NON PROMETTE NIENTE DI NUOVO ──────────────────────────────────
 * Ripete l'offerta che sta gia' in pagina: stesso codice, stessa
 * scadenza. Niente sconti "solo per te", niente contatori che ripartono.
 * Se sparisce la promozione (classe `promo-finita`) questo non compare
 * proprio: un ultimo richiamo che offre una cosa scaduta e' peggio di
 * nessun ultimo richiamo.
 */
(function () {
  'use strict';

  var TAG = document.currentScript;
  var CODICE = (TAG && TAG.getAttribute('data-codice')) || 'DIRECT10';
  var FINE = (TAG && TAG.getAttribute('data-fine')) || '30 September';

  /* niente su telefono e tablet: il gesto non esiste */
  try {
    if (!matchMedia('(min-width: 900px)').matches) return;
    if (!matchMedia('(pointer: fine)').matches) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { /* si mostra lo stesso, senza animazione */ }
  } catch (e) { return; }

  /* promozione finita: non c'e' niente da ricordare */
  if (document.documentElement.classList.contains('promo-finita')) return;

  try { if (sessionStorage.getItem('pr-uscita') === 'no') return; } catch (e) {}

  var PRONTO_DOPO = 20000;   /* vedi regola 1 */
  var pronto = false;
  setTimeout(function () { pronto = true; }, PRONTO_DOPO);

  var haGuardato = false;
  addEventListener('scroll', function () {
    if (scrollY > 400) haGuardato = true;
  }, { passive: true });

  /* regola 4: se il calendario e' a schermo, la persona sta gia' facendo
     quello che vorremmo dirle. Si guarda al momento, non prima. */
  function staPrenotando() {
    var el = document.getElementById('bookform') || document.querySelector('.pr-widget-holder');
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  }

  var css = document.createElement('style');
  css.textContent = [
    '.us-velo{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;',
    ' justify-content:center;background:rgba(15,20,26,.55);opacity:0;pointer-events:none;',
    ' transition:opacity .22s ease;}',
    '.us-velo.is-on{opacity:1;pointer-events:auto;}',
    '.us-box{position:relative;max-width:440px;margin:20px;padding:26px 26px 22px;',
    ' background:#FFF;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.32);',
    ' text-align:center;transform:translateY(10px);transition:transform .22s ease;}',
    '.us-velo.is-on .us-box{transform:none;}',
    '.us-box h3{margin:0 0 8px;font-size:1.32rem;line-height:1.25;color:#1A1A1A;}',
    '.us-box p{margin:0 0 16px;font-size:.94rem;line-height:1.6;color:#4A4A4A;}',
    '.us-cod{display:inline-flex;align-items:center;gap:10px;margin:0 0 16px;',
    ' padding:9px 10px 9px 16px;border-radius:999px;background:#FFF8F2;',
    ' border:2px dashed #C2541B;font-size:1.05rem;font-weight:900;letter-spacing:.08em;',
    ' color:#C2541B;cursor:pointer;font-family:inherit;}',
    '.us-cod span{font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;',
    ' padding:5px 11px;border-radius:999px;background:#C2541B;color:#FFF;}',
    '.us-cod.fatto span{background:#1F7A3A;}',
    '.us-vai{display:block;padding:13px 20px;border-radius:999px;background:#C2541B;',
    ' color:#FFF;text-decoration:none;font-weight:800;font-size:.95rem;letter-spacing:.04em;}',
    '.us-vai:hover{background:#A8471680;background:#A84716;}',
    '.us-no{position:absolute;top:8px;right:10px;background:none;border:0;cursor:pointer;',
    ' font-size:1.5rem;line-height:1;color:#8A8A8A;padding:6px 9px;}',
    '.us-no:hover{color:#1A1A1A;}',
    '@media (prefers-reduced-motion:reduce){.us-velo,.us-box{transition:none;}}'
  ].join('');
  document.head.appendChild(css);

  var velo = document.createElement('div');
  velo.className = 'us-velo';
  velo.setAttribute('role', 'dialog');
  velo.setAttribute('aria-modal', 'true');
  velo.setAttribute('aria-label', 'Your discount code');

  var box = document.createElement('div');
  box.className = 'us-box';

  var chiudi = document.createElement('button');
  chiudi.type = 'button';
  chiudi.className = 'us-no';
  chiudi.setAttribute('aria-label', 'Close');
  chiudi.textContent = '×';

  var h = document.createElement('h3');
  h.textContent = 'Before you go — your 10% is still here';

  var p = document.createElement('p');
  p.textContent = 'Paste this code at checkout and take 10% off your whole booking. '
                + 'It ends on ' + FINE + '.';

  var cod = document.createElement('button');
  cod.type = 'button';
  cod.className = 'us-cod';
  cod.appendChild(document.createTextNode(CODICE));
  var lab = document.createElement('span');
  lab.textContent = 'Copy';
  cod.appendChild(lab);

  var vai = document.createElement('a');
  vai.className = 'us-vai';
  vai.href = '#bookform';
  vai.textContent = 'CHECK AVAILABILITY';

  box.appendChild(chiudi); box.appendChild(h); box.appendChild(p);
  box.appendChild(cod); box.appendChild(vai);
  velo.appendChild(box);

  var aperto = false;
  function via() {
    velo.classList.remove('is-on');
    try { sessionStorage.setItem('pr-uscita', 'no'); } catch (e) {}
  }
  chiudi.addEventListener('click', via);
  velo.addEventListener('click', function (e) { if (e.target === velo) via(); });
  addEventListener('keydown', function (e) { if (aperto && e.key === 'Escape') via(); });

  cod.addEventListener('click', function () {
    /* stesso ripiego del pulsante in pagina: navigator.clipboard non
       esiste sui browser vecchi, e un pulsante che non fa niente e'
       peggio di nessun pulsante */
    function fatto() { cod.classList.add('fatto'); lab.textContent = 'Copied'; }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CODICE).then(fatto, seleziona);
      } else seleziona();
    } catch (e) { seleziona(); }
    function seleziona() {
      try {
        var t = document.createElement('textarea');
        t.value = CODICE; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); document.execCommand('copy');
        document.body.removeChild(t); fatto();
      } catch (e2) {}
    }
  });
  vai.addEventListener('click', via);

  document.addEventListener('mouseout', function (e) {
    if (aperto) return;
    if (!pronto || !haGuardato) return;
    if (e.relatedTarget || e.toElement) return;     /* si sta muovendo dentro la pagina */
    if (e.clientY > 6) return;                      /* esce dai lati o dal basso: non conta */
    if (staPrenotando()) return;                    /* regola 4 */
    aperto = true;
    if (!document.body.contains(velo)) document.body.appendChild(velo);
    requestAnimationFrame(function () { velo.classList.add('is-on'); });
    try { chiudi.focus(); } catch (e2) {}
  });
})();
