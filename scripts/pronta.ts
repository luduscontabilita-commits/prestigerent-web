/* IL VERDETTO, DA RIGA DI COMANDO.
 *
 *     node scripts/pronta.ts
 *
 * Stampa una riga di JSON: {via:true, id, autore} se C'E' una risposta
 * che puo' uscire adesso secondo TUTTI i freni di src/lib/pubblicazione.ts
 * (interruttore, tetto, errori, orario, distanza a caso dall'ultima,
 * tetto orario, controlli d'uscita); altrimenti {via:false, perche}.
 *
 * Lo chiama il controllo di shell ogni due minuti, e sveglia il giro
 * SOLO quando il verdetto e' «via». Cosi' le regole stanno in un posto
 * solo e la shell non deve ricopiarle -- ne' indovinarle.
 */
import { readFileSync } from 'node:fs';
import { cosaEsce } from '../src/lib/pubblicazione.ts';

const envTxt = readFileSync('.env.local', 'utf8');
const env = (k: string) =>
  new RegExp('^' + k + '=(.*)$', 'm').exec(envTxt)?.[1].trim().replace(/^"|"$/g, '') ?? '';
const SB = env('NEXT_PUBLIC_SUPABASE_URL');
const K = env('SUPABASE_SECRET_KEY');
const h = { apikey: K, Authorization: `Bearer ${K}` };

const righe = await fetch(
  `${SB}/rest/v1/coda_recensioni?select=id,fonte,autore,voto,titolo,testo,lingua,prodotto,stato,risposta,corretto,pubblicare_il,pubblicata_il,data_recensione`,
  { headers: h }
).then((r) => r.json());
const [imp] = await fetch(`${SB}/rest/v1/impostazioni_recensioni?select=automatico,max_al_giorno`, {
  headers: h,
}).then((r) => r.json());

const v = cosaEsce(righe, imp ?? { automatico: false, max_al_giorno: 0 });
console.log(
  JSON.stringify(v.via ? { via: true, id: v.riga.id, autore: v.riga.autore } : { via: false, perche: v.perche })
);
