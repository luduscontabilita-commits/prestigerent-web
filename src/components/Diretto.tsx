/* PERCHE' PRENOTARE QUI E NON SU VIATOR.
 *
 * ── COSA NON SI SCRIVE ──────────────────────────────────────────────
 * "Best price when you book direct" e' scritto sulle landing ed e'
 * FALSO: il Wine Experience costa 89 euro qui e 89 su GetYourGuide,
 * verificato. Chi confronta i prezzi controlla sempre, e in dieci
 * secondi smette di credere anche alle 12.900 recensioni sopra.
 *
 * ── COSA SI SCRIVE ──────────────────────────────────────────────────
 * Sul prezzo non si vince. Si vince su quello che un intermediario non
 * puo' dare: un numero di telefono invece di un codice di prenotazione.
 *
 * Chi prenota su Viator, se il volo arriva tardi o piove o si perde la
 * mattina del tour, scrive a un servizio clienti che non sa a che ora
 * parte il pullman e non puo' chiamare l'autista. Qui scrive a chi il
 * pullman lo guida.
 *
 * E' l'argomento che conta di piu' sulle prenotazioni grandi: una
 * famiglia che deve spendere 900 euro in un paese che non conosce non
 * compra da un calendario. Vuole sapere che c'e' qualcuno.
 */
export function Diretto({ whatsapp }: { whatsapp: string }) {
  return (
    <div className="dr">
      <p className="dr-t">Book here and you are not on your own</p>
      <ul>
        <li>
          <span aria-hidden="true">💬</span>
          <b>Before</b> — <a href={whatsapp} target="_blank" rel="noopener">ask us anything
          before you pay</a>. We answer ourselves: not a call centre, not a chatbot.
        </li>
        <li>
          <span aria-hidden="true">📞</span>
          <b>During</b> — you have our number, not a booking reference. Flight late,
          bad weather, lost on the morning: you call us and we sort it out.
        </li>
        <li>
          <span aria-hidden="true">🤝</span>
          <b>After</b> — same people, same number. Something left on the bus, a receipt
          you need, another day to book: you already know who to ask.
        </li>
        <li>
          <span aria-hidden="true">🏷️</span>
          <b>No booking fee.</b>
        </li>
      </ul>
    </div>
  );
}
