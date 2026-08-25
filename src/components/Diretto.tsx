/* PERCHE' PRENOTARE QUI E NON SU VIATOR.
 *
 * ── COSA NON SI SCRIVE, E PERCHE' ───────────────────────────────────
 * "Best price when you book direct" e' scritto sulle landing ed e'
 * FALSO: il Wine Experience costa 89 euro qui e 89 euro su GetYourGuide,
 * verificato oggi. Chi controlla in dieci secondi -- e chi confronta i
 * prezzi controlla sempre -- da quel momento non crede piu' nemmeno alle
 * 12.900 recensioni che stanno sopra.
 *
 * ── COSA SI SCRIVE ──────────────────────────────────────────────────
 * L'argomento vero e' piu' forte del prezzo, e nessun intermediario puo'
 * copiarlo: qui parli con chi guida il pullman. Su Viator parli con
 * Viator, e Viator il pullman non ce l'ha.
 *
 * Il terzo punto e' quello che converte davvero sulle prenotazioni
 * grandi: una famiglia di otto persone che deve spendere 900 euro non
 * compra da un calendario, scrive. E se scrive e le risponde qualcuno
 * che sa a che ora si parte, compra.
 */
export function Diretto({ whatsapp }: { whatsapp: string }) {
  return (
    <div className="dr">
      <p className="dr-t">Booking here means</p>
      <ul>
        <li>
          <span aria-hidden="true">🚐</span>
          You are booking with the company that <b>actually runs the tour</b> — our
          vehicles, our drivers, our guides
        </li>
        <li>
          <span aria-hidden="true">🏷️</span>
          <b>No booking fee</b>, and the same price as the big platforms
        </li>
        <li>
          <span aria-hidden="true">💬</span>
          <a href={whatsapp} target="_blank" rel="noopener">
            Ask us anything before you pay
          </a>{' '}
          — we answer ourselves, not a call centre
        </li>
      </ul>
    </div>
  );
}
