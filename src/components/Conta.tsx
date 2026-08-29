'use client';

import { useEffect, useRef, useState } from 'react';

/* IL NUMERO CHE SALE, QUANDO ARRIVA SOTTO GLI OCCHI.
 *
 * ── PERCHE' FUNZIONA ────────────────────────────────────────────────
 * Un numero fermo si legge; un numero che sale si GUARDA. Su una fascia
 * di quattro cifre che nessuno ha chiesto di leggere, la differenza fra
 * essere letta e essere saltata sta tutta li'. Dura ottocento
 * millisecondi: abbastanza da accorgersene, troppo poco per aspettare.
 *
 * ── 🔴 IL VALORE FINALE E' NELL'HTML FIN DALL'INIZIO ────────────────
 * Lo stato parte dal numero VERO, non da zero. Chi ha JavaScript spento,
 * chi legge con uno screen reader e chi scansiona la pagina -- Google
 * compreso -- trova "700" e non "0". L'animazione parte solo dopo che il
 * componente e' montato e solo se l'elemento entra davvero
 * nell'inquadratura: e' un effetto, non il contenuto.
 *
 * Partire da zero nel markup sarebbe stato piu' semplice e avrebbe messo
 * uno zero in pagina per chiunque non esegua lo script -- su una fascia
 * che serve a dire quanti clienti sono passati, e' il peggior numero
 * possibile.
 *
 * ── SI RISPETTA CHI HA CHIESTO DI NON VEDERE ANIMAZIONI ─────────────
 * Con `prefers-reduced-motion` il numero resta fermo sul valore finale.
 * Non e' cortesia: per certe persone il movimento provoca nausea, e qui
 * non aggiunge nessuna informazione.
 */

export function Conta({
  a,
  decimali = 0,
  prefisso = '',
  suffisso = '',
  durata = 800,
}: {
  /** il valore finale, quello vero */
  a: number;
  decimali?: number;
  prefisso?: string;
  suffisso?: string;
  durata?: number;
}) {
  const rif = useRef<HTMLSpanElement>(null);
  const [valore, setValore] = useState(a);
  const partito = useRef(false);

  useEffect(() => {
    const el = rif.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const os = new IntersectionObserver(
      ([v]) => {
        if (!v.isIntersecting || partito.current) return;
        partito.current = true;
        os.disconnect();

        const inizio = performance.now();
        let id = 0;
        const passo = (ora: number) => {
          const t = Math.min(1, (ora - inizio) / durata);
          /* Rallenta arrivando: parte veloce e si posa sul valore, invece
             di fermarsi di colpo. E' quello che fa sembrare il numero
             "atterrato" invece che "tagliato". */
          const morbido = 1 - Math.pow(1 - t, 3);
          setValore(a * morbido);
          if (t < 1) id = requestAnimationFrame(passo);
          else setValore(a);
        };
        /* Si riparte da zero SOLO ora, un fotogramma prima di animare:
           cosi' lo zero non esiste mai nell'HTML servito. */
        setValore(0);
        id = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(id);
      },
      { threshold: 0.5 },
    );
    os.observe(el);
    return () => os.disconnect();
  }, [a, durata]);

  return (
    <span ref={rif}>
      {prefisso}
      {valore.toLocaleString('en-US', {
        minimumFractionDigits: decimali,
        maximumFractionDigits: decimali,
      })}
      {suffisso}
    </span>
  );
}
