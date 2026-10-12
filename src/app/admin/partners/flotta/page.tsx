import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { FlottaVista } from '@/components/partners/FlottaVista';
import { vociPerRuolo } from '@/lib/menu-admin';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* LA FLOTTA vista dall'admin, voce di primo livello del menu. Il
 * contenuto e' lo stesso che vede il partner su /partners/fleet/
 * (FlottaVista), qui in italiano: il partner lo legge in inglese o in
 * italiano a sua scelta. */
export default async function FlottaAdmin() {
  const io = await soloGestione();
  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Flotta"
      sottotitolo="La pagina come la vede un partner su prestigerent.com/partners/fleet/ (in inglese o in italiano, a sua scelta). Mezzi, posti e descrizioni si cambiano in src/lib/flotta.ts."
    >
      <FlottaVista lingua="it" />
    </Guscio>
  );
}
