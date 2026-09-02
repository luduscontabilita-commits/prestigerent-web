/* IL BANNER DEL CONSENSO - scritto in casa, senza abbonamenti.
 *
 * -- PERCHE' ESISTE ---------------------------------------------------
 * Fino al 21 agosto 2026 questo lavoro lo faceva Cookiebot, con un
 * account di prova. Il giorno in cui la prova e' scaduta il dominio e'
 * stato deautorizzato e lo script ha smesso di fare qualsiasi cosa --
 * senza un errore visibile, senza un banner, senza niente. Da quel
 * momento chi arriva dall'Europa restava a `ad_storage: denied` PER
 * SEMPRE, perche' il banner che avrebbe dovuto sbloccarlo non compariva.
 *
 * Il 59% della spesa pubblicitaria va in quella zona. Il buco e' durato
 * sei giorni prima che qualcuno lo notasse, e l'unico motivo per cui e'
 * stato notato e' che le conversioni non tornavano.
 *
 * Di qui la scelta di non riappoggiarsi a un servizio esterno: una cosa
 * da cui dipendono le conversioni non deve poter scadere.
 *
 * -- COME SI INCASTRA CON QUELLO CHE C'E' GIA' ------------------------
 * Nella pagina, prima di tutto, ci sono due `gtag('consent','default')`:
 * uno globale che concede, uno che nega per UE, UK e Svizzera. Restano e
 * non si toccano -- sono la ragione per cui un americano funziona senza
 * mai vedere questo banner.
 *
 * Questo file fa una cosa sola: a chi si trova negato, chiede, e poi
 * manda `gtag('consent','update', ...)`.
 *
 * Il ripristino della scelta gia' fatta NON e' qui: e' in uno snippet di
 * dieci righe dentro la pagina, che gira prima di GTM. Se questo file
 * non arrivasse -- rete lenta, blocco, errore -- chi ha gia' scelto
 * continua a essere misurato bene. Qui c'e' solo la finestra da mostrare
 * a chi non ha ancora scelto.
 *
 * -- CHI DECIDE LA ZONA: GOOGLE, NON IL FUSO ORARIO -------------------
 * La prima versione guardava il fuso del browser. Il collaudo ha trovato
 * il difetto, ed era serio: a negare il consenso non e' il fuso, e' la
 * `region` che Google risolve sull'INDIRIZZO IP. Sono due segnali
 * diversi e non coincidono sempre.
 *
 * Il caso concreto, misurato: un americano in vacanza a Firenze, con il
 * portatile ancora sul fuso di casa. IP italiano -> Google nega. Fuso
 * americano -> il banner non compariva. Risultato: negato per sempre,
 * senza nessun modo di accettare. Esattamente il buco di Cookiebot, in
 * piccolo -- e sul cliente che sta prenotando da Firenze, cioe' il
 * migliore che abbiamo.
 *
 * Adesso si legge la decisione di Google direttamente da
 * `google_tag_data.ics`, che e' la struttura interna del Consent Mode:
 * se dice che ad_storage e' negato e nessuno l'ha ancora aggiornato,
 * allora si chiede. Nessuna indovinata, nessuna lista di paesi da tenere
 * allineata a mano.
 *
 * Il fuso resta solo come rete di sicurezza, per il caso in cui GTM non
 * si carichi affatto: li' si chiede lo stesso, perche' nel dubbio si sta
 * dalla parte di chi deve dare il consenso.
 */
