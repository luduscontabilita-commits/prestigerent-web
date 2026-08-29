'use client';

import { useFilm } from './useFilm';
import { foto as ottimizza, fotoSet } from '@/lib/foto';
import { testo } from '@/lib/prosa';

export type Foto = { src: string; alt?: string; label?: string; caption?: string };

/* La striscia foto, con il markup ESATTO della landing (.film-wrap / .film /
 * .film-track / .slide), non una mia versione.
 *
 * LO SCORRIMENTO AUTOMATICO, OVUNQUE. Fino al 29 agosto 2026 la striscia
 * scorreva da sola solo su desktop, e sul telefono c'era un mosaico che si
 * muoveva unicamente se lo si spingeva col dito. Ma il telefono e' dove
 * arriva la maggior parte del traffico: la versione che si muove da sola
 * non la vedeva quasi nessuno, ed e' proprio quella che fa guardare le foto
 * a chi non avrebbe scorso.
 *
 * Ora la striscia e' una sola e vale ovunque. Due conseguenze da conoscere:
 *   - niente `scroll-snap-type: x mandatory`, che tirerebbe indietro la
 *     striscia a ogni fotogramma combattendo contro lo scorrimento;
 *   - il dito METTE IN PAUSA e non spegne. Col mouse "chi tocca comanda"
 *     e' giusto, perche' trascinare e' deliberato; col dito no, visto che
 *     per scorrere la pagina il dito passa sopra le foto per forza. La
 *     distinzione sta in `useFilm`.
 *
 * Si ferma anche col passaggio del mouse: e' `sopra` dentro `useFilm`.
 *
 * I CLONI. Per scorrere all'infinito senza mai arrivare al capolinea le
 * diapositive si scrivono due volte, la seconda con `aria-hidden`. Sulla
 * landing i cloni li fa il JavaScript con cloneNode; qui si scrivono nel
 * markup, cosi' stanno gia' nell'HTML servito e la striscia non cambia
 * lunghezza sotto le mani un istante dopo il caricamento.
 */
export function PhotoStrip({ foto }: { foto: Foto[] }) {
  const { proprieta, scorri, fermo, alterna, motoRidotto } = useFilm({
    auto: true,
    originali: foto.length,
  });

  if (!foto.length) return null;

  /* Si clona solo se c'e' qualcosa da far scorrere. Con una o due foto la
     striscia non arriva a riempire lo schermo: i cloni si vedrebbero tutti
     insieme accanto agli originali, cioe' la stessa foto due volte. */
  const cicla = foto.length >= 3;
  const diapositive = cicla ? [...foto, ...foto] : foto;

  /* 🔴 L'`alt` E' TESTO, NON MARKUP.
   *
   * Le descrizioni arrivano da WordPress con le entita' gia' dentro
   * ("Ducati Museum &amp; Factory"). Passandole cosi' com'erano, React le
   * rimarcava e in pagina finiva `alt="... &amp;amp; Factory"`: HTML
   * sbagliato -- l'attributo alt non contiene markup, quindi la seconda
   * codifica non la disfa nessuno -- e un lettore di schermo che si sente
   * dire "amp" in mezzo al nome. Su una scheda tour sono SEDICI immagini
   * con lo stesso alt (mosaico del telefono piu' striscia del desktop),
   * quindi il difetto si sente sedici volte di fila.
   *
   * `testo()` e' la stessa funzione che le schede tour usano gia' per i
   * titoli: decodifica e basta, non tocca il resto. */
  const descrizione = (f: Foto) => testo(f.alt || f.caption || '');

  return (
    <>
      {/* 🔴 IL MOSAICO DEL TELEFONO NON C'E' PIU'.
          Erano due gallerie per lo stesso scopo: la striscia che scorre da
          sola su desktop, e su telefono un carosello a scatti che si
          muoveva solo col dito. Ora la striscia vale ovunque (vedi la nota
          in landing.css), e il mosaico e' stato tolto dal MARKUP e non
          solo nascosto col CSS: erano dodici immagini scaricate per
          niente, e la prima portava `fetchPriority="high"` -- cioe'
          rubava la banda proprio alla foto che si vede davvero. */}

      {/* DESKTOP: la striscia a tutta larghezza, come sulla landing */}
      {/* Stesso motivo di sopra: <div> senza ruolo, `aria-label` ignorato.
          In Videos.tsx la stessa classe sta su un <section>, che un nome
          lo regge da solo; qui e' un div e il ruolo va detto. */}
      <div className="film-section hero-film" role="group" aria-label="Tour photo highlights">
        <div className="film-wrap">
          <div
            className="film"
            {...proprieta}
            role="group"
            aria-roledescription="carousel"
            aria-label="Tour photo gallery"
          >
            <div className="film-track">
              {diapositive.map((f, i) => {
                const clone = i >= foto.length;
                return (
                  <figure
                    className="slide"
                    key={`${f.src}-${i}`}
                    aria-hidden={clone || undefined}
                    /* aria-roledescription + "3 di 18": e' cosi' che un
                       lettore di schermo annuncia dove ci si trova senza
                       che serva una zona che parla a ogni pixel di
                       scorrimento. */
                    aria-roledescription={clone ? undefined : 'slide'}
                    aria-label={clone ? undefined : `${i + 1} of ${foto.length}`}
                  >
                    {/* SOLO LA PRIMA SI CARICA SUBITO. Sta in cima alla
                        pagina, sotto il titolo, ed e' quasi sempre
                        l'immagine piu' grande dello schermo: e' lei
                        l'LCP. Le altre diciassette arrivano quando
                        servono -- e i cloni non arrivano quasi mai,
                        perche' hanno lo stesso indirizzo e il browser li
                        ha gia' in cache. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      /* La striscia e' alta poco piu' di 300px: chiedere
                         l'originale a piena risoluzione era il grosso dei
                         megabyte della home. */
                      src={ottimizza(f.src, i === 0 ? 1200 : 828)}
                      srcSet={fotoSet(f.src, [640, 828, 1200])}
                      sizes="(max-width: 700px) 88vw, 460px"
                      alt={clone ? '' : descrizione(f)}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                      decoding="async"
                    />
                    {(f.label || f.caption) && (
                      <figcaption>
                        {f.label && <span>{f.label}</span>}
                        {f.caption && <b>{f.caption}</b>}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </div>

          <button className="film-btn prev" type="button" aria-label="Previous photos" onClick={() => scorri(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button className="film-btn next" type="button" aria-label="Next photos" onClick={() => scorri(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>

          {/* Il comando dello scorrimento automatico.
              Non compare quando `prefers-reduced-motion` e' attivo: li' non
              si muove niente da solo, e un pulsante per fermare una cosa
              ferma e' solo confusione. */}
          {cicla && !motoRidotto && (
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

          {/* Il suggerimento "drag" sparisce appena l'utente ha capito da
              solo, cioe' alla prima interazione -- come sulla landing. */}
          <div className={fermo ? 'film-hint hide' : 'film-hint'}>&lsaquo; &nbsp;drag&nbsp; &rsaquo;</div>
        </div>

        {/* Lo stato detto a voce. Una zona `polite` non interrompe: parla
            quando il lettore di schermo ha finito la frase in corso. Il
            testo cambia solo quando cambia lo stato, quindi non c'e' il
            rischio della zona che chiacchiera da sola. */}
        {cicla && !motoRidotto && (
          <p className="film-stato" role="status" aria-live="polite">
            {fermo ? 'Photos paused' : 'Photos scrolling automatically'}
          </p>
        )}
      </div>
    </>
  );
}
