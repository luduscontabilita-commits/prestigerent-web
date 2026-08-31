'use client';

import { useEffect, useRef, useState } from 'react';
import { ANNO_FONDAZIONE } from '@/lib/anni';
import { inBreve, perEsteso } from '@/lib/cifre';
import { Conta } from '@/components/Conta';

/* LA FASCIA DEI NUMERI.
 *
 * ── COS'ERA E PERCHE' NON BASTAVA ───────────────────────────────────
 * Quattro cifre arancioni dentro un rettangolo bianco, tutte della
 * stessa misura, tutte trattate allo stesso modo. Il problema non era
 * la bruttezza: era che non diceva quale dei quattro numeri conta.
 * "4.9" e "24" avevano lo stesso peso, e un lettore che scorre non ha
 * nessun motivo per fermarsi su una fila di numeri pareggiati.
 *
 * ── COSA LA RENDE DIVERSA ADESSO ────────────────────────────────────
 * Il fondo scuro. E' l'unica sezione scura della home, quindi non
 * chiede attenzione col colore ma col contrasto: dopo tre sezioni
 * chiare, una fascia scura si guarda da sola.
 *
 * ── PERCHE' LE DECORAZIONI SONO SOLO SU DUE CELLE ───────────────────
 * Stelle sul voto e anello sugli anni; le altre due restano nude. E'
 * voluto: se ogni cella avesse il suo ornamento tornerebbero tutte
 * pareggiate, che e' il difetto da cui si partiva. Il voto ha le stelle
 * perche' "4.9" da solo non dice su quale scala, e gli anni hanno
 * l'anello perche' e' l'unico numero che cresce di suo.
 *
 * ── I NUMERI SONO VERI ──────────────────────────────────────────────
 * Nessuna cifra e' scritta qui dentro: arrivano tutte da `azienda` e da
 * `valutazioni_tour`. Se l'anno di fondazione cambia, cambiano gli anni
 * e cambia l'anello, senza che nessuno tocchi questo file.
 */

export type Numeri = {
  voto: number | null;
  clienti: number | null;
  tour: number | null;
  anno: number | null;
  anni: number | null;
  posizione: number | null;
  su: number | null;
  categoria: string | null;
};

/* Quando la fascia entra nell'inquadratura. Serve a stelle e anello:
   disegnarli gia' pieni mentre nessuno guarda vuol dire non disegnarli
   affatto, perche' l'occhio si accorge del MOVIMENTO, non della forma. */
function usaInVista<T extends HTMLElement>() {
  const rif = useRef<T>(null);
  const [dentro, setDentro] = useState(false);
  useEffect(() => {
    const el = rif.current;
    if (!el) return;
    /* Con `prefers-reduced-motion` si parte gia' arrivati: il disegno
       finale e' lo stesso, si salta solo il tragitto. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDentro(true);
      return;
    }
    const os = new IntersectionObserver(
      ([v]) => {
        if (!v.isIntersecting) return;
        setDentro(true);
        os.disconnect();
      },
      { threshold: 0.4 },
    );
    os.observe(el);
    return () => os.disconnect();
  }, []);
  return { rif, dentro };
}

/* LE STELLE, CON L'ULTIMA RIEMPITA A META'.
 *
 * Cinque stelle piene per un 4,9 sarebbero una bugia piccola ma
 * verificabile, ed e' il tipo di dettaglio su cui si perde la fiducia
 * guadagnata dal numero. Il riempimento e' una maschera in percentuale:
 * a 4,9 l'ultima stella e' piena al 90%, e si vede.
 *
 * L'animazione e' la maschera che si allarga da sinistra, non le stelle
 * che compaiono: e' il gesto di "riempire", che e' quello che il numero
 * sta raccontando. */
function Stelle({ voto, dentro }: { voto: number; dentro: boolean }) {
  const parte = Math.max(0, Math.min(100, (voto / 5) * 100));
  const punta =
    'M12 2.4l2.86 5.8 6.4.93-4.63 4.51 1.09 6.37L12 16.99l-5.72 3.02 1.09-6.37L2.74 9.13l6.4-.93z';
  return (
    <span className="fn-stelle" aria-hidden="true">
      <span className="fn-stelle-vuote">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 24 24" width="15" height="15">
            <path d={punta} />
          </svg>
        ))}
      </span>
      <span className="fn-stelle-piene" style={{ width: dentro ? `${parte}%` : 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 24 24" width="15" height="15">
            <path d={punta} />
          </svg>
        ))}
      </span>
    </span>
  );
}

