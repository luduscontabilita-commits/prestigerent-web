'use client';

import Script from 'next/script';
import { useEffect } from 'react';

/* IL TRACCIAMENTO.
 *
 * Gli stessi identificatori delle landing, che sono gia' collaudati su
 * traffico a pagamento: GTM-TL7VV3RL porta dentro GA4 (G-V1XGXQ22KK),
 * Google Ads (AW-18130421608) e il pixel Meta. Un contenitore solo, cosi'
 * quando si cambia idea su cosa misurare si tocca GTM e non il codice.
 *
 * ── NON PARTE SUL DOMINIO DI PROVA ──────────────────────────────────
 * Finche' il sito vive su prestigerent-web.vercel.app, ogni evento
 * inquinerebbe i dati veri delle campagne: visite che non sono visite,
 * conversioni che non sono conversioni. E i dati sporchi sono peggio dei
 * dati mancanti, perche' non si sa quali buttare. Si accende da solo
 * quando il sito risponde su prestigerent.com.
 *
 * ── SI SALVA IL gclid, MA SOLO CON IL CONSENSO ──────────────────────
 * Safari cancella i cookie dopo 24 ore sui link con parametri, e le
 * conversioni si perdono. Tenendo il gclid da parte per novanta giorni,
 * quando la prenotazione arriva da Regiondo la si puo' ricollegare al
 * clic che l'ha prodotta e caricarla in Google Ads a posteriori --
 * quella e' accurata al 100%, perche' non dipende da nessun cookie.
 * Quel caricamento notturno serve davvero, quindi il salvataggio NON si
 * toglie: si condiziona.
 *
 * Prima quelle righe stavano fuori da ogni guardia, prima persino del
 * controllo sul dominio: un identificatore pubblicitario finiva in
 * `localStorage` al primo millisecondo, per chiunque, banner o no.
 * L'art. 122 del Codice Privacy non distingue fra cookie e
 * `localStorage`: e' comunque un accesso al terminale dell'utente per
 * una finalita' di marketing, e vuole il consenso prima. Il banner che
 * si sta montando in `Consenso.tsx` non sarebbe servito a niente se poi
 * il dato lo scrivevamo lo stesso da qui.
 *
 * Adesso: il valore si LEGGE subito dall'indirizzo -- se non si legge
 * ora, la prima navigazione interna se lo porta via -- ma resta in
 * memoria, e tocca `localStorage` solo quando Cookiebot dice che il
 * gruppo `marketing` e' concesso. Se l'utente rifiuta o revoca, quello
 * che c'era viene cancellato: un consenso ritirato che lascia il dato
 * dov'era non e' ritirato.
 */

const GTM = 'GTM-TL7VV3RL';
const ADS = 'AW-18130421608';

/* Gli identificatori di clic delle quattro reti. Stanno in una costante
   sola perche' vengono percorsi due volte -- per scrivere e per
   cancellare -- e due elenchi che divergono vorrebbero dire un dato che
   resta li' dopo la revoca. */
const CHIAVI_CLIC = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid'] as const;

/* Le stesse etichette di conversione delle landing: sono gia' collegate
   alle campagne, e cambiarle vorrebbe dire perdere lo storico. */
const CONVERSIONI: Record<string, string> = {
  whatsapp: 'P6hOCJKY198cEOiOocVD',
  phone: 'dQ8fCJWY198cEOiOocVD',
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...a: unknown[]) => void;
  }
}

function suProduzione() {
  if (typeof window === 'undefined') return false;
  return /(^|\.)prestigerent\.com$/i.test(window.location.hostname);
}

