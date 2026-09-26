'use client';

import { MantineProvider, createTheme } from '@mantine/core';

/* IL TEMA DEL PANNELLO.
 *
 * ── 🔴 `forceColorScheme="light"` NON E' PIGRIZIA ─────────────────────
 * Mantine gestisce chiaro/scuro con uno script (`ColorSchemeScript`) che
 * va messo nell'`<head>` del layout RADICE, per evitare il lampo bianco
 * al caricamento. Ma il layout radice e' quello del SITO PUBBLICO: 124
 * pagine con anni di posizionamento, e la grafica collaudata sugli
 * annunci a pagamento. Metterci dentro uno script per il pannello
 * vorrebbe dire far pagare a ogni visitatore una cosa che serve a tre
 * persone.
 *
 * Forzando il tema chiaro, quello script non serve piu': niente lampo,
 * niente modifiche al sito pubblico, e il pannello resta leggibile
 * all'aperto -- che e' dove le guide lo useranno davvero, col sole sullo
 * schermo del telefono.
 *
 * ── PERCHE' IL CSS SI IMPORTA QUI E NON NEL LAYOUT RADICE ────────────
 * Next carica i fogli di stile per rotta: importandolo nel layout del
 * pannello, `@mantine/core/styles.css` arriva SOLO a chi apre /admin.
 * Chi guarda una scheda tour non scarica un byte di Mantine.
 */

const tema = createTheme({
  /* L'arancio del pannello che c'era, per non fare del cambio di libreria
     anche un cambio di identita': chi lo usa deve ritrovare i suoi
     comandi dove li lasciava, dello stesso colore. */
  primaryColor: 'prestige',
  colors: {
    prestige: [
      '#FFF4EC', '#FFE3CE', '#FFC59B', '#FFA564', '#FD8A37',
      '#FD7A1A', '#FD720B', '#E26000', '#C95400', '#AF4700',
    ],
  },
  defaultRadius: 'md',
  fontFamily:
    "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  headings: { fontWeight: '800' },
  components: {
    /* I bersagli da toccare: 44px e' la misura sotto la quale un dito
       sbaglia, e le guide lavorano col telefono in una mano sola. */
    Button: { defaultProps: { size: 'md' } },
  },
});

export function Tema({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={tema} forceColorScheme="light">
      {children}
    </MantineProvider>
  );
}
