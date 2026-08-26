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
 * ── SI SALVA IL gclid ───────────────────────────────────────────────
 * Safari cancella i cookie dopo 24 ore sui link con parametri, e le
 * conversioni si perdono. Tenendo il gclid da parte per novanta giorni,
 * quando la prenotazione arriva da Regiondo la si puo' ricollegare al
 * clic che l'ha prodotta e caricarla in Google Ads a posteriori --
 * quella e' accurata al 100%, perche' non dipende da nessun cookie.
 */

const GTM = 'GTM-TL7VV3RL';
const ADS = 'AW-18130421608';

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
    /* Il gclid si salva SEMPRE, anche in prova: e' un dato nostro, non
       esce da qui, e serve a ricostruire le conversioni perse. */
    try {
      const q = new URLSearchParams(window.location.search);
      for (const k of ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid']) {
        const v = q.get(k);
        if (v) localStorage.setItem('pr_' + k, JSON.stringify({ v, t: Date.now() }));
      }
    } catch {}

    if (!suProduzione()) return;

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
    return () => document.removeEventListener('click', alClic);
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
