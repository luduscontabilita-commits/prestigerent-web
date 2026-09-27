/* «FOTO (n)» IN /admin/gallery/pagine/, PROVATO DAVVERO IN CHROME.
 *
 * Il pannello dell'ordine delle foto vive tutto nel browser: carica le
 * miniature con una server action, trascina con dnd-kit. `prova:pannello`
 * non esegue JavaScript e di tutto questo non vede niente.
 *
 * Qui, da admin: si apre il pannello della pagina con piu' foto, si
 * guarda che le miniature arrivino e si carichino, si TRASCINA la prima
 * foto col mouse e si guarda che l'ordine cambi, si prova «Togli tutte»
 * (deve comparire l'avviso della soglia) e poi «Annulla».
 *
 * 🔴 NON SALVA MAI. Il database e' quello di produzione: la prova tocca
 * solo lo stato del browser, e alla fine «Annulla» riporta tutto com'era.
 *
 * Non e' `next dev` e non e' un build locale: la pagina e' quella
 * pubblicata, come dice la regola 1 del CLAUDE.md. L'accesso e' lo stesso
 * di `prova-foto-in-chrome.mjs`.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITO = process.env.SITO ?? 'https://prestigerent.com';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9336;

const env = {};
for (const riga of readFileSync(join(RADICE, '.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(riga.trim());
  if (m) env[m[1]] = m[2].trim();
}
const REF = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const cred = readFileSync(join(RADICE, 'CREDENZIALI_PANNELLO.md'), 'utf8');
const mp = /\*\*Password \(tutti e tre\):\*\*\s*`([^`]+)`/.exec(cred);
if (!mp) { console.error('password non trovata in CREDENZIALI_PANNELLO.md'); process.exit(1); }

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

const profilo = mkdtempSync(join(tmpdir(), 'chrome-ordine-'));
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

const d = (t, ok, x = '') => { console.log('  ' + t.padEnd(60) + (ok ? 'si\'' : '🔴 NO') + (x ? '  ' + x : '')); return ok; };
let tuttoBene = true;
const dice = (t, ok, x) => { if (!d(t, ok, x)) tuttoBene = false; };

/* La cella del pannello aperto: la riga subito sotto quella del pulsante. */
const CELLA = `document.querySelector('[data-prova=foto]').closest('tr').nextElementSibling`;
const LEGGI = `
  const cella = ${CELLA};
  if (!cella) return null;
  const imm = [...cella.querySelectorAll('.mantine-SimpleGrid-root img')];
  return {
    src: imm.map((i) => i.src),
    testo: cella.innerText,
    stelle: cella.querySelectorAll('[aria-label="Metti la stella"],[aria-label="Togli la stella"]').length,
    maniglie: cella.querySelectorAll('[aria-label^="Trascina"]').length,
    salvaSpento: [...cella.querySelectorAll('button')].find((b) => /Salva ordine/.test(b.textContent))?.disabled,
  };`;

await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 });
const caricata = evento('Page.loadEventFired');
await cdp('Page.navigate', { url: SITO + '/admin/gallery/pagine/' });
await caricata;
await attendi(3000);   // idratazione

console.log('\n═══ /admin/gallery/pagine/ — pulsante «Foto» ═══');
const riga = await valuta(`
  const bott = [...document.querySelectorAll('table tbody tr button')]
    .filter((b) => /^Foto \\(\\d+\\)$/.test(b.textContent.trim()));
  const abilitati = bott.filter((b) => !b.disabled);
  abilitati.sort((a, b) => +b.textContent.match(/\\d+/)[0] - +a.textContent.match(/\\d+/)[0]);
  const b = abilitati[0];
  if (!b) return { pulsanti: bott.length };
  b.setAttribute('data-prova', 'foto');
  const n = +b.textContent.match(/\\d+/)[0];
  const nome = b.closest('tr').querySelector('td')?.innerText.split('\\n')[0] ?? '';
  b.click();
  return { pulsanti: bott.length, n, nome };
`);
dice('ogni riga ha il pulsante «Foto (n)»', riga.pulsanti > 0, riga.pulsanti + ' pulsanti');
if (!riga.n) { console.log('nessuna pagina con foto'); ws.close(); chrome.kill(); process.exit(1); }

let prima = null;
for (let i = 0; i < 40 && !(prima?.src.length); i++) {
  await attendi(250);
  prima = await valuta(LEGGI);
}
dice('il pannello si apre sotto la riga', !!prima, riga.nome);
dice('arrivano tutte le miniature', prima?.src.length === riga.n, `${prima?.src.length} su ${riga.n}`);

