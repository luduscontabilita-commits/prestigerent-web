import '@mantine/core/styles.css';
import { Tema } from '@/components/admin/Tema';
import { linguaPartner } from '@/lib/partners-lingua';

/* L'AREA DEI PARTNER: prestigerent.com/partners/.
 *
 * Agenzie, hotel e tour operator che vedono il listino prezzi e la
 * flotta. E' un secondo layout radice accanto a quello del pannello
 * (src/app/admin/layout.tsx), con lo stesso tema Mantine: le pagine del
 * partner usano lo stesso guscio del pannello, ridotto a due voci.
 *
 * Fuori da /admin per decisione della proprieta' (12/10/2026): il
 * partner non deve mai vedere «admin» nell'indirizzo. Fuori dalle lingue
 * del sito: l'inglese o l'italiano li sceglie il selettore EN/IT
 * (src/lib/partners-lingua.ts), che decide anche il `lang` qui sotto.
 *
 * 🔴 `<html>` E `<body>` SERVONO: senza, Next non scrive `data-dpl-id` e
 * ricarica la pagina per intero a ogni aggiornamento. La storia intera
 * sta in src/app/admin/layout.tsx.
 *
 * 🔴 NON E' QUI IL CONTROLLO D'ACCESSO, per le stesse ragioni scritte in
 * src/app/admin/layout.tsx: sta in ogni pagina (`soloPartner()`) e in
 * ogni azione. Qui solo il tema, la lingua e il `noindex`. */
export const metadata = {
  title: 'Prestige Rent · Partners',
  robots: { index: false, follow: false },
};

export default async function PartnersLayout({ children }: { children: React.ReactNode }) {
  const lingua = await linguaPartner();
  return (
    <html lang={lingua} data-mantine-color-scheme="light" suppressHydrationWarning>
      <body>
        <Tema>{children}</Tema>
      </body>
    </html>
  );
}
