import { NextResponse, after } from 'next/server';
import { ultimePrenotazioni, tuttiIConteggi } from '@/lib/riprova';
import { ripassaNumeri, ripassoConfigurato } from '@/lib/numeri-freschi';

/* LE PRENOTAZIONI VERE, RILETTE MENTRE LA PAGINA E' APERTA.
 *
 * Il layout le passa gia' al primo disegno, ma una scheda tour resta
 * aperta anche dieci minuti: se in quei dieci minuti qualcuno prenota
 * davvero e il visitatore lo vede comparire, quello e' il momento che
 * converte. Da fermo invece l'elenco invecchia e il riquadro racconta
 * cose di mezz'ora fa.
 *
 * ── PERCHE' NON E' UNA LETTURA PER VISITATORE ───────────────────────
 * Con l'aggiornamento ogni 60 secondi, cento persone contemporaneamente
 * sulla pagina farebbero cento interrogazioni al minuto per ottenere
 * tutte la stessa identica risposta. Sono dati uguali per tutti e non
 * dipendono ne' dall'URL ne' da chi guarda, quindi la risposta si mette
 * in cache davanti al database e il database ne vede una sola.
 *
 * Il `Cache-Control` esplicito e' quello che regge il colpo sulla CDN, e
 * lo `stale-while-revalidate` fa sì che il minuto in cui la cache scade
 * non diventi un'attesa per chi capita proprio li'. `revalidate` NON va
 * rimesso: rende la rotta statica e la disinnesca (vedi sotto).
 *
 * ── COSA NON C'E' DENTRO ────────────────────────────────────────────
 * Nessun cognome, nessun riferimento di prenotazione. Quello che esce
 * di qui e' leggibile da chiunque apra gli strumenti del browser, e va
 * trattato come se fosse gia' pubblico -- perche' lo e'.
 */

/* 🔴 QUESTA ROTTA NON SI LIMITA A LEGGERE: TIENE FRESCO IL DATO.
 *
 * `prenotazioni_recenti` si riempiva solo premendo un pulsante in
 * /admin/numeri/. Il 29 agosto 2026 l'ultima riga era del 25 agosto: il
 * sito diceva "4 days ago" sotto ogni prenotazione e "0 booked today" su
 * ogni scheda, mentre Regiondo ne registrava diciassette nella sola notte
 * prima. Non un numero basso -- un numero fermo.
 *
 * Il piano gratuito di Vercel concede un lavoro programmato al giorno, e
 * quello e' occupato dalle conversioni; e comunque "quante prenotazioni
 * oggi" alle 3:20 di notte non significa niente. Quindi l'aggiornamento
 * si aggancia al traffico: se il dato ha piu' di un quarto d'ora si rilegge
 * Regiondo DOPO aver risposto, con `after`, cosi' chi ha fatto la
 * richiesta non aspetta un millisecondo in piu'.
 *
 * Non e' una richiesta per visitatore: la risposta sta in cache un minuto
 * sulla rete, quindi questo codice gira al massimo una volta al minuto
 * per quanti visitatori ci siano, e la guardia dei quindici minuti
 * dentro `ripassaNumeri` lo riduce a quattro volte l'ora.
 *
 * Se il ripasso fallisce non succede niente di visibile: si continua a
 * servire l'ultimo dato buono. Un riquadro un po' vecchio e' meglio di
 * una rotta che risponde errore. */
/* 🔴 `force-dynamic`, E NON `revalidate = 60`.
 *
 * Con `revalidate` Next classificava questa rotta come STATICA: la
 * eseguiva una volta durante `next build` e poi serviva quella risposta.
 * Due conseguenze, tutte e due invisibili guardando il sito.
 *
 * La prima: `after()` non gira in fase di build, quindi il ripasso da
 * Regiondo non e' MAI partito da solo. Il 29/08/2026 alle 21:30 la
 * tabella dei conteggi era ferma alle 09:20 del mattino: il sito ha
 * raccontato per tutto il giorno i numeri della colazione. E' lo stesso
 * guasto che questo file dichiara di aver risolto qualche riga piu'
 * sopra -- la cura c'era, non partiva.
 *
 * La seconda: l'intestazione `Cache-Control` scritta qui sotto veniva
 * buttata via e sostituita da `max-age=0, must-revalidate`.
 *
 * Dinamica non vuol dire una lettura per visitatore: e' il
 * `Cache-Control` esplicito a tenere la risposta un minuto sulla CDN, e
 * quello adesso arriva davvero. Il database ne vede una al minuto come
 * prima, ma il codice gira. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const [avvisi, conteggi] = await Promise.all([ultimePrenotazioni(25), tuttiIConteggi()]);

  if (ripassoConfigurato()) {
    after(async () => {
      try {
        await ripassaNumeri();
      } catch {
        /* Regiondo lento o irraggiungibile: si riprova al prossimo giro.
           Un errore qui non deve comparire da nessuna parte, perche' non
           ha tolto niente a nessuno. */
      }
    });
  }

  return NextResponse.json(
    { avvisi, conteggi },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
