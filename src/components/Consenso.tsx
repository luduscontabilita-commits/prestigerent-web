'use client';

import Script from 'next/script';

/* IL CONSENSO. SCRITTO IN CASA, SENZA ABBONAMENTI.
 *
 * (`'use client'` serve a `RiapriPreferenze`, che ha un `onClick`: senza,
 *  la compilazione si ferma con "Event handlers cannot be passed to
 *  Client Component props". Riscrivendo il file l'avevo persa.)
 *
 * ── PERCHE' NON PIU' COOKIEBOT ──────────────────────────────────────
 * Questo file caricava Cookiebot, e il commento diceva che era "la
 * trascrizione fedele di quello che gira oggi su prestigerent.com". Era
 * vero. Il problema e' che quello che gira li' e' rotto:
 *
 *     GET consent.cookiebot.com/1870b589-.../cc.js
 *     "Error: The domain PRESTIGERENT.COM is not authorized to show the
 *      cookie banner for domain group ID 1870b589-..."
 *
 * L'account era una prova gratuita, scaduta il 21 agosto 2026. Alla
 * scadenza il dominio e' stato deautorizzato: lo script continua a
 * caricarsi, risponde 372 byte di errore, e non fa piu' niente. Nessun
 * banner, nessun blocco, nessun errore visibile.
 *
 * Conseguenza misurata: chi arriva da UE, UK o Svizzera resta a
 * `ad_storage: denied` PER SEMPRE, perche' la finestra che dovrebbe
 * sbloccarlo non compare mai. Sulle landing questo ha spento la meta'
 * piu' costosa della spesa pubblicitaria per sei giorni, e nessuno se
 * n'e' accorto finche' i conti non hanno smesso di tornare.
 *
 * Portare quel guasto sul sito nuovo il giorno del passaggio sarebbe
 * stato ripeterlo consapevolmente.
 *
 * ── DUE PEZZI, E LA DIVISIONE E' LA LEZIONE DEL GUASTO ──────────────
 * 1. Il RIPRISTINO della scelta gia' fatta gira per primo, prima di GTM,
 *    dentro questo script. Se qualcosa piu' avanti non parte, chi ha gia'
 *    scelto continua a essere misurato bene.
 * 2. La FINESTRA da mostrare a chi non ha ancora scelto arriva dopo. Se
 *    non arrivasse, non si perde nessuna misura: si perde solo la
 *    possibilita' di chiedere.
 *
 * ── LA ZONA LA DECIDE GOOGLE, NON IL FUSO ORARIO ────────────────────
 * A negare il consenso non e' il fuso del browser: e' la `region` che
 * Google risolve sull'INDIRIZZO IP. Sono due segnali diversi, e la prima
 * versione di questo banner (sulle landing) sbagliava proprio li': un
 * americano in vacanza a Firenze ha IP italiano -- Google nega -- e fuso
 * americano -- il banner non compariva. Negato per sempre, senza modo di
 * accettare, proprio sul cliente che sta decidendo in quel momento.
 *
 * Adesso si legge `google_tag_data.ics`, cioe' la decisione che Google ha
 * gia' preso. Il fuso resta solo come rete di sicurezza per il caso in
 * cui GTM non arrivi affatto.
 *
 * ── COSA ESPONE ─────────────────────────────────────────────────────
 * `window.prConsenso = { consent: {marketing, statistics, preferences},
 *                        hasResponse, riapri() }`
 * e l'evento `pr-consenso` a ogni scelta. `Tracciamento.tsx` legge di li'
 * per decidere se salvare il gclid.
 */

/* I 32 paesi in cui il consenso e' preventivo: SEE + Regno Unito +
   Svizzera. Sono la lista che Google usa per il `region`, ed e' la stessa
   che gira oggi in produzione sulle landing. */
const REGIONE_UE = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS',
  'IE','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI',
  'ES','SE','GB','CH',
];

/* Il cookie sta sul dominio senza sottodominio, e non e' un dettaglio: e'
   lo stesso che scrivono le landing `/lp/*.html`. Chi ha gia' scelto li'
   -- dove atterrano tutte le campagne -- non si vede chiedere di nuovo
   quando passa al sito. */
const COOKIE = 'pr_consenso';

