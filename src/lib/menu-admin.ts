/* LE VOCI DEL MENU DEL PANNELLO.
 *
 * 🔴 PERCHE' QUESTO FILE ESISTE, invece di stare dentro `Guscio.tsx`.
 *
 * `Guscio.tsx` e' `'use client'`. Quando un Server Component importa da un
 * modulo client, OGNI export diventa un RIFERIMENTO al client -- non la
 * cosa vera. Per i componenti va bene, e' il modo in cui funziona il
 * confine. Per una funzione normale no: chiamarla sul server significa
 * provare a invocare un oggetto che non e' una funzione, e la pagina va
 * in errore 500.
 *
 * E' successo davvero, il 26/09/2026: `vociPerRuolo()` stava in
 * `Guscio.tsx` e le pagine la chiamavano lato server. TUTTE E QUINDICI le
 * pagine del pannello rispondevano 500; l'unica che funzionava era la
 * schermata di accesso, che il guscio non lo importa. Dal 307 di prima
 * non si vedeva niente, perche' senza sessione non si arrivava mai a
 * eseguire quel codice.
 *
 * Regola che ne esce: i DATI e le FUNZIONI PURE condivise fra server e
 * client stanno in un modulo senza direttiva. `'use client'` e'
 * per i componenti.
 */

export type VoceMenu = {
  href: string;
  testo: string;
  /** il nome dell'icona, non l'icona: una funzione non attraversa il
   *  confine fra server e client. La traduzione in componente avviene
   *  dentro il guscio, che e' gia' nel browser. */
  icona: 'gallery' | 'foto' | 'seo' | 'numeri' | 'utenti' | 'listino' | 'flotta';
  /** Le pagine dentro questa sezione, mostrate quando la sezione e'
   *  aperta. SOLO I TITOLI: la spiegazione di ognuna sta gia' sulla
   *  pagina della sezione, e ripeterla in una barra laterale larga 260px
   *  la riempirebbe di testo che nessuno legge due volte. */
  sotto?: { href: string; testo: string }[];
};

/** Le voci che tocca a ciascun ruolo.
 *
 *  Nascondere una voce NON e' una difesa: quelle pagine chiamano
 *  `soloGestione()` e le loro azioni chiamano `chiAgisce()`. Qui si toglie
 *  il rumore a chi non ne ha bisogno -- la porta e' chiusa altrove. */
export function vociPerRuolo(ruolo: string): VoceMenu[] {
  /* L'utente del listino (un'agenzia, un hotel) vede due pagine e
     nient'altro, in inglese: niente gallery, che e' delle guide. */
  if (ruolo === 'listino') {
    return [
      { href: '/admin/listino/', testo: 'Price list', icona: 'listino' },
      { href: '/admin/listino/flotta/', testo: 'Our fleet', icona: 'flotta' },
    ];
  }

  /* Le due che valgono per tutti: una guida carica e guarda le sue. Le
     altre quattro sono di gestione, e stanno dietro `soloGestione()`
     sulle pagine -- qui si toglie il rumore, non si chiude la porta. */
  const sempre = [
    { href: '/admin/gallery/carica/', testo: 'Carica e tagga' },
    { href: '/admin/gallery/mie/', testo: 'Le mie foto' },
  ];
  const diGestione = [
    { href: '/admin/gallery/tutte/', testo: 'Tutte le foto' },
    { href: '/admin/gallery/approva/', testo: 'Da approvare' },
    { href: '/admin/gallery/pagine/', testo: 'Pagine' },
    { href: '/admin/gallery/impostazioni/', testo: 'Impostazioni' },
  ];

  const gallery: VoceMenu = {
    href: '/admin/gallery/',
    testo: 'Foto della gallery',
    icona: 'gallery',
    sotto: ruolo === 'admin' ? [...sempre, ...diGestione] : sempre,
  };
  if (ruolo !== 'admin') return [gallery];
  return [
    gallery,
    { href: '/admin/foto/', testo: 'Foto dei tour', icona: 'foto' },
    { href: '/admin/seo/', testo: 'Title e description', icona: 'seo' },
    { href: '/admin/numeri/', testo: 'Numeri da Regiondo', icona: 'numeri' },
    {
      href: '/admin/listino/',
      testo: 'Listino prezzi',
      icona: 'listino',
      sotto: [
        { href: '/admin/listino/', testo: 'Listino' },
        { href: '/admin/listino/sincronizza/', testo: 'Sincronizza tab PRICES' },
        { href: '/admin/listino/richieste/', testo: 'Richieste di accesso' },
        { href: '/admin/listino/flotta/', testo: 'Flotta' },
      ],
    },
    { href: '/admin/utenti/', testo: 'Utenti', icona: 'utenti' },
  ];
}
