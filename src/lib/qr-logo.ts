import QRCode from 'qrcode';
import { PNG } from 'pngjs';

/* IL QR CODE CON IL LOGO AL CENTRO, IN PNG TRASPARENTE.
 *
 * Per le brochure e lo stand in fiera (proprieta', 12/10/2026). Si
 * disegna a mano, modulo per modulo, invece di usare il PNG che la
 * libreria sa fare da sola, per tre ragioni:
 *  - lo sfondo deve essere TRASPARENTE (va stampato su grafiche diverse);
 *  - al centro serve un tondo VUOTO dove appoggiare il logo, non il logo
 *    incollato sopra i moduli;
 *  - la misura in pixel deve essere esattamente quella chiesta.
 *
 * ── PERCHE' IL LOGO NON LO RENDE ILLEGGIBILE ─────────────────────────
 * Correzione d'errore «H»: il QR si legge anche con il 30% dei moduli
 * coperti. Il tondo del logo ne copre circa il 6%, con margine
 * abbondante. Lo prova `qr-logo.test.ts`, che rilegge il PNG generato.
 *
 * ── STAMPARLO ────────────────────────────────────────────────────────
 * Lo sfondo trasparente vuol dire che il colore dietro lo decide la
 * grafica: i moduli sono quasi neri, quindi va stampato su un fondo
 * CHIARO. Su un fondo scuro nessun telefono lo legge. */

/** L'indirizzo FISSO stampato nel QR delle brochure: dove porta lo decide
 *  la tabella `qr_link` (src/app/qr/[codice]/route.ts). Con la barra
 *  finale, perche' il sito ha `trailingSlash` e senza ogni scansione
 *  farebbe un rimando in piu'. */
export const INDIRIZZO_QR = 'https://prestigerent.com/qr/partners/';

const SCURO = [17, 24, 31]; // #11181F: quasi nero, il massimo contrasto su carta

/** Il PNG del QR: `misura` x `misura` pixel, sfondo trasparente, logo
 *  (PNG, anche trasparente) al centro. */
export async function qrConLogo(testo: string, logoPng: Uint8Array | null, misura = 1024): Promise<Buffer> {
  const qr = QRCode.create(testo, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const quiete = 2; // il margine bianco attorno, in moduli (trasparente)
  const totale = n + 2 * quiete;
  const lato = misura / totale; // pixel per modulo, anche non intero

  const png = new PNG({ width: misura, height: misura, colorType: 6 });
  png.data.fill(0); // tutto trasparente

  /* Il tondo vuoto al centro: diametro 22% del QR, piu' un poco di aria. */
  const centro = misura / 2;
  const raggioVuoto = (n * lato * 0.22) / 2 + lato * 0.6;
  const raggioLogo = (n * lato * 0.22) / 2;

  for (let y = 0; y < misura; y++) {
    const my = Math.floor(y / lato) - quiete;
    for (let x = 0; x < misura; x++) {
      const mx = Math.floor(x / lato) - quiete;
      if (mx < 0 || my < 0 || mx >= n || my >= n) continue;
      if (!qr.modules.get(my, mx)) continue;
      /* Un modulo che tocca il tondo si toglie intero, non a meta': un
         modulo tagliato a spicchio confonde i lettori. */
      const cx = (mx + quiete + 0.5) * lato;
      const cy = (my + quiete + 0.5) * lato;
      if (Math.hypot(cx - centro, cy - centro) < raggioVuoto) continue;
      const i = (y * misura + x) * 4;
      png.data[i] = SCURO[0];
      png.data[i + 1] = SCURO[1];
      png.data[i + 2] = SCURO[2];
      png.data[i + 3] = 255;
    }
  }

  if (logoPng) disegnaLogo(png, PNG.sync.read(Buffer.from(logoPng)), centro, raggioLogo);
  return PNG.sync.write(png);
}

/** Il logo ridotto (bilineare) e appoggiato al centro, rispettando la sua
 *  trasparenza. */
function disegnaLogo(dest: PNG, logo: PNG, centro: number, raggio: number) {
  const lato = Math.round(raggio * 2);
  const x0 = Math.round(centro - lato / 2);
  const y0 = Math.round(centro - lato / 2);
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const sx = ((x + 0.5) / lato) * logo.width - 0.5;
      const sy = ((y + 0.5) / lato) * logo.height - 0.5;
      const c = campiona(logo, sx, sy);
      if (c[3] === 0) continue;
      const i = ((y0 + y) * dest.width + (x0 + x)) * 4;
      const a = c[3] / 255;
      const sotto = dest.data[i + 3] / 255;
      const fuori = a + sotto * (1 - a);
      for (let k = 0; k < 3; k++) {
        dest.data[i + k] = Math.round((c[k] * a + dest.data[i + k] * sotto * (1 - a)) / (fuori || 1));
      }
      dest.data[i + 3] = Math.round(fuori * 255);
    }
  }
}

function campiona(img: PNG, x: number, y: number): number[] {
  const x0 = Math.max(0, Math.min(img.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(img.height - 1, Math.floor(y)));
  const x1 = Math.min(img.width - 1, x0 + 1);
  const y1 = Math.min(img.height - 1, y0 + 1);
  const fx = Math.min(1, Math.max(0, x - x0));
  const fy = Math.min(1, Math.max(0, y - y0));
  const p = (xx: number, yy: number) => {
    const i = (yy * img.width + xx) * 4;
    return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
  };
  const a = p(x0, y0), b = p(x1, y0), c = p(x0, y1), d = p(x1, y1);
  return [0, 1, 2, 3].map((k) => (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) + (c[k] * (1 - fx) + d[k] * fx) * fy);
}
