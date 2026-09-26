'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFilm } from './useFilm';
import { foto as ottimizza, fotoSet } from '@/lib/foto';
import { PASSI, rapporto, sizesDi, larghezzaDesktop, type Velocita } from '@/lib/gallery-tag';

/* LA STRISCIA DELLA GALLERY CON TAG.
 *
 * ── PERCHE' NON RIUSO `PhotoStrip` ─────────────────────────────────────
 * Perche' fa una cosa diversa, e farla diventare due cose la romperebbe.
 * La sua `.slide` e' larga `min(78vw,880px)` con `object-fit:cover`: le
 * foto del prodotto sono scelte a mano, tutte orizzontali, e il ritaglio
 * le rende una fila regolare. Qui le foto arrivano dal telefono di una
 * guida, verticali e orizzontali mescolate: con quel ritaglio ogni
 * verticale perderebbe meta' inquadratura, teste comprese.
 *
 * Quello che si riusa e' il MOTORE -- `useFilm`, con il suo
 * requestAnimationFrame, la pausa fuori dallo schermo, la pausa a scheda
 * nascosta, `prefers-reduced-motion` letto dal vivo e il trascinamento --
 * e le classi `.film-*` per l'aspetto. Cambia solo la diapositiva.
 *
 * ── STESSA ALTEZZA, LARGHEZZA DALLE PROPORZIONI ────────────────────────
 * Ogni foto e' alta quanto le altre e larga quanto dicono le sue
 * proporzioni. Una verticale esce stretta e INTERA, una orizzontale larga
 * e intera. Il rapporto e' dichiarato con `aspect-ratio` dalle misure
 * salvate all'upload, quindi lo spazio e' riservato prima che l'immagine
 * arrivi: la pagina non si sposta di un pixel (CLS zero) e mentre carica
 * si vede il colore dominante invece di un buco bianco.
 *
 * ── I CLONI E L'AUTOPLAY, DECISI SUL SERVER ────────────────────────────
 * `scorre` arriva gia' deciso da chi rende la pagina, misurando la somma
 * delle larghezze vere. Non si misura qui nel browser di proposito: un
 * numero di diapositive diverso fra server e client sarebbe un errore di
 * idratazione, e React rifarebbe l'albero da zero -- cioe' uno sfarfallio
 * su tutte le foto, proprio nel punto che si voleva far sembrare curato.
 */

export type FotoStriscia = {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  colore: string | null;
};

