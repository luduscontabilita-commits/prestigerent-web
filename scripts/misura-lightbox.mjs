/* MISURA DAVVERO L'IMMAGINE APERTA, DENTRO CHROME.
 *
 * Non si prova un problema di impaginazione leggendo il CSS servito: il
 * CSS servito l'ho gia' letto e diceva la cosa giusta, eppure la foto
 * esce tagliata. L'unica risposta che vale e' il rettangolo che Chrome
 * assegna all'immagine, confrontato con la finestra.
 *
 * Chrome si pilota col suo protocollo di debug (CDP) su una porta; Node
 * 24 ha un client WebSocket dentro, quindi non serve installare niente.
 * Non e' `next dev` e non e' un build locale: la pagina che si apre e'
 * quella PUBBLICATA, come vuole la regola 1 del CLAUDE.md.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9333;
const INDIRIZZO = process.argv[2] ?? 'https://prestigerent.com/';
const CARTELLA = process.argv[3] ?? '.';

const profilo = mkdtempSync(join(tmpdir(), 'chrome-prova-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORTA}`,
  `--user-data-dir=${profilo}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--hide-scrollbars=false',   // la barra di scorrimento fa parte del problema
  'about:blank',
], { stdio: 'ignore' });

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

/* Chrome ci mette un attimo ad aprire la porta. */
let bersaglio = null;
for (let i = 0; i < 50 && !bersaglio; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
    bersaglio = l.find((t) => t.type === 'page');
  } catch { await attendi(200); }
}
if (!bersaglio) { chrome.kill(); throw new Error('Chrome non ha aperto la porta di debug'); }

const ws = new WebSocket(bersaglio.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });

let n = 0;
const inSospeso = new Map();
const ascoltatori = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && inSospeso.has(m.id)) {
    const { ok, ko } = inSospeso.get(m.id);
    inSospeso.delete(m.id);
    m.error ? ko(new Error(JSON.stringify(m.error))) : ok(m.result);
  } else if (m.method) {
    for (const a of ascoltatori) a(m);
  }
};
const cdp = (method, params = {}) =>
  new Promise((ok, ko) => { const id = ++n; inSospeso.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
const aspettaEvento = (method, ms = 30000) =>
  new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('scaduto: ' + method)), ms);
    ascoltatori.push(function a(m) { if (m.method === method) { clearTimeout(t); ok(m.params); } });
  });

const valuta = async (codice) => {
  const r = await cdp('Runtime.evaluate', {
    expression: `(async () => { ${codice} })()`,
    awaitPromise: true, returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception));
  return r.result.value;
};

await cdp('Page.enable');
await cdp('Runtime.enable');

const SCHERMI = [
  { nome: 'desktop', width: 1920, height: 1080, mobile: false, dpr: 1 },
  { nome: 'telefono', width: 390, height: 844, mobile: true, dpr: 3 },
];

const MISURA = `
  const b = document.querySelector('.gslide-apri');
  if (!b) return { errore: 'nessuna foto nella striscia: la gallery non e\\' su questa pagina' };
  b.click();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const d = document.querySelector('dialog.glight');
  const img = document.querySelector('.glight-foto img');
  if (!d || !img) return { errore: 'il visore non si e\\' aperto' };
  if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; setTimeout(r, 6000); });
  await new Promise(r => requestAnimationFrame(r));
  const q = (el) => { const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cs = (el, ...p) => { const s = getComputedStyle(el); const o = {}; for (const k of p) o[k] = s[k]; return o; };
  return {
    finestra: { w: innerWidth, h: innerHeight, clientW: document.documentElement.clientWidth },
    aperto: d.open,
    dialog: q(d),
    dialogStile: cs(d, 'position', 'width', 'height', 'maxWidth', 'maxHeight', 'margin', 'inset', 'overflow'),
    box: q(document.querySelector('.glight-box')),
    cornice: q(document.querySelector('.glight-foto')),
    corniceStile: cs(document.querySelector('.glight-foto'), 'height', 'minHeight', 'padding'),
    img: q(img),
    imgNaturale: { w: img.naturalWidth, h: img.naturalHeight },
    imgStile: cs(img, 'width', 'height', 'maxWidth', 'maxHeight', 'objectFit', 'pointerEvents'),
    imgSrc: img.currentSrc.slice(-70),
  };
`;

const esiti = {};
for (const s of SCHERMI) {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: s.width, height: s.height, deviceScaleFactor: s.dpr, mobile: s.mobile,
  });
  const caricata = aspettaEvento('Page.loadEventFired');
  await cdp('Page.navigate', { url: INDIRIZZO });
  await caricata;
  await attendi(2500);   // idratazione di React: prima il click non fa niente
  esiti[s.nome] = await valuta(MISURA);

  if (!esiti[s.nome].errore) {
    const sh = await cdp('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(CARTELLA, `aperta-${s.nome}.png`), Buffer.from(sh.data, 'base64'));
  }
}

/* ── IL VERDETTO ────────────────────────────────────────────────────── */
console.log('pagina:', INDIRIZZO, '\n');
for (const s of SCHERMI) {
  const e = esiti[s.nome];
  console.log('═══', s.nome, `${s.width}x${s.height}`, '═══');
  if (e.errore) { console.log('  ', e.errore, '\n'); continue; }
  const f = e.finestra, i = e.img;
  console.log('  finestra           ', `${f.w} x ${f.h}   (client ${f.clientW})`);
  console.log('  dialog             ', `${e.dialog.w} x ${e.dialog.h}  a (${e.dialog.x}, ${e.dialog.y})`);
  console.log('  stile del dialog   ', JSON.stringify(e.dialogStile));
  console.log('  .glight-box        ', `${e.box.w} x ${e.box.h}  a (${e.box.x}, ${e.box.y})`);
  console.log('  .glight-foto       ', `${e.cornice.w} x ${e.cornice.h}`, JSON.stringify(e.corniceStile));
  console.log('  IMMAGINE           ', `${i.w} x ${i.h}  a (${i.x}, ${i.y})`);
  console.log('  stile immagine     ', JSON.stringify(e.imgStile));
  console.log('  naturale / file    ', `${e.imgNaturale.w} x ${e.imgNaturale.h}`, '…' + e.imgSrc);

  const fuoriX = i.x < 0 || i.x + i.w > f.w + 1;
  const fuoriY = i.y < 0 || i.y + i.h > f.h + 1;
  const dialogLargo = e.dialog.w > f.clientW + 1;
  console.log('  ──');
  console.log('  ci sta in larghezza?', fuoriX ? `🔴 NO  (da ${i.x} a ${i.x + i.w}, finestra ${f.w})` : 'si\'');
  console.log('  ci sta in altezza?  ', fuoriY ? `🔴 NO  (da ${i.y} a ${i.y + i.h}, finestra ${f.h})` : 'si\'');
  console.log('  dialog piu\' largo della finestra?', dialogLargo ? `🔴 SI (${e.dialog.w} > ${f.clientW})` : 'no');
  console.log('');
}

ws.close();
chrome.kill();
