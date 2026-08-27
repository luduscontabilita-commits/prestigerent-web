'use client';

import Script from 'next/script';

/* IL BANNER DEL CONSENSO E IL CONSENT MODE v2.
 *
 * ── DOV'E' MONTATO ──────────────────────────────────────────────────
 * In `src/app/[locale]/layout.tsx`, PRIMA di <Tracciamento />:
 *
 *     <Consenso />
 *     <Tracciamento />
 *
 * L'ordine non e' estetico. `gtag('consent','default',...)` deve essere
 * gia' nel dataLayer quando gtm.js parte, altrimenti GTM legge "nessun
 * segnale" e i tag partono comunque: il banner ci sarebbe, ma non
 * servirebbe a niente.
 *
 * Con `strategy="beforeInteractive"` Next mette questo script nella coda
 * `self.__next_s` e lo esegue dentro `document.head` PRIMA
 * dell'idratazione (vedi `next/dist/client/app-bootstrap.js`,
 * `loadScriptsInSequence`). GTM invece e' `afterInteractive` e viene
 * iniettato da un `useEffect`, cioe' DOPO l'idratazione. L'ordine e'
 * quindi garantito dal meccanismo, non dalla fortuna.
 *
 * ── PERCHE' ESATTAMENTE QUESTO E NON UN ALTRO ───────────────────────
 * Non e' scritto a mano: e' la trascrizione FEDELE di quello che gira
 * oggi su prestigerent.com (WordPress), letto dall'HTML in produzione.
 * Stesso Cookiebot, stesso CBID, stesse impostazioni predefinite, stessa
 * mappatura dei gruppi, stessi 32 paesi. Sono gia' collaudate su
 * traffico a pagamento e gia' allineate a quello che il contenitore GTM
 * si aspetta.
 *
 * Rifarle diversamente vorrebbe dire due comportamenti diversi sullo
 * stesso dominio nel giro di un'ora, e nessun modo di sapere quale dei
 * due ha prodotto i numeri che si stanno guardando.
 *
 * ── COSA FA, IN ORDINE ──────────────────────────────────────────────
 * 1. Predefinito GLOBALE tutto `granted`. Sul pubblico extra-UE -- che
 *    per Prestige Rent e' la maggioranza: USA, Australia, Canada -- non
 *    c'e' obbligo di consenso preventivo e la misurazione resta piena.
 * 2. Predefinito REGIONALE tutto `denied` sui 32 paesi SEE + UK + CH.
 *    Il secondo `default` con `region` VINCE sul primo per quei paesi:
 *    e' cosi' che il Consent Mode e' progettato, non e' un doppione.
 *    `wait_for_update:500` da mezzo secondo al banner per rispondere
 *    prima che i tag decidano.
 * 3. `ads_data_redaction` e `url_passthrough`: senza consenso Google non
 *    riceve identificatori pubblicitari, e il gclid viaggia nell'URL
 *    invece che in un cookie. E' quello che permette di non perdere del
 *    tutto l'attribuzione di chi rifiuta.
 * 4. Cookiebot in `blockingmode="auto"`: blocca da solo gli script di
 *    terzi finche' il consenso non arriva. E' quello che oggi tiene
 *    ferme le richieste di Regiondo e del pixel Meta.
 * 5. All'accetta/rifiuta, un `consent update` che traduce i gruppi di
 *    Cookiebot (marketing / statistics / preferences) nei segnali di
 *    Google.
 *
 * ── PERCHE' E' UN UNICO SCRIPT E NON DUE ────────────────────────────
 * La bozza aveva due <Script>: uno inline coi predefiniti e uno con
 * `src` per Cookiebot, tutti e due protetti da
 *
 *     if (typeof window !== 'undefined' && !suProduzione()) return null;
 *
 * Quella guardia NON funziona con `beforeInteractive`, ed e' peggio che
 * non averla, perche' sembra esserci. Sul server `window` non esiste,
 * quindi la condizione e' falsa e i due <Script> finiscono comunque
 * nell'HTML: Next li esegue prima dell'idratazione, cioe' PRIMA che
 * React arrivi a decidere di restituire null. Su
 * prestigerent-web.vercel.app il banner sarebbe partito lo stesso -- e
 * con `blockingmode="auto"` avrebbe bloccato il calendario Regiondo su
 * tutte le pagine tour, facendo sembrare rotto il sito proprio a chi lo
 * sta rivedendo. In piu' il CBID e' registrato per prestigerent.com: su
 * un dominio che Cookiebot non conosce il comportamento non e' definito.
 *
 * Quindi il controllo del dominio si fa DENTRO lo script, a tempo di
 * esecuzione, dove funziona davvero: i predefiniti si mettono sempre
 * (senza GTM non fanno niente e non costano niente) e `uc.js` si carica
 * solo su prestigerent.com. Stesso CBID, stesso blockingmode, stessi
 * predefiniti, stessi paesi: cambia solo QUANDO si decide, non COSA.
 */

