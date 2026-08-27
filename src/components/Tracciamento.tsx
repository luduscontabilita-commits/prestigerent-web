'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { EVENTI, dichiara } from '@/lib/eventi';

/* IL TRACCIAMENTO. UN MESTIERE SOLO.
 *
 * Questo componente scrive nel `dataLayer` cosa e' successo. Non decide
 * a chi mandarlo. L'elenco esatto dei fatti, con i dati che portano, sta
 * in `src/lib/eventi.ts`: quel file e' il contratto con chi configura
 * GTM, e va letto insieme a questo.
 *
 * ── COSA E' STATO TOLTO, E PERCHE' ──────────────────────────────────
 * Fino a ieri qui dentro c'erano l'identificativo di Google Ads
 * (`AW-18130421608`) e due etichette di conversione scritte a mano.
 * Il componente annunciava il fatto E chiamava il destinatario: sono
 * due mestieri, e tenerli insieme e' il difetto che ha prodotto il
 * disastro del 20 agosto sul sito vecchio. Quando lo stesso clic viene
 * contato due volte — una dalla pagina, una da un tag di GTM — non c'e'
 * modo di sapere quale bocca spegnere, perche' una delle due non e'
 * scritta da nessuna parte nel pannello.
 *
 * Adesso il sito non sa che Google Ads e Meta esistono. Le etichette di
 * conversione stanno in GTM, dove si vedono, si spengono e si contano
 * senza ripubblicare il sito.
 *
 * ── L'ACQUISTO NON LO DICHIARIAMO NOI ───────────────────────────────
 * Lo dichiara Regiondo. Non e' una supposizione: il widget
 * (`booking-widget.i18n.*.chunk.js`) tiene sei adattatori di
 * tracciamento e accende quelli che trova in pagina. Uno di questi
 * riconosce il contenitore GTM e fa da se'
 *
 *     dataLayer.push({event:'purchase', ecommerce:{transaction_id, value,
 *                     tax, shipping, currency, items, coupon, discount}})
 *
 * dove `transaction_id` e' il NUMERO D'ORDINE REGIONDO — lo stesso
 * identificativo che il vecchio tag Ads usava, e la condizione perche'
 * Google e Meta possano scartare i doppioni.
 *
 * Quindi qui non c'e' nessun `purchase`, nessun `add_to_cart`, nessun
 * `begin_checkout`: sarebbero l'acquisto contato due volte. La stessa
 * ragione per cui e' sparito l'`add_to_cart_click` che la landing
 * mandava sul pulsante del widget.
 *
 * ── IL dataLayER PARLA SEMPRE, GTM ASCOLTA SOLO IN PRODUZIONE ───────
 * Gli eventi si scrivono su qualunque dominio; il contenitore GTM si
 * carica solo su prestigerent.com. E' la stessa regola di prima detta
 * meglio: la pagina dichiara i fatti sempre, e' il centralino che a
 * volte non ascolta. Fuori produzione `dataLayer.push` riempie un array
 * e non fa nient'altro — nessuna richiesta, nessun dato sporco nelle
 * campagne — ma i fatti si possono leggere dalla console del browser sul
 * dominio di prova, che e' l'unico modo di collaudarli prima del
 * passaggio.
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
 * Il valore si LEGGE subito dall'indirizzo -- se non si legge ora, la
 * prima navigazione interna se lo porta via -- ma resta in memoria, e
 * tocca `localStorage` solo quando Cookiebot dice che il gruppo
 * `marketing` e' concesso. Se l'utente rifiuta o revoca, quello che
 * c'era viene cancellato: un consenso ritirato che lascia il dato dov'era
 * non e' ritirato. L'art. 122 del Codice Privacy non distingue fra
 * cookie e `localStorage`: e' comunque un accesso al terminale
 * dell'utente per una finalita' di marketing, e vuole il consenso prima.
 *
 * E il gclid resta dov'e': in `localStorage`, mai nel `dataLayer`.
 * Nessun evento di questo file porta un dato identificabile.
 */

const GTM = 'GTM-TL7VV3RL';

/* Gli identificatori di clic delle quattro reti. Stanno in una costante
   sola perche' vengono percorsi due volte -- per scrivere e per
   cancellare -- e due elenchi che divergono vorrebbero dire un dato che
   resta li' dopo la revoca. */
const CHIAVI_CLIC = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid'] as const;

/* DOVE E' STATO FATTO IL GESTO.
 *
 * Il numero di telefono compare in cinque punti diversi del sito, e
 * "quanti hanno chiamato" senza sapere DA DOVE non dice niente su cosa
 * spostare o togliere. Prima questo dato era `a.className`, cioe' una
 * stringa di classi CSS che cambia al primo ritocco di grafica e che in
 * GTM non si legge. Qui sono nomi decisi da noi, agganciati al
 * contenitore in cui il pulsante vive.
 *
 * L'ordine conta: si prende la PRIMA zona che contiene il pulsante, e i
 * riquadri di contatto stanno dentro la sezione contatti. */
