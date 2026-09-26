import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* I FILE DELLA GALLERY: CARICAMENTO, ANTEPRIME, COPIA, CANCELLAZIONE.
 *
 * ── 🔴 PERCHE' QUI SERVE LA CHIAVE SEGRETA E ALTROVE NO ────────────────
 * Le RIGHE (`gallery_images`, `gallery_image_tags`, le impostazioni) si
 * scrivono con la sessione dell'utente e la chiave pubblicabile, come
 * ogni altra azione di questo pannello: cosi' la RLS si applica davvero e
 * un controllo di ruolo dimenticato nel codice non apre niente.
 *
 * I FILE no, e non per scelta: `storage.objects` appartiene a
 * `supabase_storage_admin`, e il ruolo con cui girano le migrazioni non ne
 * e' membro -- misurato il 26/09/2026,
 * `pg_has_role('postgres','supabase_storage_admin','MEMBER')` e' falso.
 * Le policy sullo storage non si possono quindi versionare in una
 * migrazione: andrebbero create a mano dal pannello Supabase, e la
 * proprieta' ha deciso di non farlo adesso. Senza quelle policy la chiave
 * pubblicabile non puo' scrivere in nessuno dei due bucket.
 *
 * ── PERCHE' QUESTO NON APRE NIENTE AL PUBBLICO ─────────────────────────
 *  - `gallery-inbox` ha `public = false`: senza una firma prodotta qui
 *    nessun indirizzo risponde. E' la CHIAVE a essere privilegiata, non il
 *    bucket;
 *  - la chiave segreta non arriva mai al browser: queste funzioni girano
 *    solo dentro server action, chiamate DOPO `chiAgisce()`;
 *  - a decidere cosa e' pubblico restano le RIGHE, che passano dalla RLS.
 *    All'approvazione si copia il file e poi si aggiorna la riga: se il
 *    database rifiuta l'aggiornamento, la copia si butta (vedi
 *    `approva()` in admin/gallery/azioni.ts). Un file nel bucket pubblico
 *    senza una riga approvata non e' raggiungibile da nessuna pagina,
 *    perche' la vista `gallery_public` parte dalle righe.
 */

export const BUCKET_PUBBLICO = 'gallery';
export const BUCKET_INBOX = 'gallery-inbox';

/** Quanto vive l'indirizzo firmato con cui un admin guarda un'anteprima
 *  nell'inbox. Dieci minuti: il tempo di esaminare una coda, non il tempo
 *  di girare un indirizzo che resta valido. */
const FIRMA_SECONDI = 600;

function segreto(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  /* I due nomi convivono nei progetti Supabase (`service_role` e' stato
     rinominato `secret`): si prova il nuovo e si ricade sul vecchio, come
     fanno gia' numeri-freschi.ts e conversioni-memoria.ts. */
  const chiave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chiave) return null;
  return createClient(url, chiave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function fileConfigurati(): boolean {
  return segreto() !== null;
}

/** Il nome del file dentro il bucket. Cartelle per anno e mese perche' un
 *  bucket con diecimila file in un solo livello e' impossibile da guardare
 *  dal pannello Supabase il giorno che serve; e un pezzo casuale in fondo
 *  perche' due guide che caricano `IMG_0042.jpg` lo stesso giorno non
 *  devono sovrascriversi -- il vincolo `unique (bucket, storage_path)`
 *  rifiuterebbe la seconda riga, e la seconda persona non capirebbe
 *  perche'. */
export function nomeFile(quando: Date = new Date()): string {
  const anno = quando.getUTCFullYear();
  const mese = String(quando.getUTCMonth() + 1).padStart(2, '0');
  const caso = crypto.randomUUID();
  return `${anno}/${mese}/${caso}.webp`;
}

/** L'indirizzo firmato con cui il browser carica il file direttamente
 *  nello storage.
 *
 *  PERCHE' NON SI PASSA IL FILE ALLA SERVER ACTION: il corpo di una server
 *  action su Vercel e' limitato a 1 MB, e una foto anche ricodificata a
 *  2400px ci arriva vicino. Il browser carica dritto nello storage con
 *  questa firma, e alla server action arriva solo la riga da scrivere. */
export async function firmaCaricamento(bucket: string, percorso: string) {
  const sb = segreto();
  if (!sb) return { errore: 'Lo spazio file non e’ configurato (SUPABASE_SECRET_KEY).' as string };
  const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(percorso);
  if (error || !data) return { errore: error?.message ?? 'Firma non ottenuta.' };
  return { percorso, token: data.token, url: data.signedUrl };
}

/** Le anteprime dell'inbox per la coda di approvazione: indirizzi a
 *  scadenza, uno per foto. Le foto non approvate non hanno nessun
 *  indirizzo pubblico, quindi senza questi l'admin non potrebbe vederle. */
export async function firmaAnteprime(percorsi: string[]): Promise<Record<string, string>> {
  const sb = segreto();
  if (!sb || !percorsi.length) return {};
  const { data } = await sb.storage.from(BUCKET_INBOX).createSignedUrls(percorsi, FIRMA_SECONDI);
  const out: Record<string, string> = {};
  for (const r of data ?? []) {
    if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  }
  return out;
}

/** La copia inbox -> pubblico, che e' il gesto dell'approvazione.
 *  `copy` e non scarica-e-ricarica: il file non passa da qui, lo sposta
 *  Supabase al suo interno. */
export async function copiaInPubblico(percorso: string): Promise<string | null> {
  const sb = segreto();
  if (!sb) return 'Lo spazio file non e’ configurato.';
  const { error } = await sb.storage.from(BUCKET_INBOX).copy(percorso, percorso, {
    destinationBucket: BUCKET_PUBBLICO,
  });
  return error?.message ?? null;
}

export async function cancella(bucket: string, percorsi: string[]): Promise<string | null> {
  const sb = segreto();
  if (!sb) return 'Lo spazio file non e’ configurato.';
  if (!percorsi.length) return null;
  const { error } = await sb.storage.from(bucket).remove(percorsi);
  return error?.message ?? null;
}