const caricate = await valuta(`
  const imm = [...${CELLA}.querySelectorAll('.mantine-SimpleGrid-root img')];
  imm.forEach((i) => { i.loading = 'eager'; });
  for (let t = 0; t < 40 && imm.some((i) => !i.complete); t++) await new Promise((r) => setTimeout(r, 250));
  return imm.filter((i) => i.complete && i.naturalWidth > 0).length;
`);
dice('le miniature si vedono davvero (immagini caricate)', caricate === riga.n, `${caricate} su ${riga.n}`);
dice('una maniglia per foto', prima.maniglie === riga.n);
const criterio = (prima.testo.match(/Ordinamento di questa pagina: [^\n]+/) || [''])[0];
dice('dice il criterio della pagina', !!criterio, criterio);
if (/: Manuale/.test(criterio)) dice('in manuale la stella NON c\'e\'', prima.stelle === 0, prima.stelle + ' stelle');
else dice('fuori dal manuale la stella c\'e\'', prima.stelle === riga.n);
dice('«Salva ordine» spento finche\' non si cambia niente', prima.salvaSpento === true);

/* IL TRASCINAMENTO, col mouse vero di Chrome: maniglia della prima foto
   fino al centro della terza, a piccoli passi come una mano. */
const punti = await valuta(`
  const cella = ${CELLA};
  const m = cella.querySelectorAll('[aria-label^="Trascina"]');
  const card = cella.querySelectorAll('.mantine-SimpleGrid-root > .mantine-Card-root');
  m[0].scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 300));
  const a = m[0].getBoundingClientRect(), b = card[Math.min(2, card.length - 1)].getBoundingClientRect();
  return { x1: a.x + a.width / 2, y1: a.y + a.height / 2, x2: b.x + b.width / 2 + 10, y2: b.y + b.height / 2 };
`);
const mouse = (type, x, y) => cdp('Input.dispatchMouseEvent',
  { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
await mouse('mousePressed', punti.x1, punti.y1);
for (let i = 1; i <= 20; i++) {
  await mouse('mouseMoved', punti.x1 + (punti.x2 - punti.x1) * i / 20, punti.y1 + (punti.y2 - punti.y1) * i / 20);
  await attendi(30);
}
await attendi(200);
await mouse('mouseReleased', punti.x2, punti.y2);
await attendi(700);

const dopo = await valuta(LEGGI);
dice('trascinando, la prima foto cambia posto',
  dopo.src[0] !== prima.src[0] && dopo.src.includes(prima.src[0]),
  'ora e\' la n. ' + (dopo.src.indexOf(prima.src[0]) + 1));
dice('nessuna foto persa o doppia', new Set(dopo.src).size === riga.n);
dice('dopo il trascinamento il criterio e\' «Manuale»', /Ordinamento di questa pagina: Manuale/.test(dopo.testo));
dice('e le stelle non ci sono', dopo.stelle === 0);
dice('«Salva ordine» si accende', dopo.salvaSpento === false);

const tutte = await valuta(`
  const cella = ${CELLA};
  [...cella.querySelectorAll('button')].find((b) => /Togli tutte/.test(b.textContent)).click();
  await new Promise((r) => setTimeout(r, 500));
  return {
    maniglie: cella.querySelectorAll('[aria-label^="Trascina"]').length,
    avviso: /la gallery non\\s+comparir/.test(cella.innerText),
    daTogliere: (cella.innerText.match(/Da togliere da questa pagina \\((\\d+)\\)/) || [])[1],
  };
`);
dice('«Togli tutte» svuota l\'elenco', tutte.maniglie === 0);
dice('e le mette fra quelle da togliere', +tutte.daTogliere === riga.n, tutte.daTogliere);
dice('avvisa che la gallery non comparira\' (soglia)', tutte.avviso);

await valuta(`
  [...${CELLA}.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Annulla').click();
`);
await attendi(500);
const annullato = await valuta(LEGGI);
dice('«Annulla» rimette tutto com\'era', annullato.src.join() === prima.src.join());
dice('e «Salva ordine» torna spento (niente salvato)', annullato.salvaSpento === true);

const veri = guai.filter((g) => g && !/favicon|Failed to load resource.*40[34]/i.test(g));
dice('nessun errore in console', veri.length === 0, veri.slice(0, 2).join(' | ').slice(0, 180));

console.log('\n' + (tuttoBene ? '✓ il pannello «Foto» regge: carica, trascina, toglie, annulla'
                              : '🔴 qualcosa non va: vedi le righe sopra'));
ws.close(); chrome.kill();
process.exit(tuttoBene ? 0 : 1);
