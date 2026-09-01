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
 * Prima qui c'erano prima i nomi scritti, poi delle tessere disegnate a
 * mano: due tentativi di aggirare il problema, ed entrambi erano
 * peggio del problema.
 *
 * Adesso non sono ridisegnati: i tracciati sono quelli ORIGINALI di
 * Font Awesome (`fab fa-cc-*`), copiati dal pacchetto ufficiale. Sono
 * gli stessi disegni che usa il footer di WordPress, quindi il marchio
 * arriva nella forma in cui e' stato distribuito, non in una mia
 * approssimazione. Il dettaglio e la licenza stanno accanto ai
 * componenti, in fondo al file.
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

/* 18 e non 16 come le icone del menu: questa sta nella fila dei social,
   dove tutte le altre sono 18. Una sola piu' piccola in mezzo a quattro
   uguali si nota, e si nota come un errore. */
export const IconaWhatsApp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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

/* ── I MARCHI DEI CIRCUITI DI PAGAMENTO ───────────────────────────────
 *
 * Questi sono i disegni VERI di Font Awesome (`fab fa-cc-*`), gli stessi
 * che usa il footer di WordPress. Non sono ridisegnati a occhio: i
 * tracciati sono copiati dai file `svgs/brands/cc-*.svg` del pacchetto
 * @fortawesome/fontawesome-free 7.3.1, estratti il 01/09/2026.
 *
 * PERCHE' COPIATI E NON CARICATI. Font Awesome sono 75 KB di CSS piu' un
 * file di caratteri preso da un dominio terzo, su tutte e 124 le pagine,
 * per cinque disegni. E il carattere arriva DOPO il primo disegno della
 * pagina: al posto delle carte comparirebbero quadratini per qualche
 * decimo di secondo, proprio nel punto in cui un disegno incerto fa
 * dubitare del pagamento. Cinque tracciati scritti qui costano zero
 * richieste e si vedono subito.
 *
 * ⚠️ ATTRIBUZIONE, CHE E' UN OBBLIGO E NON UNA CORTESIA.
 * Le icone di Font Awesome Free sono rilasciate con licenza
 * CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), che
 * richiede di citare la fonte. La citazione e' questo commento:
 *     Icone: Font Awesome Free 7.3.1 -- https://fontawesome.com
 *     Licenza: CC BY 4.0
 * Se un domani questi tracciati vengono spostati in un altro file, il
 * commento va spostato con loro.
 *
 * Sono monocromatici -- `fill="currentColor"` -- come lo sono in Font
 * Awesome: prendono il colore del testo accanto e non portano cinque
 * marche di colore diverso in fondo alla pagina.
 */

