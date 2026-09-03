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

/* 🔴 UN DISEGNO SOLO, E NON UN'EMOJI (03/09/2026).
 *
 * Prima ogni riga aveva la sua emoji: 🔥 👥 📆 🚐 ⚠️ 🚫 📅. Un'emoji non
 * e' un'icona -- e' un carattere a colori FISSI disegnato dal sistema
 * operativo, quindi non prende il colore del marchio e cambia faccia a
 * ogni dispositivo. Erano quattro macchie scoordinate in un sito che ha
 * un arancione solo.
 *
 * Poi sono diventate SVG in colore di marchio, ed era meglio. Ma in una
 * griglia dove il protagonista e' la CIFRA, sette disegni sono sette
 * cose in piu' da guardare prima del numero: l'icona aiuta a scorrere
 * un elenco di righe, non a leggere quattro numeri grandi.
 *
 * Ne resta uno, sulla fascetta del prezzo garantito: quella non ha un
 * numero, quindi il disegno e' l'unica cosa che la fa riconoscere a
 * colpo d'occhio. `currentColor`, cosi' prende l'arancione dal CSS.
 */
const IconaPrezzo = () => (
  <svg
    width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.1"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
  >
    <path d="M20.6 13.3 13.3 20.6a2 2 0 0 1-2.8 0l-7.1-7.1a2 2 0 0 1-.6-1.4V4.4a2 2 0 0 1 2-2h7.7a2 2 0 0 1 1.4.6l7.1 7.1a2 2 0 0 1 0 2.8Z" />
    <path d="M7.3 7.3h.01" />
  </svg>
);

/* La data della prossima partenza sta in una casella accanto a dei
   numeri: "Thursday 27 August" la farebbe andare a capo tre volte.
   Qui diventa "27 Aug", che e' la stessa informazione nella misura di
   una cifra. Il giorno della settimana si perde, e va bene: chi guarda
   il calendario due centimetri sotto lo vede da se'. */
const MESI_BREVI = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dataBreve(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
}

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

  const righe: { n: string; t: string; avviso?: boolean }[] = [];

  /* Ogni voce e' una cifra con la sua etichetta, e l'etichetta e'
     corta: sta in una casella larga meta' colonna, in maiuscoletto.
     "Runs on 18 dates in the next 30 days" diventa 18 +
     "dates in next 30 days" -- si perdono le parole di raccordo, non
     l'informazione, e due voci stanno sulla stessa riga invece di una. */

  if (conta && conta.oggi >= 3) {
    righe.push({
      n: String(conta.oggi),
      /* Il dato di ieri non merita una casella sua -- sarebbe una cifra
         grande per un'informazione di contorno -- ma dentro l'etichetta
         regge, e dice che non e' stato un giorno fortunato. */
      t: conta.ieri >= 3 ? `booked today, ${conta.ieri} yesterday` : 'booked today',
    });
  } else if (conta && conta.ultimi_7 >= 10) {
    righe.push({ n: String(conta.ultimi_7), t: 'booked in the last 7 days' });
  }

  if (conta && conta.persone_7 >= 20) {
    righe.push({ n: String(conta.persone_7), t: 'guests this week' });
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
    righe.push({ n: dataBreve(disp.prima_libera), t: 'next departure' });
    /* I posti rimasti prendono una casella LORO invece di finire in coda
       all'etichetta della data: e' l'unico numero che deve mettere
       fretta, e in coda a un'altra frase non lo leggerebbe nessuno. */
    if (disp.posti_prima != null && disp.posti_prima <= 12) {
      righe.push({ n: String(disp.posti_prima), t: 'seats left on that date', avviso: true });
    }
  }

  if (disp && disp.esaurite_30gg > 0) {
    righe.push({
      n: String(disp.esaurite_30gg),
      t: `of ${disp.date_totali_30gg} dates already full`,
    });
  } else if (disp && disp.date_totali_30gg > 0 && disp.date_totali_30gg < 25) {
    /* Non parte tutti i giorni: e' scarsita' anche questa, e nessuno la
       dice mai. 18 date su 30 significa che dodici giorni non si va. */
    righe.push({ n: String(disp.date_totali_30gg), t: 'dates in next 30 days' });
  }

  if (posti) {
    righe.push({ n: String(posti), t: 'guests max, never more' });
  }

  return (
    <div className="ur">
      {/* 🔴 LA FASCETTA DEL PREZZO STA DENTRO QUESTO BLOCCO (03/09/2026).
          Prima era un <div className="pr-tguar"> a se', scritto nella
          pagina del tour subito sopra questo componente: un riquadro con
          la sua emoji 🏷️, il suo fondo e i suoi margini, appoggiato
          sopra una colonna di righe che parlava un'altra lingua. Due
          blocchi diversi per la stessa cosa -- le ragioni per comprare
          adesso -- separati solo da uno stacco.
          Adesso e' la prima riga di un blocco solo: stesso contenitore,
          stesso filo di separazione, stesso arancione. */}
      <p className="ur-prezzo">
        <IconaPrezzo />
        <span><b>Best price</b> &mdash; no booking fee</span>
      </p>

      {/* 🔴 LE COLONNE SEGUONO IL CONTO DELLE VOCI (03/09/2026).
          Prima erano due fisse, e prima ancora `auto-fit`. Nessuna delle
          due andava: `auto-fit` guarda lo spazio e non le voci -- quattro
          voci diventavano 3+1 con un buco -- e due fisse costringevano
          tre voci a stare come 1+2, quando in riga ci stanno benissimo.
          La disposizione giusta cambia col numero: 3 vanno in fila, 4
          fanno 2+2, 5 fanno 3+2. Non e' una regola sola che vale sempre,
          e' una scelta per ogni conto -- quindi la classe dice QUANTE
          sono (`n3`, `n4`...) e il CSS decide la forma.
          Sotto, la griglia ha SEI tracce e ogni casella ne occupa 2 o 3:
          e' il minimo comune multiplo che permette righe da tre e righe
          da due nella stessa griglia. Senza, il "3+2" sarebbe impossibile
          -- due caselle in una griglia da tre colonne lasciano un buco,
          ed e' esattamente il difetto da cui siamo partiti. */}
      <div className={`ur-griglia n${Math.min(righe.length, 6)}`}>
        {righe.map((r, i) => (
          <div className={'ur-c' + (r.avviso ? ' ur-avviso' : '')} key={i}>
            <b>{r.n}</b>
            <span>{r.t}</span>
          </div>
        ))}
      </div>
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
