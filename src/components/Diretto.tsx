/* CHI E' CHE INCASSA, SOTTO IL CALENDARIO.
 *
 * ── COSA C'ERA PRIMA, E PERCHE' NON C'E' PIU' ───────────────────────
 * Qui stava "Book here and you are not on your own": cinque punti che
 * spiegavano perche' prenotare da noi invece che da un intermediario --
 * prima, durante, dopo, i recapiti, nessuna commissione.
 *
 * L'argomento era giusto, la lunghezza no. Sono venti righe in fondo a
 * una scheda tour, sotto il calendario, cioe' nel punto in cui chi legge
 * ha gia' deciso e sta cercando un motivo per fidarsi -- non un altro
 * testo da leggere. La proprieta' l'ha chiamato "troiaio" ed e' una
 * critica che regge: un muro di rassicurazioni si salta.
 *
 * ── COSA C'E' ADESSO ────────────────────────────────────────────────
 * Gli stessi dati che stanno sotto il calendario delle landing, dove
 * sono stati messi il 01/09/2026: nome, sede, telefono, WhatsApp, email
 * e partita IVA.
 *
 * Non e' una rinuncia a convincere, e' un altro modo di farlo. Chi sta
 * per lasciare la carta a un sito che non conosce non cerca una promessa
 * in piu': cerca la prova che dietro c'e' un'azienda vera, con un
 * indirizzo dove sta e un numero che risponde. Quattro righe di dati
 * fanno quel lavoro meglio di venti di argomenti.
 *
 * ── I RECAPITI SONO CLICCABILI, E QUI IL LINK CI STA ────────────────
 * Nel blocco vecchio c'era una nota che vietava i collegamenti: era
 * giusta, perche' un link dentro un testo persuasivo porta via da una
 * pagina dove si deve restare. Qui e' il contrario: sono recapiti, e un
 * recapito che va copiato a mano non e' un recapito. Chi ha un dubbio
 * proprio in quel punto deve poter chiamare senza cercare altrove.
 *
 * ── COSA NON SI SCRIVE, E RESTA VERO ────────────────────────────────
 * "Best price when you book direct" e' scritto sulle landing ed e'
 * FALSO: il Wine Experience costa 89 euro qui e 89 su GetYourGuide,
 * verificato. Chi confronta i prezzi controlla sempre, e in dieci
 * secondi smette di credere anche alle recensioni qui sopra.
 */
export function Diretto({
  whatsapp: _whatsapp,
  tipo: _tipo,
}: {
  /* Tenuti nella firma anche se non si usano piu': il blocco vecchio li
     voleva, e toglierli dalle pagine che lo richiamano sarebbe una
     modifica in piu' senza nessun guadagno. Il giorno che si tocca la
     scheda tour si tolgono anche di la'. */
  whatsapp: string;
  tipo?: string | null;
}) {
  return (
    <div className="dr">
      <p className="dr-nome">Prestige Rent S.r.l.</p>
      <p className="dr-riga">Via della Saggina 98, 50145 Florence, Italy</p>
      <p className="dr-riga dr-rec">
        <a href="tel:+39055286059">+39 055 286 059</a>
        <span aria-hidden="true"> · </span>
        <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
          WhatsApp +39 333 842 4047
        </a>
        <span aria-hidden="true"> · </span>
        <a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>
      </p>
      <p className="dr-min">
        Tour Operator, Travel Agency &amp; Limo Company &mdash; VAT 05745220482
      </p>
    </div>
  );
}