export const CartaStripe = () => (
  <svg width="30" height="21" viewBox="0 0 576 512" fill="currentColor" role="img" aria-label="Stripe">
    <path d="M492.4 220.8c-8.9 0-18.7 6.7-18.7 22.7l36.7 0c0-16-9.3-22.7-18-22.7zM375 223.4c-8.2 0-13.3 2.9-17 7l.2 52.8c3.5 3.7 8.5 6.7 16.8 6.7 13.1 0 21.9-14.3 21.9-33.4 0-18.6-9-33.2-21.9-33.1zM528 32L48 32C21.5 32 0 53.5 0 80L0 432c0 26.5 21.5 48 48 48l480 0c26.5 0 48-21.5 48-48l0-352c0-26.5-21.5-48-48-48zM122.2 281.1c0 25.6-20.3 40.1-49.9 40.3-12.2 0-25.6-2.4-38.8-8.1l0-33.9c12 6.4 27.1 11.3 38.9 11.3 7.9 0 13.6-2.1 13.6-8.7 0-17-54-10.6-54-49.9 0-25.2 19.2-40.2 48-40.2 11.8 0 23.5 1.8 35.3 6.5l0 33.4c-10.8-5.8-24.5-9.1-35.3-9.1-7.5 0-12.1 2.2-12.1 7.7 0 16 54.3 8.4 54.3 50.7zM191 224.5l-27 0 0 50.5c0 20.9 22.5 14.4 27 12.6l0 28.9c-4.7 2.6-13.3 4.7-24.9 4.7-21.1 0-36.9-15.5-36.9-36.5l.2-113.9 34.7-7.4 0 30.8 26.9 0 0 30.3zm74 2.4c-4.5-1.5-18.7-3.6-27.1 7.4l0 84.4-35.5 0 0-124.5 30.7 0 2.2 10.5c8.3-15.3 24.9-12.2 29.6-10.5l.1 0 0 32.7zm44.1 91.8l-35.7 0 0-124.5 35.7 0 0 124.5zm0-142.9l-35.7 7.6 0-28.9 35.7-7.6 0 28.9zm74.1 145.5c-12.4 0-20-5.3-25.1-9l-.1 40.2-35.5 7.5 0-165.8 31.3 0 1.8 8.8c4.9-4.5 13.9-11.1 27.8-11.1 24.9 0 48.4 22.5 48.4 63.8 0 45.1-23.2 65.5-48.6 65.6zm160.4-51.5l-69.5 0c1.6 16.6 13.8 21.5 27.6 21.5 14.1 0 25.2-3 34.9-7.9l0 28.6c-9.7 5.3-22.4 9.2-39.4 9.2-34.6 0-58.8-21.7-58.8-64.5 0-36.2 20.5-64.9 54.3-64.9 33.7 0 51.3 28.7 51.3 65.1 0 3.5-.3 10.9-.4 12.9z" />
  </svg>
);

