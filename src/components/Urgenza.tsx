import type { Conteggio, Disponibilita } from '@/lib/riprova';

/* LA RIGA SOPRA IL CALENDARIO.
 *
 * E' l'ultimo centimetro prima della decisione, e va sfruttato con dei
 * fatti: quante prenotazioni oggi, quante questa settimana, quanti posti
 * ci sono per partenza. Tutto vero, tutto da Regiondo.
 *
 * Niente conti alla rovescia e niente "12 persone stanno guardando
 * adesso": quella roba si smaschera ricaricando la pagina due volte, e
 * chi la smaschera smette di credere anche ai numeri veri che stanno
 * dieci centimetri piu' su. Con 281 prenotazioni in una settimana non
 * serve inventare niente.
 *
 * Le soglie servono a non dire cose deboli: sotto le 3 prenotazioni al
 * giorno "2 prenotate oggi" lavora CONTRO, perche' suona come "non la
 * prende nessuno". In quel caso si mostra il dato settimanale, che e'
 * piu' grande, o niente.
 */
const GIORNI = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MESI = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* 🔴 DISEGNI, NON EMOJI (03/09/2026).
 *
 * Qui c'erano 🔥 👥 📆 🚐 ⚠️ 🚫 📅. Un'emoji non e' un'icona: e' un
 * carattere a colori FISSI, disegnato dal sistema operativo. Non prende
 * il colore del marchio perche' non prende nessun colore -- e cambia
 * faccia a ogni dispositivo: la fiamma di Windows non e' quella
 * dell'iPhone, che non e' quella di Android. In una colonna di quattro
 * righe accanto al calendario diventavano quattro macchie colorate
 * scoordinate, ognuna col suo verde, giallo e rosso, dentro un sito che
 * ha un arancione solo.
 *
 * Questi sono SVG con `currentColor`: prendono il colore che la regola
 * CSS decide, quindi l'arancione del marchio, e sono identici ovunque.
 * Stesso `viewBox` e stesso tratto per tutte, cosi' in colonna nessuna
 * pesa piu' delle altre.
 */
