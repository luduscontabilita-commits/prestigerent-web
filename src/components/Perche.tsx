/* "WHY US" -- le cinque promesse, riprese dalla home di WordPress.
 *
 * Sono le uniche righe del sito vecchio che rispondono alla domanda che
 * chi prenota si fa davvero prima di lasciare la carta: "e se cambia il
 * volo?", "chi mi risponde di domenica sera?", "questi sono loro o sono
 * un'agenzia che rivende?". Le recensioni dicono che il tour e' bello;
 * questo blocco dice che l'azienda e' seria. Sono due cose diverse e nel
 * passaggio al sito nuovo la seconda era sparita.
 *
 * ── DUE COSE CHE NON SONO COPIATE PARI PARI ─────────────────────────────
 *
 * 1. "Top Rated" sul sito vecchio dice «piu' di 6300 recensioni solo su
 *    TripAdvisor», «#1 su 967 Tours & Activities» e «#1 su 207
 *    Transportation Service». Quei numeri li abbiamo controllati sulla
 *    scheda vera il 24/08/2026 e NON tornano: il piazzamento e' #2 su
 *    248. Qui i numeri non si scrivono a mano, arrivano dal database --
 *    gli stessi che la fascia qui sopra mostra come prova con la fonte
 *    linkata. Un secondo posto vero vale piu' di un primo posto falso, e
 *    soprattutto due numeri diversi nella stessa pagina fanno perdere
 *    credibilita' a entrambi.
 *
 * 2. "Travel safe" finiva con «and periodically sanitized», che e'
 *    linguaggio del 2021. Nel 2026 non rassicura, data il testo. Il
 *    resto della frase -- Mercedes, licenze, assicurazioni, controlli --
 *    e' quello che conta ed e' rimasto intatto. Anche `src/lib/punti.ts`
 *    filtra gia' quel vocabolario dai contenuti che arrivano da
 *    WordPress: qui si fa la stessa cosa a mano.
 *
 * ── PERCHE' <details> E NON UN ACCORDION IN JAVASCRIPT ──────────────────
 * Sul sito vecchio erano schede verticali fatte da Elementor: su telefono
 * si aprivano una sull'altra e il testo finiva sotto la piega. `<details>`
 * con `name` fa la stessa cosa in HTML puro -- si apre una sola scheda
 * per volta -- senza una riga di JavaScript, funziona con la tastiera, e
 * il contenuto e' nel codice della pagina anche da chiuso: Google e le AI
 * lo leggono comunque. Dove `name` non e' supportato restano aperte piu'
 * schede, che e' una resa peggiore ma non un guasto.
 */

type Props = {
  /** media voto, dal database delle recensioni */
  voto: number | null;
  /** totale recensioni verificate, tutte le piattaforme */
  totale: number;
  /** il piazzamento Tripadvisor, dalla scheda azienda */
  posizione?: number | null;
  su?: number | null;
  categoria?: string | null;
  /** anni di attivita', calcolati sull'anno di fondazione. Puo' mancare:
   *  in quel caso la frase dice "more than 20 years", che e' vero da
   *  quando l'azienda esiste (2002) e non e' un numero inventato. */
  anni: number | null;
};

export function Perche({ voto, totale, posizione, su, categoria, anni }: Props) {
  const schede = [
    {
      id: 'travel-safe',
      titolo: 'Travel safe',
      corpo: (
        <p>
          The safety of our passengers and staff has always been our priority. We
          want your experience to be comfortable and safe; that&rsquo;s why we
          exclusively use fully licensed and insured, top-of-the-line
          Mercedes-Benz vehicles &mdash; sedans, vans and MPVs &mdash; subjected
          to continuous checks and thoroughly cleaned after each use.
        </p>
      ),
    },
    {
      id: 'book-with-confidence',
      titolo: 'Book with confidence',
      corpo: (
        <>
          <p>
            If you book with us, you will never lose your money. You can easily:
          </p>
          <ul>
            <li>change your tour date for free up to 24 hours before departure;</li>
            <li>convert your existing payments to credit and use it whenever you want;</li>
            <li>transfer your credit to a friend or family member, at no extra cost.</li>
          </ul>
          <p>
            And if the best option for you is to cancel, we have one of the
            friendliest cancellation policies in the market: free cancellation up
            to 24 hours in advance.
          </p>
        </>
      ),
    },
    {
      id: 'top-rated',
      titolo: 'Top rated',
      corpo: (
        <>
          <p>
            {/* 🔴 QUI NON SI NOMINA VIATOR, e non e' una dimenticanza.
                Il totale d'azienda somma Tripadvisor, GetYourGuide e chi ha
                prenotato con noi: Viator ne resta FUORI, perche' il suo
                numero comprende gia' quello di Tripadvisor e sommarli
                vorrebbe dire contare due volte le stesse recensioni.
                Elencare una piattaforma che non e' nella somma e' il modo
                piu' rapido di far sembrare inventato un numero vero. */}
            We love what we do, and so do our guests: {totale.toLocaleString('en-US')}{' '}
            verified reviews across Tripadvisor, GetYourGuide and guests who
            booked with us directly
            {voto ? `, ${voto.toFixed(1)} out of 5 on average` : ''}.
          </p>
          {posizione && su && categoria && (
            <p>
              On Tripadvisor we are ranked #{posizione} of {su}{' '}
              {categoria.toLowerCase()} in Florence, and we hold the
              Travelers&rsquo; Choice award.
            </p>
          )}
          <p>
            What our guests write is the most important resource we have to keep
            improving, and reading it is always a pleasure.
          </p>
        </>
      ),
    },
    {
      id: 'no-intermediaries',
      titolo: 'No intermediaries',
      corpo: (
        <>
          <p>
            We operate what we sell &mdash; and this is not true for most of our
            competitors. We use our own vehicles, and the drivers, guides and
            office staff are all employed by us.
          </p>
          <p>
            What does it mean? You speak directly and exclusively with us, so
            there are no misunderstandings passed along second-hand; and if your
            travel plans change even at the last minute, we are here, ready to
            help in the simplest and fastest way possible. Last but not least, no
            intermediaries means no prices inflated by commissions.
          </p>
        </>
      ),
    },
    {
      id: 'support',
      titolo: '24/7 support',
      corpo: (
        <>
          <p>
            We have been in the travel industry for more than {anni ?? 20} years. We
            know how complicated it can be to plan a trip to a foreign country,
            and our goal is to put that experience at your disposal, suggesting
            what actually fits what you are after.
          </p>
          <p>
            We also know that while you are travelling your plans might change.
            That is why your confirmation voucher carries our emergency contacts,
            answered 24/7/365.
          </p>
        </>
      ),
    },
  ];

  return (
    <section className="pr-sec" id="why-us" aria-labelledby="why-t">
      <div className="pr-wrap wide">
        <h2 className="wy-t" id="why-t">Why us</h2>

        <div className="wy-list">
          {schede.map((s, i) => (
            <details key={s.id} name="why-us" open={i === 0} className="wy-item">
              <summary>
                <span>{s.titolo}</span>
                <svg className="wy-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="wy-corpo">{s.corpo}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
