/* LA DATA DI SCATTO, LETTA A MANO DAL JPEG.
 *
 * ── PERCHE' NON UNA LIBRERIA ───────────────────────────────────────────
 * Il piano lasciava la scelta fra `exifr` e poche righe nostre. Serve UN
 * campo, `DateTimeOriginal`, e questo file lo tira fuori in una sessantina
 * di righe senza dipendenze nuove: `exifr` anche in versione ridotta porta
 * decine di tag che non servono a nessuno e che finiscono nel bundle del
 * pannello, cioe' nel telefono di chi carica in mezzo a una vigna.
 *
 * ── PERCHE' SI LEGGE PRIMA DEL CANVAS ──────────────────────────────────
 * Il pannello ridisegna la foto in un canvas per ridimensionarla, e quel
 * passaggio BUTTA TUTTO L'EXIF -- che e' quello che si vuole, perche'
 * dentro c'e' anche il GPS di casa di qualcuno. Ma butta anche la data. Se
 * la si leggesse dopo non ci sarebbe piu'.
 *
 * ── A COSA SERVE, E QUINDI QUANTA PRECISIONE SERVE ─────────────────────
 * Solo a ORDINARE le foto ("piu' recenti prima", "piu' vecchie prima") e a
 * mostrare la data nel pannello. Non entra in nessun conto e non si vede
 * sul sito.
 *
 * Per questo, quando il telefono non scrive il fuso (`OffsetTimeOriginal`,
 * tag 0x9011, che i telefoni recenti scrivono e quelli vecchi no), l'ora
 * scritta nell'EXIF si prende come UTC invece di indovinare un fuso. Lo
 * scarto e' di un'ora o due: fra due foto di GIORNI diversi non cambia
 * nulla, e nel pannello si vede la data, non l'ora. Indovinare il fuso
 * costerebbe righe di codice e casi limite (ora legale) per una precisione
 * che non serve a niente.
 *
 * Del GPS qui non si legge niente, di proposito: quello che non si legge
 * non si puo' salvare per sbaglio.
 */

/** `2026:09:26 10:30:00` — il formato EXIF, che non e' ISO. */
const FORMATO = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
/** `+02:00`, `-05:00`, e a volte `+02:00\0` con il riempimento. */
const FUSO = /^([+-]\d{2}):(\d{2})/;

const TAG_EXIF_IFD = 0x8769;
const TAG_DATA_SCATTO = 0x9003;
const TAG_FUSO_SCATTO = 0x9011;
const TAG_ORIENTAMENTO = 0x0112;

/**
 * L'ORIENTAMENTO, che e' la cosa da cui dipende se le verticali escono
 * coricate.
 *
 * Il telefono non ruota i pixel: li salva come li ha letti il sensore e
 * scrive nell'EXIF «ruotala di 90 gradi». Quando il canvas ricodifica la
 * foto quell'istruzione sparisce insieme al resto dell'EXIF, quindi la
 * rotazione va applicata AI PIXEL prima di buttarlo -- e larghezza e
 * altezza vanno salvate DOPO, o la pagina riserva lo spazio girato.
 *
 * 🔴 PERCHE' SI LEGGE QUI E NON SI LASCIA FARE AL BROWSER.
 * `createImageBitmap(file, { imageOrientation: 'from-image' })` farebbe la
 * stessa cosa, ma il supporto di quell'opzione non e' uniforme: dove non
 * c'e' viene ignorata in silenzio -- nessun errore, nessun avviso, solo
 * tutte le verticali coricate e le misure invertite. Leggendo il tag e
 * girando noi, il risultato e' lo stesso su qualunque browser.
 *
 * I valori sono 1..8 come da specifica. `1` (e il caso "non c'e'") vuol
 * dire nessuna rotazione.
 */
