'use client';

import { useEffect, useRef, useState } from 'react';
import { testiModulo, type CodiceErrore } from '@/lib/testi';
import { DEFAULT_LOCALE } from '@/lib/locales';

/* IL MODULO DI RICHIESTA RAPIDA.
 *
 * ── PERCHE' TORNA UN MODULO, DOPO CHE ERA STATO TOLTO ───────────────
 * Nel footer ce n'era uno da sette campi ed e' stato tolto per un buon
 * motivo (vedi `Footer.tsx`): in fondo alla pagina non lo compilava
 * nessuno e WhatsApp converte molto meglio. Quel giudizio resta valido e
 * questo modulo non lo contraddice -- infatti sta DOPO i tre riquadri di
 * contatto diretto, non prima.
 *
 * Quello che manca a WhatsApp e' l'altra meta' del pubblico: chi guarda
 * la pagina alle due di notte da Chicago, quando a Firenze non risponde
 * nessuno; chi non usa WhatsApp; e chi ha una domanda lunga -- sei
 * persone, una carrozzina, un rientro entro le sei -- che non ha voglia
 * di digitare in una chat aspettando. Quella persona oggi chiude la
 * pagina e basta, e non lasciamo traccia del fatto che sia mai passata.
 *
 * ── PERCHE' I CAMPI SONO QUASI TUTTI FACOLTATIVI ────────────────────
 * Obbligatori sono due: nome ed email. Tutto il resto aiuta chi
 * risponde, ma nessuno di quei campi vale un abbandono -- una richiesta
 * con solo "siamo in quattro a maggio, si puo' fare?" e' comunque un
 * cliente, e il resto glielo si chiede rispondendo.
 *
 * ── IL TRACCIAMENTO NON SI TOCCA ────────────────────────────────────
 * Niente `gtag`, niente pixel, nessuna etichetta di conversione qui
 * dentro: quella roba vive tutta in `Tracciamento.tsx` e in GTM, ed e'
 * gia' collegata alle campagne. Qui c'e' un solo `dataLayer.push` con un
 * nome parlante, sull'invio riuscito, usando lo stesso meccanismo che il
 * sito ha gia'. Se GTM non e' caricato -- fuori produzione non lo e' --
 * riempie un array e non fa niente: nessun effetto, nessun errore.
 */

type Props = {
  /** la lingua della pagina: decide TUTTO il testo di questo componente */
  locale: string;
  /** il nome del tour da cui si arriva, se si arriva da una scheda tour */
  tour?: string;
};

type Stato = 'fermo' | 'invio' | 'fatto';

