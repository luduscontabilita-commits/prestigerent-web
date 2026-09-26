'use client';

import { dataDiScatto, giraLeMisure, orientamento } from '@/lib/exif-data';
import { bassaRisoluzione, verraRitagliata } from '@/lib/gallery-tag';

/* LA FOTO PREPARATA NEL BROWSER, PRIMA DI PARTIRE.
 *
 * ── PERCHE' NEL BROWSER E NON SUL SERVER ───────────────────────────────
 * Due motivi concreti, non di gusto:
 *  - il corpo di una server action su Vercel e' limitato a 1 MB, e una
 *    foto da telefono ne pesa dai tre agli otto. Mandarla al server per
 *    ridimensionarla vuol dire non riuscire a mandarla;
 *  - `sharp` non e' una dipendenza di questo progetto, e aggiungerla per
 *    ridimensionare vuol dire aggiungere un pacchetto nativo alle funzioni.
 * Il canvas invece c'e' in ogni telefono, e il ridimensionamento avviene
 * dove la foto e' gia': dieci foto diventano un megabyte l'una PRIMA di
 * salire, quindi si carica meno e in mezzo a una vigna si carica prima.
 *
 * ── E TOGLIE I METADATI COME EFFETTO, NON COME PASSAGGIO IN PIU' ───────
 * Un canvas ricodificato non ha EXIF: spariscono marca del telefono, ora
 * esatta e soprattutto il GPS, che su una foto scattata davanti a casa di
 * qualcuno e' la posizione di casa di qualcuno. La data di scatto e
 * l'orientamento si leggono PRIMA (`exif-data.ts`), che e' l'unico ordine
 * possibile.
 */

/** 2400px sul lato lungo. Una foto da telefono (circa 4000x3000) ci arriva
 *  sempre per riduzione, mai per ingrandimento: non si inventano pixel. */
const LATO_LUNGO = 2400;

/** WebP 0,85. In pagina l'ottimizzatore di Vercel riscende a 75, che e'
 *  l'unica qualita' ammessa dal profilo predefinito: partire piu' alti
 *  serve al lightbox e a non sommare due compressioni. */
const QUALITA = 0.85;

export type Preparata = {
  blob: Blob;
  /** DOPO la rotazione: sono le misure che vanno nel database e che la
   *  pagina usa per `aspect-ratio`. */
  width: number;
  height: number;
  /** il colore dominante, come `#rrggbb`: e' quello che si vede mentre la
   *  foto arriva, al posto di un rettangolo bianco */
  colore: string;
  /** la data di scatto dall'EXIF, o null se il file non la porta */
  scattata: Date | null;
  /** cose da dire a chi carica, non errori: la foto si carica comunque */
  avvisi: string[];
};

export type EsitoPrepara = { ok: true; foto: Preparata } | { ok: false; errore: string };

/** I formati che il pannello accetta. HEIC non c'e': vedi sotto. */
const AMMESSI = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

function pareHeic(f: File): boolean {
  return /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
}