const CODICE = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',personalization_storage:'granted',security_storage:'granted'});
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500,region:${JSON.stringify(REGIONE_UE)}});
gtag('set','ads_data_redaction',true);
gtag('set','url_passthrough',true);

(function(){
  var NOME='${COOKIE}', MESI=6, ATTESA=3000, PASSO=100;
  var POLICY='/cookie-policy/';

  function leggi(){
    try{
      var m=document.cookie.match(new RegExp('(?:^|;\\\\s*)'+NOME+'=([^;]*)'));
      return m?JSON.parse(decodeURIComponent(m[1])):null;
    }catch(e){ return null; }
  }
  function scrivi(s){
    var f=new Date(); f.setMonth(f.getMonth()+MESI);
    document.cookie=NOME+'='+encodeURIComponent(JSON.stringify(s))
      +';expires='+f.toUTCString()+';path=/;domain=.prestigerent.com;SameSite=Lax;Secure';
  }
  function stato(s){
    window.prConsenso={
      consent:{marketing:!!(s&&s.mk),statistics:!!(s&&s.an),preferences:!!(s&&s.an)},
      hasResponse:!!s,
      riapri:riapri
    };
  }
  /* META NON ASCOLTA IL CONSENT MODE DI GOOGLE.
   *
   * I tag Google si governano da soli: basta 'gtag('consent','update')' e
   * si comportano di conseguenza. Il pixel di Meta no -- e' codice suo,
   * e l'unico modo di fermarlo e' dirglielo nella sua lingua.
   *
   * Senza questa chiamata il pixel scriveva '_fbp' sul dispositivo di
   * chiunque, anche di chi aveva appena premuto "Refuse". Misurato dal
   * vivo con un browser pulito e un indirizzo italiano: cookie deposto,
   * e la richiesta a 'signals/config' che porta a Meta l'IP e l'URL della
   * pagina. Le landing questa riga ce l'avevano da sempre
   * ('lp/js/consenso.js', 'apriGliAltri'); il sito nuovo no. */
  function avvisaMeta(marketing){
    try{
      var f=window.fbq;
      if(typeof f==='function'){ f('consent', marketing ? 'grant' : 'revoke'); }
    }catch(e){}
  }

  function applica(s){
    var mk=s.mk?'granted':'denied';
    avvisaMeta(!!s.mk);
    gtag('consent','update',{
      ad_storage:mk, ad_user_data:mk, ad_personalization:mk,
      analytics_storage:s.an?'granted':'denied',
      functionality_storage:s.an?'granted':'denied',
      personalization_storage:mk, security_storage:'granted'
    });
    stato(s);
    dataLayer.push({event:'consenso_scelto',consenso_marketing:!!s.mk,consenso_statistiche:!!s.an});
    try{ window.dispatchEvent(new CustomEvent('pr-consenso')); }catch(e){}
  }

  /* 1. La scelta gia' fatta, subito, prima di GTM. */
  var gia=leggi();
  stato(gia);
  if(gia){ applica(gia); }

  /* 2. Chi decide se chiedere: Google, guardando il proprio ics. */
  function googleDice(){
    try{
      var e=window.google_tag_data&&window.google_tag_data.ics&&window.google_tag_data.ics.entries;
      if(!e||!e.ad_storage) return null;
      return e.ad_storage['default']===false;
    }catch(x){ return null; }
  }
  var FUORI={'Atlantic/Reykjavik':1,'Atlantic/Azores':1,'Atlantic/Madeira':1,'Atlantic/Canary':1};
  function ripiego(){
    try{
      var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';
      return tz.indexOf('Europe/')===0||FUORI[tz]===1;
    }catch(e){ return true; }
  }

  var CSS='#pr-cons{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;'
    +'background:#14110f;color:#f2ede6;padding:18px 24px calc(18px + env(safe-area-inset-bottom));'
    +'font:15px/1.5 system-ui,-apple-system,sans-serif;box-shadow:0 -2px 24px rgba(0,0,0,.35)}'
    +'#pr-cons .pr-in{max-width:1080px;margin:0 auto;display:flex;gap:24px;align-items:center;flex-wrap:wrap}'
    +'#pr-cons p{margin:0;flex:1 1 360px;min-width:240px}'
    +'#pr-cons a{color:#e0b768}'
    +'#pr-cons .pr-bot{display:flex;gap:10px;flex-wrap:wrap}'
    +'#pr-cons button{font:600 15px/1 system-ui,sans-serif;cursor:pointer;padding:13px 26px;'
    +'border-radius:4px;border:1px solid #7a6f63;background:#2a2522;color:#f2ede6;min-width:132px}'
    +'#pr-cons button:hover{border-color:#e0b768;background:#332c27}'
    +'#pr-cons button:focus-visible{outline:2px solid #e0b768;outline-offset:2px}'
    +'html.pr-cons-aperto .pg-bar,html.pr-cons-aperto .pr-sticky{bottom:var(--pr-cons-h)!important}'
    +'@media(max-width:640px){#pr-cons{padding:14px 16px calc(14px + env(safe-area-inset-bottom))}'
    +'#pr-cons .pr-in{gap:14px}#pr-cons .pr-bot{width:100%}#pr-cons button{flex:1 1 0;min-width:0}}';

  var riquadro=null;
  function misura(){
    if(riquadro) document.documentElement.style.setProperty('--pr-cons-h',riquadro.offsetHeight+'px');
  }
  function mostra(){
    if(document.getElementById('pr-cons')) return;
    var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    var d=document.createElement('div'); riquadro=d;
    d.id='pr-cons'; d.setAttribute('role','dialog');
    d.setAttribute('aria-label','Cookie preferences'); d.setAttribute('tabindex','-1');
    d.innerHTML='<div class="pr-in"><p>We use cookies to measure how our ads perform and to '
      +'improve this site. Accept or refuse as you prefer: refusing costs you nothing and '
      +'booking works either way. <a href="'+POLICY+'">Cookie policy</a></p>'
      +'<div class="pr-bot"><button type="button" class="pr-no">Refuse</button>'
      +'<button type="button" class="pr-si">Accept</button></div></div>';
    document.body.appendChild(d);
    document.documentElement.className+=' pr-cons-aperto';
    misura(); window.addEventListener('resize',misura);
    function chiudi(s){
      scrivi(s); applica(s);
      window.removeEventListener('resize',misura);
      document.documentElement.className=document.documentElement.className.replace(/\\s*pr-cons-aperto/g,'');
      document.documentElement.style.removeProperty('--pr-cons-h');
      if(d.parentNode) d.parentNode.removeChild(d);
      riquadro=null;
    }
    /* Rifiutare e accettare hanno lo stesso peso, un clic ciascuno: e' la
       condizione perche' il consenso sia valido, non una cortesia. */
    d.querySelector('.pr-si').addEventListener('click',function(){chiudi({mk:1,an:1,q:Date.now()});});
    d.querySelector('.pr-no').addEventListener('click',function(){chiudi({mk:0,an:0,q:Date.now()});});
    setTimeout(function(){try{d.focus();}catch(e){}},60);
  }

  /* RITIRARE IL CONSENSO DEVE RITIRARLO DAVVERO.
   *
   * Prima questa funzione cancellava il cookie della scelta e riapriva la
   * finestra, e basta. Tutto il resto restava dov'era: 'google_tag_data'
   * continuava a dire 'granted' su tutte le voci, il pixel di Meta non
   * veniva avvisato, e gli identificatori gia' posati -- '_fbp',
   * '_gcl_au', '_ga' -- restavano sul dispositivo. Misurato dal vivo:
   * dopo aver premuto "Cookie preferences" i quattro cookie erano ancora
   * tutti li'.
   *
   * Un consenso ritirato che lascia gli identificatori dov'erano non e'
   * ritirato: e' solo una finestra che si riapre. Qui si fanno le tre
   * cose in ordine -- si richiude Google, si avvisa Meta, si spazza via
   * quello che era stato scritto -- e solo dopo si torna a chiedere. */
  function spazza(){
    var da=['_ga','_gcl_au','_gcl_aw','_gcl_gb','_fbp','_fbc','_clck','_clsk'];
    var host=location.hostname.replace(/^www\./,'');
    var domini=['', '.'+host, host];
    try{
      /* anche i '_ga_XXXX' di Analytics, che hanno il nome variabile */
      document.cookie.split(';').forEach(function(c){
        var n=c.split('=')[0].trim();
        if(n.indexOf('_ga_')===0 || n.indexOf('_uetsid')===0) da.push(n);
      });
    }catch(e){}
    da.forEach(function(n){
      domini.forEach(function(d){
        try{
          document.cookie = n+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'+
            (d ? ';domain='+d : '');
        }catch(e){}
      });
    });
  }

  function riapri(){
    try{
      gtag('consent','update',{
        ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
        analytics_storage:'denied', functionality_storage:'denied',
        personalization_storage:'denied', security_storage:'granted'
      });
    }catch(e){}
    avvisaMeta(false);
    spazza();
    document.cookie=NOME+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.prestigerent.com';
    stato(null);
    try{ window.dispatchEvent(new CustomEvent('pr-consenso')); }catch(e){}
    mostra();
  }

  function decidi(passato){
    var r=googleDice();
    if(r===true){ mostra(); return; }
    if(r===false){
      /* 🔴 FUORI ZONA IL PIXEL VA RIAPERTO, ALTRIMENTI RESTA CHIUSO
         PER SEMPRE.
         Google qui non nega: il visitatore e' fuori dai 32 paesi che
         chiedono il consenso, quindi vale il default globale, che
         concede, e la finestra non si mostra. Ma il pixel di Meta parte
         REVOCATO dal tag in GTM, e senza questa riga nessuno lo riapre
         piu': si perde il pixel su tutti gli americani, che sono il 62%
         del traffico. Le landing questa riga ce l'hanno da sempre
         ('lp/js/consenso.js', ramo 'r===false'); riscrivendo il consenso
         per il sito nuovo era andata persa. */
      avvisaMeta(true);
      return;
    }
    if(passato>=ATTESA){ if(ripiego()) mostra(); return; }
    setTimeout(function(){decidi(passato+PASSO);},PASSO);
  }

  /* 🔴 CHI HA GIA' ACCETTATO IN UNA VISITA PRECEDENTE.
   *
   * 'applica(gia)' gira in 'beforeInteractive', cioe' PRIMA che GTM
   * crei 'fbq': 'avvisaMeta' non trova la funzione ed esce in silenzio,
   * e nessuno riprova piu'. Risultato: chi torna sul sito avendo gia'
   * detto di si' resta con il pixel revocato.
   *
   * Qui si riprova appena 'fbq' compare. Poche prove ravvicinate e poi
   * si smette: se GTM non c'e' (fuori produzione, o bloccato da
   * un'estensione) non c'e' niente da avvisare, e insistere sarebbe un
   * timer che gira a vuoto per sempre. */
  function riprovaMeta(scelta, quante){
    if(typeof window.fbq==='function'){ avvisaMeta(scelta); return; }
    if(quante<=0) return;
    setTimeout(function(){ riprovaMeta(scelta, quante-1); }, 400);
  }

  function avvia(){
    var g=leggi();
    if(!g){ decidi(0); return; }
    /* la scelta c'era gia': si riapre Meta quando sara' possibile */
    riprovaMeta(!!g.mk, 12);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',avvia);
  else avvia();
})();
`;

export function Consenso() {
  return (
    <Script id="consenso" strategy="beforeInteractive">
      {CODICE}
    </Script>
  );
}

/* IL LINK PER RIAPRIRE LE PREFERENZE.
 *
 * Sta nel footer: revocare dev'essere facile quanto dare, e senza questo
 * l'unico modo sarebbe cancellare i cookie a mano.
 *
 * Prima chiamava `window.Cookiebot?.renew?.()`, e con Cookiebot morto era
 * un pulsante che non faceva niente -- il tipo di cosa che nessuno prova
 * mai perche' sembra ovvio che funzioni. */
export function RiapriPreferenze() {
  return (
    <button
      type="button"
      className="ft-cookie"
      onClick={() => window.prConsenso?.riapri?.()}
    >
      Cookie preferences
    </button>
  );
}

declare global {
  interface Window {
    prConsenso?: {
      consent?: { marketing: boolean; statistics: boolean; preferences: boolean };
      /* Vero quando l'utente ha gia' risposto, in questa visita o in una
         precedente. Serve a `Tracciamento.tsx` per non cancellare un gclid
         ancora valido mentre il banner e' aperto e nessuno ha premuto. */
      hasResponse?: boolean;
      riapri?: () => void;
    };
  }
}
