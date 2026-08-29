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

  const righe: { icona: string; testo: React.ReactNode }[] = [];

  if (conta && conta.oggi >= 3) {
    righe.push({
      icona: '🔥',
      testo: (
        <>
          <b>{conta.oggi}</b> booked today
          {conta.ieri >= 3 ? <>, <b>{conta.ieri}</b> yesterday</> : null}
        </>
      ),
    });
  } else if (conta && conta.ultimi_7 >= 10) {
    righe.push({ icona: '🔥', testo: <><b>{conta.ultimi_7}</b> booked in the last 7 days</> });
  }

  if (conta && conta.persone_7 >= 20) {
    righe.push({ icona: '👥', testo: <><b>{conta.persone_7}</b> guests joined this week</> });
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
      icona: pochi ? '⚠️' : '📅',
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
      icona: '🚫',
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
      icona: '📆',
      testo: (
        <>
          Runs on <b>{disp.date_totali_30gg}</b> dates in the next 30 days
        </>
      ),
    });
  }

  if (posti) {
    righe.push({ icona: '🚐', testo: <>Never more than <b>{posti}</b> guests</> });
  }

  if (!righe.length) return null;

  return (
    <div className="ur">
      {righe.map((r, i) => (
        <span key={i}>
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
