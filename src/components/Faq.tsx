import { faqDa, pulisci } from '@/lib/prosa';

/* Le FAQ come accordion, con il markup della landing (.pr-acc).
 *
 * Su WordPress sono un blocco unico: domanda in grassetto, a capo, risposta,
 * ripetuto dodici volte. Leggibile, ma e' un muro -- e ci mettevo pure sopra
 * un ritaglio a 320px che le tagliava a meta'.
 *
 * Qui diventano `<details>`: HTML nativo, quindi funzionano anche senza
 * JavaScript e il testo delle risposte resta SEMPRE nel sorgente. Quest'ultima
 * cosa non e' un dettaglio: le FAQ sono il formato che le AI citano di piu'
 * (§10.2 del masterplan), e una risposta che esiste solo dopo un clic per una
 * macchina non esiste.
 */
export function Faq({ html }: { html: string }) {
  const domande = faqDa(html);

  if (!domande.length) {
    // riconoscimento fallito: meglio il testo cosi' com'e' che niente
    return (
      <div className="pr-acc-body pr-prose" dangerouslySetInnerHTML={{ __html: pulisci(html) }} />
    );
  }

  /* Qui NON serve la barra chiusa della landing: siamo gia' dentro la scheda
     "FAQ'S", che l'utente ha scelto di aprire. Una barra dentro una scheda
     sarebbe un secondo clic per la stessa decisione. */
  return (
      <div className="pr-faqbar-body">
      {domande.map((d, i) => (
        <details className="pr-acc" key={d.q} >
          <summary>
            <span>{d.q}</span>
            <svg
              className="pr-chev"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div
            className="pr-acc-body pr-prose"
            dangerouslySetInnerHTML={{ __html: d.a }}
          />
        </details>
        ))}
      </div>
  );
}