export function orientamento(buf: ArrayBuffer): number {
  try {
    const d = new DataView(buf);
    if (d.byteLength < 4 || d.getUint16(0) !== 0xffd8) return 1;
    let p = 2;
    while (p + 4 <= d.byteLength) {
      if (d.getUint8(p) !== 0xff) return 1;
      const marcatore = d.getUint8(p + 1);
      if (marcatore === 0xda) return 1;
      const lunghezza = d.getUint16(p + 2);
      if (lunghezza < 2) return 1;
      if (marcatore === 0xe1 && p + 10 <= d.byteLength) {
        const firma = String.fromCharCode(
          d.getUint8(p + 4), d.getUint8(p + 5), d.getUint8(p + 6), d.getUint8(p + 7)
        );
        if (firma === 'Exif') {
          const base = p + 10;
          if (base + 8 > d.byteLength) return 1;
          const ordine = d.getUint16(base);
          const le = ordine === 0x4949;
          if (!le && ordine !== 0x4d4d) return 1;
          if (d.getUint16(base + 2, le) !== 0x002a) return 1;
          const ifd0 = base + d.getUint32(base + 4, le);
          /* L'orientamento e' uno SHORT, quindi sta nei primi due byte del
             campo valore: `getUint32` leggerebbe anche i due byte di
             riempimento e darebbe 0x00010000 invece di 1. */
          if (ifd0 + 2 > d.byteLength) return 1;
          const quanti = d.getUint16(ifd0, le);
          for (let i = 0; i < quanti; i++) {
            const v = ifd0 + 2 + i * 12;
            if (v + 12 > d.byteLength) return 1;
            if (d.getUint16(v, le) === TAG_ORIENTAMENTO) {
              const o = d.getUint16(v + 8, le);
              return o >= 1 && o <= 8 ? o : 1;
            }
          }
          return 1;
        }
      }
      p += 2 + lunghezza;
    }
    return 1;
  } catch {
    return 1;
  }
}

/** L'orientamento scambia larghezza e altezza? Vero per i quattro valori
 *  che comprendono una rotazione di 90 gradi. */
export function giraLeMisure(o: number): boolean {
  return o >= 5 && o <= 8;
}

/**
 * La data di scatto, oppure `null` se non c'e'.
 *
 * Torna `null` e non lancia in tutti i casi in cui il file non e' quello
 * che dice di essere: un PNG rinominato .jpg, un file troncato a meta'
 * caricamento, un JPEG senza EXIF (le foto ricevute su WhatsApp lo hanno
 * rimosso, le schermate non l'hanno mai avuto). Chi chiama in quei casi
 * usa la data di caricamento, e il pannello lo dichiara.
 */
export function dataDiScatto(buf: ArrayBuffer): Date | null {
  try {
    const d = new DataView(buf);
    if (d.byteLength < 4 || d.getUint16(0) !== 0xffd8) return null; // non e' un JPEG

    /* Si cammina di segmento in segmento cercando APP1. Non si cerca la
       stringa "Exif" in tutto il file: la troverebbe anche dentro i dati
       compressi dell'immagine, e da li' si leggerebbe spazzatura. */
    let p = 2;
    while (p + 4 <= d.byteLength) {
      if (d.getUint8(p) !== 0xff) return null; // fuori sincrono: si smette
      const marcatore = d.getUint8(p + 1);
      /* SOS: da qui comincia l'immagine compressa, l'EXIF non c'e'. */
      if (marcatore === 0xda) return null;
      const lunghezza = d.getUint16(p + 2);
      if (lunghezza < 2) return null;

      if (marcatore === 0xe1 && p + 10 <= d.byteLength) {
        const firma = String.fromCharCode(
          d.getUint8(p + 4), d.getUint8(p + 5), d.getUint8(p + 6), d.getUint8(p + 7)
        );
        if (firma === 'Exif') return dentroTiff(d, p + 10);
      }
      p += 2 + lunghezza;
    }
    return null;
  } catch {
    /* Un file corrotto non deve impedire di caricare la foto: si perde la
       data, non il caricamento. */
    return null;
  }
}