export function GalleryStriscia({
  foto,
  scorre,
  velocita,
  etichetta,
}: {
  foto: FotoStriscia[];
  /** le foto NON ci stanno nella larghezza: si duplicano e si scorre */
  scorre: boolean;
  velocita: Velocita;
  /** il titolo senza asterischi, per dare un nome alla striscia */
  etichetta: string;
}) {
  const { proprieta, scorri, fermo, alterna, motoRidotto } = useFilm({
    auto: scorre,
    velocita: PASSI[velocita],
    originali: scorre ? foto.length : 0,
    /* 🔴 l'opzione che esiste per questa striscia: con larghezze diverse
       il passo della freccia non puo' essere la larghezza della prima */
    passoPerDiapositiva: true,
  });

  /* I cloni servono solo al giro infinito. Senza scorrimento sarebbero
     copie visibili una accanto all'altra, cioe' un errore. */
  const lista = scorre ? [...foto, ...foto] : foto;

  const [aperta, setAperta] = useState<number | null>(null);

  return (
    <>
      <div className="film-wrap">
        <div
          className={'film gfilm' + (scorre ? '' : ' gfilm-ferma')}
          {...proprieta}
          aria-roledescription="carousel"
          aria-label={etichetta}
        >
          <div className="film-track gtrack">
            {lista.map((f, i) => {
              const clone = i >= foto.length;
              const indice = i % foto.length;
              return (
                <figure
                  className="gslide"
                  key={`${f.id}-${i}`}
                  /* I cloni non esistono per chi usa uno screen reader: li
                     leggerebbe due volte tutti. */
                  aria-hidden={clone || undefined}
                  aria-roledescription={clone ? undefined : 'slide'}
                  aria-label={clone ? undefined : `${indice + 1} of ${foto.length}`}
                  style={{
                    aspectRatio: String(rapporto(f)),
                    background: f.colore ?? undefined,
                  }}
                >
                  <button
                    type="button"
                    className="gslide-apri"
                    /* Il clone non e' un secondo bersaglio: porta alla
                       stessa foto dell'originale. */
                    onClick={() => setAperta(indice)}
                    aria-label={`Open photo ${indice + 1} of ${foto.length}`}
                    tabIndex={clone ? -1 : 0}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ottimizza(f.url, larghezzaDesktop(f))}
                      srcSet={fotoSet(f.url)}
                      /* la larghezza vera di QUESTA foto in pagina: e' cosi'
                         che il browser scarica la variante giusta invece di
                         una misura media sbagliata per quasi tutte */
                      sizes={sizesDi(f)}
                      width={f.width}
                      height={f.height}
                      alt={clone ? '' : f.alt}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </button>
                  {f.caption && !clone && (
                    <figcaption>
                      <b>{f.caption}</b>
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        </div>

        {scorre && (
          <>
            <button className="film-btn prev" type="button" aria-label="Previous photos" onClick={() => scorri(-1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button className="film-btn next" type="button" aria-label="Next photos" onClick={() => scorri(1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>

            {/* Con `prefers-reduced-motion` non scorre niente, quindi un
                pulsante per fermarlo non avrebbe nulla da fermare. */}
            {!motoRidotto && (
              <button
                className="film-auto"
                type="button"
                onClick={alterna}
                aria-pressed={fermo}
                aria-label={fermo ? 'Let the photos scroll by themselves' : 'Stop the photos from scrolling by themselves'}
              >
                {fermo ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
                )}
              </button>
            )}
          </>
        )}
      </div>

      <Lightbox foto={foto} aperta={aperta} chiudi={() => setAperta(null)} vai={setAperta} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   IL LIGHTBOX
   ═══════════════════════════════════════════════════════════════════

   E' un `<dialog>` aperto con `showModal()`, e non un `<div>` con
   `position:fixed`. Il motivo e' l'accessibilita' gratis e fatta bene dal
   browser: il fuoco resta dentro (niente trappola da scrivere a mano e da
   sbagliare), il resto della pagina diventa inerte per gli screen reader,
   ESC chiude, e lo sfondo lo disegna `::backdrop`.

   La foto si vede INTERA: `object-fit:contain` dentro `100vw × 100dvh`.
   Una verticale su desktop ha le bande ai lati, una orizzontale su
   telefono le ha sopra e sotto. Mai ritagliata: qui la foto e' il
   contenuto, non la decorazione. */
function Lightbox({
  foto,
  aperta,
  chiudi,
  vai,
}: {
  foto: FotoStriscia[];
  aperta: number | null;
  chiudi: () => void;
  vai: (i: number) => void;
}) {
  const box = useRef<HTMLDialogElement>(null);
  const partenzaX = useRef<number | null>(null);

  const scorri = useCallback(
    (verso: 1 | -1) => {
      if (aperta === null) return;
      /* Si gira in tondo: dall'ultima si torna alla prima. In un lightbox
         di dieci foto una freccia che si spegne sembra rotta. */
      vai((aperta + verso + foto.length) % foto.length);
    },
    [aperta, foto.length, vai]
  );

  /* L'apertura e la chiusura vere le fa il browser. Lo stato React dice
     soltanto QUALE foto: tenere le due cose separate evita il caso in cui
     il `<dialog>` e' aperto e React crede di no. */
  useEffect(() => {
    const d = box.current;
    if (!d) return;
    if (aperta !== null && !d.open) d.showModal();
    if (aperta === null && d.open) d.close();
  }, [aperta]);

  /* Le frecce della tastiera. Stanno su `document` e non sul dialog
     perche' dopo `showModal()` il fuoco puo' essere sul pulsante di
     chiusura, e un `onKeyDown` sul contenitore non riceverebbe niente. */
  useEffect(() => {
    if (aperta === null) return;
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); scorri(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); scorri(-1); }
    };
    document.addEventListener('keydown', tasto);
    return () => document.removeEventListener('keydown', tasto);
  }, [aperta, scorri]);

  const f = aperta === null ? null : foto[aperta];

  return (
    <dialog
      className="glight"
      ref={box}
      /* ESC lo gestisce il browser: qui si rimette in pari lo stato, cosi'
         riaprendo la stessa foto il click funziona la prima volta. */
      onClose={chiudi}
      /* Clic sullo sfondo: il bersaglio e' il dialog stesso solo fuori dal
         contenuto, perche' il contenuto e' in un elemento figlio. */
      onClick={(e) => { if (e.target === box.current) chiudi(); }}
      onPointerDown={(e) => { partenzaX.current = e.clientX; }}
      onPointerUp={(e) => {
        const da = partenzaX.current;
        partenzaX.current = null;
        if (da === null) return;
        const salto = e.clientX - da;
        /* 45px: sopra il tremolio del dito, sotto un gesto voluto */
        if (Math.abs(salto) > 45) scorri(salto < 0 ? 1 : -1);
      }}
      aria-label="Photo viewer"
    >
      {f && (
        <div className="glight-box">
          <div className="glight-foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ottimizza(f.url, 1920)}
              srcSet={fotoSet(f.url, [828, 1200, 1920])}
              sizes="100vw"
              width={f.width}
              height={f.height}
              alt={f.alt}
              decoding="async"
            />
          </div>

          <div className="glight-barra">
            <span className="glight-conta">
              {aperta! + 1} / {foto.length}
            </span>
            {f.caption && <span className="glight-did">{f.caption}</span>}
          </div>

          <button className="glight-x" type="button" onClick={chiudi} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>

          {foto.length > 1 && (
            <>
              <button className="glight-freccia prev" type="button" onClick={() => scorri(-1)} aria-label="Previous photo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="glight-freccia next" type="button" onClick={() => scorri(1)} aria-label="Next photo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
