/* Promemoria rosso, visibile su ogni pagina finche' il sito e' nascosto a Google.
 *
 * Non e' decorazione: e' l'unica difesa contro l'errore piu' costoso di tutta
 * la migrazione -- mandare il sito in produzione lasciando il noindex acceso.
 * Succederebbe che il sito nuovo funziona benissimo e sparisce da Google,
 * e ci si accorge del perche' settimane dopo, guardando il traffico a zero.
 *
 * Sparisce da solo quando SITE_NOINDEX=false: il promemoria si spegne quando
 * il lavoro e' fatto, non quando qualcuno si ricorda di toglierlo.
 */
export function NoindexBadge() {
  if (process.env.SITE_NOINDEX === 'false') return null;

  return (
    <div
      dir="ltr"
      style={{
        position: 'fixed',
        insetInlineEnd: 12,
        bottom: 12,
        zIndex: 2147483647,
        background: '#C8102E',
        color: '#fff',
        font: '700 11px/1.35 system-ui, sans-serif',
        letterSpacing: '.02em',
        padding: '8px 11px',
        borderRadius: 8,
        maxWidth: 260,
        boxShadow: '0 4px 14px rgba(0,0,0,.28)',
        pointerEvents: 'none',
      }}
    >
      ⚠️ NOINDEX ATTIVO — invisibile a Google.
      <br />
      Il giorno del passaggio: <code style={{ background: 'rgba(0,0,0,.22)', padding: '0 3px' }}>
        SITE_NOINDEX=false
      </code>{' '}
      su Vercel, poi ripubblica.
    </div>
  );
}
