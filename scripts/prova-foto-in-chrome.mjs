/* /admin/foto/ APERTA DAVVERO, DA ADMIN, DENTRO CHROME.
 *
 * `prova:pannello` dice che la pagina risponde 200 e che nel corpo non
 * c'e' il testo dell'errore. Non basta per una funzione che vive nel
 * browser: un componente client che va in errore all'idratazione lascia
 * l'HTML del server intatto -- 200, nessun testo d'errore -- e il
 * pulsante non fa niente quando ci si clicca sopra.
 *
 * Qui si apre la pagina in Chrome con i cookie di un admin vero, si
 * guarda che il pulsante ci sia su ogni riga, ci si clicca, e si guarda
 * che il riquadro si apra con dentro i suoi comandi. Gli errori della
 * console si raccolgono tutti: un `Uncaught` a idratazione fallita si
 * vede qui e non nei 200.
 *
 * Non e' `next dev` e non e' un build locale: la pagina e' quella
 * pubblicata, come dice la regola 1 del CLAUDE.md.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITO = process.env.SITO ?? 'https://prestigerent.com';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9335;

const env = {};
for (const riga of readFileSync(join(RADICE, '.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(riga.trim());
  if (m) env[m[1]] = m[2].trim();
}
const REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const cred = readFileSync(join(RADICE, 'CREDENZIALI_PANNELLO.md'), 'utf8');
const mp = /\*\*Password \(tutti e tre\):\*\*\s*`([^`]+)`/.exec(cred);
if (!mp) { console.error('password non trovata in CREDENZIALI_PANNELLO.md'); process.exit(1); }

/* Gli stessi cookie di `prova-pannello.mjs`: `base64-` + base64 del JSON
   della sessione, spezzato a 3180 caratteri come fa `@supabase/ssr`. */
const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'usa@prestigerent.com', password: mp[1] }),
});
if (!r.ok) { console.error('accesso rifiutato:', await r.text()); process.exit(1); }
const valore = 'base64-' + Buffer.from(JSON.stringify(await r.json()), 'utf8').toString('base64');
const MAX = 3180;
const pezzi = [];
for (let i = 0; i < valore.length; i += MAX) pezzi.push(valore.slice(i, i + MAX));
const biscotti = pezzi.length === 1
  ? [{ name: `sb-${REF}-auth-token`, value: valore }]
  : pezzi.map((p, i) => ({ name: `sb-${REF}-auth-token.${i}`, value: p }));