const svg = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ICONE = {
  /* la fiamma: quante prenotazioni oggi o negli ultimi sette giorni */
  fuoco: (
    <svg {...svg}>
      <path d="M12 3c.6 2.4-.5 3.9-1.8 5.2C8.6 9.8 7 11.3 7 14a5 5 0 0 0 10 0c0-2.2-1-3.7-2.1-5.2" />
      <path d="M12 21a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1.6-2.3-2.6-3.9-1 1.6-2.6 2.3-2.6 3.9A2.6 2.6 0 0 0 12 21Z" />
    </svg>
  ),
  /* le persone: quanti ospiti questa settimana */
  ospiti: (
    <svg {...svg}>
      <path d="M15.5 20v-1.7a3.4 3.4 0 0 0-3.4-3.4H6.4A3.4 3.4 0 0 0 3 18.3V20" />
      <circle cx="9.2" cy="7.4" r="3.4" />
      <path d="M21 20v-1.7a3.4 3.4 0 0 0-2.6-3.3" />
      <path d="M15.7 4.2a3.4 3.4 0 0 1 0 6.5" />
    </svg>
  ),
  /* il calendario: la prossima partenza, o su quante date si parte */
  data: (
    <svg {...svg}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  /* il triangolo: pochi posti rimasti. E' l'unica che avverte, ed e'
     anche l'unica che cambia colore (vedi .ur-avviso nel CSS). */
  pochi: (
    <svg {...svg}>
      <path d="M12 3.7 2.6 19.4a1.4 1.4 0 0 0 1.2 2.1h16.4a1.4 1.4 0 0 0 1.2-2.1L12 3.7Z" />
      <path d="M12 9.6v4.2M12 17.4h.01" />
    </svg>
  ),
  /* il cerchio sbarrato: date gia' al completo */
  piene: (
    <svg {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </svg>
  ),
  /* il minibus: quanti ospiti al massimo per partenza */
  mezzo: (
    <svg {...svg}>
      <path d="M3 16V8.5A1.5 1.5 0 0 1 4.5 7h9.2v9" />
      <path d="M13.7 10.2h2.9a1.5 1.5 0 0 1 1.2.6l2.3 3a1.5 1.5 0 0 1 .3.9V16" />
      <circle cx="7.4" cy="17" r="1.9" />
      <circle cx="16.6" cy="17" r="1.9" />
      <path d="M9.3 17h5.4" />
    </svg>
  ),
};

function quandoParte(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
}

export function Urgenza({
  conta,
  posti,
  disp,
}: {
  conta: Conteggio | null;
  posti?: number | null;
  disp?: Disponibilita | null;
}) {
  if (!conta && !disp) return null;

  const righe: { icona: React.ReactNode; testo: React.ReactNode; avviso?: boolean }[] = [];

  if (conta && conta.oggi >= 3) {
    righe.push({
      icona: ICONE.fuoco,
      testo: (
        <>
          <b>{conta.oggi}</b> booked today
          {conta.ieri >= 3 ? <>, <b>{conta.ieri}</b> yesterday</> : null}
        </>
      ),
    });
  } else if (conta && conta.ultimi_7 >= 10) {
    righe.push({ icona: ICONE.fuoco, testo: <><b>{conta.ultimi_7}</b> booked in the last 7 days</> });
  }

  if (conta && conta.persone_7 >= 20) {
    righe.push({ icona: ICONE.ospiti, testo: <><b>{conta.persone_7}</b> guests joined this week</> });
  }

  /* LA SCARSITA' VERA, e solo dove esiste davvero.
     Un transfer ha capienza illimitata: scrivere "posti rimasti" li'
     sarebbe una bugia, e infatti `posti_prima` e' nullo. Sotto i 12
     posti si dice il numero; sopra si dice solo la data, perche' "27
     posti rimasti" non mette fretta a nessuno. */
  /* 🔴 UNA DATA GIA' PASSATA NON SI SCRIVE.
   *
   * `prima_libera` viene calcolato dal pulsante in /admin/numeri/ e nessun
   * lavoro notturno lo aggiorna: invecchia da solo, un giorno alla volta.
   * Il 28 agosto trentaquattro pagine su ottantasei annunciavano "Next
   * departure Thursday 27 August" -- il giorno prima. Fra queste il tour
   * di punta.
   *
   * E' il tipo di errore che non rompe niente e costa tutto: chi legge una
   * data passata non pensa "il dato e' vecchio", pensa che il sito non sia
   * curato, e da li' dubita anche del prezzo e della disponibilita'.
   *
   * Finche' non c'e' un aggiornamento automatico, la riga sparisce invece
   * di mentire: un'informazione in meno non si nota, una sbagliata si'. */
  const scaduta =
    disp?.prima_libera != null && disp.prima_libera < new Date().toISOString().slice(0, 10);

  if (disp?.prima_libera && !scaduta) {
    const pochi = disp.posti_prima != null && disp.posti_prima <= 12;
    righe.push({
      icona: pochi ? ICONE.pochi : ICONE.data,
      avviso: pochi,
      testo: (
        <>
          Next departure <b>{quandoParte(disp.prima_libera)}</b>
          {pochi ? <> — only <b>{disp.posti_prima}</b> seats left</> : null}
        </>
      ),
    });
  }

  if (disp && disp.esaurite_30gg > 0) {
    righe.push({
      icona: ICONE.piene,
      testo: (
        <>
          <b>{disp.esaurite_30gg}</b> of the next {disp.date_totali_30gg} dates are
          already full
        </>
      ),
    });
  } else if (disp && disp.date_totali_30gg > 0 && disp.date_totali_30gg < 25) {
    /* Non parte tutti i giorni: e' scarsita' anche questa, e nessuno la
       dice mai. 18 date su 30 significa che dodici giorni non si va. */
    righe.push({
      icona: ICONE.data,
      testo: (
        <>
          Runs on <b>{disp.date_totali_30gg}</b> dates in the next 30 days
        </>
      ),
    });
  }

  if (posti) {
    righe.push({ icona: ICONE.mezzo, testo: <>Never more than <b>{posti}</b> guests</> });
  }

  if (!righe.length) return null;

  return (
    <div className="ur">
      {righe.map((r, i) => (
        <span key={i} className={r.avviso ? 'ur-avviso' : undefined}>
          <i aria-hidden="true">{r.icona}</i>
          {r.testo}
        </span>
      ))}
      {/* 🔴 QUI C'ERA "Live figures from Regiondo, our booking system".
          Tolta il 29/08/2026. La riga voleva dare provenienza al dato --
          e la tesi non era sbagliata -- ma stava a due centimetri dal
          pulsante di prenotazione, cioe' nel punto piu' prezioso della
          pagina, e li' spiegava un dettaglio tecnico che al cliente non
          interessa: il nome del gestionale di chi incassa. Chi sta per
          premere "prenota" non vuole sapere da dove arriva il numero,
          vuole premere.
          I numeri restano quelli veri: cambia che non lo si dichiara. */}
    </div>
  );
}
