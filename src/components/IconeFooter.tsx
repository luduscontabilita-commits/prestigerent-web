/* LE ICONE DEL PIEDE, DISEGNATE IN LINEA.
 *
 * Il footer di WordPress usava Font Awesome (`fab fa-cc-visa`,
 * `fas fa-envelope`, ...). Qui non si puo' fare lo stesso, e non e' una
 * limitazione: Font Awesome sono 75 KB di CSS piu' un file di caratteri
 * scaricato da un dominio terzo, su tutte e 124 le pagine, per una
 * quindicina di disegni. Il carattere arriva DOPO il primo disegno della
 * pagina, quindi al posto delle icone comparirebbero quadratini per
 * qualche decimo di secondo -- proprio in fondo, dove ci sono i marchi
 * dei circuiti di pagamento, cioe' l'unico punto in cui un disegno
 * incerto fa dubitare del pagamento.
 *
 * Qui sono SVG scritti a mano dentro l'HTML: nessuna richiesta in piu',
 * niente da aspettare, e si colorano con `currentColor` come il testo
 * accanto.
 *
 * ── SUI MARCHI DEI CIRCUITI ──────────────────────────────────────────
 * Visa, Mastercard, American Express, PayPal e Stripe sono marchi
 * registrati, e ognuno ha un manuale d'uso che vieta di ridisegnarli.
 * Rifarli "a occhio" e' insieme una violazione e un autogol: un logo
 * storto fa sembrare finto anche un pagamento vero -- ed e' esattamente
 * la ragione per cui prima qui c'erano solo i nomi scritti.
 * La via di mezzo che si tiene: una tessera con il nome del circuito,
 * nella sua forma e nel suo colore. Non e' il logo ufficiale e non
 * pretende di esserlo; e' un'etichetta riconoscibile, che dice la stessa
 * cosa senza spacciarsi per il marchio. L'unica eccezione e' Mastercard,
 * i cui due cerchi sono una forma geometrica semplice che si riproduce
 * senza deformare niente.
 */

/* ── Le icone di servizio (menu Help e social) ─────────────────────────
   Un solo `viewBox` per tutte, 24x24, cosi' stanno in riga senza che
   nessuna balli rispetto alle altre. */
const P = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const IconaFaq = () => (
  <svg {...P}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconaEmail = () => (
  <svg {...P}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6 8.5-6" />
  </svg>
);

export const IconaTelefono = () => (
  <svg {...P}>
    <path d="M6.6 3h-.9A2.7 2.7 0 0 0 3 5.7C3 14.1 9.9 21 18.3 21a2.7 2.7 0 0 0 2.7-2.7v-.9a1 1 0 0 0-.8-1l-3.4-.7a1 1 0 0 0-1 .4l-.9 1.2a12.6 12.6 0 0 1-5.2-5.2l1.2-.9a1 1 0 0 0 .4-1l-.7-3.4a1 1 0 0 0-1-.8Z" />
  </svg>
);

export const IconaWhatsApp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 1 1-4.2 15.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8Zm-3.3 4c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.5-.6c.1-.2.2-.3.3-.5v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4Z" />
  </svg>
);

export const IconaFreccia = () => (
  <svg {...P}>
    <path d="m7 6 6 6-6 6" />
    <path d="m14 6 6 6-6 6" />
  </svg>
);

export const IconaAereo = () => (
  <svg {...P}>
    <path d="M21 3 3 10.5l7 2.7 2.7 7L21 3Z" />
    <path d="M10 13.2 21 3" />
  </svg>
);

export const IconaMappa = () => (
  <svg {...P}>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

/* Il menu Help del sito nuovo non ha le stesse voci di quello di
   WordPress: qui ci sono "About us" e "Our vehicles", che li' non
   c'erano, e non c'e' "Quick Request", che e' stato tolto. Queste tre
   coprono le voci in piu' invece di riusare due volte la stessa
   freccia -- due righe con lo stesso disegno si leggono come un
   errore. */
export const IconaInfo = () => (
  <svg {...P}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

export const IconaMezzo = () => (
  <svg {...P}>
    <path d="M3 16V8a1 1 0 0 1 1-1h9v9" />
    <path d="M13 10h3.6a1 1 0 0 1 .8.4l2.4 3.1a1 1 0 0 1 .2.6V16" />
    <circle cx="7.5" cy="17" r="1.8" />
    <circle cx="16.5" cy="17" r="1.8" />
    <path d="M9.3 17h5.4" />
  </svg>
);

export const IconaCarta = () => (
  <svg {...P}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M2.5 10h19" />
    <path d="M6.5 15h3" />
  </svg>
);

export const IconaTripadvisor = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 6.2c-2.4 0-4.6.6-6.4 1.7H1l1.7 1.9A4.9 4.9 0 0 0 6 18.3a4.8 4.8 0 0 0 3.4-1.4l1.6 1.8 1.6-1.8a4.8 4.8 0 0 0 3.4 1.4 4.9 4.9 0 0 0 3.3-8.5L21 7.9h-2.6A12.4 12.4 0 0 0 12 6.2Zm-6 3.6a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm12 0a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4ZM6 11.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm12 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z" />
  </svg>
);

export const IconaInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconaFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
  </svg>
);

export const IconaTikTok = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.5 3h-2.8v12.1a2.5 2.5 0 1 1-2.1-2.5v-2.9a5.4 5.4 0 1 0 5 5.4V9.4a6.4 6.4 0 0 0 3.7 1.2V7.7a3.7 3.7 0 0 1-3.8-3.6V3Z" />
  </svg>
);

/* 🔴 QUI C'ERANO LE TESSERE DEI CIRCUITI, TOLTE IL 01/09/2026.
   Aggiunte e rimosse lo stesso giorno, su richiesta: il piede torna a
   dire i circuiti a parole, come faceva prima. Il ragionamento sui
   marchi resta scritto in cima a questo file, perche' vale ancora il
   giorno in cui qualcuno riproponesse di disegnarli.
   `IconaCarta` invece resta: non e' un marchio, e' il disegno di una
   carta qualunque accanto alla voce "Payment" del menu Help. */