const CBID = '1870b589-da3c-4001-ae07-9e0262b8a192';

/* I 32 paesi in cui il consenso e' preventivo: SEE + Regno Unito +
   Svizzera. Copiati uno a uno da quelli attivi oggi in produzione. */
const REGIONE_UE = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS',
  'IE','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI',
  'ES','SE','GB','CH',
];

/* Attenzione ai `\\.` nella regex qui sotto: siamo dentro un template
   literal, dove `\.` verrebbe mangiato e la regex diventerebbe piu'
   larga di quanto deve essere (un punto qualsiasi invece di un punto). */
const PREDEFINITI = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',personalization_storage:'granted',security_storage:'granted'});
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500,region:${JSON.stringify(REGIONE_UE)}});
gtag('set','ads_data_redaction',true);
gtag('set','url_passthrough',true);
function prAggiornaConsenso(){
  if(!window.Cookiebot||!window.Cookiebot.consent) return;
  var c=window.Cookiebot.consent;
  gtag('consent','update',{
    ad_storage:c.marketing?'granted':'denied',
    ad_user_data:c.marketing?'granted':'denied',
    ad_personalization:c.marketing?'granted':'denied',
    analytics_storage:c.statistics?'granted':'denied',
    functionality_storage:c.preferences?'granted':'denied',
    personalization_storage:c.preferences?'granted':'denied',
    security_storage:'granted'
  });
}
window.addEventListener('CookiebotOnAccept',prAggiornaConsenso);
window.addEventListener('CookiebotOnDecline',prAggiornaConsenso);
if(/(^|\\.)prestigerent\\.com$/i.test(location.hostname)){
  var s=document.createElement('script');
  s.id='Cookiebot';
  s.src='https://consent.cookiebot.com/uc.js';
  s.setAttribute('data-cbid','${CBID}');
  s.setAttribute('data-blockingmode','auto');
  s.type='text/javascript';
  (document.head||document.documentElement).appendChild(s);
}
`;

export function Consenso() {
  return (
    <Script id="consenso" strategy="beforeInteractive">
      {PREDEFINITI}
    </Script>
  );
}

/* IL LINK PER RIAPRIRE LE PREFERENZE.
 *
 * Sta nel footer: il consenso dev'essere revocabile con la stessa
 * facilita' con cui e' stato dato, e senza questo link l'unico modo e'
 * cancellare i cookie a mano.
 *
 * Fuori da prestigerent.com Cookiebot non c'e', `renew` non esiste e il
 * `?.` fa sparire il clic senza errori: sul dominio di prova e' un link
 * che non fa niente, ed e' giusto cosi' -- li' non c'e' nessun consenso
 * da revocare.
 */
export function RiapriPreferenze() {
  return (
    <button
      type="button"
      className="ft-cookie"
      onClick={() => window.Cookiebot?.renew?.()}
    >
      Cookie preferences
    </button>
  );
}

declare global {
  interface Window {
    Cookiebot?: {
      consent?: { marketing: boolean; statistics: boolean; preferences: boolean };
      /* Vero quando l'utente ha gia' risposto, in questa sessione o in una
         precedente. Serve a `Tracciamento.tsx` per non cancellare un gclid
         ancora valido nell'attimo in cui il banner e' aperto e nessuno ha
         ancora premuto niente. */
      hasResponse?: boolean;
      renew?: () => void;
    };
  }
}
