import '@mantine/core/styles.css';
/* 🔴 I VECCHI FOGLI RESTANO, E L'ORDINE CONTA.
 *
 * Il guscio e le pagine sono passati a Mantine, ma i componenti interni
 * (il caricatore, la coda, le tabelle SEO e numeri, il riordino foto)
 * usano ancora le classi di questi file. Toglierli adesso li lascerebbe
 * SENZA STILE -- non "meno belli": senza. Restano finche' ogni componente
 * non e' convertito, e allora spariranno da soli.
 *
 * Vengono DOPO quello di Mantine di proposito: a parita' di specificita'
 * vince chi e' dichiarato per ultimo, quindi le regole di queste classi
 * non vengono scavalcate dal foglio della libreria. */
import '@/styles/admin.css';
import '@/styles/admin-telefono.css';
import '@/styles/gallery-admin.css';
import { Tema } from '@/components/admin/Tema';

/* Il pannello NON deve mai finire su Google, nemmeno il giorno in cui il
   sito diventa visibile: e' l'unica parte che resta chiusa per sempre.
   Questa riga e' la protezione vera -- `Disallow` in robots.txt e' una
   richiesta cortese, un `noindex` nella pagina e' un'istruzione. */
export const metadata = { robots: { index: false, follow: false } };

/* 🔴 QUI NON C'E' NESSUN CONTROLLO D'ACCESSO, E NON E' UNA DIMENTICANZA.
 * Un layout in Next non protegge da solo: le pagine figlie possono essere
 * servite senza rieseguirlo, e le server action non lo attraversano
 * affatto. Il controllo sta in ogni pagina (`soloGestione()`,
 * `soloCaricatori()`) e in ogni azione (`chiAgisce()`), entrambe in
 * src/lib/auth.ts.
 *
 * Fino al 26/09/2026 questo file esportava una `guardia()` che nessuno
 * importava: codice morto che dava l'impressione di una difesa che non
 * c'era. Togliendola resta una sola strada, e si vede da dov'e' presa.
 *
 * 🔴 E NON C'E' NEMMENO IL GUSCIO (barra laterale, intestazione, uscita).
 * La schermata di accesso e' figlia di questo layout: una barra laterale
 * qui comparirebbe anche sopra al modulo di accesso, e se chiedesse chi
 * sei prima di disegnarsi, quella schermata rimanderebbe a se stessa.
 * Il guscio lo includono le PAGINE -- vedi `Guscio` in
 * src/components/admin/.
 *
 * Quello che il layout fa, e che nessun altro puo' fare al posto suo, e'
 * caricare il tema: il CSS di Mantine arriva SOLO a chi apre /admin,
 * perche' Next carica i fogli di stile per rotta. */
export default async function PannelloLayout({ children }: { children: React.ReactNode }) {
  return <Tema>{children}</Tema>;
}