/* L'ANELLO DEGLI ANNI.
 *
 * Un cerchio che si chiude quasi del tutto: ventiquattro anni su
 * venticinque. Quel quasi e' il punto -- un anello chiuso non dice
 * niente, un anello a cui manca uno spicchio dice "il prossimo e' il
 * venticinquesimo", che e' l'unica cosa interessante di un numero di
 * anni.
 *
 * `strokeDasharray` e' la circonferenza intera e `strokeDashoffset`
 * quanto ne resta da coprire: si parte tutto scoperto e si arriva alla
 * frazione giusta. La transizione e' sul solo `stroke-dashoffset`,
 * quindi il browser la fa sulla scheda grafica e non ridisegna niente
 * a ogni fotogramma. */
function Anello({ anni, meta, dentro }: { anni: number; meta: number; dentro: boolean }) {
  const R = 34;
  const giro = 2 * Math.PI * R;
  const quota = Math.max(0, Math.min(1, anni / meta));
  return (
    <svg className="fn-anello" viewBox="0 0 80 80" aria-hidden="true">
      <circle className="fn-anello-fondo" cx="40" cy="40" r={R} />
      <circle
        className="fn-anello-tratto"
        cx="40"
        cy="40"
        r={R}
        strokeDasharray={giro}
        strokeDashoffset={dentro ? giro * (1 - quota) : giro}
      />
    </svg>
  );
}

export function FasciaNumeri({ n }: { n: Numeri }) {
  const { rif, dentro } = usaInVista<HTMLDivElement>();

  /* La meta dell'anello e' il quarto di secolo in cui l'azienda si trova,
     non un venticinque scritto a mano: nel 2027 diventeranno 25 su 25 e
     nel 2028 saranno 26 su 50, che sarebbe un anello quasi vuoto. Si
     arrotonda al multiplo di cinque successivo, cosi' l'anello resta
     sempre quasi pieno e la frase sotto resta sempre vera. */
  const meta = n.anni != null ? Math.max(5, Math.ceil((n.anni + 1) / 5) * 5) : 25;

  return (
    <div className="fn" ref={rif}>
      {n.voto != null && (
        <div className="fn-cella">
          <b className="fn-num">
            <Conta a={n.voto} decimali={1} />
          </b>
          <Stelle voto={n.voto} dentro={dentro} />
          <span className="fn-eti">average rating out of 5</span>
        </div>
      )}

      {n.clienti != null && (
        <div className="fn-cella">
          <b className="fn-num">
            {/* 🔴 QUESTO CONTEGGIO DURA PIU' DEGLI ALTRI.
                Ottocento millisecondi bastano per salire a 4,9 o a 24: si
                vedono passare tutte le cifre. Per arrivare a 700 no --
                il numero scatta cosi' in fretta che si legge solo
                l'arrivo, e l'unico numero della fascia che vale la pena
                guardare mentre sale e' proprio questo. Due secondi e
                mezzo: si vede la corsa, e non si aspetta. */}
            <Conta
              a={inBreve(n.clienti).valore}
              decimali={inBreve(n.clienti).decimali}
              suffisso={inBreve(n.clienti).suffisso}
              durata={2500}
            />
          </b>
          <span className="fn-eti">guests driven since {n.anno ?? ANNO_FONDAZIONE}</span>
        </div>
      )}

      {n.tour != null && (
        <div className="fn-cella">
          <b className="fn-num">
            <Conta
              a={inBreve(n.tour).valore}
              decimali={inBreve(n.tour).decimali}
              suffisso={inBreve(n.tour).suffisso}
              durata={2500}
            />
          </b>
          <span className="fn-eti">tours and transfers</span>
        </div>
      )}

      {n.posizione != null && (
        <div className="fn-cella">
          <b className="fn-num">
            <Conta a={n.posizione} prefisso="#" />
          </b>
          {/* L'iniziale minuscola e non tutta la stringa: con
              `.toLowerCase()` si leggeva "companies in florence", cioe' il
              nome della citta' in minuscolo dentro il dato che serve
              proprio a farsi verificare. */}
          <span className="fn-eti">
            {n.su ? `of ${perEsteso(n.su)} ` : ''}
            {n.categoria
              ? n.categoria.charAt(0).toLowerCase() + n.categoria.slice(1)
              : ''}
          </span>
        </div>
      )}

      {n.anni != null && (
        <div className="fn-cella fn-cella-anello">
          <span className="fn-tondo">
            <Anello anni={n.anni} meta={meta} dentro={dentro} />
            <b className="fn-num fn-num-tondo">
              <Conta a={n.anni} />
            </b>
          </span>
          <span className="fn-eti">years on the road, since {n.anno ?? ANNO_FONDAZIONE}</span>
        </div>
      )}
    </div>
  );
}

