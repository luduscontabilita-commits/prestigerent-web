import '@mantine/core/styles.css';
import { Tema } from '@/components/admin/Tema';

/* L'AREA DEI PARTNER: prestigerent.com/partners/.
 *
 * Agenzie, hotel e tour operator che vedono il listino prezzi e la
 * flotta. E' un secondo layout radice accanto a quello del pannello
 * (src/app/admin/layout.tsx), con lo stesso tema Mantine: le pagine del
 * partner usano lo stesso guscio del pannello, ridotto a due voci.
 *
 * Fuori da /admin per decisione della proprieta' (12/10/2026): il
 * partner non deve mai vedere «admin» nell'indirizzo. Fuori dalle lingue
 * perche' e' in inglese e basta (il proxy la esclude, src/proxy.ts).
 *
 * 🔴 NON E' QUI IL CONTROLLO D'ACCESSO, per le stesse ragioni scritte in
 * src/app/admin/layout.tsx: sta in ogni pagina (`soloPartner()`) e in
 * ogni azione. Qui solo il tema e il `noindex`. */
export const metadata = {
  title: 'Prestige Rent · Partners',
  robots: { index: false, follow: false },
};

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <Tema>{children}</Tema>;
}