const ZONE: [string, string][] = [
  ['#prSticky', 'barra-fissa'],
  ['.hd', 'intestazione'],
  ['.ft', 'piede'],
  ['.pg-rail', 'colonna-calendario'],
  ['.pr-help', 'riquadri-contatto'],
  ['.dr', 'blocco-prenota-diretto'],
  ['#contact', 'sezione-contatti'],
];

function zona(el: Element): string {
  for (const [selettore, nome] of ZONE) if (el.closest(selettore)) return nome;
  return 'pagina';
}

function suProduzione() {
  if (typeof window === 'undefined') return false;
  return /(^|\.)prestigerent\.com$/i.test(window.location.hostname);
}

export function Tracciamento() {
  /* Il percorso serve a riarmare l'osservatore del calendario a ogni
     cambio di pagina: questo componente sta nel layout e non viene mai
     smontato, quindi senza questo un `view_booking_form` uscirebbe solo
     sulla prima pagina aperta e mai su quelle raggiunte cliccando. */
  const percorso = usePathname();

  /* ── IL gclid: SI LEGGE SUBITO, SI SCRIVE QUANDO IL CONSENSO PARLA ── */
  useEffect(() => {
    /* La lettura dall'indirizzo va fatta adesso: fra un attimo l'utente
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

    /* Tre casi, e il terzo e' quello che conta:

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
       quindi in prova il gclid non viene salvato. Su un dominio che non
       riceve clic dalle campagne non manca a nessuno. */
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
    return () => {
      window.removeEventListener('CookiebotOnAccept', applicaConsenso);
      window.removeEventListener('CookiebotOnDecline', applicaConsenso);
      window.removeEventListener('CookiebotOnLoad', applicaConsenso);
    };
  }, []);

  /* ── I GESTI DI CONTATTO E L'INTENZIONE DI PRENOTARE ───────────────
     Un ascoltatore solo, sul documento, per tutta la vita della scheda:
     i pulsanti compaiono e scompaiono (il menu, la barra fissa), un
     ascoltatore per pulsante li perderebbe. */
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('a,button') as HTMLElement | null;
      if (!el) return;
      const href = el.getAttribute('href') ?? '';
      const posizione = zona(el);

      if (/wa\.me|whatsapp/i.test(href)) {
        dichiara(EVENTI.contattoWhatsapp, { posizione, canale: 'whatsapp' });
      } else if (href.startsWith('tel:')) {
        dichiara(EVENTI.contattoTelefono, { posizione, canale: 'telefono' });
      } else if (href.startsWith('mailto:')) {
        dichiara(EVENTI.contattoEmail, { posizione, canale: 'email' });
      } else if (href === '#bookform' || href.endsWith('#bookform')) {
        /* Intenzione, non acquisto: chiedere di vedere il calendario non
           e' prenotare. Va tenuto distinto, altrimenti Google impara a
           portare gente che apre il calendario e se ne va.

           Si riconosce dall'ancora e non piu' dal testo "BOOK NOW": il
           testo lo si traduce, e in otto lingue quella regola smetterebbe
           di funzionare senza che nessuno se ne accorga. L'ancora
           `#bookform` invece e' la stessa in tutte le lingue perche' e'
           un'ancora, non una parola. */
        dichiara(EVENTI.intenzioneDiPrenotare, { posizione });
      }
    };

    document.addEventListener('click', alClic, { passive: true });
    return () => document.removeEventListener('click', alClic);
  }, []);

  /* ── IL CALENDARIO E' COMPARSO DAVVERO A SCHERMO ───────────────────
     Non "la pagina lo contiene": e' comparso sotto gli occhi di
     qualcuno. E' la misura che dice quanti dei visitatori arrivano
     davvero al punto in cui si prenota, ed e' il denominatore giusto
     per giudicare il calendario invece della pagina.

     Si riarma a ogni cambio di percorso perche' con Next la pagina
     cambia senza ricaricare. Il `MutationObserver` serve al caso in cui
     l'elemento non ci sia ancora quando l'effetto parte. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    let osservatore: IntersectionObserver | null = null;
    let attesa: MutationObserver | null = null;

    const attacca = (elemento: Element) => {
      osservatore = new IntersectionObserver(
        (voci) => {
          if (!voci[0]?.isIntersecting) return;
          dichiara(EVENTI.calendarioVisto);
          /* Una volta per vista di pagina: il calendario puo' entrare e
             uscire dallo schermo dieci volte mentre si scorre, ma il
             fatto -- "e' arrivato a vederlo" -- e' successo una volta. */
          osservatore?.disconnect();
          osservatore = null;
        },
        { threshold: 0.3 }
      );
      osservatore.observe(elemento);
    };

    const cercato = document.getElementById('bookform');
    if (cercato) {
      attacca(cercato);
    } else {
      attesa = new MutationObserver(() => {
        const trovato = document.getElementById('bookform');
        if (!trovato) return;
        attesa?.disconnect();
        attesa = null;
        attacca(trovato);
      });
      attesa.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      osservatore?.disconnect();
      attesa?.disconnect();
    };
  }, [percorso]);

  /* Il contenitore GTM solo sul dominio vero. Su
     prestigerent-web.vercel.app resta spento apposta: ogni evento
     inquinerebbe i dati veri delle campagne, e i dati sporchi sono
     peggio dei dati mancanti perche' non si sa quali buttare. */
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
