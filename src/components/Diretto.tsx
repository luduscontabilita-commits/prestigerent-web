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
/* 🔴 QUI DENTRO NON CI VANNO LINK.
 *
 * La prima riga era un collegamento a WhatsApp ("ask us anything before
 * you pay"). Il blocco pero' sta in fondo alla pagina, sotto il
 * calendario: e' l'ultimo argomento prima della decisione, e un link li'
 * fa una cosa sola, porta via. Chi lo preme esce dal sito e la
 * prenotazione resta a meta'.
 *
 * Quello che deve fare questo blocco e' rassicurare, non ingaggiare: dire
 * che i recapiti li avranno comunque, tutti, su qualunque canale. I
 * pulsanti per scrivere davvero ci sono gia' -- WhatsApp in testata, il
 * modulo di richiesta, la barra in basso sul telefono -- e sono loro il
 * posto giusto per farlo.
 */
export function Diretto({ whatsapp: _whatsapp }: { whatsapp: string }) {
  return (
    <div className="dr">
      <p className="dr-t">Book here and you are not on your own</p>
      <ul>
        <li>
          <span aria-hidden="true">💬</span>
          <b>Before</b> — ask us anything before you pay, and we answer ourselves:
          not a call center, not a chatbot.
        </li>
        <li>
          <span aria-hidden="true">📱</span>
          <b>Every way to reach us, in the confirmation</b> — WhatsApp, SMS, phone
          and email, with the direct number of the people running your day. No
          booking reference, no ticket queue.
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