export const CartaMastercard = () => (
  <svg width="30" height="21" viewBox="0 0 576 512" fill="currentColor" role="img" aria-label="Mastercard">
    <path d="M482.9 410.3c0 6.8-4.6 11.7-11.2 11.7-6.8 0-11.2-5.2-11.2-11.7s4.4-11.7 11.2-11.7c6.6 0 11.2 5.2 11.2 11.7zM172.1 398.6c-7.1 0-11.2 5.2-11.2 11.7S165 422 172.1 422c6.5 0 10.9-4.9 10.9-11.7-.1-6.5-4.4-11.7-10.9-11.7zm117.5-.3c-5.4 0-8.7 3.5-9.5 8.7l19.1 0c-.9-5.7-4.4-8.7-9.6-8.7zm107.8 .3c-6.8 0-10.9 5.2-10.9 11.7s4.1 11.7 10.9 11.7 11.2-4.9 11.2-11.7c0-6.5-4.4-11.7-11.2-11.7zm105.9 26.1c0 .3 .3 .5 .3 1.1 0 .3-.3 .5-.3 1.1-.3 .3-.3 .5-.5 .8-.3 .3-.5 .5-1.1 .5-.3 .3-.5 .3-1.1 .3-.3 0-.5 0-1.1-.3-.3 0-.5-.3-.8-.5-.3-.3-.5-.5-.5-.8-.3-.5-.3-.8-.3-1.1 0-.5 0-.8 .3-1.1 0-.5 .3-.8 .5-1.1 .3-.3 .5-.3 .8-.5 .5-.3 .8-.3 1.1-.3 .5 0 .8 0 1.1 .3 .5 .3 .8 .3 1.1 .5s.2 .6 .5 1.1zm-2.2 1.4c.5 0 .5-.3 .8-.3 .3-.3 .3-.5 .3-.8s0-.5-.3-.8c-.3 0-.5-.3-1.1-.3l-1.6 0 0 3.5 .8 0 0-1.4 .3 0 1.1 1.4 .8 0-1.1-1.3zM576 81l0 352c0 26.5-21.5 48-48 48L48 481c-26.5 0-48-21.5-48-48L0 81C0 54.5 21.5 33 48 33l480 0c26.5 0 48 21.5 48 48zM64 220.6c0 76.5 62.1 138.5 138.5 138.5 27.2 0 53.9-8.2 76.5-23.1-72.9-59.3-72.4-171.2 0-230.5-22.6-15-49.3-23.1-76.5-23.1-76.4-.1-138.5 62-138.5 138.2zM288 329.4c70.5-55 70.2-162.2 0-217.5-70.2 55.3-70.5 162.6 0 217.5zM145.7 405.7c0-8.7-5.7-14.4-14.7-14.7-4.6 0-9.5 1.4-12.8 6.5-2.4-4.1-6.5-6.5-12.2-6.5-3.8 0-7.6 1.4-10.6 5.4l0-4.4-8.2 0 0 36.7 8.2 0c0-18.9-2.5-30.2 9-30.2 10.2 0 8.2 10.2 8.2 30.2l7.9 0c0-18.3-2.5-30.2 9-30.2 10.2 0 8.2 10 8.2 30.2l8.2 0 0-23-.2 0zM190.6 392l-7.9 0 0 4.4c-2.7-3.3-6.5-5.4-11.7-5.4-10.3 0-18.2 8.2-18.2 19.3 0 11.2 7.9 19.3 18.2 19.3 5.2 0 9-1.9 11.7-5.4l0 4.6 7.9 0 0-36.8zm40.5 25.6c0-15-22.9-8.2-22.9-15.2 0-5.7 11.9-4.8 18.5-1.1l3.3-6.5c-9.4-6.1-30.2-6-30.2 8.2 0 14.3 22.9 8.3 22.9 15 0 6.3-13.5 5.8-20.7 .8l-3.5 6.3c11.2 7.6 32.6 6 32.6-7.5zm35.4 9.3l-2.2-6.8c-3.8 2.1-12.2 4.4-12.2-4.1l0-16.6 13.1 0 0-7.4-13.1 0 0-11.2-8.2 0 0 11.2-7.6 0 0 7.3 7.6 0 0 16.7c0 17.6 17.3 14.4 22.6 10.9zm13.3-13.4l27.5 0c0-16.2-7.4-22.6-17.4-22.6-10.6 0-18.2 7.9-18.2 19.3 0 20.5 22.6 23.9 33.8 14.2l-3.8-6c-7.8 6.4-19.6 5.8-21.9-4.9zM338.9 392c-4.6-2-11.6-1.8-15.2 4.4l0-4.4-8.2 0 0 36.7 8.2 0 0-20.7c0-11.6 9.5-10.1 12.8-8.4l2.4-7.6zm10.6 18.3c0-11.4 11.6-15.1 20.7-8.4l3.8-6.5c-11.6-9.1-32.7-4.1-32.7 15 0 19.8 22.4 23.8 32.7 15l-3.8-6.5c-9.2 6.5-20.7 2.6-20.7-8.6zM416.2 392l-8.2 0 0 4.4c-8.3-11-29.9-4.8-29.9 13.9 0 19.2 22.4 24.7 29.9 13.9l0 4.6 8.2 0 0-36.8zm33.7 0c-2.4-1.2-11-2.9-15.2 4.4l0-4.4-7.9 0 0 36.7 7.9 0 0-20.7c0-11 9-10.3 12.8-8.4l2.4-7.6zm40.3-14.9l-7.9 0 0 19.3c-8.2-10.9-29.9-5.1-29.9 13.9 0 19.4 22.5 24.6 29.9 13.9l0 4.6 7.9 0 0-51.7zm7.6-75.1l0 4.6 .8 0 0-4.6 1.9 0 0-.8-4.6 0 0 .8 1.9 0zm6.6 123.8c0-.5 0-1.1-.3-1.6-.3-.3-.5-.8-.8-1.1s-.8-.5-1.1-.8c-.5 0-1.1-.3-1.6-.3-.3 0-.8 .3-1.4 .3-.5 .3-.8 .5-1.1 .8-.5 .3-.8 .8-.8 1.1-.3 .5-.3 1.1-.3 1.6 0 .3 0 .8 .3 1.4 0 .3 .3 .8 .8 1.1 .3 .3 .5 .5 1.1 .8 .5 .3 1.1 .3 1.4 .3 .5 0 1.1 0 1.6-.3 .3-.3 .8-.5 1.1-.8s.5-.8 .8-1.1c.3-.6 .3-1.1 .3-1.4zm3.2-124.7l-1.4 0-1.6 3.5-1.6-3.5-1.4 0 0 5.4 .8 0 0-4.1 1.6 3.5 1.1 0 1.4-3.5 0 4.1 1.1 0 0-5.4zm4.4-80.5c0-76.2-62.1-138.3-138.5-138.3-27.2 0-53.9 8.2-76.5 23.1 72.1 59.3 73.2 171.5 0 230.5 22.6 15 49.5 23.1 76.5 23.1 76.4 .1 138.5-61.9 138.5-138.4z" />
  </svg>
);