export async function preparaFoto(file: File): Promise<EsitoPrepara> {
  /* 🔴 HEIC: SI RIFIUTA, E SI DICE PERCHE'.
   *
   * E' il formato predefinito delle foto su iPhone, e nessun browser lo
   * sa decodificare in un canvas -- nemmeno Safari, che lo mostra ma non
   * lo ridisegna. Ricodificarlo sul server vorrebbe dire aggiungere una
   * libreria nativa per un caso che si evita con una impostazione.
   *
   * In pratica non capita quasi mai: `<input type="file" accept="image/*">`
   * su iOS consegna JPEG anche quando sul telefono la foto e' HEIC. Capita
   * a chi ha ricevuto il file da un altro iPhone via AirDrop o email.
   * Perche' il messaggio dica cosa fare e non solo che non si puo':
   * Impostazioni -> Fotocamera -> Formati -> "Più compatibile". */
  if (pareHeic(file)) {
    return {
      ok: false,
      errore:
        'Questa foto è in formato HEIC, che il browser non sa aprire. Sul telefono: Impostazioni → Fotocamera → Formati → «Più compatibile», poi riscattala; oppure aprila nella galleria e usa «Condividi» per salvarne una copia JPEG.',
    };
  }
  if (file.type && !AMMESSI.includes(file.type)) {
    return { ok: false, errore: `Formato non gestito (${file.type}). Serve JPG, PNG, WebP o AVIF.` };
  }

  const buf = await file.arrayBuffer();

  /* PRIMA l'EXIF, poi il canvas. Invertire l'ordine vuol dire perdere
     tutti e due i valori, e non accorgersene: il canvas non da' errore,
     da' una foto senza data e coricata. */
  const scattata = dataDiScatto(buf);
  const giro = orientamento(buf);

  let bitmap: ImageBitmap;
  try {
    /* `imageOrientation: 'none'` -- cioe' NON ruotare -- perche' la
       rotazione la applichiamo noi qui sotto. Lasciarla al browser
       significherebbe girare due volte dove l'opzione e' supportata e zero
       volte dove non lo e'. */
    bitmap = await createImageBitmap(new Blob([buf], { type: file.type || 'image/jpeg' }), {
      imageOrientation: 'none',
    });
  } catch {
    return { ok: false, errore: 'Non riesco ad aprire questa immagine: il file sembra danneggiato.' };
  }

  /* Le misure DOPO la rotazione: se l'EXIF chiede 90 gradi, quella che il
     sensore ha salvato come 4032x3024 in pagina e' 3024x4032. */
  const giraMisure = giraLeMisure(giro);
  const wSorgente = giraMisure ? bitmap.height : bitmap.width;
  const hSorgente = giraMisure ? bitmap.width : bitmap.height;

  const scala = Math.min(1, LATO_LUNGO / Math.max(wSorgente, hSorgente));
  const width = Math.max(1, Math.round(wSorgente * scala));
  const height = Math.max(1, Math.round(hSorgente * scala));

  const tela = document.createElement('canvas');
  tela.width = width;
  tela.height = height;
  const ctx = tela.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { ok: false, errore: 'Il browser non mette a disposizione un canvas.' };
  }

  applicaGiro(ctx, giro, width, height);
  /* La destinazione e' nel sistema di riferimento GIA' girato, quindi le
     misure da usare qui sono quelle del sensore scalate, non quelle finali. */
  ctx.drawImage(bitmap, 0, 0, giraMisure ? height : width, giraMisure ? width : height);
  bitmap.close();

  const colore = coloreDominante(tela);

  const blob = await new Promise<Blob | null>((risolvi) =>
    tela.toBlob(risolvi, 'image/webp', QUALITA)
  );
  if (!blob) return { ok: false, errore: 'Non riesco a convertire questa immagine in WebP.' };

  const avvisi: string[] = [];
  /* Gli avvisi si misurano sulle dimensioni FINALI, che sono quelle con cui
     la foto si vedra' davvero. */
  if (bassaRisoluzione({ width, height })) {
    avvisi.push(
      `Risoluzione bassa (${width}×${height}): sul sito si vede, ma aperta a schermo pieno risulterà sgranata.`
    );
  }
  if (verraRitagliata({ width, height })) {
    avvisi.push(
      'Proporzioni molto allungate: nella striscia verrà ritagliata al centro per non occupare tutto lo schermo. Aperta a schermo pieno si vede intera.'
    );
  }

  return { ok: true, foto: { blob, width, height, colore, scattata, avvisi } };
}

/* Le otto trasformazioni dell'EXIF. I quattro casi con lo specchio
   esistono davvero -- li producono le fotocamere frontali di certi
   telefoni -- e trattarli come "nessuna rotazione" darebbe una foto
   ribaltata, che su un testo nell'inquadratura si vede subito. */
function applicaGiro(ctx: CanvasRenderingContext2D, giro: number, w: number, h: number) {
  switch (giro) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;              // specchio orizzontale
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;             // 180°
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;              // specchio verticale
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;               // trasposta
    case 6: ctx.transform(0, 1, -1, 0, w, 0); break;              // 90° in senso orario
    case 7: ctx.transform(0, -1, -1, 0, w, h); break;             // trasversa
    case 8: ctx.transform(0, -1, 1, 0, 0, h); break;              // 90° antiorario
    default: break;                                                // 1: niente
  }
}

/** Il colore dominante: si ridisegna la foto in UN pixel e si legge quel
 *  pixel. E' la media, che e' esattamente quello che serve -- uno sfondo
 *  che somiglia alla foto mentre arriva. Costa una `drawImage` su un
 *  canvas 1x1, non una scansione dei pixel. */
function coloreDominante(tela: HTMLCanvasElement): string {
  try {
    const mini = document.createElement('canvas');
    mini.width = 1;
    mini.height = 1;
    const c = mini.getContext('2d');
    if (!c) return '#E9E5DF';
    c.drawImage(tela, 0, 0, 1, 1);
    const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
    const due = (n: number) => n.toString(16).padStart(2, '0');
    return `#${due(r)}${due(g)}${due(b)}`;
  } catch {
    /* `getImageData` puo' essere negato su un canvas "sporco". Qui non lo
       e' -- la foto viene da un file locale, non da un altro dominio -- ma
       se lo fosse si perde lo sfondo colorato, non il caricamento. */
    return '#E9E5DF';
  }
}
