import type { Conteggio } from '@/lib/riprova';

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
export function Urgenza({ conta, posti }: { conta: Conteggio | null; posti?: number | null }) {
  if (!conta) return null;

  const righe: { icona: string; testo: React.ReactNode }[] = [];

  if (conta.oggi >= 3) {
    righe.push({
      icona: '🔥',
      testo: (
        <>
          <b>{conta.oggi}</b> booked today
          {conta.ieri >= 3 ? <>, <b>{conta.ieri}</b> yesterday</> : null}
        </>
      ),
    });
  } else if (conta.ultimi_7 >= 10) {
    righe.push({ icona: '🔥', testo: <><b>{conta.ultimi_7}</b> booked in the last 7 days</> });
  }

  if (conta.persone_7 >= 20) {
    righe.push({ icona: '👥', testo: <><b>{conta.persone_7}</b> guests joined this week</> });
  }

  if (posti) {
    righe.push({ icona: '🚐', testo: <>Only <b>{posti}</b> seats per departure</> });
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
    </div>
  );
}