export const CartaVisa = () => (
  <svg width="30" height="21" viewBox="0 0 576 512" fill="currentColor" role="img" aria-label="Visa">
    <path d="M470.1 231.3s7.6 37.2 9.3 45l-33.4 0c3.3-8.9 16-43.5 16-43.5-.2 .3 3.3-9.1 5.3-14.9l2.8 13.4zM576 80l0 352c0 26.5-21.5 48-48 48L48 480c-26.5 0-48-21.5-48-48L0 80C0 53.5 21.5 32 48 32l480 0c26.5 0 48 21.5 48 48zM152.5 331.2l63.2-155.2-42.5 0-39.3 106-4.3-21.5-14-71.4c-2.3-9.9-9.4-12.7-18.2-13.1l-64.7 0-.7 3.1c15.8 4 29.9 9.8 42.2 17.1l35.8 135 42.5 0zm94.4 .2l25.2-155.4-40.2 0-25.1 155.4 40.1 0zm139.9-50.8c.2-17.7-10.6-31.2-33.7-42.3-14.1-7.1-22.7-11.9-22.7-19.2 .2-6.6 7.3-13.4 23.1-13.4 13.1-.3 22.7 2.8 29.9 5.9l3.6 1.7 5.5-33.6c-7.9-3.1-20.5-6.6-36-6.6-39.7 0-67.6 21.2-67.8 51.4-.3 22.3 20 34.7 35.2 42.2 15.5 7.6 20.8 12.6 20.8 19.3-.2 10.4-12.6 15.2-24.1 15.2-16 0-24.6-2.5-37.7-8.3l-5.3-2.5-5.6 34.9c9.4 4.3 26.8 8.1 44.8 8.3 42.2 .1 69.7-20.8 70-53zM528 331.4l-32.4-155.4-31.1 0c-9.6 0-16.9 2.8-21 12.9l-59.7 142.5 42.2 0s6.9-19.2 8.4-23.3l51.6 0c1.2 5.5 4.8 23.3 4.8 23.3l37.2 0z" />
  </svg>
);

