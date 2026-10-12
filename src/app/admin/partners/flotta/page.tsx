import { Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { FlottaVista } from '@/components/partners/FlottaVista';
import { vociPerRuolo } from '@/lib/menu-admin';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* LA FLOTTA vista dall'admin, dentro il pannello. Il contenuto e' lo
 * stesso che vede il partner su /partners/fleet/ (FlottaVista). */
export default async function FlottaAdmin() {
  const io = await soloGestione();
  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Flotta"
      sottotitolo="La pagina come la vede un partner su prestigerent.com/partners/fleet/. Mezzi, posti e descrizioni si cambiano in src/lib/flotta.ts."
    >
      <Text size="sm" c="dimmed" mb="lg">Testi in inglese: sono quelli che leggono i partner.</Text>
      <FlottaVista />
    </Guscio>
  );
}
