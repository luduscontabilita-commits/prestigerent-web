import { Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { GestioneCommissioni } from '@/components/admin/GestioneCommissioni';
import { vociPerRuolo } from '@/lib/menu-admin';
import { tourDelListino } from '@/lib/regiondo-listino';
import { sezioneDi, SEZIONI } from '@/lib/listino';
import { unitaDi } from '@/lib/prezzi';
import { tipoCommissione } from '@/lib/commissioni';
import { leggiCommissioni } from '@/lib/commissioni-db';
import { salvaCommissioni } from './azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* LISTINO PREZZI → COMMISSIONI: le due percentuali dei partner
 * (src/lib/commissioni.ts), con quali servizi cadono in ognuna. Il tipo
 * di ogni servizio si calcola dal catalogo, senza chiedere i prezzi a
 * Regiondo: serve solo l'unita' del prezzo. */
export default async function Commissioni() {
  const io = await soloGestione();
  const [tour, c] = await Promise.all([tourDelListino(), leggiCommissioni()]);
  const servizi = tour.map((t) => ({ nome: t.nome, sezione: sezioneDi(t.categorie).sezione, unita: unitaDi({ PRICES: t.prices }, t.kind) }));
  const gruppi = servizi.filter((s) => tipoCommissione(s) === 'gruppo').map((s) => s.nome).sort((a, b) => a.localeCompare(b));
  const privati = SEZIONI.map((z) => ({
    sezione: z.it,
    quanti: servizi.filter((s) => s.sezione === z.chiave && tipoCommissione(s) === 'privato').length,
  })).filter((x) => x.quanti > 0);

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Listino prezzi · Commissioni"
      sottotitolo="Le commissioni dei partner. Dal prezzo Retail di Regiondo il listino ricava il Net (Retail meno la commissione, arrotondato all'euro) e la commissione. Le vedono i partner e l'admin."
    >
      <GestioneCommissioni
        privato={c.privato}
        gruppo={c.gruppo}
        aggiornato={c.aggiornato}
        gruppi={gruppi}
        privati={privati}
        salva={salvaCommissioni}
      />
      <Text size="sm" c="dimmed" mt="xl" maw={900}>
        Un servizio è «di gruppo» quando il prezzo è a persona, «privato» quando è per gruppo o veicolo: un tour nuovo si
        classifica da solo. Le percentuali non sono prezzi, quindi stanno nel database; i prezzi restano solo su Regiondo.
      </Text>
    </Guscio>
  );
}
