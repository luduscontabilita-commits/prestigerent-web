'use server';

import { chiAgisce, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import { percentualeValida } from '@/lib/commissioni';

/* LE COMMISSIONI DEI PARTNER, salvate dall'admin in
 * /admin/partners/commissioni/.
 *
 * 🔴 `chiAgisce(RUOLI_GESTIONE)` PRIMA DI TUTTO: un partner e' autenticato
 * e potrebbe chiamare l'azione a mano per alzarsi la commissione. La
 * scrittura passa comunque dalla sessione, cioe' dalla policy `e_admin()`
 * di `commissioni`. Niente revalidatePath: le pagine del listino sono
 * dinamiche e rileggono le percentuali a ogni richiesta. */

export type EsitoCommissioni = { ok: boolean; errore?: string };

export async function salvaCommissioni(privato: string | number, gruppo: string | number): Promise<EsitoCommissioni> {
  const { io, errore } = await chiAgisce(RUOLI_GESTIONE);
  if (!io) return { ok: false, errore: errore! };

  const p = percentualeValida(privato);
  const g = percentualeValida(gruppo);
  if (p == null || g == null) return { ok: false, errore: 'Le percentuali vanno da 0 a 99.' };

  const sb = await supabaseServer();
  const ora = new Date().toISOString();
  const { error } = await sb.from('commissioni').upsert([
    { tipo: 'privato', percentuale: p, aggiornato_il: ora, aggiornato_da: io.id },
    { tipo: 'gruppo', percentuale: g, aggiornato_il: ora, aggiornato_da: io.id },
  ]);
  if (error) return { ok: false, errore: `Non salvate: ${error.message}` };
  return { ok: true };
}
