import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { RichiesteListino } from '@/components/admin/RichiesteListino';
import { vociPerRuolo } from '@/lib/menu-admin';
import { approvaRichiesta, nuovaPasswordPartner, rifiutaRichiesta } from './azioni';
import { cambiaAttivo } from '../utenti/azioni';
import { caricaPartners } from './carica';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* PARTNERS → RICHIESTE: chi ha chiesto di entrare nell'area partner.
 *
 * Solo admin. Le richieste arrivano da prestigerent.com/partners/ e
 * restano qui finche' qualcuno non le decide; approvando, il sito crea
 * l'accesso e manda l'email con il link e la password
 * (src/app/admin/partners/azioni.ts). Chi ha gia' accesso sta in
 * /admin/partners/attivi/.
 *
 * Era /admin/listino/richieste/ fino al 12/10/2026: quell'indirizzo, gia'
 * scritto nelle email di avviso partite, rimanda qui. */
export default async function PartnersRichieste() {
  const io = await soloGestione();
  const { richieste, partner } = await caricaPartners();

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Partners · Richieste"
      sottotitolo="Chi chiede l’accesso da prestigerent.com/partners/ compare qui. Approvando, il sito crea l’accesso e manda all’utente un’email per entrare: vedrà solo il listino e la flotta."
    >
      <RichiesteListino
        mostra="richieste"
        richieste={richieste}
        partner={partner}
        approva={approvaRichiesta}
        rifiuta={rifiutaRichiesta}
        nuovaPassword={nuovaPasswordPartner}
        cambiaAttivo={cambiaAttivo}
      />
    </Guscio>
  );
}
