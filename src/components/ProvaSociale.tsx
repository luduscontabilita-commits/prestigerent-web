'use client';

import { useEffect, useRef, useState } from 'react';
import type { AvvisoRiga } from '@/lib/riprova';
import type { Locale } from '@/lib/locales';

/* Una riga cosi' com'e' nel database: nessun rimaneggiamento a monte, cosi'
 * quelle del primo disegno e quelle rilette dopo un minuto hanno la stessa
 * forma e si possono sostituire senza convertire niente. */
export type Avviso = AvvisoRiga;

/* I RIQUADRI DELLE PRENOTAZIONI VERE.
 *
 * Compaiono in basso a sinistra, uno alla volta: "Michael R. booked the
 * Wine Experience — 2 hours ago · for 4 guests · verified booking".
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

/* Sei e poi basta. Il ciclo infinito si tradisce da solo: al settimo
 * riquadro ricompare la stessa persona con la stessa ora, e da quel
 * momento tutto l'insieme viene letto come una finta -- comprese le
 * prenotazioni vere che erano passate prima. Sei bastano a dire "qui si
 * prenota di continuo" e finiscono prima che chi guarda se ne accorga. */
const MASSIMO = 6;

/* Un minuto: abbastanza raro da non pesare, abbastanza fitto da far
 * comparire una prenotazione nuova mentre la scheda e' ancora aperta. */
const AGGIORNA = 60_000;

