/* IL PANNELLO, PROVATO DA DENTRO.
 *
 * ── 🔴 PERCHE' QUESTO FILE ESISTE ─────────────────────────────────────
 * Il 26/09/2026 tutte e quindici le pagine del pannello hanno risposto
 * 500 a chi era entrato, e la verifica che avevo fatto non se n'era
 * accorta: controllavo le pagine con `curl` SENZA sessione, vedevo il
 * `307 -> /admin/entra/` e scrivevo «chiuso, giusto». Ma cosi' il codice
 * che sta DOPO l'accesso non lo esegue mai nessuno -- ed era li' tutto il
 * guasto. La proprieta' l'ha trovato usando il pannello.
 *
 * Questo script fa l'accesso come farebbe un browser: chiede il token a
 * Supabase, costruisce i cookie nel formato di `@supabase/ssr` e chiede
 * ogni pagina con quelli.
 *
 * NON e' un browser e non esegue JavaScript: prova il rendering sul
 * SERVER, che e' dove nascono gli errori di confine fra Server e Client
 * Component -- quelli che `tsc` non vede e che si manifestano solo in
 * produzione. Per il resto (come si vede, se un pulsante funziona) serve
 * ancora un paio d'occhi.
 *
 * ── COME SI USA ───────────────────────────────────────────────────────
 *     npm run prova:pannello
 *     SITO=https://qualcos-altro.vercel.app npm run prova:pannello
 *
 * Legge la password da CREDENZIALI_PANNELLO.md, che e' gitignorato: qui
 * dentro non c'e' nessun segreto.
 *
 * Esce con 1 se qualcosa e' rotto, cosi' si puo' incatenare a un altro
 * comando senza guardare l'uscita a occhio.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITO = process.env.SITO ?? 'https://prestigerent.com';

function leggiEnv() {
  const env = {};
  for (const riga of readFileSync(join(RADICE, '.env.local'), 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(riga.trim());
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = leggiEnv();
const REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];

const cred = readFileSync(join(RADICE, 'CREDENZIALI_PANNELLO.md'), 'utf8');
const mp = /\*\*Password \(tutti e tre\):\*\*\s*`([^`]+)`/.exec(cred);
if (!mp) {
  console.error('Password non trovata in CREDENZIALI_PANNELLO.md');
  process.exit(1);
}

/** I cookie di sessione, nel formato che `@supabase/ssr` si aspetta:
 *  `sb-<ref>-auth-token` = `base64-` + base64 del JSON della sessione,
 *  spezzato in `.0`, `.1`… se supera la misura massima. */
async function entra(email, password) {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;

  const valore = 'base64-' + Buffer.from(JSON.stringify(await r.json()), 'utf8').toString('base64');
  const nome = `sb-${REF}-auth-token`;
  const MAX = 3180;
  if (valore.length <= MAX) return `${nome}=${valore}`;
  const pezzi = [];
  for (let i = 0, k = 0; i < valore.length; i += MAX, k++) {
    pezzi.push(`${nome}.${k}=${valore.slice(i, i + MAX)}`);
  }
  return pezzi.join('; ');
}

const PAGINE = [
  '/admin/',
  '/admin/gallery/',
  '/admin/gallery/carica/',
  '/admin/gallery/tutte/',
  '/admin/gallery/tutte/?stato=approvata',
  '/admin/gallery/approva/',
  '/admin/gallery/mie/',
  '/admin/gallery/pagine/',
  '/admin/gallery/impostazioni/',
  '/admin/utenti/',
  '/admin/seo/',
  '/admin/foto/',
  '/admin/numeri/',
];

const cookie = await entra('usa@prestigerent.com', mp[1]);
if (!cookie) {
  console.error('🔴 ACCESSO FALLITO: la password in CREDENZIALI_PANNELLO.md non funziona piu\'.');
  process.exit(1);
}
console.log(`${SITO} — entrato come admin\n`);

let rotte = 0;
for (const p of PAGINE) {
  let esito;
  try {
    const res = await fetch(SITO + p, { headers: { cookie }, redirect: 'manual' });
    const html = await res.text();

    if (res.status !== 200) {
      /* Un 307 qui vuol dire che la sessione non e' stata riconosciuta:
         e' un guasto, non una difesa -- in questa prova siamo dentro. */
      esito = `🔴 HTTP ${res.status}${res.headers.get('location') ? ' -> ' + res.headers.get('location') : ''}`;
      rotte++;
    } else if (
      /This page couldn.t load|A server error occurred|Application error|Internal Server Error/i.test(html)
    ) {
      /* Next serve la pagina di errore anche con stato 200: guardare solo
         il codice di stato non basta. */
      esito = '🔴 ERRORE DENTRO LA PAGINA';
      rotte++;
    } else if (html.length < 2000) {
      esito = `🔴 PAGINA QUASI VUOTA (${html.length} byte)`;
      rotte++;
    } else {
      esito = `200  ${String(html.length).padStart(7)} byte`;
    }
  } catch (e) {
    esito = `🔴 ${e.message}`;
    rotte++;
  }
  console.log(`   ${p.padEnd(42)} ${esito}`);
}

console.log(`\n${rotte === 0 ? '✓ tutte le pagine reggono' : `🔴 ${rotte} pagine rotte`}`);
process.exit(rotte === 0 ? 0 : 1);
