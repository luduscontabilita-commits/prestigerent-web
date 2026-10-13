/* IL PIXEL DI OPENAI (annunci su ChatGPT) — SOLO GLI EVENTI.
 *
 * Il pixel lo carica e lo governa `Consenso.tsx`, non questo file: li'
 * c'e' l'unico punto della pagina in cui l'ordine e' garantito, ed e'
 * un ordine che conta. `oaiq('consent', false)` deve arrivare PRIMA di
 * `oaiq('init')`, altrimenti il pixel parte col consenso concesso (e'
 * il suo default) e scrive `__obref` sul dispositivo di chi non ha
 * ancora risposto al banner. Qui si mandano solo i fatti.
 *
 * ── PERCHE' NON STA IN GTM COME META ────────────────────────────────
 * Per il pixel di OpenAI GTM non ha un modello pronto, e il consenso va
 * dato nella sua lingua (`oaiq('consent', ...)`), come per Meta: tanto
 * vale tenerlo accanto al banner che quel consenso lo decide, invece di
 * avere una terza copia della regola dentro un tag HTML personalizzato.
 *
 * ── SE IL PIXEL NON C'E', NON SUCCEDE NIENTE ────────────────────────
 * Fuori da prestigerent.com lo snippet non si accende (stessa guardia di
 * GTM), un blocco pubblicita' puo' toglierlo: `misura()` allora esce in
 * silenzio. Una misura persa non deve mai rompere un modulo o un clic.
 *
 * E non serve ricontrollare il consenso qui: col consenso a `false` il
 * pixel tiene la chiamata e non la spedisce (e non la ripete dopo -- gli
 * eventi bloccati non vengono recuperati). E' lui il cancello, non noi.
 *
 * `page_viewed` non lo manda nessuno: il pixel non lo fa da solo e qui
 * non lo si aggiunge. Interessano i contatti, non le visite. */

type Oaiq = (...args: unknown[]) => void;

declare global {
  interface Window {
    oaiq?: Oaiq;
  }
}

/** I gesti di contatto, con i nomi che il pixel accetta: minuscole,
 *  cifre, `_` e `-`. Sono gli stessi tre gesti di `EVENTI` in
 *  `eventi.ts`, con il nome che si legge nel pannello di OpenAI. */
export type GestoContatto = 'whatsapp_clicked' | 'phone_clicked' | 'email_clicked';

function chiama(...args: unknown[]) {
  try {
    if (typeof window === 'undefined' || typeof window.oaiq !== 'function') return;
    window.oaiq(...args);
  } catch {
    /* il pixel e' codice di altri: un suo errore resta suo */
  }
}

/** La richiesta e' arrivata davvero al server: si chiama solo dopo la
 *  risposta positiva, mai sul semplice clic di "Invia". */
export function misuraRichiesta() {
  chiama('measure', 'lead_created', { type: 'customer_action' });
}

/** Un clic su WhatsApp, telefono o email. */
export function misuraContatto(gesto: GestoContatto) {
  chiama('measure', 'custom', { type: 'custom' }, { custom_event_name: gesto });
}