function quantoFa(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${Math.max(2, min)} minutes ago`;
  const ore = Math.round(min / 60);
  if (ore < 24) return ore === 1 ? 'an hour ago' : `${ore} hours ago`;
  const gg = Math.round(ore / 24);
  return gg === 1 ? 'yesterday' : `${gg} days ago`;
}

/* Due righe sono la stessa prenotazione se coincidono nome e istante.
 * Si evita di proposito il `riferimento` vero: e' il codice con cui si
 * apre una prenotazione, e qui finirebbe in chiaro nel browser. */
const chiave = (a: Avviso) => `${a.nome}|${a.quando}`;

/* Il tour che si sta guardando davanti a tutti gli altri.
 *
 * "Qualcuno ha prenotato QUESTO tour" e' pressione: risponde alla domanda
 * che chi guarda si sta facendo in quel momento. "Qualcuno ha prenotato un
 * altro tour" e' solo rumore, e per giunta un invito ad andarsene altrove
 * proprio mentre stava per prenotare. Gli altri restano, ma dopo.
 *
 * `sort` in JavaScript e' stabile, quindi dentro i due gruppi l'ordine per
 * data piu' recente arrivato dal database non si perde. */
function ordina(righe: Avviso[], slug: string | null): Avviso[] {
  if (!slug) return righe;
  return [...righe].sort(
    (a, b) => Number(b.tour_slug === slug) - Number(a.tour_slug === slug),
  );
}

/* Lo slug della scheda aperta, letto dall'indirizzo invece che passato
 * come proprieta': questo componente sta nel layout, che e' condiviso da
 * tutte le pagine del sito e non sa su quale di esse si trova. Vale sia
 * per l'inglese alla radice (`/tour/...`) sia per le lingue con prefisso
 * (`/it/tour/...`). */
function slugDallIndirizzo(): string | null {
  return window.location.pathname.match(/(?:^|\/)tour\/([^/?#]+)/)?.[1] ?? null;
}

export function ProvaSociale({ avvisi, locale }: { avvisi: Avviso[]; locale: Locale }) {
  /* Il riquadro visibile si tiene per intero e non come indice: l'elenco
     viene sostituito ogni minuto, e un indice punterebbe a una persona
     diversa da quella che si sta leggendo a meta' animazione. */
  const [ora, setOra] = useState<Avviso | null>(null);
  const [visibile, setVisibile] = useState(false);
  const [chiuso, setChiuso] = useState(false);

  /* I dati stanno in un riferimento e non nello stato: cambiarli ogni
     minuto rifarebbe partire l'effetto, e con lui l'attesa di 12 secondi
     e il conteggio dei sei riquadri, che ricomincerebbero da capo per
     sempre. Cosi' invece il ciclo gira una volta sola e legge, a ogni
     giro, l'elenco piu' fresco che c'e'. */
  const dati = useRef<Avviso[]>(avvisi);
  const visti = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (chiuso) return;
    if (window.matchMedia('(max-width: 760px)').matches) return;
    /* Chi ha gia' detto basta in questa visita non li rivede. */
    try {
      if (sessionStorage.getItem('pr-avvisi') === 'no') return;
    } catch {}

    let n = 0;
    let sparisci: ReturnType<typeof setTimeout> | undefined;

    /* `giro` e `sonda` nascono qualche riga piu' sotto: le funzioni qui
       sopra li vedono lo stesso perche' nessuna di esse gira prima dei
       dodici secondi di attesa. */
    const basta = () => {
      clearInterval(giro);
      /* Finiti i sei riquadri non c'e' piu' niente da mostrare: continuare
         a interrogare la rotta sarebbe traffico per nessuno. */
      clearInterval(sonda);
    };

    const mostra = () => {
      /* L'ordine si rifa' a ogni riquadro e non una volta all'avvio: fra
         una scheda tour e l'altra si passa senza ricaricare la pagina, e
         questo componente sta nel layout, che non si rimonta mai. Deciso
         all'inizio, il tour "corrente" resterebbe quello di partenza. */
      const lista = ordina(dati.current, slugDallIndirizzo());
      if (!lista.length) return;
      /* Prima una che non si e' ancora vista: fra un aggiornamento e
         l'altro l'elenco cambia, e ripescare la stessa persona due volte
         e' esattamente il difetto che i sei riquadri vogliono evitare. */
      const scelta = lista.find((r) => !visti.current.has(chiave(r))) ?? lista[n % lista.length];
      visti.current.add(chiave(scelta));
      setOra(scelta);
      setVisibile(true);
      n++;
      sparisci = setTimeout(() => setVisibile(false), DURA);
      if (n >= MASSIMO) basta();
    };

    const aggiorna = async () => {
      try {
        /* `no-store` riguarda solo la cache del browser: la richiesta esce
           comunque, ma si ferma sulla CDN, che serve la stessa risposta a
           tutti per un minuto. Il database non la vede. */
        const r = await fetch('/api/prenotazioni', { cache: 'no-store' });
        if (!r.ok) return;
        const j = (await r.json()) as { avvisi?: Avviso[] };
        if (Array.isArray(j.avvisi) && j.avvisi.length) {
          dati.current = j.avvisi;
        }
      } catch {
        /* Rete caduta o risposta storta: si tiene l'elenco che c'era.
           Un riquadro un po' vecchio e' meglio di nessun riquadro, e
           soprattutto meglio di un errore in console su ogni pagina. */
      }
    };

    const avvio = setTimeout(mostra, PRIMO);
    const giro = setInterval(mostra, PRIMO + OGNI);
    const sonda = setInterval(aggiorna, AGGIORNA);

    return () => {
      clearTimeout(avvio);
      clearTimeout(sparisci);
      basta();
    };
  }, [chiuso]);

  if (!ora) return null;
  const a = ora;
  const chi = [a.nome, a.iniziale ? a.iniziale + '.' : ''].filter(Boolean).join(' ');
  const href = a.tour_slug
    ? (locale === 'en' ? '' : `/${locale}`) + `/tour/${a.tour_slug}/`
    : null;

  /* "for 4 guests" e' una prenotazione con dentro delle persone; una
     prenotazione e basta e' una riga di database. Quando il numero manca
     -- e manca spesso -- la frase si chiude da sola senza lasciare il
     buco di un "for" senza seguito. */
  const ospiti =
    a.persone && a.persone > 0
      ? `for ${a.persone} ${a.persone === 1 ? 'guest' : 'guests'}`
      : null;

  const dentro = (
    <>
      <span className="ps-punto" aria-hidden="true" />
      <span className="ps-testo">
        <b>{chi}</b>
        {/* Il paese e' nullo su tutte le righe di oggi: la frase e' scritta
            per reggere senza, non per aspettarlo. */}
        {a.paese ? ` from ${a.paese}` : ''} booked <b>{a.prodotto}</b>
        <em>
          {quantoFa(a.quando)}
          {ospiti ? (
            <>
              {' '}
              &middot; <span className="ps-ospiti">{ospiti}</span>
            </>
          ) : null}
          {/* La provenienza sta qui e non in un riquadro a parte: chi
              dubita cerca proprio in quel punto, sotto la frase. */}
          <span className="ps-fonte"> &middot; verified booking</span>
        </em>
      </span>
    </>
  );

  return (
    <div className={'ps' + (visibile ? ' is-on' : '')} role="status" aria-live="polite">
      {href ? (
        <a className="ps-in" href={href}>
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