/* ── GLI STESSI NUMERI, PICCOLI, SULLA FOTO ─────────────────────────
 *
 * Nell'hero il lato destro era vuoto: la fotografia da sola, con tutto il
 * testo ammassato a sinistra. Qui vanno le stesse quattro misure, in
 * piccolo -- stelle e anello compresi, perche' sono quelli che si leggono
 * da lontano senza mettersi a decifrare cifre.
 *
 * 🔴 NON SI RIPETONO DUE VOLTE. Sotto il titolo c'e' gia' la riga
 * "★4.9 · 700k+ guests · Since 2002": su schermo largo quella sparisce e
 * resta questo blocco, sotto i 1100px succede il contrario. Gli stessi
 * numeri detti due volte nella stessa schermata non convincono il doppio,
 * fanno solo dubitare che siano due dati diversi -- e' lo stesso motivo
 * per cui e' stato tolto il riquadro "25 guests in one vehicle".
 *
 * Il fondo e' un velo scuro e non un riquadro pieno: la foto deve
 * continuare a vedersi sotto, altrimenti diventa una scatola appoggiata
 * sull'immagine. */
export function FattiHero({ n }: { n: Numeri }) {
  const { rif, dentro } = usaInVista<HTMLDivElement>();
  const meta = n.anni != null ? Math.max(5, Math.ceil((n.anni + 1) / 5) * 5) : 25;

  return (
    <div className="fh" ref={rif}>
      {n.voto != null && (
        <div className="fh-c">
          <b className="fh-n">
            <Conta a={n.voto} decimali={1} />
          </b>
          <Stelle voto={n.voto} dentro={dentro} />
          <span className="fh-e">average rating</span>
        </div>
      )}
      {n.clienti != null && (
        <div className="fh-c">
          <b className="fh-n">
            <Conta
              a={inBreve(n.clienti).valore}
              decimali={inBreve(n.clienti).decimali}
              suffisso={inBreve(n.clienti).suffisso}
              durata={2500}
            />
          </b>
          <span className="fh-e">guests driven</span>
        </div>
      )}
      {n.tour != null && (
        <div className="fh-c">
          <b className="fh-n">
            <Conta
              a={inBreve(n.tour).valore}
              decimali={inBreve(n.tour).decimali}
              suffisso={inBreve(n.tour).suffisso}
              durata={2500}
            />
          </b>
          <span className="fh-e">tours and transfers</span>
        </div>
      )}
      {n.posizione != null && (
        <div className="fh-c">
          <b className="fh-n">
            <Conta a={n.posizione} prefisso="#" />
          </b>
          {/* Senza il "di quanti" la riga si accorcia e resta la
              sola cosa che si voleva dire. */}
          <span className="fh-e">
            {n.su ? `of ${n.su} ` : ''}
            {n.categoria ?? 'in Florence'}
          </span>
        </div>
      )}
      {n.anni != null && (
        <div className="fh-c">
          <span className="fh-tondo">
            <Anello anni={n.anni} meta={meta} dentro={dentro} />
            <b className="fh-n fh-n-tondo">
              <Conta a={n.anni} />
            </b>
          </span>
          <span className="fh-e">years on the road</span>
        </div>
      )}
    </div>
  );
}
