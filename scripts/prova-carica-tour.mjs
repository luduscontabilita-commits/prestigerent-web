/* LA CATENA DI CARICAMENTO DI UNA FOTO DI TOUR, PROVATA DAVVERO.
 *
 * Rifa' esattamente quello che fanno `firmeTour()` e il browser, nello
 * stesso ordine, e alla fine cancella. Serve a sapere PRIMA di pubblicare
 * che il bucket accetta il file e che il file esce pubblico -- due cose
 * che si scoprirebbero altrimenti dal pannello, con una foto persa.
 */
import { readFileSync } from 'node:fs';
const env = {};
for (const r of readFileSync('D:/PROGETTO_AI/PRESTIGERENT_NEW_WEBSITE/.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(r.trim());
  if (m) env[m[1]] = m[2].trim();
}
const U = env.NEXT_PUBLIC_SUPABASE_URL, S = env.SUPABASE_SECRET_KEY;
const H = { apikey: S, authorization: 'Bearer ' + S };
const d = (t, ok, x = '') => console.log('  ' + t.padEnd(58) + (ok ? "si'" : '🔴 NO') + (x ? '  ' + x : ''));

const b = (await (await fetch(U + '/storage/v1/bucket', { headers: H })).json()).find((x) => x.name === 'media');
console.log('bucket media:', JSON.stringify({ pubblico: b.public, limite: b.file_size_limit, tipi: b.allowed_mime_types }));
console.log('');

const percorso = 'tour/prova-caricamento/' + crypto.randomUUID() + '.webp';

/* 1. la firma, come la fa firmeTour() */
const f = await (await fetch(U + '/storage/v1/object/upload/sign/media/' + percorso, {
  method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: '{}',
})).json();
d('la firma di caricamento si ottiene', !!f.url, f.error ?? '');
if (!f.url) process.exit(1);

/* 2. il PUT come lo fa il browser: SENZA nessuna chiave, solo la firma */
const webp = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=', 'base64');
const su = await fetch(U + '/storage/v1' + f.url, {
  method: 'PUT', headers: { 'content-type': 'image/webp' }, body: webp,
});
d('il browser carica con la sola firma, senza chiavi', su.ok, su.ok ? '' : await su.text());

/* 3. e il file esce pubblico: e' quello che finisce dentro blocks.images */
const pub = U + '/storage/v1/object/public/media/' + percorso;
const g = await fetch(pub);
d("il file e' leggibile pubblicamente", g.ok, g.status + ' ' + g.headers.get('content-type'));

/* 4. il filtro di galleria.ts guarda il NOME del file: lo terrebbe? */
const { fotoAttinente, provaDi } = await import('file:///D:/PROGETTO_AI/PRESTIGERENT_NEW_WEBSITE/src/lib/galleria.ts')
  .catch(() => ({}));
if (fotoAttinente) {
  const prova = provaDi('private-tour-siena-and-san-gimignano', { name: 'Siena and San Gimignano' });
  d('il filtro della scheda tiene la foto appena caricata', fotoAttinente(pub, prova), percorso.split('/').pop());
} else {
  console.log('  (il filtro si prova con `npm test`: qui il TypeScript non si importa a crudo)');
}

/* 5. pulizia */
const del = await fetch(U + '/storage/v1/object/media', {
  method: 'DELETE', headers: { ...H, 'content-type': 'application/json' },
  body: JSON.stringify({ prefixes: [percorso] }),
});
d('file di prova cancellato', del.ok);
const dopo = await fetch(pub);
d('e non risponde piu\u0027', dopo.status === 400 || dopo.status === 404, 'stato ' + dopo.status);