export function Tracciamento() {
  useEffect(() => {
    /* ── 1. SI LEGGE SUBITO, SI SCRIVE DOPO ──────────────────────────
       La lettura dall'indirizzo va fatta adesso: fra un attimo l'utente
       clicca qualcosa, Next cambia pagina senza ricaricare e i parametri
       della campagna non ci sono piu'. Ma qui finisce in una variabile
       locale -- niente lascia questo effetto e niente tocca il disco
       finche' il consenso non c'e'. */
    const daSalvare: [string, string][] = [];
    try {
      const q = new URLSearchParams(window.location.search);
      for (const k of CHIAVI_CLIC) {
        const v = q.get(k);
        if (v) daSalvare.push([k, v]);
      }
    } catch {}

    /* ── 2. SI SCRIVE (O SI CANCELLA) QUANDO IL CONSENSO PARLA ───────
       Tre casi, e il terzo e' quello che conta:

         - marketing concesso  -> si scrive quello che si e' letto;
         - marketing rifiutato -> si cancella quello che c'era, perche'
           la revoca deve valere anche all'indietro;
         - nessuna risposta ancora, o Cookiebot che non c'e' (dominio di
           prova, blocco pubblicita', script caduto) -> NON si fa
           niente. Nel dubbio non si scrive: e' lo stesso principio del
           `denied` predefinito del Consent Mode. Costa qualche gclid su
           chi usa un blocco pubblicita', e in cambio non si scrive mai
           un identificatore senza permesso.

       Il prezzo va detto: fuori produzione Cookiebot non si carica, e
       quindi in prova il gclid non viene piu' salvato. Su un dominio che
       non riceve clic dalle campagne non manca a nessuno. */
    const applicaConsenso = () => {
      const cb = window.Cookiebot;
      if (!cb?.consent || cb.hasResponse === false) return;
      try {
        if (cb.consent.marketing) {
          for (const [k, v] of daSalvare) {
            localStorage.setItem('pr_' + k, JSON.stringify({ v, t: Date.now() }));
          }
        } else {
          for (const k of CHIAVI_CLIC) localStorage.removeItem('pr_' + k);
        }
      } catch {}
    };

    /* Una volta subito -- chi aveva gia' risposto in una visita
       precedente ha `hasResponse` vero fin dal primo istante -- e poi a
       ogni cambio di idea. `CookiebotOnLoad` copre anche il caso in cui
       il banner non venga mostrato affatto. */
    applicaConsenso();
    window.addEventListener('CookiebotOnAccept', applicaConsenso);
    window.addEventListener('CookiebotOnDecline', applicaConsenso);
    window.addEventListener('CookiebotOnLoad', applicaConsenso);
    const scollegaConsenso = () => {
      window.removeEventListener('CookiebotOnAccept', applicaConsenso);
      window.removeEventListener('CookiebotOnDecline', applicaConsenso);
      window.removeEventListener('CookiebotOnLoad', applicaConsenso);
    };

    /* Anche uscendo di qui gli ascoltatori vanno tolti: sono stati
       registrati sopra la guardia, quindi esistono anche in prova. */
    if (!suProduzione()) return scollegaConsenso;

    /* Un evento per ogni gesto che conta. Su un sito che vende da un
       calendario dentro un iframe, questi sono gli unici segnali che la
       pagina puo' davvero osservare. */
    const unaVolta = new Set<string>();
    const manda = (nome: string, dati: Record<string, unknown> = {}) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: nome, ...dati });
    };
    const conversione = (chiave: string) => {
      if (!CONVERSIONI[chiave] || unaVolta.has(chiave)) return;
      unaVolta.add(chiave);
      window.gtag?.('event', 'conversion', { send_to: `${ADS}/${CONVERSIONI[chiave]}` });
    };

    const alClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a,button') as HTMLElement | null;
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      const dove = a.className || 'pagina';

      if (/wa\.me|whatsapp/i.test(href)) {
        manda('contact_whatsapp', { posizione: dove });
        conversione('whatsapp');
      } else if (href.startsWith('tel:')) {
        manda('contact_phone', { posizione: dove });
        conversione('phone');
      } else if (href.startsWith('mailto:')) {
        manda('contact_email');
      } else if (href === '#bookform' || /BOOK NOW/i.test(a.textContent ?? '')) {
        /* Intenzione, non acquisto: l'acquisto avviene dentro l'iframe di
           Regiondo e da qui non si vede. Va tenuto distinto, altrimenti
           Google impara a portare gente che apre il calendario e se ne va. */
        manda('booking_intent', { posizione: dove });
      }
    };

    document.addEventListener('click', alClic, { passive: true });
    return () => {
      scollegaConsenso();
      document.removeEventListener('click', alClic);
    };
  }, []);

  if (typeof window !== 'undefined' && !suProduzione()) return null;

  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM}');`}
    </Script>
  );
}