const profilo = mkdtempSync(join(tmpdir(), 'chrome-foto-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${profilo}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
  { stdio: 'ignore' });
const attendi = (ms) => new Promise((x) => setTimeout(x, ms));

let bersaglio = null;
for (let i = 0; i < 60 && !bersaglio; i++) {
  try { bersaglio = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find((t) => t.type === 'page'); }
  catch { await attendi(200); }
}
if (!bersaglio) { chrome.kill(); console.error('Chrome non ha aperto la porta'); process.exit(1); }

const ws = new WebSocket(bersaglio.webSocketDebuggerUrl);
await new Promise((x) => { ws.onopen = x; });
let n = 0; const sosp = new Map(); const asc = [];
const guai = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && sosp.has(m.id)) {
    const { ok, ko } = sosp.get(m.id); sosp.delete(m.id);
    m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result);
  } else if (m.method) {
    if (m.method === 'Runtime.exceptionThrown') {
      guai.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      guai.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    for (const a of asc) a(m);
  }
};
const cdp = (method, params = {}) => new Promise((ok, ko) => {
  const id = ++n; sosp.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
const evento = (method, ms = 45000) => new Promise((ok, ko) => {
  const t = setTimeout(() => ko(new Error('scaduto ' + method)), ms);
  asc.push((m) => { if (m.method === method) { clearTimeout(t); ok(m.params); } }); });
const valuta = async (c) => {
  const x = await cdp('Runtime.evaluate', { expression: `(async () => { ${c} })()`, awaitPromise: true, returnByValue: true });
  if (x.exceptionDetails) throw new Error(JSON.stringify(x.exceptionDetails.exception));
  return x.result.value; };

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Network.enable');
const dominio = new URL(SITO).hostname;
for (const b of biscotti) {
  await cdp('Network.setCookie', { name: b.name, value: b.value, domain: dominio, path: '/', secure: true });
}

const d = (t, ok, x = '') => { console.log('  ' + t.padEnd(56) + (ok ? "si'" : '🔴 NO') + (x ? '  ' + x : '')); return ok; };
let tuttoBene = true;
const dice = (t, ok, x) => { if (!d(t, ok, x)) tuttoBene = false; };

for (const schermo of [{ nome: 'desktop', width: 1440, height: 900, mobile: false },
                       { nome: 'telefono', width: 390, height: 844, mobile: true }]) {
  console.log(`\n═══ /admin/foto/ — ${schermo.nome} ${schermo.width}x${schermo.height} ═══`);
  guai.length = 0;
  await cdp('Emulation.setDeviceMetricsOverride', { ...schermo, deviceScaleFactor: 1 });
  const caricata = evento('Page.loadEventFired');
  await cdp('Page.navigate', { url: SITO + '/admin/foto/' });
  await caricata;
  await attendi(3000);   // idratazione

  const stato = await valuta(`
    return {
      indirizzo: location.pathname,
      titolo: (document.querySelector('h1')||{}).textContent || '',
      righe: document.querySelectorAll('table tbody tr').length,
      pulsanti: document.querySelectorAll('table tbody tr button').length,
      errore: /A server error occurred|couldn.t load|Application error/i.test(document.body.innerText),
    };
  `);

  dice('la pagina si apre da admin (non rimanda al login)', stato.indirizzo.startsWith('/admin/foto'), stato.indirizzo);
  dice('non e\u0027 la pagina di errore', !stato.errore);
  dice('la tabella dei tour c\u0027e\u0027', stato.righe > 0, stato.righe + ' righe');
  dice('ogni riga ha il suo pulsante di caricamento', stato.righe > 0 && stato.pulsanti >= stato.righe,
       stato.pulsanti + ' pulsanti su ' + stato.righe + ' righe');

  /* Il clic: e' qui che si vede se React si e' idratato davvero. */
  const dopo = await valuta(`
    const b = document.querySelector('table tbody tr button');
    if (!b) return { errore: 'nessun pulsante' };
    b.click();
    await new Promise(r => setTimeout(r, 900));
    const m = document.querySelector('.mantine-Modal-content, [role="dialog"]');
    if (!m) return { aperto: false };
    const t = m.innerText;
    return {
      aperto: true,
      titolo: (m.querySelector('.mantine-Modal-title')||{}).textContent || '',
      scegli: /Scegli le foto/i.test(t),
      carica: /Carica/i.test(t),
      avvisoGps: /GPS/i.test(t),
      avvisoFondo: /in fondo/i.test(t),
      inputFile: !!m.querySelector('input[type=file]'),
      larghezza: Math.round(m.getBoundingClientRect().width),
      dentro: m.getBoundingClientRect().right <= innerWidth + 1 && m.getBoundingClientRect().left >= -1,
    };
  `);

  dice('il clic apre il riquadro (React si e\u0027 idratato)', dopo.aperto === true, dopo.errore ?? '');
  if (dopo.aperto) {
    dice('il riquadro nomina il tour', /—/.test(dopo.titolo), dopo.titolo.slice(0, 60));
    dice('c\u0027e\u0027 il selettore dei file', dopo.inputFile && dopo.scegli);
    dice('c\u0027e\u0027 il pulsante per caricare', dopo.carica);
    dice('avvisa che l\u0027EXIF/GPS viene tolto', dopo.avvisoGps);
    dice('avvisa che le foto vanno in fondo', dopo.avvisoFondo);
    dice('il riquadro sta dentro lo schermo', dopo.dentro, dopo.larghezza + 'px su ' + schermo.width);
  }

  const veri = guai.filter((g) => g && !/favicon|Failed to load resource.*40[34]/i.test(g));
  dice('nessun errore in console', veri.length === 0, veri.slice(0, 2).join(' | ').slice(0, 180));
}

console.log('\n' + (tuttoBene ? '✓ /admin/foto/ regge da admin, su desktop e su telefono'
                              : '🔴 qualcosa non va: vedi le righe sopra'));
ws.close(); chrome.kill();
process.exit(tuttoBene ? 0 : 1);
