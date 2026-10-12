import { comeSiChiama } from '@/lib/accesso';
import { soloPartner } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { FlottaVista } from '@/components/partners/FlottaVista';
import { vociPartner } from '@/lib/menu-admin';
import { linguaPartner } from '@/lib/partners-lingua';
import { testiDi } from '@/lib/partners-testi';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Our fleet · Prestige Rent Partners' };

/* LA FLOTTA DEL PARTNER: prestigerent.com/partners/fleet/, in inglese o
 * in italiano (selettore EN/IT). Solo con l'accesso (`soloPartner()`).
 * Il contenuto sta in FlottaVista, lo stesso che l'admin vede in
 * /admin/partners/flotta/. */
export default async function FlottaPartner() {
  const io = await soloPartner();
  const lingua = await linguaPartner();
  const T = testiDi(lingua);
  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo="listino"
      lingua={lingua}
      voci={vociPartner(lingua)}
      titolo={T.flottaTitolo}
      sottotitolo={T.flottaSotto}
    >
      <FlottaVista lingua={lingua} />
    </Guscio>
  );
}
