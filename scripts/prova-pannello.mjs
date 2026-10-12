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
  /* «Partners» e «Listino prezzi» (dal 12/10/2026 tutto sotto
     /admin/partners/) */
  '/admin/partners/',
  '/admin/partners/attivi/',
  '/admin/partners/listino/',
  '/admin/partners/sincronizza/',
  '/admin/partners/flotta/',
  '/admin/partners/qrcode/',
  '/admin/partners/pdf/',
  /* l'area dei partner vista dall'admin: deve aprirsi anche a lui */
  '/partners/price-list/',
  '/partners/fleet/',
];

/* Il partner (ruolo `listino`) non deve poter aprire NESSUNA pagina del
   pannello: per lui ogni /admin/... risponde con un rimando, mai 200. */
const VIETATE_AL_PARTNER = PAGINE.filter((p) => p.startsWith('/admin/'));

/* Gli indirizzi vecchi (fino al 12/10/2026), gia' scritti in email
   partite: devono rimandare a quelli nuovi, non dare 404. */
const SPOSTATE = [
  ['/admin/listino/', '/admin/partners/listino/'],
  ['/admin/listino/sincronizza/', '/admin/partners/sincronizza/'],
  ['/admin/listino/flotta/', '/admin/partners/flotta/'],
  ['/admin/listino/richieste/', '/admin/partners/'],
  ['/admin/listino/login/', '/partners/'],
  ['/admin/listino/register/', '/partners/'],
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

/* ── IL RECINTO DEL PARTNER ─────────────────────────────────────────
   Solo se ci sono le credenziali di un utente `listino` di prova
   (PROVA_PARTNER_EMAIL e PROVA_PARTNER_PASSWORD nell'ambiente o in
   .env.local). Entra come lui e controlla le due cose che contano: il
   listino e la flotta si aprono, TUTTO il resto lo rimanda indietro. */
const pEmail = process.env.PROVA_PARTNER_EMAIL ?? env.PROVA_PARTNER_EMAIL;
const pPass = process.env.PROVA_PARTNER_PASSWORD ?? env.PROVA_PARTNER_PASSWORD;
if (pEmail && pPass) {
  const cp = await entra(pEmail, pPass);
  if (!cp) {
    console.log('\n🔴 ACCESSO DEL PARTNER DI PROVA FALLITO');
    rotte++;
  } else {
    console.log(`\n${SITO} — entrato come partner del listino (${pEmail})\n`);
    for (const p of ['/partners/price-list/', '/partners/fleet/']) {
      const res = await fetch(SITO + p, { headers: { cookie: cp }, redirect: 'manual' });
      const html = await res.text();
      const bene = res.status === 200 && !/This page couldn.t load|Application error/i.test(html) && html.length > 2000;
      if (!bene) rotte++;
      console.log(`   ${p.padEnd(42)} ${bene ? '200  si apre' : `🔴 HTTP ${res.status}`}`);
    }
    for (const p of VIETATE_AL_PARTNER) {
      const res = await fetch(SITO + p, { headers: { cookie: cp }, redirect: 'manual' });
      const dove = res.headers.get('location') ?? '';
      const chiusa = res.status >= 300 && res.status < 400;
      if (!chiusa) rotte++;
      console.log(`   ${p.padEnd(42)} ${chiusa ? `${res.status} -> ${dove}` : `🔴 HTTP ${res.status}: IL PARTNER LA VEDE`}`);
    }
  }
} else {
  console.log('\n(nessun partner di prova: PROVA_PARTNER_EMAIL/PROVA_PARTNER_PASSWORD non impostate, recinto non provato)');
}

/* ── SENZA SESSIONE: l'ingresso dei partner e gli indirizzi vecchi ──── */
console.log(`\n${SITO} — senza sessione\n`);
{
  const res = await fetch(SITO + '/partners/', { redirect: 'manual' });
  const html = await res.text();
  const bene = res.status === 200 && /Sign in/.test(html) && /Request access/.test(html);
  if (!bene) rotte++;
  console.log(`   ${'/partners/'.padEnd(42)} ${bene ? '200  Sign in + Request access' : `🔴 HTTP ${res.status}`}`);
  for (const p of ['/partners/price-list/', '/partners/fleet/']) {
    const r = await fetch(SITO + p, { redirect: 'manual' });
    const dove = r.headers.get('location') ?? '';
    const chiusa = r.status >= 300 && r.status < 400 && dove.includes('/partners/');
    if (!chiusa) rotte++;
    console.log(`   ${p.padEnd(42)} ${chiusa ? `${r.status} -> ${dove}` : `🔴 HTTP ${r.status}: SI VEDE SENZA ACCESSO`}`);
  }
}
for (const [vecchio, nuovo] of SPOSTATE) {
  const res = await fetch(SITO + vecchio, { headers: { cookie }, redirect: 'manual' });
  const dove = res.headers.get('location') ?? '';
  const bene = res.status >= 300 && res.status < 400 && dove.endsWith(nuovo);
  if (!bene) rotte++;
  console.log(`   ${vecchio.padEnd(42)} ${bene ? `${res.status} -> ${dove}` : `🔴 HTTP ${res.status} ${dove}`}`);
}

console.log(`\n${rotte === 0 ? '✓ tutte le pagine reggono' : `🔴 ${rotte} pagine rotte`}`);
process.exit(rotte === 0 ? 0 : 1);
