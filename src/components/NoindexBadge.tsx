/* Promemoria rosso, visibile su ogni pagina finche' il sito e' in prova.
 *
 * Non e' decorazione: e' l'unica difesa contro i due errori che si dimenticano
 * piu' facilmente perche' non danno nessun sintomo.
 *
 *  1. mandare in produzione lasciando il noindex acceso -> il sito funziona
 *     benissimo e sparisce da Google, e ci si accorge del perche' settimane
 *     dopo guardando il traffico a zero;
 *  2. lasciare il repo pubblico -> il codice del cliente resta leggibile a
 *     chiunque, e nessuna pagina lo segnalera' mai.
 *
 * Ogni riga sparisce da sola quando la sua variabile viene spenta: il
 * promemoria muore quando il lavoro e' fatto, non quando qualcuno se ne
 * ricorda.
 */
export function NoindexBadge() {
  const noindex = process.env.SITE_NOINDEX !== 'false';
  const repoPubblico = process.env.REPO_PUBLIC === 'true';
  if (!noindex && !repoPubblico) return null;

  const code: React.CSSProperties = {
    background: 'rgba(0,0,0,.22)',
    padding: '0 3px',
    borderRadius: 3,
  };

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
        font: '700 11px/1.4 system-ui, sans-serif',
        letterSpacing: '.02em',
        padding: '9px 11px',
        borderRadius: 8,
        maxWidth: 280,
        boxShadow: '0 4px 14px rgba(0,0,0,.28)',
        pointerEvents: 'none',
      }}
    >
      {noindex && (
        <div>
          ⚠️ NOINDEX ATTIVO — invisibile a Google.
          <br />
          Al passaggio: <code style={code}>SITE_NOINDEX=false</code> su Vercel.
        </div>
      )}

      {repoPubblico && (
        <div style={{ marginTop: noindex ? 8 : 0, paddingTop: noindex ? 8 : 0, borderTop: noindex ? '1px solid rgba(255,255,255,.3)' : undefined }}>
          ⚠️ REPO PUBBLICO — reso pubblico solo per collegare Vercel.
          <br />
          Da rimettere privato:{' '}
          <code style={code}>gh repo edit --visibility private</code>, poi{' '}
          <code style={code}>REPO_PUBLIC=false</code>.
        </div>
      )}
    </div>
  );
}
