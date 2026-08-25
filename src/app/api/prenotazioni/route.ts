import { NextResponse } from 'next/server';
import { ultimePrenotazioni, tuttiIConteggi } from '@/lib/riprova';

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
 * `revalidate` da solo non basta: in App Router una Route Handler e'
 * dinamica di default e quell'export viene ignorato se la rotta non
 * viene resa statica. Il `Cache-Control` esplicito e' quello che regge
 * davvero il colpo sulla CDN, e lo `stale-while-revalidate` fa sì che
 * il minuto in cui la cache scade non diventi un'attesa per chi capita
 * proprio li'.
 *
 * ── COSA NON C'E' DENTRO ────────────────────────────────────────────
 * Nessun cognome, nessun riferimento di prenotazione. Quello che esce
 * di qui e' leggibile da chiunque apra gli strumenti del browser, e va
 * trattato come se fosse gia' pubblico -- perche' lo e'.
 */

export const revalidate = 60;

export async function GET() {
  const [avvisi, conteggi] = await Promise.all([ultimePrenotazioni(25), tuttiIConteggi()]);

  return NextResponse.json(
    { avvisi, conteggi },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