export function ModuloRichiesta({ locale, tour }: Props) {
  const t = testiModulo(locale);
  /* L'inglese sta alla radice, le altre lingue sotto il loro prefisso:
     la privacy va aperta nella lingua che si sta leggendo, altrimenti
     l'informativa e' in tedesco e la pagina che spiega no. */
  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);
  const [stato, setStato] = useState<Stato>('fermo');
  const [errore, setErrore] = useState<CodiceErrore | null>(null);
  const [campoRotto, setCampoRotto] = useState<string | null>(null);

  /* 🔴 IL "GRAZIE" DEVE FINIRE SOTTO GLI OCCHI.
   *
   * Su telefono il modulo e' lungo: quando si preme invia si e' in fondo,
   * e il riquadro di conferma nasce IN CIMA al modulo -- cioe' fuori
   * schermo. Chi ha appena scritto vede la pagina che si accorcia e
   * nient'altro: non sa se e' partito, e nel dubbio rimanda. Provato dal
   * vivo su un telefono vero.
   *
   * Si porta il riquadro in vista appena esiste. `block:'center'` e non
   * `'start'` perche' sopra c'e' l'intestazione fissa, che mangerebbe le
   * prime righe. */
  const ilGrazie = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (stato !== 'fatto') return;
    const n = ilGrazie.current;
    if (!n) return;
    try {
      n.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      /* i browser vecchi non conoscono le opzioni: meglio uno scatto
         secco che nessuno scorrimento */
      n.scrollIntoView();
    }
  }, [stato]);

  /* L'ISTANTE IN CUI IL MODULO E' COMPARSO.
   *
   * In un ref e non in uno stato: cambiarlo non deve ridisegnare niente.
   * E si scrive dentro un effetto, non durante il disegno, perche'
   * `Date.now()` e' impura -- React puo' disegnare lo stesso componente
   * due volte e il valore cambierebbe sotto i piedi (in sviluppo la
   * regola `react-hooks/purity` fa fallire la compilazione, e ha
   * ragione). L'effetto parte una volta sola, subito dopo il montaggio:
   * che e' esattamente il momento in cui il modulo compare a chi legge.
   */
  const apertoIl = useRef<number | null>(null);
  useEffect(() => {
    apertoIl.current = Date.now();
  }, []);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stato === 'invio') return;

    const dati = new FormData(e.currentTarget);
    setStato('invio');
    setErrore(null);
    setCampoRotto(null);

    try {
      /* La barra finale non e' un dettaglio: senza, Vercel risponde
         308 e la richiesta va fatta due volte. Con il POST funziona lo
         stesso -- il 308 conserva metodo e corpo, a differenza del 301 --
         ma sono due viaggi invece di uno su ogni singolo invio, e basta
         un browser che tratti male il redirect perche' diventi un modulo
         che non parte. Misurato in produzione il 28/08/2026. */
      const risposta = await fetch('/api/richieste/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dati.get('nome'),
          email: dati.get('email'),
          telefono: dati.get('telefono'),
          tour: dati.get('tour'),
          quando: dati.get('quando'),
          persone: dati.get('persone'),
          messaggio: dati.get('messaggio'),
          /* LA SPUNTA FACOLTATIVA, COME BOOLEANO.
             Una casella non spuntata non compare affatto nel FormData:
             `get` torna null e il confronto da' false, che e' esattamente
             il valore giusto. Il momento in cui e' stata data la risposta
             lo mette il server, non il browser: un consenso datato dal
             client e' un consenso datato da chi lo deve dimostrare. */
          marketing: dati.get('marketing') === 'si',
          /* L'esca. Si manda com'e': se e' piena, decide il server. */
          azienda: dati.get('azienda'),
          /* Se l'effetto non fosse ancora passato -- non succede, ma
             se succedesse -- si manda 0 e il server rifiuta: meglio un
             errore che dice "riprova" che un'esca disinnescata. */
          compilato: apertoIl.current ? Date.now() - apertoIl.current : 0,
          lingua: locale,
          /* Solo il percorso, senza dominio e senza i parametri delle
             campagne: in tabella serve sapere QUALE PAGINA ha prodotto la
             richiesta, non ricostruire la sessione di chi l'ha scritta. */
          pagina: window.location.pathname,
        }),
      });

      const esito = (await risposta.json().catch(() => null)) as
        | { ok: boolean; codice?: CodiceErrore; campo?: string }
        | null;

      if (!risposta.ok || !esito?.ok) {
        setErrore(esito?.codice ?? 'salvataggio');
        setCampoRotto(esito?.campo ?? null);
        setStato('fermo');
        return;
      }

      /* L'unico segnale che esce da qui. Il nome e' parlante apposta:
         chi apre GTM deve capire cos'e' senza chiedere a nessuno. */
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'richiesta_inviata', lingua: locale });
      } catch {
        /* se il tracciamento non c'e', non e' un problema del modulo */
      }

      setStato('fatto');
    } catch {
      /* La connessione caduta, o la rotta irraggiungibile. Non e' colpa
         di un campo: si dice di riprovare, non si accusa l'utente. */
      setErrore('rete');
      setStato('fermo');
    }
  }

  /* LA RISPOSTA PRENDE IL POSTO DEL MODULO.
     Lasciare le caselle piene sotto un "grazie" fa dubitare di aver
     inviato davvero, e c'e' chi preme di nuovo -- e arrivano due
     richieste identiche a chi risponde. */
  if (stato === 'fatto') {
    return (
      <div className="mr-fatto" role="status" ref={ilGrazie}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <div>
          <b>{t.fattoTitolo}</b>
          <p>{t.fattoTesto}</p>
          {/* IL PULSANTE, non il link dentro la frase.
              Chi ha appena scritto e ha fretta non aspetta un'email: qui
              e' il punto in cui e' piu' disposto a scrivere subito, e un
              collegamento in mezzo al testo non si vede. */}
          <a
            className="mr-fatto-wa"
            href="https://wa.me/393338424047"
            target="_blank"
            rel="noopener"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.26-8.25" />
            </svg>
            {t.fattoWhatsapp}
          </a>
        </div>
      </div>
    );
  }

  const rotto = (campo: string) => (campoRotto === campo ? 'mr-rotto' : undefined);

  return (
    <form className="mr" onSubmit={invia} noValidate>
      <div className="mr-riga">
        <label className="mr-campo">
          <span>{t.nome}</span>
          <input
            name="nome" type="text" required autoComplete="name"
            maxLength={80} placeholder={t.nomeEs} className={rotto('nome')}
          />
        </label>

        <label className="mr-campo">
          <span>{t.email}</span>
          <input
            name="email" type="email" required autoComplete="email" inputMode="email"
            maxLength={160} placeholder={t.emailEs} className={rotto('email')}
          />
        </label>
      </div>

      <div className="mr-riga">
        <label className="mr-campo">
          <span>{t.telefono} <i>{t.facoltativo}</i></span>
          <input
            name="telefono" type="tel" autoComplete="tel" inputMode="tel"
            maxLength={40} placeholder={t.telefonoEs} className={rotto('telefono')}
          />
        </label>

        <label className="mr-campo">
          <span>{t.tour} <i>{t.facoltativo}</i></span>
          {/* Prefilato quando si arriva da una scheda tour: chi sta
              guardando il Wine Experience non deve riscriverne il nome, e
              chi risponde vede subito di cosa si parla. Resta modificabile
              perche' meta' delle richieste vere chiedono un'altra cosa. */}
          <input
            name="tour" type="text" maxLength={160}
            defaultValue={tour ?? ''} placeholder={t.tourEs} className={rotto('tour')}
          />
        </label>
      </div>

      <div className="mr-riga">
        <label className="mr-campo">
          <span>{t.quando} <i>{t.facoltativo}</i></span>
          <input name="quando" type="date" className={rotto('quando')} />
        </label>

        <label className="mr-campo">
          <span>{t.persone} <i>{t.facoltativo}</i></span>
          <input
            name="persone" type="number" min={1} max={60} inputMode="numeric"
            placeholder="4" className={rotto('persone')}
          />
        </label>
      </div>

      <label className="mr-campo">
        <span>{t.messaggio} <i>{t.facoltativo}</i></span>
        <textarea
          name="messaggio" rows={4} maxLength={2000}
          placeholder={t.messaggioEs} className={rotto('messaggio')}
        />
      </label>

      {/* L'ESCA.
          Nascosta con la posizione e non con `display:none` o `hidden`:
          i bot piu' comuni saltano i campi dichiaratamente nascosti,
          mentre questo per loro e' un campo normale. `tabIndex={-1}` e
          `aria-hidden` lo tengono fuori dalla tastiera e dai lettori di
          schermo, cosi' non lo incontra nemmeno chi non usa il mouse.
          `autoComplete="off"` evita che un gestore di password lo riempia
          da solo e trasformi un cliente vero in uno spammer. */}
      <div className="mr-esca" aria-hidden="true">
        <label htmlFor="mr-azienda">Company</label>
        <input id="mr-azienda" name="azienda" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {errore && (
        /* `alert` e non `status`: un errore deve interrompere il lettore
           di schermo, non aspettare che finisca la frase in corso. */
        <p className="mr-errore" role="alert">{t.errori[errore]}</p>
      )}

      {/* LA SPUNTA FACOLTATIVA, E PERCHE' NE BASTA UNA.
       *
       * Rispondere a chi chiede un preventivo NON e' consenso: e'
       * esecuzione di misure precontrattuali, art. 6(1)(b) GDPR. Mettere
       * una casella obbligatoria "acconsento a essere ricontattato"
       * sarebbe sbagliato due volte -- fa credere che sia revocabile
       * quando senza quei dati la risposta non si puo' proprio scrivere,
       * e aggiunge un attrito che costa richieste vere.
       *
       * Consenso ne serve per una cosa sola: usare l'indirizzo per
       * offerte e novita' DOPO che la richiesta e' chiusa. Fino a ieri
       * quel consenso non veniva chiesto, e intanto il contatto finiva
       * comunque in un CRM da cui partono campagne.
       *
       * NON pre-selezionata, e non e' un dettaglio: su una casella gia'
       * spuntata la Corte di giustizia (Planet49, C-673/17) e il Garante
       * non lasciano margini -- non e' consenso.
       *
       * Sta SOPRA il pulsante: una scelta che compare dopo il gesto che
       * la chiude non e' una scelta. */}
      <label className="mr-consenso">
        <input name="marketing" type="checkbox" value="si" />
        <span>{t.marketing}</span>
      </label>

      <div className="mr-fondo">
        <button type="submit" className="mr-invia" disabled={stato === 'invio'}>
          {stato === 'invio' ? t.inviando : t.invia}
        </button>
        {/* L'INFORMATIVA BREVE, SEMPRE VISIBILE E SENZA SPUNTA.
         *
         * Il link si apre in una scheda nuova apposta: chi lo clicca ha
         * il modulo mezzo compilato, e portarlo via da questa pagina
         * vorrebbe dire fargli perdere quello che ha scritto. */}
        <p className="mr-privacy">
          {t.informativa}
          <a href={p('/privacy-policy/')} target="_blank" rel="noopener">
            {t.informativaLink}
          </a>
          .
        </p>
      </div>
    </form>
  );
}
