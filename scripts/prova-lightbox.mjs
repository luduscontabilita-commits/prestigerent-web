/* QUALE REGOLA FA ENTRARE DAVVERO LA FOTO NELLO SCHERMO.
 *
 * La misura ha detto che `max-height: 100%` sull'immagine non limita
 * niente: la percentuale non si risolve. Invece di dedurre il perche' e
 * riscrivere il CSS al buio -- l'ho gia' fatto una volta e non ha
 * funzionato -- qui si iniettano le varianti nella pagina PUBBLICATA e
 * si misura il rettangolo dell'immagine per ognuna.
 *
 * Passa solo la variante che, su entrambi gli schermi:
 *   - tiene l'immagine dentro la finestra in larghezza e in altezza;
 *   - non la gonfia oltre la sua misura naturale (altrimenti e' sfocata);
 *   - non la ritaglia (le proporzioni devono restare quelle vere).
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9334;
const profilo = mkdtempSync(join(tmpdir(), 'chrome-var-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${profilo}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
  { stdio: 'ignore' });

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
let bersaglio = null;
for (let i = 0; i < 50 && !bersaglio; i++) {
  try { bersaglio = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find((t) => t.type === 'page'); }
  catch { await attendi(200); }
}
const ws = new WebSocket(bersaglio.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let n = 0; const sosp = new Map(); const asc = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data);
  if (m.id && sosp.has(m.id)) { const { ok, ko } = sosp.get(m.id); sosp.delete(m.id);
    m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result); }
  else if (m.method) for (const a of asc) a(m); };
const cdp = (method, params = {}) => new Promise((ok, ko) => { const id = ++n; sosp.set(id, { ok, ko });
  ws.send(JSON.stringify({ id, method, params })); });
const evento = (method, ms = 30000) => new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('scaduto ' + method)), ms);
  asc.push((m) => { if (m.method === method) { clearTimeout(t); ok(m.params); } }); });
const valuta = async (c) => { const r = await cdp('Runtime.evaluate',
  { expression: `(async () => { ${c} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception)); return r.result.value; };

await cdp('Page.enable'); await cdp('Runtime.enable');

/* ── LE VARIANTI ─────────────────────────────────────────────────────
   Ognuna e' un foglio di stile che vince su quello del sito. */
const VARIANTI = {
  'come sta ora (grid + max-height:100%)': '',

  'A. la cornice diventa flex': `
    .glight-foto { display:flex !important; align-items:center; justify-content:center; }
    .glight-foto img { max-width:100% !important; max-height:100% !important; }`,

  'B. altezza esplicita sulla cornice': `
    .glight-foto { height:100% !important; }
    .glight-foto img { max-width:100% !important; max-height:100% !important; }`,

  'C. immagine che riempie e si adatta (object-fit)': `
    .glight-foto { position:relative !important; display:block !important; padding:0 !important; }
    .glight-foto img { position:absolute !important; inset:12px !important;
      width:calc(100% - 24px) !important; height:calc(100% - 24px) !important;
      max-width:none !important; max-height:none !important; object-fit:contain !important; }`,

  'D. misure in unita di finestra, non percentuali': `
    .glight-foto img { max-width:calc(100vw - 24px) !important;
      max-height:calc(100dvh - 24px - 45px) !important; }`,

  'E. flex + min-height:0 sulla cornice': `
    .glight-box { grid-template-rows:minmax(0,1fr) auto !important; }
    .glight-foto { display:flex !important; align-items:center; justify-content:center;
      min-height:0 !important; height:auto !important; }
    .glight-foto img { max-width:100% !important; max-height:100% !important;
      width:auto !important; height:auto !important; }`,
};

const MISURA = `
  const b = document.querySelector('.gslide-apri');
  if (!b) return { errore: 'niente gallery qui' };
  const d0 = document.querySelector('dialog.glight');
  if (d0 && d0.open) d0.close();
  b.click();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const img = document.querySelector('.glight-foto img');
  if (!img) return { errore: 'visore non aperto' };
  if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 6000); });
  await new Promise(r => requestAnimationFrame(r));
  const r = img.getBoundingClientRect();
  return { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height),
           nw: img.naturalWidth, nh: img.naturalHeight, W: innerWidth, H: innerHeight };
`;

const SCHERMI = [
  { nome: 'desktop', width: 1920, height: 1080, mobile: false, dpr: 1 },
  { nome: 'telefono', width: 390, height: 844, mobile: true, dpr: 3 },
];

for (const [nome, css] of Object.entries(VARIANTI)) {
  console.log('\n═══', nome, '═══');
  for (const s of SCHERMI) {
    await cdp('Emulation.setDeviceMetricsOverride',
      { width: s.width, height: s.height, deviceScaleFactor: s.dpr, mobile: s.mobile });
    const caricata = evento('Page.loadEventFired');
    await cdp('Page.navigate', { url: 'https://prestigerent.com/' });
    await caricata;
    await attendi(2200);
    if (css) await valuta(`const e=document.createElement('style'); e.textContent=${JSON.stringify(css)};
                           document.head.appendChild(e); await new Promise(r=>requestAnimationFrame(r));`);
    const m = await valuta(MISURA);
    if (m.errore) { console.log(` ${s.nome.padEnd(9)} ${m.errore}`); continue; }

    const dentro = m.x >= -1 && m.y >= -1 && m.x + m.w <= m.W + 1 && m.y + m.h <= m.H + 1;
    /* gonfiata: piu' grande del file scaricato di oltre il 2% */
    const gonfia = m.w > m.nw * 1.02 || m.h > m.nh * 1.02;
    /* ritagliata: le proporzioni mostrate non sono quelle del file */
    const rApp = m.w / m.h, rVer = m.nw / m.nh;
    const storta = Math.abs(rApp - rVer) / rVer > 0.02;

    console.log(` ${s.nome.padEnd(9)} ${String(m.w).padStart(4)}x${String(m.h).padStart(4)}` +
      ` a (${String(m.x).padStart(4)},${String(m.y).padStart(4)})  finestra ${m.W}x${m.H}` +
      `  file ${m.nw}x${m.nh}` +
      `  ${dentro ? 'dentro' : '🔴 FUORI'}${gonfia ? ' 🔴 gonfiata' : ''}${storta ? ' 🔴 deformata' : ''}`);
  }
}

ws.close(); chrome.kill();
