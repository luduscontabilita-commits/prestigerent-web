/* LA FOTOGRAFIA CHE ALIMENTA IL PANNELLO /michele/.
 *
 * ── PERCHE' UNA FOTOGRAFIA E NON CHIAMATE DAL VIVO ──────────────────
 * Le quattro fonti sono lente e capricciose: Regiondo pagina 250 righe
 * per volta e su trenta giorni ci mette due minuti, il Pianificatore di
 * Google altrettanto. Aprire il pannello e aspettare due minuti vuol dire
 * non aprirlo mai. Quindi il lavoro lo fa una volta al giorno un
 * passaggio notturno, che scrive una riga in `pannello`, e la pagina
 * legge quella.
 *
 * ── OGNI NUMERO PORTA LA SUA DATA ───────────────────────────────────
 * Un numero senza data invecchia in silenzio: fra un mese uno lo legge e
 * non sa se e' di ieri o di agosto. Qui `aggiornato` sta accanto a ogni
 * sezione, e la pagina lo mostra sempre.
 *
 * ── SE UNA FONTE E' GIU', LE ALTRE PASSANO ──────────────────────────
 * Ogni sezione si aggiorna per conto suo. Se Meta non risponde, resta la
 * fotografia di ieri con la sua data -- non sparisce tutto il pannello.
 */
import { createClient } from '@supabase/supabase-js';

const CLIENTE = 'prestigerent';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chiave) return null;
  return createClient(url, chiave, { auth: { persistSession: false } });
}

export type Sezione =
  | 'cassa'
  | 'spesa'
  | 'imbuto'
  | 'prodotti'
  | 'campagne'
  | 'pubblici'
  | 'potenziale';

export type Foto<T> = { dati: T; aggiornato: string } | null;

/** Legge una sezione della fotografia. `null` se non e' mai stata scritta. */
export async function leggi<T>(sezione: Sezione): Promise<Foto<T>> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from('pannello')
    .select('dati, aggiornato')
    .eq('cliente', CLIENTE)
    .eq('sezione', sezione)
    .maybeSingle();
  if (error || !data) return null;
  return { dati: data.dati as T, aggiornato: data.aggiornato as string };
}

/** Scrive (o sovrascrive) una sezione. La usa solo il lavoro notturno. */
export async function scrivi(sezione: Sezione, dati: unknown) {
  const c = db();
  if (!c) return { ok: false, errore: 'Supabase non configurato' };
  const { error } = await c
    .from('pannello')
    .upsert(
      { cliente: CLIENTE, sezione, dati, aggiornato: new Date().toISOString() },
      { onConflict: 'cliente,sezione' }
    );
  return error ? { ok: false, errore: error.message } : { ok: true };
}

/** Tutte le sezioni in una lettura sola: la pagina ne fa una, non sette. */
export async function leggiTutto(): Promise<Record<string, Foto<unknown>>> {
  const c = db();
  if (!c) return {};
  const { data } = await c
    .from('pannello')
    .select('sezione, dati, aggiornato')
    .eq('cliente', CLIENTE);
  const fuori: Record<string, Foto<unknown>> = {};
  for (const r of data ?? []) {
    fuori[r.sezione as string] = {
      dati: r.dati,
      aggiornato: r.aggiornato as string,
    };
  }
  return fuori;
}

/* ── LE FORME DEI DATI ───────────────────────────────────────────────
   Scritte qui e non sparse: il lavoro notturno e la pagina devono
   parlare la stessa lingua, e se una cambia l'altra non compila. */

export type Cassa = {
  giorni: number;
  ordini: number;
  incasso: number;
  diretti: { ordini: number; incasso: number };
  perCanale: { canale: string; ordini: number; incasso: number }[];
};

export type Spesa = {
  giorni: number;
  google: number;
  meta: number;
  clic: number;
};

export type Imbuto = {
  giorni: number;
  passi: { nome: string; quanti: number }[];
};

export type Prodotto = {
  nome: string;
  ordini: number;
  incasso: number;
  diretti: number;
  incassoDiretto: number;
};

export type Campagna = {
  nome: string;
  stato: string;
  spesa: number;
  clic: number;
  cpc: number;
  conversioni: number;
};

export type Pubblico = {
  dove: 'google' | 'meta';
  nome: string;
  quanti: number | null;
  usatoDa: number;
};

export type Potenziale = {
  parola: string;
  ricerche: number;
  concorrenza: string;
  cpc: number;
  giaComprata: boolean;
};
