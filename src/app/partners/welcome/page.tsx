import { comeSiChiama } from '@/lib/accesso';
import { soloPartner } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { Benvenuto } from '@/components/partners/Benvenuto';
import { vociPartner } from '@/lib/menu-admin';
import { linguaPartner } from '@/lib/partners-lingua';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'About us · Prestige Rent Partners' };

/* LA PAGINA INIZIALE DELL'AREA PARTNER: prestigerent.com/partners/welcome/,
 * la presentazione dell'azienda come nelle brochure B2B (proprieta',
 * 13/10/2026). Dopo l'accesso si arriva qui, non piu' al listino. Solo
 * con l'accesso (`soloPartner()`). Anno e contatti dalla tabella
 * `azienda`, come nel resto del sito. */
export default async function BenvenutoPartner() {
  const io = await soloPartner();
  const lingua = await linguaPartner();
  const { data } = await supabase.from('azienda').select('anno_fondazione, telefono, email, whatsapp').eq('id', 1).maybeSingle();
  const a = (data ?? {}) as { anno_fondazione?: number | null; telefono?: string | null; email?: string | null; whatsapp?: string | null };
  return (
    <Guscio chi={comeSiChiama(io)} ruolo="listino" lingua={lingua} voci={vociPartner(lingua)}>
      <Benvenuto
        lingua={lingua}
        c={{
          anno: a.anno_fondazione ?? 2000,
          telefono: a.telefono ?? '+39 055 286059',
          email: a.email ?? 'usa@prestigerent.com',
          whatsapp: a.whatsapp ?? '393338424047',
        }}
      />
    </Guscio>
  );
}
