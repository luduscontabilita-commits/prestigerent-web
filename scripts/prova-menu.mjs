/* OGNI VOCE DEL MENU, CLICCATA DAVVERO.
 *
 * 🔴 PERCHE' ESISTE. Il 26/09/2026 il clic su «Foto della gallery» ha
 * smesso di funzionare del tutto: la voce era diventata una `NavLink`
 * CON FIGLI, e quel componente di Mantine chiama `event.preventDefault()`
 * e si limita ad aprire il gruppo. Il collegamento c'era, l'indirizzo
 * era giusto, la pagina rispondeva 200 se la si chiedeva a mano -- e
 * cliccandola non succedeva niente.
 *
 * Nessuno dei controlli che avevo lo vedeva: `prova:pannello` chiede le
 * pagine con `curl` e le trova tutte a posto, `tsc` non ha niente da
 * dire, e in console non compare nessun errore. Un collegamento rotto
 * cosi' si vede SOLO cliccandolo.
 *
 * Qui si entra come admin, si clicca ogni voce della barra laterale e si
 * controlla che l'indirizzo cambi e che la pagina non sia quella di
 * errore. Non e' `next dev`: e' il sito pubblicato.
 *
 *   npm run prova:menu
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITO = process.env.SITO ?? 'https://prestigerent.com';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9360;

const env = {};
for (const riga of readFileSync(join(RADICE, '.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(riga.trim());
  if (m) env[m[1]] = m[2].trim();
}
const cred = readFileSync(join(RADICE, 'CREDENZIALI_PANNELLO.md'), 'utf8');
const mp = /\*\*Password \(tutti e tre\):\*\*\s*`([^`]+)`/.exec(cred);
if (!mp) { console.error('password non trovata in CREDENZIALI_PANNELLO.md'); process.exit(1); }

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const profilo = mkdtempSync(join(tmpdir(), 'chrome-menu-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${profilo}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });

let bers = null;
for (let i = 0; i < 80 && !bers; i++) {
  try { bers = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find((t) => t.type === 'page'); }
  catch { await attendi(200); }
}
if (!bers) { chrome.kill(); console.error('Chrome non ha aperto la porta'); process.exit(1); }

const ws = new WebSocket(bers.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let n = 0; const sosp = new Map(); const asc = []; const guai = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && sosp.has(m.id)) {
    const { ok, ko } = sosp.get(m.id); sosp.delete(m.id);
    m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result);
  } else if (m.method) {
    if (m.method === 'Runtime.exceptionThrown') guai.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    for (const a of asc) a(m);
  }
};
const cdp = (method, params = {}) => new Promise((ok, ko) => {
  const id = ++n; sosp.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
const evento = (method, ms = 45000) => new Promise((ok, ko) => {
  const t = setTimeout(() => ko(new Error('scaduto ' + method)), ms);
  asc.push((m) => { if (m.method === method) { clearTimeout(t); ok(m.params); } }); });

const AIUTI = `
  const vis = (el) => el && el.offsetParent !== null;
  const tutti = (sel) => [...document.querySelectorAll(sel)];
  const scrivi = (el, v) => {
    const proto = HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
`;
const valuta = async (c) => {
  const x = await cdp('Runtime.evaluate', { expression: `(async () => { ${AIUTI}\n${c} })()`, awaitPromise: true, returnByValue: true });
  if (x.exceptionDetails) throw new Error(x.exceptionDetails.exception?.description ?? x.exceptionDetails.text);
  return x.result.value;
};
const vai = async (p, pausa = 2600) => {
  const caricata = evento('Page.loadEventFired');
  await cdp('Page.navigate', { url: SITO + p });
  await caricata;
  await attendi(pausa);
};

await cdp('Page.enable'); await cdp('Runtime.enable');

let rotti = 0;
const d = (t, ok, x = '') => { if (!ok) rotti++;
  console.log('   ' + String(t).padEnd(46) + (ok ? "si'" : '🔴 NO') + (x ? '  ' + x : '')); };

await vai('/admin/entra/');
await valuta(`
  scrivi(document.querySelector('input[type=text]'), 'admin');
  scrivi(document.querySelector('input[type=password]'), ${JSON.stringify(mp[1])});
  await new Promise(r=>setTimeout(r,300));
  document.querySelector('button[type=submit]').click();
  return true;`);
await attendi(5000);
const dove = await valuta('return location.pathname;');
if (dove.includes('entra')) { console.error('🔴 accesso fallito'); ws.close(); chrome.kill(); process.exit(1); }

/* L'elenco delle voci si legge dalla barra, non si scrive qui: cosi' una
   voce aggiunta domani viene provata senza toccare questo file. */
const voci = await valuta(`
  return tutti('.mantine-AppShell-navbar a').filter(vis)
    .map(a => ({ testo: (a.innerText||'').trim(), href: a.getAttribute('href') }))
    .filter(v => v.testo && v.href);
`);
console.log(`\n${SITO} — entrato come admin, ${voci.length} voci nel menu\n`);

for (const v of voci) {
  /* si riparte sempre da /admin/, cosi' ogni voce si prova dallo stesso
     punto e l'ordine non conta */
  await vai('/admin/', 2200);
  guai.length = 0;
  const r = await valuta(`
    const a = tutti('.mantine-AppShell-navbar a').filter(vis)
      .find(x => (x.innerText||'').trim() === ${JSON.stringify(v.testo)});
    if (!a) return { errore: 'voce sparita dal menu' };
    const prima = location.pathname;
    a.click();
    await new Promise(r=>setTimeout(r,3500));
    return {
      prima,
      dopo: location.pathname,
      errore: /A server error occurred|couldn.t load|Application error/i.test(document.body.innerText)
        ? 'pagina di errore' : null,
      titolo: (document.querySelector('h1')||{}).textContent || '',
    };
  `);
  const atteso = (v.href || '').replace(/\/$/, '');
  const arrivato = (r.dopo || '').replace(/\/$/, '');
  d(v.testo, !r.errore && arrivato === atteso,
    r.errore ?? (arrivato === atteso ? r.titolo.slice(0, 32) : `resta su ${r.dopo}, doveva andare a ${v.href}`));
}

ws.close(); chrome.kill();
console.log('\n' + (rotti ? `🔴 ${rotti} voci non portano da nessuna parte` : '✓ ogni voce del menu porta alla sua pagina'));
process.exit(rotti ? 1 : 0);
