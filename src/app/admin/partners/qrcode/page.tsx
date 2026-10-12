import { Alert } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { GestioneQr } from '@/components/admin/GestioneQr';
import { vociPerRuolo } from '@/lib/menu-admin';
import { INDIRIZZO_QR } from '@/lib/qr-logo';
import { salvaDestinazioneQr } from '../azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* PARTNERS → QR CODE: il QR per brochure e stand in fiera, con il logo
 * al centro (src/lib/qr-logo.ts), e la destinazione modificabile anche
 * dopo la stampa (tabella `qr_link`, rimando in src/app/qr/[codice]/). */
export default async function QrCode() {
  const io = await soloGestione();
  const sb = await supabaseServer();
  const { data } = await sb.from('qr_link').select('codice, destinazione, aggiornato_il').eq('codice', 'partners').maybeSingle();
  const riga = data as { codice: string; destinazione: string; aggiornato_il: string | null } | null;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Partners · QR code"
      sottotitolo="Il QR per le brochure e lo stand in fiera, con il logo Prestige Rent al centro. Il QR stampato resta sempre lo stesso: dove porta lo decidi qui, anche dopo la stampa."
    >
      {riga ? (
        <GestioneQr
          codice={riga.codice}
          indirizzoQr={INDIRIZZO_QR}
          destinazione={riga.destinazione}
          aggiornato={riga.aggiornato_il}
          salva={salvaDestinazioneQr}
        />
      ) : (
        <Alert color="red" variant="light">
          Manca la riga «partners» nella tabella qr_link: va applicata la migrazione 20261012_qr_link.sql.
        </Alert>
      )}
    </Guscio>
  );
}
