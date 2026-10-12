import { clientSegreto } from '@/lib/chiave-segreta';
import { COMMISSIONI_INIZIALI, type Commissioni } from '@/lib/commissioni';

/** Le percentuali delle commissioni (tabella `commissioni`). Si leggono
 *  con la chiave segreta, sul server: la tabella e' chiusa a tutti tranne
 *  che all'admin, e il partner le vede solo gia' applicate al listino.
 *  Se la lettura fallisce valgono quelle di partenza (10% e 20%). */
export async function leggiCommissioni(): Promise<Commissioni & { aggiornato: string | null }> {
  const sb = clientSegreto();
  if (!sb) return { ...COMMISSIONI_INIZIALI, aggiornato: null };
  const { data, error } = await sb.from('commissioni').select('tipo, percentuale, aggiornato_il');
  if (error || !data?.length) return { ...COMMISSIONI_INIZIALI, aggiornato: null };
  const c = { ...COMMISSIONI_INIZIALI, aggiornato: null as string | null };
  for (const r of data as { tipo: string; percentuale: number | string; aggiornato_il: string }[]) {
    if (r.tipo === 'privato' || r.tipo === 'gruppo') c[r.tipo] = Number(r.percentuale);
    if (!c.aggiornato || r.aggiornato_il > c.aggiornato) c.aggiornato = r.aggiornato_il;
  }
  return c;
}