function dentroTiff(d: DataView, base: number): Date | null {
  if (base + 8 > d.byteLength) return null;

  /* L'ordine dei byte lo dichiara il file: "II" Intel (little endian),
     "MM" Motorola (big endian). Gli iPhone scrivono MM, molti Android II:
     dare per buono uno dei due vuol dire leggere numeri assurdi sull'altro
     e non accorgersene, perche' non da' errore -- da' una data sbagliata. */
  const ordine = d.getUint16(base);
  const le = ordine === 0x4949;
  if (!le && ordine !== 0x4d4d) return null;

  const u16 = (o: number) => d.getUint16(o, le);
  const u32 = (o: number) => d.getUint32(o, le);

  if (u16(base + 2) !== 0x002a) return null;

  const ifd0 = base + u32(base + 4);
  const exifIfd = cerca(d, base, ifd0, TAG_EXIF_IFD, le);
  /* Senza il sotto-blocco EXIF la data di scatto non esiste: in IFD0 c'e'
     `DateTime`, che e' la data dell'ultima MODIFICA del file, non dello
     scatto. Usarla vorrebbe dire ordinare per "quando e' stata ritagliata". */
  if (exifIfd == null) return null;

  const testo = cercaTesto(d, base, base + exifIfd, TAG_DATA_SCATTO);
  if (!testo) return null;

  const m = FORMATO.exec(testo.trim());
  if (!m) return null;

  const fusoTesto = cercaTesto(d, base, base + exifIfd, TAG_FUSO_SCATTO);
  const f = fusoTesto ? FUSO.exec(fusoTesto.trim()) : null;
  const fuso = f ? `${f[1]}:${f[2]}` : 'Z';

  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${fuso}`;
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return null;

  /* Una data nel futuro o prima del 1990 e' un orologio sbagliato, non uno
     scatto: ordinare per quella metterebbe la foto in cima o in fondo per
     sempre. Meglio dire "non lo so" e usare la data di caricamento. */
  const ora = Date.now();
  if (quando.getTime() > ora + 86_400_000) return null;
  if (quando.getUTCFullYear() < 1990) return null;

  return quando;
}

/** Il valore numerico (LONG/SHORT) di un tag in un IFD, come scostamento. */
function cerca(d: DataView, base: number, ifd: number, tag: number, le: boolean): number | null {
  if (ifd + 2 > d.byteLength) return null;
  const quanti = d.getUint16(ifd, le);
  for (let i = 0; i < quanti; i++) {
    const v = ifd + 2 + i * 12;
    if (v + 12 > d.byteLength) return null;
    if (d.getUint16(v, le) === tag) return d.getUint32(v + 8, le);
  }
  return null;
}

/** Il valore ASCII di un tag. I campi di testo dell'EXIF stanno fuori
 *  dall'elemento quando superano i quattro byte -- e una data di venti
 *  caratteri li supera sempre -- quindi il valore e' uno scostamento
 *  dall'inizio del TIFF. */
function cercaTesto(d: DataView, base: number, ifd: number, tag: number): string | null {
  const le = d.getUint16(base) === 0x4949;
  if (ifd + 2 > d.byteLength) return null;
  const quanti = d.getUint16(ifd, le);
  for (let i = 0; i < quanti; i++) {
    const v = ifd + 2 + i * 12;
    if (v + 12 > d.byteLength) return null;
    if (d.getUint16(v, le) !== tag) continue;

    const conta = d.getUint32(v + 4, le);
    if (conta === 0 || conta > 64) return null;
    const dove = conta <= 4 ? v + 8 : base + d.getUint32(v + 8, le);
    if (dove + conta > d.byteLength) return null;

    let out = '';
    for (let k = 0; k < conta; k++) {
      const c = d.getUint8(dove + k);
      if (c === 0) break; // le stringhe EXIF finiscono con uno zero
      out += String.fromCharCode(c);
    }
    return out;
  }
  return null;
}
