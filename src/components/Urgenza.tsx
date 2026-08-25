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
  if (disp?.prima_libera) {
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
      {/* DA DOVE VENGONO I NUMERI.
          Senza questa riga "29 booked today" e' un'affermazione come
          tante; con questa e' un dato che ha una provenienza. E' la
          differenza fra un sito che dice di essere popolare e uno che
          mostra il registro.
          Non si scrive "verified by Regiondo": Regiondo non ci
          certifica, e' il sistema che incassa. Dire cosa e' davvero --
          il nostro sistema di prenotazione, letto in diretta -- e' piu'
          onesto e, con un lettore attento, anche piu' credibile. */}
      <em className="ur-fonte">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        Live figures from Regiondo, our booking system
      </em>
    </div>
  );
}
