/* UN GIRO DI RISPOSTE, DA RIGA DI COMANDO.
 *
 *     node scripts/giro-recensioni.ts <file.json>
 *
 * Il file e' l'elenco delle recensioni lette dal portale (il portale si
 * apre col browser: ne' Viator ne' Tripadvisor ne' GetYourGuide danno
 * un'API, e viator.com risponde 403 a chi non e' un browser vero).
 *
 * Lo script le mette in coda, fa scrivere le risposte, le passa ai
 * controlli, assegna a ciascuna l'ora di uscita e salva tutto come
 * BOZZA. 🔴 Non pubblica niente e non puo' pubblicare niente: lo stato
 * resta `bozza` finche' una persona non approva.
 *
 * Rilanciarlo non crea doppioni (indice unico portale+prodotto+titolo+
 * autore), ma RISCRIVE le bozze non ancora approvate: e' il modo per
 * riprovare dopo aver cambiato i criteri.
 *
 * Esiste perche' la schermata del pannello non c'e' ancora. Quando ci
 * sara', questa resta la via da riga di comando per i giri grossi.
 *
 * Provato il 22/10/2026 su dieci recensioni vere: 0,35 centesimi di
 * dollaro in tutto, zero risposte fermate dai controlli.
 */
import { readFileSync } from 'node:fs';
import { chiedi } from './src/lib/modello.ts';
import { compitoDi, guaiDi, sistemaDi, type Recensione } from './src/lib/risposte.ts';
import { quandoPubblicarle } from './src/lib/attesa.ts';

const envTxt = readFileSync('.env.local', 'utf8');
const env = (k: string) =>
  new RegExp('^' + k + '=(.*)$', 'm').exec(envTxt)?.[1].trim().replace(/^"|"$/g, '') ?? '';
process.env.OPENROUTER_API_KEY = env('OPENROUTER_API_KEY');
const SB = env('NEXT_PUBLIC_SUPABASE_URL');
const KEY = env('SUPABASE_SECRET_KEY');

const sb = async (percorso: string, opzioni: RequestInit = {}) => {
  const r = await fetch(`${SB}/rest/v1/${percorso}`, {
    ...opzioni,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
      ...(opzioni.headers ?? {}),
    },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};

type Grezza = {
  i: number; data: string; autore: string; fonte: 'viator' | 'tripadvisor';
  voto: number; prodotto: string; titolo: string; testo: string;
};
const grezze: Grezza[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));

/* 1. in coda. `merge-duplicates` sull'indice unico: rifare il giro non
      crea doppioni, e il riepilogo di Viator ripete le stesse righe
      finche' non si risponde. */
const righe = await sb('coda_recensioni?on_conflict=portale,prodotto,titolo,autore', {
  method: 'POST',
  body: JSON.stringify(
    grezze.map((g) => ({
      fonte: g.fonte, portale: 'viator', prodotto: g.prodotto, titolo: g.titolo,
      voto: g.voto, autore: g.autore, lingua: 'en', testo: g.testo, stato: 'letta',
    }))
  ),
});
console.log(`in coda: ${righe.length} recensioni\n`);

/* 2. gli orari, decisi una volta per tutto il gruppo */
const orari = quandoPubblicarle(righe.length, new Date());
const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', timeStyle: 'short' });

/* 3. le risposte */
let speso = 0;
let bloccate = 0;
for (let k = 0; k < righe.length; k++) {
  const r = righe[k];
  const rec: Recensione = {
    id: r.id, fonte: r.fonte, autore: r.autore, voto: r.voto,
    titolo: r.titolo, testo: r.testo, lingua: r.lingua,
    tour_slug: r.prodotto, data: null,
  };
  const out = await chiedi(sistemaDi('Prestige Rent'), compitoDi(rec));
  speso += out.costo;
  const guai = guaiDi(out.testo, rec);
  const blocca = guai.some((g) => g.gravita === 'blocca');
  if (blocca) bloccate++;

  await sb(`coda_recensioni?id=eq.${r.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      risposta: out.testo, modello: out.modello, costo: out.costo,
      stato: 'bozza', pubblicare_il: orari[k].toISOString(),
    }),
  });

  console.log('─'.repeat(72));
  console.log(`${k + 1}. ${r.autore}  ·  ${r.voto}★  ·  ${r.fonte}  ·  ${r.prodotto.slice(0, 42)}`);
  console.log(`   «${r.titolo}»`);
  console.log(`   ${r.testo.slice(0, 150).replace(/\s+/g, ' ')}${r.testo.length > 150 ? '…' : ''}`);
  console.log();
  console.log('   RISPOSTA: ' + out.testo.replace(/\n+/g, '\n             '));
  console.log(
    `   controlli: ${guai.length ? guai.map((g) => `[${g.gravita}] ${g.perche}`).join(' | ') : 'tutto a posto'}`
  );
  console.log(`   uscirebbe alle ${ora.format(orari[k])}`);
}

console.log('\n' + '═'.repeat(72));
console.log(`${righe.length} risposte scritte, ${bloccate} fermate dai controlli`);
console.log(`speso: ${(speso * 100).toFixed(3)} centesimi di dollaro (${(speso).toFixed(5)} $)`);
console.log('stato: BOZZA. Niente e` stato pubblicato.');