export const CartaPayPal = () => (
  <svg width="30" height="21" viewBox="0 0 576 512" fill="currentColor" role="img" aria-label="PayPal">
    <path d="M186.3 258.2c0 12.2-9.7 21.5-22 21.5-9.2 0-16-5.2-16-15 0-12.2 9.5-22 21.7-22 9.3 0 16.3 5.7 16.3 15.5zM80.5 209.7l-4.7 0c-1.5 0-3 1-3.2 2.7l-4.3 26.7 8.2-.3c11 0 19.5-1.5 21.5-14.2 2.3-13.4-6.2-14.9-17.5-14.9zm284 0l-4.5 0c-1.8 0-3 1-3.2 2.7l-4.2 26.7 8-.3c13 0 22-3 22-18-.1-10.6-9.6-11.1-18.1-11.1zM576 80l0 352c0 26.5-21.5 48-48 48L48 480c-26.5 0-48-21.5-48-48L0 80C0 53.5 21.5 32 48 32l480 0c26.5 0 48 21.5 48 48zM128.3 215.4c0-21-16.2-28-34.7-28l-40 0c-2.5 0-5 2-5.2 4.7L32 294.2c-.3 2 1.2 4 3.2 4l19 0c2.7 0 5.2-2.9 5.5-5.7l4.5-26.6c1-7.2 13.2-4.7 18-4.7 28.6 0 46.1-17 46.1-45.8zm84.2 8.8l-19 0c-3.8 0-4 5.5-4.2 8.2-5.8-8.5-14.2-10-23.7-10-24.5 0-43.2 21.5-43.2 45.2 0 19.5 12.2 32.2 31.7 32.2 9 0 20.2-4.9 26.5-11.9-.5 1.5-1 4.7-1 6.2 0 2.3 1 4 3.2 4l17.2 0c2.7 0 5-2.9 5.5-5.7l10.2-64.3c.3-1.9-1.2-3.9-3.2-3.9zM253 322.1l63.7-92.6c.5-.5 .5-1 .5-1.7 0-1.7-1.5-3.5-3.2-3.5l-19.2 0c-1.7 0-3.5 1-4.5 2.5l-26.5 39-11-37.5c-.8-2.2-3-4-5.5-4l-18.7 0c-1.7 0-3.2 1.8-3.2 3.5 0 1.2 19.5 56.8 21.2 62.1-2.7 3.8-20.5 28.6-20.5 31.6 0 1.8 1.5 3.2 3.2 3.2l19.2 0c1.8-.1 3.5-1.1 4.5-2.6zM412.3 215.4c0-21-16.2-28-34.7-28l-39.7 0c-2.7 0-5.2 2-5.5 4.7l-16.2 102c-.2 2 1.3 4 3.2 4l20.5 0c2 0 3.5-1.5 4-3.2l4.5-29c1-7.2 13.2-4.7 18-4.7 28.4 0 45.9-17 45.9-45.8zm84.2 8.8l-19 0c-3.8 0-4 5.5-4.3 8.2-5.5-8.5-14-10-23.7-10-24.5 0-43.2 21.5-43.2 45.2 0 19.5 12.2 32.2 31.7 32.2 9.3 0 20.5-4.9 26.5-11.9-.3 1.5-1 4.7-1 6.2 0 2.3 1 4 3.2 4l17.3 0c2.7 0 5-2.9 5.5-5.7l10.2-64.3c.3-1.9-1.2-3.9-3.2-3.9zM544 190.9c0-2-1.5-3.5-3.2-3.5l-18.5 0c-1.5 0-3 1.2-3.2 2.7l-16.2 104-.3 .5c0 1.8 1.5 3.5 3.5 3.5l16.5 0c2.5 0 5-2.9 5.2-5.7l16.2-101.2 0-.3zm-90 51.8c-12.2 0-21.7 9.7-21.7 22 0 9.7 7 15 16.2 15 12 0 21.7-9.2 21.7-21.5 .1-9.8-6.9-15.5-16.2-15.5z" />
  </svg>
);

export const CartaAmex = () => (
  <svg width="30" height="21" viewBox="0 0 576 512" fill="currentColor" role="img" aria-label="American Express">
    <path d="M0 432c0 26.5 21.5 48 48 48l480 0c26.5 0 48-21.5 48-48l0-1.1-61.7 0-31.9-35.1-31.9 35.1-203.7 0 0-163.8-65.8 0 81.7-184.7 78.6 0 28.1 63.2 0-63.2 97.2 0 16.9 47.6 17-47.6 75.5 0 0-2.4c0-26.5-21.5-48-48-48L48 32C21.5 32 0 53.5 0 80L0 432zm440.4-21.7l42.2-46.3 42 46.3 51.4 0-68-72.1 68-72.1-50.6 0-42 46.7-41.5-46.7-51.4 0 67.5 72.5-67.4 71.6 0-33.1-83 0 0-22.2 80.9 0 0-32.3-80.9 0 0-22.4 83 0 0-33.1-122 0 0 143.2 171.8 0zm96.3-72l39.3 41.9 0-83.3-39.3 41.4zm-36.3-92l36.9-100.6 0 100.6 38.7 0 0-143.3-60.2 0-32.2 89.3-31.9-89.3-61.2 0 0 143.1-63.2-143.1-51.2 0-62.4 143.3 43 0 11.9-28.7 65.9 0 12 28.7 82.7 0 0-100.3 36.8 100.3 34.4 0zM282 185.4l19.5-46.9 19.4 46.9-38.9 0z" />
  </svg>
);
