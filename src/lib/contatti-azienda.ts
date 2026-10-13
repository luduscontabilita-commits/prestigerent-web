import { supabase } from '@/lib/supabase';
import type { ContattiAzienda } from '@/lib/partners-benvenuto';

/** Anno e contatti dell'azienda dalla tabella `azienda`, per la
 *  presentazione dei partner e per i contatti in fondo al loro menu. I
 *  valori di riserva sono quelli della brochure B2B: valgono solo se la
 *  tabella non risponde. */
export async function contattiAzienda(): Promise<ContattiAzienda> {
  const { data } = await supabase.from('azienda').select('anno_fondazione, telefono, email, whatsapp').eq('id', 1).maybeSingle();
  const a = (data ?? {}) as { anno_fondazione?: number | null; telefono?: string | null; email?: string | null; whatsapp?: string | null };
  return {
    anno: a.anno_fondazione ?? 2000,
    telefono: a.telefono ?? '+39 055 286059',
    email: a.email ?? 'usa@prestigerent.com',
    whatsapp: a.whatsapp ?? '393338424047',
  };
}
