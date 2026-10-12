import { comeSiChiama } from '@/lib/accesso';
import { soloPartner } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { FlottaVista } from '@/components/partners/FlottaVista';
import { vociPerRuolo } from '@/lib/menu-admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Our fleet · Prestige Rent Partners' };

/* LA FLOTTA DEL PARTNER: prestigerent.com/partners/fleet/. Solo con
 * l'accesso (`soloPartner()`). Il contenuto sta in FlottaVista, lo stesso
 * che l'admin vede in /admin/partners/flotta/. */
export default async function FlottaPartner() {
  const io = await soloPartner();
  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo="listino"
      voci={vociPerRuolo('listino')}
      titolo="Our fleet"
      sottotitolo="The vehicles we use for our tours and transfers: how many people each one takes and which services it runs. We own and maintain all of them, with our own drivers."
    >
      <FlottaVista />
    </Guscio>
  );
}
