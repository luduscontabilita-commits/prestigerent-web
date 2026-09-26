import { describe, expect, it } from 'vitest';
import { dataDiScatto, giraLeMisure, orientamento } from './exif-data';

/* SI COSTRUISCE UN JPEG VERO, byte per byte.
 *
 * Non una finta: un SOI, un segmento APP1 con l'intestazione "Exif", un
 * blocco TIFF con IFD0 e il sotto-blocco EXIF. E' l'unico modo di provare
 * un parser di byte -- e serve, perche' qui un errore non da' eccezioni:
 * da' tutte le foto verticali coricate, con larghezza e altezza scambiate,
 * su un sito pubblicato.
 *
 * L'ordine dei byte e' scelto dal costruttore: gli iPhone scrivono MM
 * (big endian), molti Android II (little endian), e dare per buono uno dei
 * due vuol dire leggere numeri assurdi sull'altro senza accorgersene.
 * Qui si provano entrambi.
 */

type Opzioni = { orientamento?: number; data?: string | null; bigEndian?: boolean };

function jpegConExif({ orientamento: o = 1, data = '2026:09:26 10:30:00', bigEndian = false }: Opzioni = {}) {
  const testo = data === null ? null : data;
  const lunghezzaTesto = testo ? testo.length + 1 : 0;

  /* Le posizioni sono relative all'inizio del blocco TIFF, che e' come le
     scrive l'EXIF: e' proprio il punto in cui un parser sbaglia, quindi
     nel test si calcolano invece di essere copiate a mano. */
  const IFD0 = 8;
  const vociIfd0 = testo ? 2 : 1;
  const EXIF_IFD = IFD0 + 2 + vociIfd0 * 12 + 4;
  const vociExif = testo ? 1 : 0;
  const TESTO = EXIF_IFD + 2 + vociExif * 12 + 4;
  const tiffLungo = TESTO + lunghezzaTesto;

  const tiff = new DataView(new ArrayBuffer(tiffLungo));
  const le = !bigEndian;
  const u16 = (o2: number, v: number) => tiff.setUint16(o2, v, le);
  const u32 = (o2: number, v: number) => tiff.setUint32(o2, v, le);

  /* "II" = Intel, "MM" = Motorola */
  tiff.setUint8(0, bigEndian ? 0x4d : 0x49);
  tiff.setUint8(1, bigEndian ? 0x4d : 0x49);
  u16(2, 0x002a);
  u32(4, IFD0);

  u16(IFD0, vociIfd0);
  let v = IFD0 + 2;

  // Orientation: tag 0x0112, tipo 3 (SHORT), 1 valore
  u16(v, 0x0112); u16(v + 2, 3); u32(v + 4, 1); u16(v + 8, o);
  v += 12;

  if (testo) {
    // ExifIFD: tag 0x8769, tipo 4 (LONG) -> lo scostamento del sotto-blocco
    u16(v, 0x8769); u16(v + 2, 4); u32(v + 4, 1); u32(v + 8, EXIF_IFD);
    v += 12;
  }
  u32(v, 0); // nessun IFD successivo

  if (testo) {
    u16(EXIF_IFD, 1);
    const e = EXIF_IFD + 2;
    // DateTimeOriginal: tag 0x9003, tipo 2 (ASCII). Venti byte non stanno
    // nei quattro del campo, quindi il valore e' uno scostamento.
    u16(e, 0x9003); u16(e + 2, 2); u32(e + 4, lunghezzaTesto); u32(e + 8, TESTO);
    u32(e + 12, 0);
    for (let i = 0; i < testo.length; i++) tiff.setUint8(TESTO + i, testo.charCodeAt(i));
    tiff.setUint8(TESTO + testo.length, 0); // le stringhe EXIF finiscono con uno zero
  }

  const app1 = 6 + tiffLungo; // "Exif\0\0" + TIFF
  const out = new Uint8Array(2 + 2 + 2 + app1);
  let p = 0;
  out[p++] = 0xff; out[p++] = 0xd8;            // SOI
  out[p++] = 0xff; out[p++] = 0xe1;            // APP1
  out[p++] = (app1 + 2) >> 8; out[p++] = (app1 + 2) & 0xff;  // lunghezza, sempre big endian
  for (const c of 'Exif') out[p++] = c.charCodeAt(0);
  out[p++] = 0; out[p++] = 0;
  out.set(new Uint8Array(tiff.buffer), p);
  return out.buffer;
}

describe('orientamento: e’ la differenza fra una verticale intera e una coricata', () => {
  it('legge tutti e otto i valori, in little endian', () => {
    for (let o = 1; o <= 8; o++) {
      expect(orientamento(jpegConExif({ orientamento: o }))).toBe(o);
    }
  });

  it('legge tutti e otto i valori anche in big endian (gli iPhone scrivono MM)', () => {
    for (let o = 1; o <= 8; o++) {
      expect(orientamento(jpegConExif({ orientamento: o, bigEndian: true }))).toBe(o);
    }
  });

  it('un valore fuori scala non diventa una rotazione inventata', () => {
    expect(orientamento(jpegConExif({ orientamento: 42 }))).toBe(1);
  });

  it('senza EXIF, senza JPEG o con un file rotto torna 1 e non lancia', () => {
    expect(orientamento(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer)).toBe(1);
    expect(orientamento(new Uint8Array([1, 2, 3, 4, 5]).buffer)).toBe(1);
    expect(orientamento(new ArrayBuffer(0))).toBe(1);
  });

  it('solo i quattro valori con la rotazione di 90 gradi scambiano le misure', () => {
    expect([1, 2, 3, 4].map(giraLeMisure)).toEqual([false, false, false, false]);
    expect([5, 6, 7, 8].map(giraLeMisure)).toEqual([true, true, true, true]);
  });
});

describe('dataDiScatto', () => {
  it('legge DateTimeOriginal, che NON e’ in formato ISO', () => {
    const d = dataDiScatto(jpegConExif({ data: '2026-09-26 10:30:00'.replace(/-/g, ':') }));
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe('2026-09-26T10:30:00.000Z');
  });

  it('funziona anche in big endian', () => {
    const d = dataDiScatto(jpegConExif({ data: '2026:09:26 10:30:00', bigEndian: true }));
    expect(d!.toISOString()).toBe('2026-09-26T10:30:00.000Z');
  });

  it('senza il sotto-blocco EXIF torna null: DateTime di IFD0 e’ la data di MODIFICA, non di scatto', () => {
    expect(dataDiScatto(jpegConExif({ data: null }))).toBeNull();
  });

  it('un formato non riconosciuto torna null invece di una data a caso', () => {
    expect(dataDiScatto(jpegConExif({ data: 'ieri pomeriggio' }))).toBeNull();
  });

  it('un orologio sbagliato non passa: niente date nel futuro', () => {
    const anno = new Date().getUTCFullYear() + 5;
    expect(dataDiScatto(jpegConExif({ data: `${anno}:01:01 10:00:00` }))).toBeNull();
  });

  it('e niente date prima del 1990', () => {
    expect(dataDiScatto(jpegConExif({ data: '1980:01:01 10:00:00' }))).toBeNull();
  });

  it('un file che non e’ un JPEG, o troncato, torna null e non lancia', () => {
    expect(dataDiScatto(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    const pezzo = jpegConExif().slice(0, 14);
    expect(dataDiScatto(pezzo)).toBeNull();
    expect(dataDiScatto(new ArrayBuffer(0))).toBeNull();
  });
});
