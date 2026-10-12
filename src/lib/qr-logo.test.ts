import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { qrConLogo } from './qr-logo';

/* Il QR della fiera. Un errore qui e' un codice stampato su mille
 * brochure che nessun telefono legge: si prova LEGGENDOLO, con lo stesso
 * tipo di decodificatore che usano le app. */

/** Un «logo» finto: un tondo rosso pieno, come quello di Prestige Rent. */
function logoFinto(lato = 200): Uint8Array {
  const p = new PNG({ width: lato, height: lato, colorType: 6 });
  for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
    const i = (y * lato + x) * 4;
    const dentro = Math.hypot(x - lato / 2, y - lato / 2) < lato / 2;
    p.data[i] = 200; p.data[i + 1] = 20; p.data[i + 2] = 30; p.data[i + 3] = dentro ? 255 : 0;
  }
  return new Uint8Array(PNG.sync.write(p));
}

describe('qrConLogo', () => {
  for (const misura of [512, 1024]) {
    it(`${misura}px: si legge con il logo al centro e porta all'indirizzo giusto`, async () => {
      const file = await qrConLogo('https://prestigerent.com/qr/partners', logoFinto(), misura);
      const png = PNG.sync.read(file);
      expect([png.width, png.height]).toEqual([misura, misura]);
      const letto = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
      expect(letto?.data).toBe('https://prestigerent.com/qr/partners');
    });
  }

  it('lo sfondo e’ bianco e opaco, anche dietro il logo', async () => {
    const png = PNG.sync.read(await qrConLogo('https://prestigerent.com/qr/partners', logoFinto(), 256));
    expect([...png.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 255) throw new Error('pixel trasparente in ' + (i - 3) / 4);
  });
});
