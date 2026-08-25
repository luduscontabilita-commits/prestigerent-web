'use client';

import { useEffect, useState } from 'react';

export type Avviso = {
  nome: string;
  iniziale: string | null;
  paese: string | null;
  prodotto: string;
  persone: number | null;
  quando: string;
  href: string | null;
};

/* I RIQUADRI DELLE PRENOTAZIONI VERE.
 *
 * Compaiono in basso a sinistra, uno alla volta: "Michael R. from the
 * United States booked the Wine Experience — 2 hours ago".
 *
 * ── SONO VERE ───────────────────────────────────────────────────────
 * Vengono dalle prenotazioni Regiondo. Non c'e' nessun numero casuale,
 * nessun "12 persone stanno guardando": quella roba si smaschera
 * ricaricando due volte, e chi la smaschera smette di credere anche ai
 * 12.694 numeri veri che ci sono sulla pagina. Con 319 prenotazioni in
 * sette giorni non serve inventare niente.
 *
 * ── COSA NON SI SCRIVE ──────────────────────────────────────────────
 * Il cognome per intero. Nome + cognome + tour + data identificano una
 * persona, e pubblicarli e' una comunicazione di dati personali a
 * chiunque passi. Resta l'iniziale, come fanno Booking e GetYourGuide:
 * l'effetto e' identico e non si espone nessuno.
 *
 * ── COME SI COMPORTA ────────────────────────────────────────────────
 * Il primo arriva dopo 12 secondi, non subito: sovrapporsi al titolo
 * mentre uno sta ancora capendo dov'e' finito e' il modo migliore per
 * farsi chiudere. Poi uno ogni 22 secondi, ognuno resta 7 secondi.
 * Chi lo chiude non lo rivede piu' per quella visita -- se ha detto no
 * una volta, ripresentarsi e' molestia, non marketing.
 *
 * Su schermi piccoli non compare affatto: coprirebbe la barra di
 * prenotazione, che e' l'unica cosa che conta davvero su un telefono.
 */

const PRIMO = 12_000;
const OGNI = 22_000;
const DURA = 7_000;

function quantoFa(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${Math.max(2, min)} minutes ago`;
  const ore = Math.round(min / 60);
  if (ore < 24) return ore === 1 ? 'an hour ago' : `${ore} hours ago`;
  const gg = Math.round(ore / 24);
  return gg === 1 ? 'yesterday' : `${gg} days ago`;
}

export function ProvaSociale({ avvisi }: { avvisi: Avviso[] }) {
  const [i, setI] = useState(-1);
  const [visibile, setVisibile] = useState(false);
  const [chiuso, setChiuso] = useState(false);

  useEffect(() => {
    if (!avvisi.length || chiuso) return;
    if (window.matchMedia('(max-width: 760px)').matches) return;
    /* Chi ha gia' detto basta in questa visita non li rivede. */
    try {
      if (sessionStorage.getItem('pr-avvisi') === 'no') return;
    } catch {}

    let n = 0;
    let sparisci: ReturnType<typeof setTimeout>;

    const mostra = () => {
      setI(n % avvisi.length);
      setVisibile(true);
      n++;
      sparisci = setTimeout(() => setVisibile(false), DURA);
    };

    const avvio = setTimeout(mostra, PRIMO);
    const giro = setInterval(mostra, PRIMO + OGNI);
    return () => {
      clearTimeout(avvio);
      clearTimeout(sparisci);
      clearInterval(giro);
    };
  }, [avvisi, chiuso]);

  if (i < 0 || !avvisi[i]) return null;
  const a = avvisi[i];
  const chi = [a.nome, a.iniziale ? a.iniziale + '.' : ''].filter(Boolean).join(' ');

  const dentro = (
    <>
      <span className="ps-punto" aria-hidden="true" />
      <span className="ps-testo">
        <b>{chi}</b>
        {a.paese ? ` from ${a.paese}` : ''} booked <b>{a.prodotto}</b>
        {a.persone && a.persone > 1 ? ` for ${a.persone}` : ''}
        <em>
          {quantoFa(a.quando)}
          {/* La provenienza sta qui e non in un riquadro a parte: chi
              dubita cerca proprio in quel punto, sotto la frase. */}
          <span className="ps-fonte"> &middot; verified booking</span>
        </em>
      </span>
    </>
  );

  return (
    <div className={'ps' + (visibile ? ' is-on' : '')} role="status" aria-live="polite">
      {a.href ? (
        <a className="ps-in" href={a.href}>
          {dentro}
        </a>
      ) : (
        <div className="ps-in">{dentro}</div>
      )}
      <button
        type="button"
        className="ps-x"
        aria-label="Stop showing these"
        onClick={() => {
          setVisibile(false);
          setChiuso(true);
          try {
            sessionStorage.setItem('pr-avvisi', 'no');
          } catch {}
        }}
      >
        ×
      </button>
    </div>
  );
}
