/* I RIQUADRI DELLE PRENOTAZIONI VERE, SULLE LANDING.
 *
 * Sul sito questa cosa c'e' gia' (src/components/ProvaSociale.tsx). Le
 * landing sono HTML statico e non montano React, ma stanno sullo STESSO
 * dominio: quindi possono chiamare la stessa rotta, /api/prenotazioni/,
 * e mostrare le stesse prenotazioni. Nessun dato nuovo, nessuna copia da
 * tenere allineata: la fonte resta una sola.
 *
 * ── SONO VERE ───────────────────────────────────────────────────────
 * Vengono da Regiondo. Nessun "12 persone stanno guardando", nessun
 * numero casuale: quella roba si smaschera ricaricando due volte, e chi
 * la smaschera smette di credere anche a quello che e' vero -- le 8.167
 * recensioni, la garanzia, il contatore di settembre. Su una pagina in
 * cui tutto il resto e' verificabile, la riprova non puo' essere l'unica
 * cosa inventata. Con 43 ordini in un giorno non serve inventare niente.
 *
 * ── UNA DIFFERENZA VOLUTA RISPETTO AL SITO ──────────────────────────
 * Sul sito il riquadro e' un collegamento alla scheda del tour. Qui NO:
 * su una landing mandare via chi sta leggendo e' l'unico errore che non
 * si recupera, e la scheda /tour/ per giunta non ha ne' il codice ne'
 * l'offerta di settembre. Qui il riquadro porta al calendario di QUESTA
 * pagina: la prova diventa il gesto successivo invece di una fuga.
 *
 * ── IL TOUR DI QUESTA PAGINA PRIMA DI TUTTI ─────────────────────────
 * "Qualcuno ha prenotato QUESTO" risponde alla domanda che chi legge si
 * sta facendo in quel momento. "Qualcuno ha prenotato un altro tour" e'
 * rumore, e su una pagina con un prodotto solo e' pure un invito ad
 * andare a cercarne un altro. Lo slug si dichiara sul tag <script> con
 * data-tour, perche' la landing -- a differenza di /tour/<slug>/ -- non
 * ha il nome del prodotto nell'indirizzo e non puo' dedurlo.
 *
 * ── COSA NON C'E' DENTRO ────────────────────────────────────────────
 * Il cognome per intero e il codice di prenotazione. Non li toglie
 * questo file: non arrivano proprio dalla rotta, che pubblica nome piu'
 * iniziale. Quello che passa di qui e' leggibile da chiunque apra gli
 * strumenti del browser, quindi va trattato come gia' pubblico.
 * E si scrive con textContent, mai con innerHTML: i nomi li digitano i
 * clienti, e un nome e' testo che arriva da fuori.
 */
