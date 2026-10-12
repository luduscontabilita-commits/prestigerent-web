import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ALFABETO_PASSWORD, LUNGHEZZA_PASSWORD } from './accesso';

/* LA CHIAVE SEGRETA DI SUPABASE E LE PASSWORD GENERATE.
 *
 * Stavano dentro src/app/admin/utenti/azioni.ts; dal 12/10/2026 servono
 * anche all'approvazione degli utenti del listino
 * (src/app/admin/partners/azioni.ts). Un file `'use server'` puo'
 * esportare solo funzioni asincrone chiamabili dal browser: queste due
 * NON devono esserlo, quindi stanno qui, in un modulo normale che solo il
 * server importa.
 *
 * 🔴 LA CHIAVE SEGRETA SCAVALCA LA RLS. Chi usa `clientSegreto()` deve
 * aver gia' controllato il ruolo nella PRIMA riga dell'azione
 * (`chiAgisce`): qui sotto non c'e' piu' nessuna rete. */

export function clientSegreto(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chiave) return null;
  return createClient(url, chiave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Una password che si possa dettare al telefono senza domande.
 *  `crypto.getRandomValues` e non `Math.random()`: la seconda e'
 *  prevedibile, e una password prevedibile non e' una password. */
export function generaPassword(): string {
  const n = ALFABETO_PASSWORD.length;
  const byte = new Uint32Array(LUNGHEZZA_PASSWORD);
  crypto.getRandomValues(byte);
  /* Il modulo introduce una piccolissima preferenza per i primi
     caratteri dell'alfabeto; con 2^32 valori su 56 lettere e' fuori da
     qualunque rilevanza pratica, e vale la pena dirlo invece di far
     finta che il modulo sia innocuo. */
  return Array.from(byte, (b) => ALFABETO_PASSWORD[b % n]).join('');
}
