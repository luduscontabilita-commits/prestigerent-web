'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ModuloRichiesta } from '@/components/ModuloRichiesta';
import { testiModulo } from '@/lib/testi';

/* IL "QUICK REQUEST", come su WordPress: si apre SOPRA la pagina in cui
 * si e', qualunque essa sia.
 *
 * ── IL DIFETTO CHE QUESTO RISOLVE ──────────────────────────────────────
 * Il "Quick Request" in cima al sito era un link a `/#contact`, cioe'
 * alla HOME. Chi lo cliccava dalla scheda del Wine Experience veniva
 * portato via dalla scheda che stava leggendo, e per tornarci doveva
 * premere indietro. Su WordPress non succede: li' e' un popup di
 * Elementor che compare sopra la pagina, che resta dov'era, con
 * l'indirizzo invariato.
 *
 * ── COME E' FATTO ──────────────────────────────────────────────────────
 * Il dialogo vive UNA VOLTA SOLA, nel layout: e' in ogni pagina del sito
 * senza che nessuna pagina debba saperlo. Chi vuole aprirlo -- il
 * pulsante in cima, quello nella colonna della scheda tour, o qualunque
 * altro domani -- lancia l'evento `pr-richiesta-apri`. Nessuno dei due
 * ha bisogno di un riferimento all'altro.
 *
 * `<dialog>` nativo con `showModal()` regala tre cose che un popup fatto
 * con dei <div> non ha: il fuoco della tastiera intrappolato dentro, Esc
 * che chiude, e il resto della pagina inerte per gli screen reader.
 *
 * ── DA DOVE ARRIVA IL SERVIZIO ─────────────────────────────────────────
 * Chi lancia l'evento puo' dire per cosa (`detail.servizio`). Se non lo
 * dice -- ed e' il caso del pulsante in cima, che sta nel layout e non sa
 * su che pagina si trova -- si legge il campo "Service" del modulo in
 * fondo alla pagina, che ogni pagina compila gia' per conto suo: la
 * scheda tour col nome del tour, la categoria col titolo della categoria,
 * /contact-us/ con "Contact page". Una fonte sola, gia' giusta ovunque,
 * invece di ripetere lo stesso dato in due posti che poi divergono.
 */

/** Apre il popup da qualunque punto del sito. */
export function apriRichiesta(servizio?: string) {
  window.dispatchEvent(
    new CustomEvent('pr-richiesta-apri', { detail: { servizio } })
  );
}

/** Legge il servizio dal modulo della pagina, ignorando quello nel popup. */
function servizioDellaPagina(): string | undefined {
  const campi = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="tour"]')
  ).filter((c) => !c.closest('.qr-dlg'));
  const v = campi[0]?.value?.trim();
  return v || undefined;
}

export function RichiestaModale({ locale }: { locale: string }) {
  const rif = useRef<HTMLDialogElement>(null);
  const [aperto, setAperto] = useState(false);
  const [servizio, setServizio] = useState<string | undefined>(undefined);
  const t = testiModulo(locale);

  const chiudi = useCallback(() => setAperto(false), []);

  useEffect(() => {
    const apri = (e: Event) => {
      const chiesto = (e as CustomEvent<{ servizio?: string }>).detail?.servizio;
      setServizio(chiesto || servizioDellaPagina());
      setAperto(true);
    };
    window.addEventListener('pr-richiesta-apri', apri);
    return () => window.removeEventListener('pr-richiesta-apri', apri);
  }, []);

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
    <dialog
      ref={rif}
      className="qr-dlg"
      aria-labelledby="qr-tit"
      /* il click sullo sfondo chiude: il bersaglio e' il <dialog> stesso
         solo quando si colpisce l'area fuori dal riquadro */
      onClick={(e) => {
        if (e.target === rif.current) chiudi();
      }}
      onClose={chiudi}
    >
      <div className="qr-box">
        <div className="qr-testa">
          <div>
            <h2 id="qr-tit">{t.pulsanteRapido}</h2>
            {servizio && <p className="qr-serv">{servizio}</p>}
          </div>
          <button type="button" className="qr-chiudi" onClick={chiudi} aria-label={t.chiudi}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Il modulo e' lo STESSO di tutto il sito, non una copia: se
            domani cambia una regola di validazione o un campo, cambia in
            un posto solo.

            `key` sul servizio: React ricrea il modulo quando il servizio
            cambia, altrimenti chi apre il popup su un secondo tour si
            ritroverebbe il nome del primo, perche' `defaultValue` non
            aggiorna un campo gia' disegnato. */}
        <div className="qr-corpo">
          {aperto && (
            <ModuloRichiesta key={servizio ?? '-'} locale={locale} tour={servizio} />
          )}
        </div>
      </div>
    </dialog>
  );
}

/* IL PULSANTE. Sta a parte dal dialogo perche' ce n'e' piu' d'uno in
 * pagina -- in cima e nella colonna della scheda tour -- mentre il
 * dialogo e' uno solo. */
export function BottoneRichiesta({
  servizio,
  etichetta,
  className = 'qr-apri',
  children,
}: {
  servizio?: string;
  etichetta?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => apriRichiesta(servizio)}
      aria-haspopup="dialog"
    >
      {children ?? (
        <>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 3.6 11a8.4 8.4 0 0 1 8.4-8.4h.5A8.4 8.4 0 0 1 21 11v.5z"
              fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          {etichetta}
        </>
      )}
    </button>
  );
}
