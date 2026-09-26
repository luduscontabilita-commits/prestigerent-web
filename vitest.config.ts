import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/* I TEST DELLA LOGICA PURA, E SOLO DI QUELLA.
 *
 * ── PERCHE' NIENTE `jsdom`, NIENTE React, NIENTE e2e ───────────────────
 * La regola 1 del CLAUDE.md dice che in locale non si compila e non si
 * serve niente: un test che apre un browser o monta un componente
 * chiederebbe esattamente quello. E servirebbe a poco: quello che si puo'
 * sbagliare davvero qui sono le REGOLE -- se una gallery si vede, in che
 * ordine escono le foto, come si limita una panoramica -- e sono funzioni
 * che prendono valori e tornano valori.
 *
 * Quindi: `environment: 'node'`, nessuna dipendenza oltre a vitest, e i
 * test girano in un secondo senza toccare il database, la rete o `.next`.
 * Il resto -- redirezioni, permessi, come si vede in pagina -- si verifica
 * con `curl` sull'indirizzo pubblicato, dopo il push.
 *
 * ── PERCHE' vitest@3 E NON L'ULTIMO ───────────────────────────────────
 * vitest 5 vuole `@types/node` 22 o piu', e qui c'e' ^20. Si poteva
 * installare con `--legacy-peer-deps`, ma Vercel installa SENZA quel
 * flag: la build di produzione si sarebbe fermata su un conflitto di
 * dipendenze per colpa di un pacchetto di test. vitest@3 risolve pulito.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    /* Lo stesso `@/` di tsconfig: se no ogni test dovrebbe importare con
       percorsi relativi diversi da quelli del codice che prova. */
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