(function () {
  'use strict';

  var TAG = document.currentScript;
  var MIO = (TAG && TAG.getAttribute('data-tour')) || '';

  var PRIMO = 12000;   /* non subito: sovrapporsi al titolo mentre uno sta
                          ancora capendo dov'e' finito e' il modo migliore
                          di farsi chiudere al primo colpo */
  var OGNI  = 22000;
  var DURA  = 7000;
  var MASSIMO = 6;     /* sei e poi basta: al settimo riquadro ricompare
                          la stessa persona con la stessa ora, e da quel
                          momento viene letto come finto tutto l'insieme,
                          comprese le prenotazioni vere passate prima */
  var AGGIORNA = 60000;

  /* Chi ha gia' detto basta in questa visita non li rivede: se ha chiuso
     una volta, ripresentarsi e' molestia, non marketing. */
  try { if (sessionStorage.getItem('pr-avvisi') === 'no') return; } catch (e) {}

  /* ── lo stile ────────────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '.ps{position:fixed;left:20px;bottom:20px;z-index:70;display:flex;align-items:stretch;',
    ' max-width:390px;background:#fff;border:1px solid rgba(0,0,0,.10);border-radius:14px;',
    ' box-shadow:0 16px 40px rgba(0,0,0,.16);opacity:0;transform:translateY(14px) scale(.97);',
    ' pointer-events:none;transition:opacity .3s ease,transform .3s cubic-bezier(.2,.8,.3,1);}',
    '.ps.is-on{opacity:1;transform:none;pointer-events:auto;}',
    '.ps-in{display:flex;align-items:flex-start;gap:11px;padding:13px 6px 13px 15px;',
    ' text-decoration:none;color:inherit;flex:1;cursor:pointer;background:none;border:0;',
    ' text-align:left;font:inherit;}',
    '.ps-in:hover .ps-testo b{color:#C2541B;}',
    /* il pallino che pulsa: dice "adesso" senza doverlo scrivere */
    '.ps-punto{width:9px;height:9px;flex:none;margin-top:5px;border-radius:50%;',
    ' background:#22C55E;box-shadow:0 0 0 0 rgba(34,197,94,.55);animation:ps-batte 2.2s infinite;}',
    '@keyframes ps-batte{70%{box-shadow:0 0 0 9px rgba(34,197,94,0);}100%{box-shadow:0 0 0 0 rgba(34,197,94,0);}}',
    '.ps-testo{font-size:.84rem;line-height:1.42;color:#4A4A4A;}',
    '.ps-testo b{color:#1A1A1A;font-weight:800;transition:color .15s;}',
    '.ps-testo em{display:block;margin-top:3px;font-style:normal;font-size:.72rem;',
    ' font-weight:700;color:#4A4A4A;opacity:.9;line-height:1.5;}',
    '.ps-ospiti{color:#1A1A1A;}',
    '.ps-x{flex:none;align-self:flex-start;background:none;border:0;cursor:pointer;',
    ' padding:8px 11px 8px 4px;font-size:1.1rem;line-height:1;color:#4A4A4A;opacity:.85;}',
    '.ps-x:hover{opacity:1;color:#C2541B;}',
    /* Su telefono c'e' lo stesso -- li' arriva la maggior parte del
       traffico, ed e' l'ultimo posto dove ha senso spegnere la prova.
       Ma NON deve coprire la barra "prenota": quella e' il pulsante che
       va premuto, e una riprova che nasconde la conversione e' un danno
       netto. L'altezza della barra non si indovina, si misura. */
    '@media (max-width:760px){.ps{left:10px;right:10px;max-width:none;',
    ' bottom:calc(var(--ps-sotto,78px) + env(safe-area-inset-bottom,0px));',
    ' border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.16);}',
    ' .ps-in{padding:10px 4px 10px 12px;gap:9px;}',
    ' .ps-testo{font-size:.8rem;} .ps-testo em{font-size:.68rem;}}',
    '@media (prefers-reduced-motion:reduce){.ps{transition:opacity .2s;transform:none;}',
    ' .ps-punto{animation:none;}}'
  ].join('');
  document.head.appendChild(css);

  /* ── il riquadro ─────────────────────────────────────────────────── */
  var box = document.createElement('div');
  box.className = 'ps';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');

  var dentro = document.createElement('button');
  dentro.type = 'button';
  dentro.className = 'ps-in';

  var punto = document.createElement('span');
  punto.className = 'ps-punto';
  punto.setAttribute('aria-hidden', 'true');

  var testo = document.createElement('span');
  testo.className = 'ps-testo';
  dentro.appendChild(punto);
  dentro.appendChild(testo);

  var ics = document.createElement('button');
  ics.type = 'button';
  ics.className = 'ps-x';
  ics.setAttribute('aria-label', 'Stop showing these');
  ics.textContent = '×';

  box.appendChild(dentro);
  box.appendChild(ics);

  var spento = false;
  var avvio, giro, sonda, viaChe;

  /* Il riquadro porta al calendario di questa pagina, non altrove.
     Le landing non chiamano tutte allo stesso modo il punto in cui si
     prenota -- le due rifatte hanno `bookform`, quella vecchia `book` --
     quindi si provano nell'ordine invece di darne per scontato uno: se
     non si trovasse niente il riquadro diventerebbe un pulsante che non
     fa nulla, che e' peggio di un riquadro non cliccabile. */
  dentro.addEventListener('click', function () {
    var t = document.getElementById('bookform') || document.getElementById('book');
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  ics.addEventListener('click', function () {
    spento = true;
    box.classList.remove('is-on');
    try { sessionStorage.setItem('pr-avvisi', 'no'); } catch (e) {}
    clearTimeout(avvio); clearInterval(giro); clearInterval(sonda);
  });

  /* ── quanto tempo fa ─────────────────────────────────────────────── */
  function quantoFa(iso) {
    var min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 60) return Math.max(2, min) + ' minutes ago';
    var ore = Math.round(min / 60);
    if (ore < 24) return ore === 1 ? 'an hour ago' : ore + ' hours ago';
    var gg = Math.round(ore / 24);
    return gg === 1 ? 'yesterday' : gg + ' days ago';
  }

  /* ── i dati ──────────────────────────────────────────────────────── */
  var righe = [];
  var visti = {};
  var n = 0;

  /* `sort` in JavaScript e' stabile: dentro i due gruppi l'ordine per data
     piu' recente che arriva dalla rotta non si perde. */
  function ordina(a) {
    if (!MIO) return a.slice();
    return a.slice().sort(function (x, y) {
      return (y.tour_slug === MIO ? 1 : 0) - (x.tour_slug === MIO ? 1 : 0);
    });
  }

  function scrivi(r) {
    testo.textContent = '';
    var chi = [r.nome, r.iniziale ? r.iniziale + '.' : ''].filter(Boolean).join(' ');

    var b1 = document.createElement('b');
    b1.textContent = chi;
    testo.appendChild(b1);
    /* Il paese e' nullo su tutte le righe di oggi: la frase e' scritta per
       reggere senza, non per aspettarselo. */
    testo.appendChild(document.createTextNode(r.paese ? ' from ' + r.paese + ' booked ' : ' booked '));
    var b2 = document.createElement('b');
    b2.textContent = r.prodotto || 'this tour';
    testo.appendChild(b2);

    var em = document.createElement('em');
    em.appendChild(document.createTextNode(quantoFa(r.quando)));
    /* "for 4 guests" e' una prenotazione con dentro delle persone; una
       prenotazione e basta e' una riga di database. Quando il numero manca
       la frase si chiude da sola, senza un "for" appeso al vuoto. */
    if (r.persone > 0) {
      em.appendChild(document.createTextNode(' · '));
      var sp = document.createElement('span');
      sp.className = 'ps-ospiti';
      sp.textContent = 'for ' + r.persone + (r.persone === 1 ? ' guest' : ' guests');
      em.appendChild(sp);
    }
    /* La provenienza del dato sta qui, sotto la frase: e' il punto dove
       cerca chi dubita. */
    em.appendChild(document.createTextNode(' · verified booking'));
    testo.appendChild(em);
  }

  /* La barra "prenota" si misura invece di indovinarla: cambia altezza fra
     una landing e l'altra, e sbagliare di dieci pixel vuol dire coprire
     proprio il pulsante che deve essere premuto. */
  function alzati() {
    var barra = document.querySelector('.pr-sticky');
    if (!barra) return;
    var h = barra.getBoundingClientRect().height;
    if (h > 0) document.documentElement.style.setProperty('--ps-sotto', (h + 10) + 'px');
  }

  function mostra() {
    if (spento || !righe.length) return;
    var lista = ordina(righe), scelta = null;
    for (var i = 0; i < lista.length; i++) {
      var k = lista[i].nome + '|' + lista[i].quando;
      if (!visti[k]) { scelta = lista[i]; visti[k] = 1; break; }
    }
    if (!scelta) scelta = lista[n % lista.length];
    alzati();
    scrivi(scelta);
    box.classList.add('is-on');
    n++;
    clearTimeout(viaChe);
    viaChe = setTimeout(function () { box.classList.remove('is-on'); }, DURA);
    if (n >= MASSIMO) { clearInterval(giro); clearInterval(sonda); }
  }

  function leggi(primaVolta) {
    fetch('/api/prenotazioni/', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.avvisi && j.avvisi.length) {
          righe = j.avvisi;
          if (primaVolta && !document.body.contains(box)) document.body.appendChild(box);
        }
      })
      .catch(function () {
        /* Rete caduta o risposta storta: non compare niente e non succede
           niente altro. Un errore in console su ogni landing sarebbe
           peggio del riquadro mancante. */
      });
  }

  leggi(true);
  avvio = setTimeout(mostra, PRIMO);
  giro = setInterval(mostra, PRIMO + OGNI);
  sonda = setInterval(function () { leggi(false); }, AGGIORNA);
})();
