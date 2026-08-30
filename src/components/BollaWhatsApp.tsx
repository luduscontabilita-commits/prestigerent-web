/* LA BOLLA WHATSAPP, FISSA IN BASSO A DESTRA.
 *
 * ── PERCHE' WHATSAPP E NON UNA CHAT ─────────────────────────────────
 * Sul sito vecchio c'era un widget di chat. Non l'ho riportato e la
 * scelta e' voluta: una chat vive o muore su chi risponde, e se non
 * risponde nessuno fa piu' danno del non averla -- il visitatore scrive,
 * aspetta, e se ne va convinto che qui non risponda nessuno. WhatsApp
 * quel presidio ce l'ha gia': arriva sul telefono di chi lavora, si
 * risponde da fuori ufficio, e la conversazione resta anche dopo che il
 * cliente ha chiuso la pagina.
 *
 * ── NON E' UN <button>, E' UN LINK ──────────────────────────────────
 * Cosi' funziona col tasto centrale, col "apri in un'altra scheda", e
 * senza JavaScript. Il tracciamento non sta qui dentro: `Tracciamento.tsx`
 * ascolta i clic su tutti i link `wa.me` e sa gia' da quale zona della
 * pagina arrivano -- questa si chiama `bolla-fissa`.
 *
 * ── DOVE NON DEVE DARE FASTIDIO ─────────────────────────────────────
 * In basso a destra ci passano gia' due cose: la barra fissa "prenota"
 * sulle schede tour da telefono, e il riquadro delle prenotazioni vere in
 * basso a SINISTRA. Con la prima si sale sopra la barra (vedi il CSS),
 * con la seconda non ci si incrocia perche' stanno ai due lati opposti.
 */

const NUMERO = '393338424047';

/* Il messaggio gia' scritto: chi apre WhatsApp trova la prima riga
   pronta e non deve inventarsi come cominciare. Non e' cortesia -- la
   casella vuota e' il punto in cui la meta' delle persone rinuncia. */
const TESTO = encodeURIComponent(
  'Hello Prestige Rent! I have a question about your tours and transfers.',
);

export function BollaWhatsApp() {
  return (
    <a
      className="wa-bolla"
      href={`https://wa.me/${NUMERO}?text=${TESTO}`}
      target="_blank"
      rel="noopener"
      aria-label="Chat with us on WhatsApp"
      data-zona="bolla-fissa"
    >
      {/* Il glifo intero: cornetta DENTRO il fumetto. Il tracciato che
          gira nei siti spesso disegna solo il fumetto, e senza la
          cornetta non si riconosce -- diventa "una chat qualsiasi". */}
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.47-.01c-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.73 2.64 4.19 3.7.59.26 1.04.41 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z"
        />
      </svg>
    </a>
  );
}
