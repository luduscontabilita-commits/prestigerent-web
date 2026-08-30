'use client';

import { useEffect, useRef } from 'react';

/* LA GALLERIA DI FOTAFLO.
 *
 * ── 🔴 L'ID SULLO SCRIPT NON E' DECORATIVO: E' IL PUNTO D'INNESTO ───
 * Prima creavo il tag `<script>` senza id, perche' sembrava un dettaglio
 * del loro copia-e-incolla. Non lo era. Il codice di Fotaflo, quando le
 * fotografie arrivano, fa esattamente questo:
 *
 *     const script = document.getElementById("fotaflo-gallery-widget-script")
 *     script.insertAdjacentHTML('afterend', html)
 *
 * cioe' cerca UN ELEMENTO CON QUELL'ID e ci appende la galleria subito
 * dopo. Senza id trovava `null`, l'errore finiva dentro un `catch` che
 * si limita a scrivere in console, e la pagina restava vuota **senza
 * nessun segnale**: 100 fotografie servite dal loro server e zero in
 * pagina. E' il tipo di guasto peggiore -- tutto risponde 200 e non si
 * vede niente.
 *
 * ── PERCHE' NON SI INCOLLA E BASTA IL LORO CODICE ───────────────────
 * Il loro frammento crea un secondo script mentre la pagina si disegna.
 * Su WordPress va bene; dentro React quel tag puo' essere rimosso o
 * eseguito due volte, e la seconda volta raddoppia le fotografie senza
 * dare errore. Qui lo si fa una volta sola, da dentro un effetto.
 *
 * ── LA CHIAVE E' PUBBLICA, E VA BENE COSI' ──────────────────────────
 * `key=67aa5a82` viaggia nell'indirizzo di uno script che carica il
 * browser: chiunque apra la pagina la vede. Non e' una password, e' il
 * nome della galleria. A difendere le foto e' l'elenco degli indirizzi
 * autorizzati nel pannello Fotaflo: da un dominio non autorizzato la
 * stessa chiave risponde 404. Misurato.
 */

const CHIAVE = '67aa5a82';
const ID_INNESTO = 'fotaflo-gallery-widget-script';

/* 🔴 UNA VOLTA SOLA PER APERTURA DI PAGINA.
   Il loro script dichiara `const fotafloGalleryWidget` nello spazio
   globale: caricarlo due volte non lo ricarica, lancia un errore di
   ridichiarazione e da li' in poi non funziona piu' niente. Questa
   guardia vale finche' il browser non ricarica davvero la pagina. */
let gia = false;

export function GalleriaFotaflo() {
  const posto = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = posto.current;
    if (!el || gia) return;
    gia = true;

    const s = document.createElement('script');
    /* L'id: e' qui che Fotaflo appendera' la galleria. */
    s.id = ID_INNESTO;
    /* `client_url` e' l'indirizzo della pagina senza la query, ed e'
       quello che confrontano con la lista degli autorizzati. Si calcola
       come nel loro codice originale, per non discostarsi. */
    const href = window.location.href;
    const clientUrl = href.substring(0, href.indexOf(window.location.search) || href.length);
    s.src =
      'https://app.fotaflo.com/embeds/gallery_widgets/v2023-08-30.js' +
      `?key=${CHIAVE}&client_url=${clientUrl}`;
    s.async = true;
    el.appendChild(s);
  }, []);

  /* Il contenitore resta alto zero finche' non arriva niente: a galleria
     vuota la pagina non mostra un rettangolo bianco che sembra rotto. */
  return <div ref={posto} className="ftf" aria-label="Photographs from our tours" />;
}
