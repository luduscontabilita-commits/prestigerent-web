/* LE TENDINE DEL MENU DEL SITO, PROVATE COL MOUSE.
 *
 * 🔴 PERCHE' ESISTE. Il 04/10/2026 e' arrivata in testata una seconda fila
 * sottile («Weddings»). Da allora, passando col mouse su una voce, la
 * tendina si apriva per un istante e si richiudeva prima che si riuscisse
 * a entrarci. Il pannello (`.hd-mega`, `top:100%`) si aggancia al fondo di
 * TUTTA la testata, e la fila nuova si era messa in mezzo: scendendo, il
 * mouse la attraversava, usciva dalla voce, e `onPointerLeave` chiudeva.
 *
 * Nessun controllo lo poteva vedere: e' un fatto di MOVIMENTO. Qui si
 * apre la pagina pubblicata in Chrome, si porta il mouse su ogni voce, lo
 * si fa scendere a piccoli passi fin dentro il pannello -- come una mano
 * vera -- e si guarda se la tendina e' ancora aperta.
 *
 * Non e' `next dev` e non e' un build locale: la pagina e' quella
 * pubblicata, come dice la regola 1 del CLAUDE.md.
 *
 *   npm run prova:tendine
 *   CSS="…regole…" node scripts/prova-tendine.mjs   (prova una correzione
 *                                                    iniettata, prima di pubblicarla)
 *
 * Esce con 1 se una tendina si chiude sotto il mouse.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITO = process.env.SITO ?? 'https://prestigerent.com';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA = 9371;
const CSS = process.env.CSS ?? '';

const profilo = mkdtempSync(join(tmpdir(), 'chrome-tendine-'));
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
const muovi = (x, y) => cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'mouse' });

let rotte = 0;
try {
  await cdp('Page.enable'); await cdp('Runtime.enable');
  /* 1440: lo schermo di un portatile da 15 pollici, dove la barra
     e' piena. Sotto i 1280 le tendine diventano il menu del telefono. */
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const caricata = evento('Page.loadEventFired', 45000);
  await cdp('Page.navigate', { url: SITO + '/' });
  await caricata;
  await attendi(1500);

  if (CSS) {
    await valuta(`const s = document.createElement('style'); s.textContent = ${JSON.stringify(CSS)};
      document.head.appendChild(s); return true;`);
    console.log('   (correzione CSS iniettata)\n');
  }

  const voci = await valuta(`
    return [...document.querySelectorAll('.hd-item')].map((el, i) => {
      const a = el.querySelector('.hd-top').getBoundingClientRect();
      return { i, nome: el.querySelector('.hd-top').textContent.trim(),
               x: a.left + a.width / 2, y: a.top + a.height / 2, fondo: a.bottom };
    });`);
  const sotto = await valuta(`const s = document.querySelector('.hd-sotto');
    return s ? Math.round(s.getBoundingClientRect().height) : 0;`);
  console.log(`${SITO} — 1440×900, ${voci.length} voci con tendina, fila sotto la barra: ${sotto}px\n`);

  for (const v of voci) {
    await muovi(5, 600);               // fuori da tutto: si parte a tendine chiuse
    await attendi(300);
    await muovi(v.x, v.y);
    await attendi(350);                 // la transizione di apertura dura 160 ms

    const aperta = await valuta(`
      const p = document.querySelectorAll('.hd-item')[${v.i}].querySelector('.hd-mega');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      return { aperta: p.classList.contains('is-open'), cima: r.top };`);
    if (!aperta) { console.log(`   ${v.nome.padEnd(22)} (senza pannello)`); continue; }

    const buco = Math.round(aperta.cima - v.fondo);
    /* Si scende in dieci passi, di qualche pixel per volta, fino a 40 px
       dentro il pannello: e' il percorso di chi va a cliccare una voce
       della tendina. */
    const arrivo = aperta.cima + 40;
    for (let k = 1; k <= 10; k++) {
      await muovi(v.x, v.y + ((arrivo - v.y) * k) / 10);
      await attendi(25);
    }
    await attendi(250);

    const resta = await valuta(`return document.querySelectorAll('.hd-item')[${v.i}]
      .querySelector('.hd-mega').classList.contains('is-open');`);
    const ok = aperta.aperta && resta;
    if (!ok) rotte++;
    console.log(`   ${v.nome.padEnd(22)} si apre: ${aperta.aperta ? 'si' : 'NO'}` +
      ` | buco voce→pannello: ${String(buco).padStart(3)} px | col mouse dentro: ${resta ? 'resta aperta' : '🔴 SI CHIUDE'}`);
  }

  /* ── IL TELEFONO ──────────────────────────────────────────────────────
     Sotto i 1280px niente tendine al passaggio: il menu e' un pannello che
     scende sotto la testata e si apre col tocco. La fila «Weddings» sposta
     tutto piu' in basso, quindi si controlla che il pannello resti dentro
     lo schermo, che si possa scorrere fino all'ultima voce, che una sezione
     si apra al tocco e che la pagina non scorra di lato. Due schermi: un
     iPhone grande e uno piccolo, dove lo spazio e' poco. */
  for (const [nome, w, h] of [['iPhone 14', 390, 844], ['iPhone SE', 375, 667]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    const ricaricata = evento('Page.loadEventFired', 45000);
    await cdp('Page.navigate', { url: SITO + '/' });
    await ricaricata;
    await attendi(1500);
    if (CSS) await valuta(`const s = document.createElement('style'); s.textContent = ${JSON.stringify(CSS)};
      document.head.appendChild(s); return true;`);

    const esito = await valuta(`
      const fuori = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const hd = document.querySelector('.hd').getBoundingClientRect();
      const burger = document.querySelector('.hd-burger');
      if (!burger) return { errore: 'pulsante del menu non trovato' };
      burger.click();
      await new Promise(r => setTimeout(r, 450));
      const nav = document.querySelector('.hd-nav');
      const r = nav.getBoundingClientRect();
      const aperto = nav.classList.contains('is-mob');
      /* fino in fondo: l'ultima voce deve essere raggiungibile scorrendo */
      nav.scrollTop = nav.scrollHeight;
      await new Promise(r => setTimeout(r, 100));
      const voci = [...nav.querySelectorAll('a')].filter(a => a.offsetParent);
      const ultima = voci[voci.length - 1];
      const u = ultima ? ultima.getBoundingClientRect() : null;
      nav.scrollTop = 0;
      /* una sezione: si tocca la freccia della prima */
      const freccia = nav.querySelector('.hd-freccia');
      let sezione = null;
      if (freccia) {
        freccia.click();
        await new Promise(r => setTimeout(r, 400));
        const p = freccia.closest('.hd-item').querySelector('.hd-mega');
        sezione = { aperta: p.classList.contains('is-open'), alta: Math.round(p.getBoundingClientRect().height) };
      }
      const fuoriDopo = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return { fuori, fuoriDopo, testata: Math.round(hd.height), aperto,
               cima: Math.round(r.top), fondo: Math.round(r.bottom), schermo: innerHeight,
               ultimaDentro: u ? (u.bottom <= innerHeight + 1 && u.top >= r.top - 1) : null,
               ultima: ultima ? ultima.textContent.trim().slice(0, 30) : null, sezione };`);

    if (esito.errore) { rotte++; console.log(`\n   ${nome}: 🔴 ${esito.errore}`); continue; }
    const problemi = [];
    if (!esito.aperto) problemi.push('il menu non si apre');
    if (esito.fondo > esito.schermo + 1) problemi.push(`il pannello esce dallo schermo (${esito.fondo} > ${esito.schermo})`);
    if (!esito.ultimaDentro) problemi.push(`l'ultima voce («${esito.ultima}») non si raggiunge`);
    if (!esito.sezione?.aperta) problemi.push('la sezione non si apre al tocco');
    if (esito.fuori > 0 || esito.fuoriDopo > 0) problemi.push(`la pagina scorre di lato di ${Math.max(esito.fuori, esito.fuoriDopo)}px`);
    if (problemi.length) rotte++;
    console.log(`\n   ${nome} ${w}×${h} — testata ${esito.testata}px, menu da ${esito.cima} a ${esito.fondo}px` +
      ` | ultima voce «${esito.ultima}» raggiungibile: ${esito.ultimaDentro ? 'si' : 'NO'}` +
      ` | sezione al tocco: ${esito.sezione?.aperta ? `si (${esito.sezione.alta}px)` : 'NO'}`);
    console.log(`      ${problemi.length ? '🔴 ' + problemi.join('; ') : 'nessun problema'}`);
  }
} finally {
  ws.close();
  chrome.kill();
}

console.log(`\n${rotte === 0 ? '✓ tutte le tendine restano aperte sotto il mouse' : `🔴 ${rotte} tendine si chiudono`}`);
process.exit(rotte === 0 ? 0 : 1);
