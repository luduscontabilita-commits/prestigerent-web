import { createClient } from '@supabase/supabase-js';

/* Client di sola lettura per le pagine pubbliche.
 *
 * Usa la chiave pubblicabile, che finisce nel browser: e' sicura SOLO perche'
 * su ogni tabella e' attiva la sicurezza a livello di riga e il pubblico vede
 * unicamente le righe con status = 'published'. Se un domani si aggiunge una
 * tabella, la RLS va accesa nella stessa migrazione che la crea -- non dopo.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

export type TourRow = {
  id: string;
  slug: string;
  kind: 'small_group' | 'private' | 'transfer' | 'cruise' | 'other';
  regiondo_sku: string | null;
  status: 'draft' | 'review' | 'published';
  /* Nulli quasi ovunque: il 4,9 su 1.794 e' del tour Siena in piccolo gruppo,
     non dell'azienda. Vedi la migrazione `recensioni_per_tour`. */
  rating: number | null;
  reviews_count: number | null;
  reviews_source: string | null;
};
