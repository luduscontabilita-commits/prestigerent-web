import { supabaseServer } from '@/lib/auth';
import { CAMPI_TESTO, type ModificaTesto } from '@/lib/flotta';

/** I testi della flotta cambiati dall'admin (tabella `flotta_testi`).
 *  La tabella si legge con qualunque sessione: sono i testi che il partner
 *  vede comunque. Se la lettura fallisce -- per esempio prima che la
 *  migrazione sia applicata -- la pagina resta in piedi con i testi del
 *  codice: una flotta senza le ultime correzioni e' meglio di un 500. */
export async function modificheFlotta(): Promise<ModificaTesto[]> {
  try {
    const sb = await supabaseServer();
    const { data, error } = await sb.from('flotta_testi').select('chiave, lingua, campo, testo');
    if (error || !data) return [];
    const campi = new Set<string>(CAMPI_TESTO.map((c) => c.campo));
    return (data as ModificaTesto[]).filter((r) => campi.has(r.campo) && (r.lingua === 'en' || r.lingua === 'it'));
  } catch {
    return [];
  }
}
