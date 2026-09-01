import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* LA MEMORIA DI COSA E' GIA' STATO CARICATO.
 *
 * ── PERCHE' NON BASTA IL NUMERO D'ORDINE ────────────────────────────
 * Google e Meta scartano i doppioni per conto loro, ed e' vero. Ma
 * fidarsi di quello vuol dire rimandare ogni notte tutte le
 * prenotazioni della finestra, e non e' gratis: il tetto giornaliero di
 * chiamate si consuma, i rapporti degli scarti diventano illeggibili
 * (novanta righe "gia' vista" e due nuove), e soprattutto non si sa piu'
 * cosa e' stato caricato davvero. Il giorno che un caricamento sbaglia,
 * senza un registro non c'e' modo di dire quali righe sono partite.
 *
 * ── LA REGOLA CHE CONTA ─────────────────────────────────────────────
 * Si segna solo quello che il destinatario ha ACCETTATO. Un caricamento
 * fallito non lascia traccia di "fatto": la notte dopo si riprova. Il
 * contrario -- segnare prima e correggere dopo -- perde per sempre le
 * righe di ogni caricamento andato male, e non se ne accorge nessuno.
 *
 * ── LA CHIAVE SEGRETA ───────────────────────────────────────────────
 * Qui serve la chiave di servizio, non quella pubblicabile: la tabella
 * ha la RLS accesa e nessuna policy di scrittura, quindi con la chiave
 * del browser non si scrive niente (ed e' voluto -- quella chiave la
 * legge chiunque apra gli strumenti dello sviluppatore).
 *
 * Se la chiave non c'e', la memoria non e' disponibile: la modalita' di
 * prova va avanti lo stesso e lo dice, il caricamento vero si rifiuta di
 * partire. Caricare senza memoria significa ricaricare tutto ogni notte
 * per sempre.
 */

/* I nomi con cui il registro distingue le destinazioni.
 * `_lead` sono le richieste dal modulo: vanno su un'altra azione di
 * Google Ads e su un altro evento di Analytics, quindi devono avere un
 * conto loro -- se condividessero il nome con gli acquisti, una
 * richiesta gia' mandata impedirebbe l'invio dell'acquisto con lo
 * stesso identificativo, e nessuno capirebbe perche'. */
export type Destinatario =
  | 'google'
  | 'meta'
  | 'ga4'
  | 'google_lead'
  | 'ga4_lead';

export type Esito = {
  ordine: string;
  destinatario: Destinatario;
  esito: 'ok' | 'rifiutata';
  valore?: number;
  creata_il?: string;
  motivo?: string | null;
};

const TABELLA = 'conversioni_caricate';

function chiave(): { url: string; segreta: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  /* Due nomi accettati apposta: Supabase ha ribattezzato le chiavi
     (`service_role` -> `secret`) e i due nomi convivono nei progetti
     esistenti. Meglio due righe qui che un lavoro notturno che non
     parte perche' la variabile si chiama come l'altra. */
  const segreta = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !segreta) return null;
  return { url, segreta };
}

export function memoriaConfigurata(): boolean {
  return chiave() !== null;
}

let cliente: SupabaseClient | null = null;

function db(): SupabaseClient | null {
  const k = chiave();
  if (!k) return null;
  if (!cliente) {
    cliente = createClient(k.url, k.segreta, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

/** Le coppie `destinatario:ordine` gia' caricate con successo, fra
 *  quelle passate. Si chiede solo per gli ordini in mano invece di
 *  leggere la tabella intera: fra un anno saranno decine di migliaia di
 *  righe e non serve portarsele dentro una funzione ogni notte. */
export async function giaFatte(
  ordini: string[],
): Promise<{ ok: boolean; insieme: Set<string>; errore?: string }> {
  const insieme = new Set<string>();
  const c = db();
  if (!c) return { ok: false, insieme, errore: 'chiave di servizio Supabase assente' };
  if (!ordini.length) return { ok: true, insieme };

  /* A pezzi da 200: un `in (...)` con migliaia di valori finisce dentro
     l'URL della richiesta e supera il limite di lunghezza, con un errore
     che parla di URI e non di quello che sta succedendo. */
  for (let i = 0; i < ordini.length; i += 200) {
    const pezzo = ordini.slice(i, i + 200);
    const { data, error } = await c
      .from(TABELLA)
      .select('ordine,destinatario')
      .eq('esito', 'ok')
      .in('ordine', pezzo);
    if (error) return { ok: false, insieme, errore: error.message };
    for (const r of data ?? []) insieme.add(`${r.destinatario}:${r.ordine}`);
  }
  return { ok: true, insieme };
}

/** Registra gli esiti. `upsert` sulla coppia (ordine, destinatario):
 *  una riga rifiutata ieri e accettata stanotte diventa accettata, e non
 *  si accumulano doppioni del registro. */
export async function segnaEsiti(esiti: Esito[]): Promise<{ ok: boolean; errore?: string }> {
  if (!esiti.length) return { ok: true };
  const c = db();
  if (!c) return { ok: false, errore: 'chiave di servizio Supabase assente' };

  const righe = esiti.map((e) => ({
    ordine: e.ordine,
    destinatario: e.destinatario,
    esito: e.esito,
    valore: e.valore ?? null,
    creata_il: e.creata_il ?? null,
    motivo: e.motivo ? e.motivo.slice(0, 500) : null,
    caricata_il: new Date().toISOString(),
  }));

  for (let i = 0; i < righe.length; i += 500) {
    const { error } = await c
      .from(TABELLA)
      .upsert(righe.slice(i, i + 500), { onConflict: 'ordine,destinatario' });
    if (error) return { ok: false, errore: error.message };
  }
  return { ok: true };
}
