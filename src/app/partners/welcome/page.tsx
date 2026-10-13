import { comeSiChiama } from '@/lib/accesso';
import { soloPartner } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { Benvenuto } from '@/components/partners/Benvenuto';
import { vociPartner } from '@/lib/menu-admin';
import { linguaPartner } from '@/lib/partners-lingua';
import { contattiAzienda } from '@/lib/contatti-azienda';

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
  const c = await contattiAzienda();
  return (
    <Guscio chi={comeSiChiama(io)} ruolo="listino" lingua={lingua} voci={vociPartner(lingua)} contatti={c}>
      <Benvenuto lingua={lingua} c={c} />
    </Guscio>
  );
}
