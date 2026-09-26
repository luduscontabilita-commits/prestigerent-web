import '@/styles/admin.css';
import '@/styles/admin-telefono.css';

/* Il pannello NON deve mai finire su Google, nemmeno il giorno in cui il
   sito diventa visibile: e' l'unica parte che resta chiusa per sempre.
   Questa riga e' la protezione vera -- `Disallow` in robots.txt e' una
   richiesta cortese, un `noindex` nella pagina e' un'istruzione. */
export const metadata = { robots: { index: false, follow: false } };

/* 🔴 QUI NON C'E' NESSUN CONTROLLO D'ACCESSO, E NON E' UNA DIMENTICANZA.
 * Un layout in Next non protegge da solo: le pagine figlie possono essere
 * servite senza rieseguirlo, e le server action non lo attraversano
 * affatto. Il controllo sta in ogni pagina (`soloGestione()`) e in ogni
 * azione (`chiAgisce()`), entrambe in src/lib/auth.ts.
 *
 * Fino al 26/09/2026 questo file esportava una `guardia()` che nessuno
 * importava: codice morto che dava l'impressione di una difesa che non
 * c'era. Togliendola resta una sola strada, e si vede da dov'e' presa. */
export default async function PannelloLayout({ children }: { children: React.ReactNode }) {
  return <div className="ad">{children}</div>;
}
