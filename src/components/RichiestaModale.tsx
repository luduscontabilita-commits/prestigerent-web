'use client';

import { useEffect, useRef, useState } from 'react';
import { ModuloRichiesta } from '@/components/ModuloRichiesta';
import { testiModulo } from '@/lib/testi';

/* IL "QUICK REQUEST" DELLA SCHEDA TOUR, come su WordPress.
 *
 * Sul sito vecchio "Quick Request" apre un popup di Elementor
 * (`action=popup:open`, id 1537): il modulo compare SOPRA la scheda, la
 * pagina resta dov'era e l'indirizzo non cambia. Chi sta guardando il
 * Wine Experience non perde il posto in cui era arrivato.
 *
 * Qui si fa la stessa cosa con `<dialog>` nativo e `showModal()`, che
 * regala tre cose che un finto popup fatto con dei <div> non ha:
 *   - il fuoco della tastiera resta intrappolato dentro (Tab non esce);
 *   - Esc chiude, e non serve scriverlo;
 *   - il resto della pagina diventa inerte per chi usa uno screen reader.
 *
 * ── PERCHE' IL MODULO E' ANCHE IN FONDO ALLA PAGINA ────────────────────
 * Non e' un doppione: sono due momenti diversi. Il popup lo apre chi sta
 * guardando le foto e ha una domanda adesso; il modulo in fondo lo trova
 * chi ha letto tutto e ha deciso alla fine. Toglierne uno vuol dire
 * perdere una delle due.
 *
 * Il servizio di interesse arriva gia' scritto (prop `servizio`) e
 * finisce nell'oggetto dell'email: chi risponde sa di cosa si parla
 * senza aprire il messaggio. Vedi `src/lib/posta.ts`.
 */

export function RichiestaModale({
  locale,
  servizio,
  etichetta,
}: {
  locale: string;
  /** il nome del tour: entra gia' compilato nel campo "Service" */
  servizio?: string;
  /** il testo del pulsante; se manca si usa quello della lingua */
  etichetta?: string;
}) {
  const rif = useRef<HTMLDialogElement>(null);
  const [aperto, setAperto] = useState(false);
  const t = testiModulo(locale);

  /* `showModal()` non si puo' chiamare durante il disegno: il nodo non
     esiste ancora. Si apre qui, quando il dialogo e' gia' in pagina. */
  useEffect(() => {
    const d = rif.current;
    if (!d) return;
    if (aperto && !d.open) d.showModal();
    if (!aperto && d.open) d.close();
  }, [aperto]);

  /* Con il popup aperto la pagina dietro non deve scorrere: su telefono
     e' il difetto piu' fastidioso dei popup fatti male -- si scorre il
     modulo e si muove la pagina sotto. */
  useEffect(() => {
    if (!aperto) return;
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prima;
    };
  }, [aperto]);

  return (
    <>
      <button
        type="button"
        className="qr-apri"
        onClick={() => setAperto(true)}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 3.6 11a8.4 8.4 0 0 1 8.4-8.4h.5A8.4 8.4 0 0 1 21 11v.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {etichetta ?? t.pulsanteRapido}
      </button>

      <dialog
        ref={rif}
        className="qr-dlg"
        aria-labelledby="qr-tit"
        /* il click sullo sfondo chiude: il bersaglio e' il <dialog>
           stesso solo quando si colpisce l'area fuori dal riquadro */
        onClick={(e) => {
          if (e.target === rif.current) setAperto(false);
        }}
        onClose={() => setAperto(false)}
      >
        <div className="qr-box">
          <div className="qr-testa">
            <div>
              <h2 id="qr-tit">{t.pulsanteRapido}</h2>
              {servizio && <p className="qr-serv">{servizio}</p>}
            </div>
            <button
              type="button"
              className="qr-chiudi"
              onClick={() => setAperto(false)}
              aria-label={t.chiudi}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Il modulo e' lo STESSO di tutto il sito, non una copia: se
              domani cambia una regola di validazione o un campo, cambia
              in un posto solo. */}
          <div className="qr-corpo">
            <ModuloRichiesta locale={locale} tour={servizio} />
          </div>
        </div>
      </dialog>
    </>
  );
}
