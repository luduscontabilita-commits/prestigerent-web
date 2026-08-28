/* IL CLIC CHE HA PORTATO QUI, LETTO DA DOVE LO SALVA IL TRACCIAMENTO.
 *
 * Sta in un file suo perche' lo leggono in due -- il widget di Regiondo e
 * il modulo di richiesta -- e due copie della stessa lettura vorrebbero
 * dire due convenzioni che col tempo divergono. Il giorno in cui cambia
 * la chiave o la scadenza, cambia qui e basta.
 *
 * Chi SCRIVE e' `Tracciamento.tsx`, e solo con il consenso di marketing
 * concesso: se l'utente rifiuta, la voce viene cancellata. Qui non si
 * ricontrolla il consenso -- se il valore c'e', il permesso c'era.
 *
 * ── IL PREFISSO DI UNA LETTERA ────────────────────────────────────────
 * `gclid` e `fbclid` si assomigliano abbastanza da scambiarli, e un
 * identificativo attribuito alla rete sbagliata e' peggio di nessun
 * identificativo: fa contare a Google una conversione di Meta. La
 * convenzione la impone `sorgenteDaSubId` in `conversioni.ts`, che
 * scarta tutto quello che non comincia per `g-` o `f-`.
 */

/** Novanta giorni: la finestra di attribuzione di Google. Un clic piu'
 *  vecchio non verrebbe comunque abbinato, e mandarlo lo stesso
 *  significherebbe solo sporcare il campo. */
const FINESTRA_MS = 90 * 24 * 60 * 60 * 1000;

function leggi(rete: string): string | null {
  try {
    const grezzo = localStorage.getItem('pr_' + rete);
    if (!grezzo) return null;
    const o = JSON.parse(grezzo) as { v?: unknown; t?: unknown };
    if (typeof o?.v !== 'string' || typeof o?.t !== 'number') return null;
    if (Date.now() - o.t > FINESTRA_MS) return null;
    return o.v;
  } catch {
    /* modalita' privata, archiviazione negata, o un valore scritto da una
       versione precedente: si resta senza, che e' com'era prima. */
    return null;
  }
}

/**
 * `g-<gclid>` oppure `f-<fbclid>`, o `undefined` se non c'e' niente.
 * Google vince su Meta perche' e' la rete su cui si spende, e il campo
 * che lo trasporta e' uno solo.
 */
export function identificativoClic(): string | undefined {
  const g = leggi('gclid') ?? leggi('gbraid') ?? leggi('wbraid');
  if (g) return 'g-' + g;
  const f = leggi('fbclid');
  return f ? 'f-' + f : undefined;
}
