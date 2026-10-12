'use server';

import { chiAgisce, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import { CAMPI_TESTO, FLOTTA, MAX_TESTO, type CampoTesto } from '@/lib/flotta';

/* I TESTI DELLA FLOTTA, modificati dall'admin in /admin/partners/flotta/.
 *
 * 🔴 `chiAgisce(RUOLI_GESTIONE)` PRIMA DI TUTTO, come ogni azione del
 * pannello: un partner e' autenticato e potrebbe chiamarla a mano. La
 * scrittura passa comunque dalla sessione, cioe' dalla policy `e_admin()`
 * di `flotta_testi`: il database rifiuterebbe anche se qui mancasse il
 * controllo.
 *
 * Niente revalidatePath: /partners/fleet/ e la pagina dell'admin sono
 * dinamiche e rileggono la tabella a ogni richiesta. */

export type EsitoTesto = { ok: boolean; errore?: string };

function valido(chiave: string, lingua: string, campo: string): string | null {
  if (!FLOTTA.some((m) => m.chiave === chiave)) return 'Mezzo sconosciuto.';
  if (lingua !== 'it' && lingua !== 'en') return 'Lingua sconosciuta.';
  if (!CAMPI_TESTO.some((c) => c.campo === campo)) return 'Campo sconosciuto.';
  return null;
}

export async function salvaTestoFlotta(
  chiave: string,
  lingua: 'it' | 'en',
  campo: CampoTesto,
  testo: string
): Promise<EsitoTesto> {
  const { io, errore } = await chiAgisce(RUOLI_GESTIONE);
  if (!io) return { ok: false, errore: errore! };

  const sbagliato = valido(chiave, lingua, campo);
  if (sbagliato) return { ok: false, errore: sbagliato };
  const t = String(testo ?? '').replace(/\s+/g, ' ').trim();
  if (t.length > MAX_TESTO) return { ok: false, errore: `Al massimo ${MAX_TESTO} caratteri.` };
  if (!t && CAMPI_TESTO.find((c) => c.campo === campo)!.obbligatorio) {
    return { ok: false, errore: 'Questo testo non può restare vuoto.' };
  }

  const sb = await supabaseServer();
  const { error } = await sb
    .from('flotta_testi')
    .upsert({ chiave, lingua, campo, testo: t, aggiornato_il: new Date().toISOString(), aggiornato_da: io.id });
  if (error) return { ok: false, errore: `Non salvato: ${error.message}` };
  return { ok: true };
}

/** Toglie la modifica: torna il testo scritto nel codice. */
export async function ripristinaTestoFlotta(chiave: string, lingua: 'it' | 'en', campo: CampoTesto): Promise<EsitoTesto> {
  const { io, errore } = await chiAgisce(RUOLI_GESTIONE);
  if (!io) return { ok: false, errore: errore! };

  const sbagliato = valido(chiave, lingua, campo);
  if (sbagliato) return { ok: false, errore: sbagliato };

  const sb = await supabaseServer();
  const { error } = await sb.from('flotta_testi').delete().match({ chiave, lingua, campo });
  if (error) return { ok: false, errore: `Non ripristinato: ${error.message}` };
  return { ok: true };
}
