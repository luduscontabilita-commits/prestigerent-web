import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { FlottaModifica } from '@/components/admin/FlottaModifica';
import { datiFlotta } from '@/components/partners/FlottaVista';
import { vociPerRuolo } from '@/lib/menu-admin';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* LA FLOTTA vista dall'admin, voce di primo livello del menu. Il
 * contenuto e' lo stesso che vede il partner su /partners/fleet/, con i
 * testi cliccabili e il selettore Italiano/English (FlottaModifica): le
 * modifiche vanno nella tabella `flotta_testi`. */
export default async function FlottaAdmin() {
  const io = await soloGestione();
  const { usati, modifiche } = await datiFlotta();
  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Flotta"
      sottotitolo="La pagina come la vede un partner su prestigerent.com/partners/fleet/, in inglese o in italiano a sua scelta. Le descrizioni si modificano qui, in tutte e due le lingue; nome, posti e foto dei mezzi restano in src/lib/flotta.ts."
    >
      <FlottaModifica usati={usati} modifiche={modifiche} />
    </Guscio>
  );
}
