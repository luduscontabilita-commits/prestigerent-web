import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { RichiesteListino } from '@/components/admin/RichiesteListino';
import { vociPerRuolo } from '@/lib/menu-admin';
import { approvaRichiesta, nuovaPasswordPartner, rifiutaRichiesta } from '../azioni';
import { cambiaAttivo } from '../../utenti/azioni';
import { caricaPartners } from '../carica';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* PARTNERS → PARTNER ATTIVI: chi entra nell'area partner, con i suoi
 * recapiti e i dati scritti alla registrazione (pulsante «Dati»).
 * Da qui si manda una password nuova o si chiude l'accesso.
 *
 * Si gestiscono SOLO qui: /admin/utenti/ elenca guide e admin. */
export default async function PartnersAttivi() {
  const io = await soloGestione();
  const { richieste, partner } = await caricaPartners();

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Partners · Partner attivi"
      sottotitolo="Chi può entrare in prestigerent.com/partners/: listino prezzi e flotta, nient’altro. «Dati» mostra quello che la persona ha scritto registrandosi."
    >
      <RichiesteListino
        mostra="attivi"
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
