'use client';

import { useEffect, useRef, useState } from 'react';

/* LA GALLERIA DI FOTAFLO.
 *
 * ── PERCHE' NON SI INCOLLA E BASTA IL LORO CODICE ───────────────────
 * Quello che Fotaflo consegna e' uno `<script>` che, mentre la pagina si
 * disegna, ne crea un secondo e se lo infila accanto. Su WordPress va
 * bene; qui no: React ricostruisce l'albero quando gli pare, e uno
 * script piazzato a mano dentro il suo albero puo' venire rimosso, o
 * eseguito due volte alla prima navigazione interna. Il secondo caso e'
 * il piu' fastidioso, perche' non da' errore: raddoppia le fotografie.
 *
 * Qui si fa la stessa identica cosa, ma da dentro un effetto: si crea il
 * tag una volta sola, si aspetta, e si toglie quando la pagina cambia.
 *
 * ── LA CHIAVE E' PUBBLICA, E VA BENE COSI' ──────────────────────────
 * `key=67aa5a82` viaggia nell'indirizzo di uno script che carica il
 * browser: chiunque apra la pagina la vede. Non e' un segreto e non va
 * trattata come tale -- non e' una password, e' il nome della galleria.
 * A difendere le foto e' l'elenco degli indirizzi autorizzati nel
 * pannello Fotaflo: da un dominio non autorizzato la stessa chiave
 * risponde 404. Misurato.
 *
 * ── SE NON C'E' NIENTE, NON SI VEDE NIENTE ──────────────────────────
 * Oggi la galleria torna vuota: l'indirizzo di questa pagina non e'
 * ancora fra quelli autorizzati e nessuna foto e' marcata come
 * pubblicabile. In quel caso il contenitore resta alto zero e la pagina
 * non ha buchi -- meglio una sezione che manca di una che promette
 * fotografie e mostra un rettangolo bianco.
 */

const CHIAVE = '67aa5a82';

export function GalleriaFotaflo() {
  const posto = useRef<HTMLDivElement>(null);
  /* Serve solo a dare al contenitore un po' d'aria quando le foto ci
     sono davvero: senza, il margine resterebbe anche a galleria vuota. */
  const [piena, setPiena] = useState(false);

  useEffect(() => {
    const el = posto.current;
    if (!el) return;

    /* `client_url` e' l'indirizzo della pagina SENZA la query, ed e'
       quello che Fotaflo confronta con la lista degli autorizzati. Si
       calcola come nel loro codice originale, per non discostarsi. */
    const href = window.location.href;
    const clientUrl = href.substring(0, href.indexOf(window.location.search) || href.length);

    const s = document.createElement('script');
    s.src =
      'https://app.fotaflo.com/embeds/gallery_widgets/v2023-08-30.js' +
      `?key=${CHIAVE}&client_url=${encodeURIComponent(clientUrl)}`;
    s.async = true;
    el.appendChild(s);

    /* Il loro script inserisce le immagini quando gli arrivano, e non
       avvisa: si guarda il contenitore e si smette appena c'e' qualcosa. */
    const osserva = new MutationObserver(() => {
      if (el.querySelector('img, .fotaflo-gallery')) {
        setPiena(true);
        osserva.disconnect();
      }
    });
    osserva.observe(el, { childList: true, subtree: true });

    return () => {
      osserva.disconnect();
      el.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={posto}
      className="ftf"
      style={{ marginTop: piena ? 26 : 0 }}
      aria-label="Photographs from our tours"
    />
  );
}