(function () {
  'use strict';

  var COOKIE = 'pr_consenso';
  var MESI = 6;
  var POLICY = 'https://prestigerent.com/cookie-policy/';
  var ATTESA_MAX = 3000;   /* quanto si aspetta che GTM popoli `ics` */
  var PASSO = 100;

  /* ---------------------------------------------------------------- */
  /* Cosa ha deciso Google                                            */
  /* ---------------------------------------------------------------- */
  /* Restituisce true (chiedere), false (non chiedere), null (non lo sa
     ancora, richiama fra un po'). */
  function googleDice() {
    try {
      var e = window.google_tag_data &&
              window.google_tag_data.ics &&
              window.google_tag_data.ics.entries;
      if (!e || !e.ad_storage) { return null; }
      /* Qui si guarda SOLO il default, mai `update`.
       *
       * La versione precedente usciva se trovava un `update` gia' fatto,
       * ragionando che la scelta esistesse. Ma `update` e' uno stato
       * globale che chiunque puo' scrivere: il giorno che un tag qualsiasi
       * del container ne mandasse uno di sua iniziativa, il banner
       * smetterebbe di comparire senza che nessuno abbia scelto niente --
       * e sarebbe di nuovo un guasto silenzioso, la terza volta.
       *
       * Il controllo era anche inutile: chi ha gia' scelto ha il cookie, e
       * `avvia()` esce prima ancora di arrivare qui. */
      return e.ad_storage['default'] === false;
    } catch (x) {
      return null;
    }
  }

  /* La rete di sicurezza: se GTM non arriva, si guarda il fuso e si
     sbaglia per eccesso. Un russo vede il banner senza doverlo vedere:
     e' un fastidio, non un danno. */
  var DENTRO_MA_FUORI = {
    'Atlantic/Reykjavik': 1, 'Atlantic/Azores': 1,
    'Atlantic/Madeira': 1, 'Atlantic/Canary': 1
  };

  function ripiego() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return tz.indexOf('Europe/') === 0 || DENTRO_MA_FUORI[tz] === 1;
    } catch (e) {
      return true;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Memoria della scelta                                             */
  /* ---------------------------------------------------------------- */
  function leggi() {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]*)'));
    if (!m) { return null; }
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
  }

  function scrivi(scelta) {
    var f = new Date();
    f.setMonth(f.getMonth() + MESI);
    /* Dominio senza sottodominio: la scelta fatta su una landing vale
       anche sul sito, che e' quello che si aspetta chi la fa.
       `Secure` perche' il sito e' tutto in HTTPS. */
    document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(scelta)) +
      ';expires=' + f.toUTCString() +
      ';path=/;domain=.prestigerent.com;SameSite=Lax;Secure';
  }

  /* Meta e Clarity non leggono il Consent Mode di Google: hanno il loro
     interruttore, e va girato a mano. In pagina partono revocati ("chiuso
     finche' non si sa"); qui si concede. Gli eventi che Meta ha messo in
     coda partono subito dopo il grant, quindi il PageView non si perde. */
  function apriGliAltri(marketing, statistiche) {
    /* 🔴 SI ASPETTA CHE IL PIXEL CI SIA.
       Fino al 01/09/2026 il pixel era scritto dentro la pagina, quindi
       quando si arrivava qui `fbq` esisteva di sicuro e bastava un `if`.
       Ora lo accende GTM, che si carica per conto suo: se qualcuno accetta
       i cookie nel mezzo secondo prima che GTM abbia finito, quell'`if`
       era falso, il consenso non arrivava mai e il pixel restava muto per
       quella persona -- senza nessun errore, senza nessun segnale.
       Adesso si riprova per cinque secondi, dieci volte al secondo, e si
       smette al primo colpo andato a segno. */
    (function concedi(tentativi) {
      try {
        if (typeof window.fbq === 'function') {
          window.fbq('consent', marketing ? 'grant' : 'revoke');
          return;
        }
      } catch (e) { return; }
      if (tentativi > 0) setTimeout(function () { concedi(tentativi - 1); }, 100);
    })(50);

    try {
      /* Clarity non si "spegne": il suo `consent` governa i cookie, non la
         registrazione. Misurato: con `consent false` le sessioni continuano
         ad arrivare, sei POST a `a.clarity.ms/collect` dopo il rifiuto.
         L'unico modo di non registrare e' non caricarlo: la pagina espone
         `prCaricaClarity`, e il tag entra solo da qui. */
      if (statistiche && typeof window.prCaricaClarity === 'function') {
        window.prCaricaClarity();
      }
    } catch (e) {}
  }

  function applica(scelta) {
    apriGliAltri(!!scelta.mk, !!scelta.an);
    if (typeof window.gtag !== 'function') { return; }
    var mk = scelta.mk ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      ad_storage: mk,
      ad_user_data: mk,
      ad_personalization: mk,
      analytics_storage: scelta.an ? 'granted' : 'denied',
      functionality_storage: scelta.an ? 'granted' : 'denied',
      personalization_storage: mk
    });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consenso_scelto',
      consenso_marketing: !!scelta.mk,
      consenso_statistiche: !!scelta.an
    });
  }

  /* ---------------------------------------------------------------- */
  /* La finestra                                                      */
  /* ---------------------------------------------------------------- */
  /* I due bottoni hanno stessa dimensione, stesso peso di carattere e un
     clic ciascuno; "Accept" ha in piu' il fondo arancione del sito.
     Fino al 01/09/2026 erano identici anche nel colore, e qui c'era
     scritto il perche': un "accetta" acceso accanto a un "rifiuta"
     scolorito e' la prima cosa che i garanti guardano. Allineati al sito
     su richiesta -- il sito li ha diversi da sempre, e avere due banner
     con gerarchie opposte sullo stesso dominio era il difetto piu'
     visibile dei due. Se un domani si vuole tornare indietro, si toglie
     la riga 'button.pr-si' qui sotto e la sua gemella in
     src/components/Consenso.tsx: vanno cambiate INSIEME, o si torna ad
     avere due banner che non si somigliano. */
  /* 🔴 LO STILE E' QUELLO DEL SITO, NON UNO SUO.
     Prima qui c'era una fascia nera a tutta larghezza con carattere
     "Open Sans" e bordi a 4px, mentre il sito su Vercel mostra un
     riquadro bianco nell'angolo in basso a destra. Chi arrivava da un
     annuncio vedeva un banner sulla landing e un banner diverso al
     clic successivo: due banner diversi sullo stesso dominio sembrano
     due aziende diverse, e sul consenso la fiducia e' tutto.
     Trascrizione fedele di src/components/Consenso.tsx: stessa
     larghezza, stesso raggio, stessa ombra, stesso arancione #F5760B,
     carattere di sistema, e la variante per il tema scuro. */
  var CSS = [
    ':root{--pr-cons-h:0px}',
    '#pr-cons{position:fixed;right:18px;bottom:18px;z-index:2147483000;',
    'width:380px;max-width:calc(100vw - 28px);background:#fff;color:#1e2a32;',
    'border:1px solid #dfe3e6;border-radius:12px;padding:18px 18px 16px;',
    'font:14px/1.55 system-ui,-apple-system,sans-serif;',
    'box-shadow:0 10px 40px rgba(20,26,32,.22)}',
    /* 🔴 IL TEMA LO DICE LA PAGINA, NON IL SISTEMA OPERATIVO.
       Qui c'era '@media (prefers-color-scheme:dark)', copiato dal sito
       insieme al resto dello stile. Ma guarda l'impostazione di Windows,
       e queste pagine un tema scuro non ce l'hanno proprio: chi ha il
       sistema scuro si vedeva un riquadro nero in mezzo a una landing
       tutta bianca. Sul sito lo stesso difetto ignorava l'interruttore
       del tema -- segnalato con schermata il 01/09/2026.
       Si guarda 'html[data-theme="dark"]', che e' come il sito dichiara
       la scelta. Qui quell'attributo non c'e' e non ci sara': il
       riquadro resta chiaro, come la pagina che lo ospita. */
    'html[data-theme="dark"] #pr-cons{background:#1b1917;',
    'color:#efeae4;border-color:#312c28;box-shadow:0 10px 40px rgba(0,0,0,.5)}',
    '#pr-cons .pr-tit{font-size:15px;font-weight:800;margin:0 0 7px}',
    '#pr-cons p{margin:0 0 14px}',
    '#pr-cons a{color:#F5760B;font-weight:600}',
    '#pr-cons .pr-bot{display:flex;gap:9px}',
    '#pr-cons button{font:700 14px/1 system-ui,sans-serif;cursor:pointer;',
    'padding:11px 16px;border-radius:8px;border:1px solid #dfe3e6;',
    'background:transparent;color:inherit;flex:1 1 0}',
    'html[data-theme="dark"] #pr-cons button{border-color:#312c28}',
    /* "Accept" arancione pieno, testo bianco: le tre righe che seguono
       sono la copia esatta di src/components/Consenso.tsx, ordine
       compreso. Il bordo arancione serve anche a "Refuse" al passaggio
       del mouse, cosi' i due restano a fuoco allo stesso modo. */
    '#pr-cons button.pr-si{background:#F5760B;border-color:#F5760B;color:#fff}',
    '#pr-cons button:hover{border-color:#F5760B}',
    '#pr-cons button.pr-si:hover{filter:brightness(1.07)}',
    '#pr-cons button:focus-visible{outline:2px solid #F5760B;outline-offset:2px}',
    /* La bolla della chat vive nello stesso angolo del riquadro: sale
       sopra di lui invece di finirci sotto. `--pr-cons-top` la scrive
       `misura()` leggendo il riquadro vero, non un'altezza indovinata. */
    'html.pr-cons-aperto .chaty-widget{bottom:var(--pr-cons-top,214px)!important}',
    /* Su telefono il riquadro prende la larghezza dello schermo e si mette
       SOPRA la barra BOOK, non davanti. La barra non si sposta piu': due
       elementi che non si sovrappongono non hanno bisogno di sapere
       l'uno l'altezza dell'altro. `--pr-barra-h` e' l'altezza vera della
       barra, misurata all'apertura. */
    '@media(max-width:760px){#pr-cons{right:10px;left:10px;width:auto;',
    'bottom:calc(var(--pr-barra-h,88px) + env(safe-area-inset-bottom,0px));',
    'padding:15px 15px 13px}}'
  ].join('');

  var riquadro = null;

  function misura() {
    if (!riquadro) { return; }
    var st = document.documentElement.style;
    st.setProperty('--pr-cons-h', riquadro.offsetHeight + 'px');
    /* Quanto il riquadro occupa a partire dal fondo dello schermo, piu' un
       dito di distacco: e' li' che deve salire la bolla della chat, che
       altrimenti gli finisce sotto. Si legge dal riquadro vero perche' la
       sua altezza cambia con la larghezza dello schermo. */
    try {
      var r = riquadro.getBoundingClientRect();
      st.setProperty('--pr-cons-top',
        Math.round(window.innerHeight - r.top + 12) + 'px');
    } catch (e) {}
  }

  /* L'altezza VERA della barra BOOK, non una costante scritta a mano: se
     un domani la barra cambia altezza il riquadro le resta comunque sopra.
     Sopra i 760px la barra e' nascosta e bastano i 18px di margine. */
  function misuraBarra() {
    var h = 0;
    try {
      var b = document.querySelector('.pr-sticky');
      if (b && window.getComputedStyle(b).display !== 'none') { h = b.offsetHeight; }
    } catch (e) {}
    document.documentElement.style.setProperty(
      '--pr-barra-h', (h ? h + 10 : 18) + 'px');
  }

  function mostra() {
    if (document.getElementById('pr-cons')) { return; }

    var st = document.createElement('style');
    st.id = 'pr-cons-css';
    st.textContent = CSS;
    document.head.appendChild(st);

    var d = document.createElement('div');
    riquadro = d;
    d.id = 'pr-cons';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Cookie preferences');
    d.setAttribute('tabindex', '-1');
    /* Stesso titolo e stesso testo del sito, parola per parola: il
       riquadro dell'annuncio e quello del sito devono dire la stessa
       cosa, non due versioni della stessa cosa. Via il vecchio
       contenitore `.pr-in`, che serviva alla fascia a tutta larghezza per
       tenere il testo dentro i 1080px: in un riquadro da 380 non ha piu'
       niente da centrare. */
    d.innerHTML =
      '<p class="pr-tit">Cookie consent</p>' +
      '<p>We use cookies to measure how our ads perform and to improve this ' +
      'site. Refusing costs you nothing: booking works either way. ' +
      '<a href="' + POLICY + '" target="_blank" rel="noopener">Cookie policy</a></p>' +
      '<div class="pr-bot">' +
        '<button type="button" class="pr-no">Refuse</button>' +
        '<button type="button" class="pr-si">Accept</button>' +
      '</div>';
    document.body.appendChild(d);
    document.documentElement.className += ' pr-cons-aperto';
    misuraBarra();
    misura();
    window.addEventListener('resize', misura);
    window.addEventListener('resize', misuraBarra);

    function chiudi(scelta) {
      scrivi(scelta);
      applica(scelta);
      window.removeEventListener('resize', misura);
      window.removeEventListener('resize', misuraBarra);
      document.documentElement.className =
        document.documentElement.className.replace(/\s*pr-cons-aperto/g, '');
      document.documentElement.style.removeProperty('--pr-cons-h');
      document.documentElement.style.removeProperty('--pr-cons-top');
      document.documentElement.style.removeProperty('--pr-barra-h');
      if (d.parentNode) { d.parentNode.removeChild(d); }
      riquadro = null;
    }
    d.querySelector('.pr-si').addEventListener('click', function () {
      chiudi({ mk: 1, an: 1, q: Date.now() });
    });
    d.querySelector('.pr-no').addEventListener('click', function () {
      chiudi({ mk: 0, an: 0, q: Date.now() });
    });
    /* Il fuoco va sulla finestra, non su uno dei due bottoni: mettere il
       cursore su "Accept" e' un altro modo di spingere verso il si'. */
    setTimeout(function () { try { d.focus(); } catch (e) {} }, 60);
  }

  /* ---------------------------------------------------------------- */
  /* Si puo' sempre tornare indietro                                  */
  /* ---------------------------------------------------------------- */
  /* Revocare deve essere facile quanto dare: qualunque elemento con
     [data-consenso] cancella la scelta e riapre la finestra. */
  function agganciaRevoca() {
    var n = document.querySelectorAll('[data-consenso]');
    for (var i = 0; i < n.length; i++) {
      n[i].addEventListener('click', function (e) {
        e.preventDefault();
        document.cookie = COOKIE + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT' +
          ';path=/;domain=.prestigerent.com';
        mostra();
      });
    }
  }

  /* ---------------------------------------------------------------- */
  function decidi(passato) {
    var r = googleDice();
    if (r === true) { mostra(); return; }
    if (r === false) {
      /* Google non nega: il visitatore e' fuori dalla zona che chiede il
         consenso, quindi vale il default globale che concede. Meta e
         Clarity pero' sono partiti revocati -- vanno aperti qui, o si
         perde il pixel su tutti gli americani, che sono il 62%. */
      apriGliAltri(true, true);
      return;
    }
    /* null: GTM non ha ancora popolato `ics`. Si riprova, e se non
       arriva entro il tempo massimo si passa al ripiego sul fuso. */
    if (passato >= ATTESA_MAX) {
      if (ripiego()) {
        mostra();
      } else {
        /* Fuori zona, ma GTM non e' arrivato in tempo. Il banner non serve
           -- e pero' Meta e Clarity sono partiti CHIUSI dallo snippet in
           pagina, e se si esce di qui restano chiusi per sempre.
           E' successo: su rete lenta un americano perdeva il pixel senza
           che nessuno se ne accorgesse. Terza volta che lo stesso ramo
           esce senza riaprire, e l'ultima. */
        apriGliAltri(true, true);
      }
      return;
    }
    setTimeout(function () { decidi(passato + PASSO); }, PASSO);
  }

  function avvia() {
    agganciaRevoca();
    if (leggi()) { return; }   /* ha gia' scelto: applicata dallo snippet */
    decidi(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avvia);
  } else {
    avvia();
  }
})();
