import Link from 'next/link';
import { Alert, Button, Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { ListinoTabelle, type StatoTab } from '@/components/admin/ListinoTabelle';
import { vociPerRuolo } from '@/lib/menu-admin';
import { listino } from '@/lib/regiondo-listino';
import { confronta } from '@/lib/prezzi-tab';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* IL LISTINO PREZZI, VISTA DELL'ADMIN (/admin/partners/listino/, era
 * /admin/listino/ fino al 12/10/2026): tutti i servizi del sito con i
 * prezzi di ogni variante e opzione, letti da Regiondo
 * (src/lib/regiondo-listino.ts), piu' lo stato della tab PRICES di ogni
 * pagina e il pulsante per rileggere subito.
 *
 * Solo admin dal 12/10/2026: i partner hanno la loro pagina,
 * /partners/price-list/, in inglese e senza codici Regiondo. Un partner
 * che arriva qui viene rimandato la' (`soloGestione()` -> /admin/ ->
 * /partners/price-list/).
 *
 * L'HTML delle tab non arriva al browser: il confronto si fa qui sul
 * server e al componente passa solo l'esito. */
export default async function Listino({
  searchParams,
}: {
  searchParams: Promise<{ fresco?: string }>;
}) {
  const io = await soloGestione();
  /* «Rileggi adesso» salta la cache di cinque minuti. */
  const fresco = (await searchParams).fresco === '1';

  const { servizi, tour, letto } = await listino(fresco);

  const statiTab: Record<string, StatoTab> = {};
  let daAggiornare = 0;
  for (const t of tour) {
    const s = servizi.find((x) => x.slug === t.slug);
    if (!s?.varianti) continue;
    const c = confronta(t.prices, s.varianti);
    statiTab[t.slug] = c.stato;
    if (c.stato !== 'uguale') daAggiornare++;
  }

  const mancanti = servizi.filter((s) => !s.varianti).length;
  const quando = new Date(letto).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Listino prezzi"
      sottotitolo={`Tutti i servizi del sito con i prezzi di ogni variante e opzione, letti da Regiondo il ${quando}. Si rileggono da soli ogni cinque minuti. I partner lo vedono, in inglese, su prestigerent.com/partners/.`}
      azioni={
        <>
          {/* La brochure da stampare per le fiere: due facciate A4, con i
              prezzi letti adesso (src/lib/listino-pdf.ts). Link normali e
              non bottoni d'azione: e' un file da scaricare. */}
          <Button component="a" href="/admin/partners/listino/pdf/?lingua=it" variant="filled" size="sm">
            PDF italiano
          </Button>
          <Button component="a" href="/admin/partners/listino/pdf/?lingua=en" variant="filled" size="sm">
            PDF English
          </Button>
          <Button component="a" href="/admin/partners/listino/?fresco=1" variant="default" size="sm">
            Rileggi adesso da Regiondo
          </Button>
        </>
      }
    >
      {daAggiornare > 0 && (
        <Alert color="orange" variant="light" mb="lg" title={`${daAggiornare} ${daAggiornare === 1 ? 'tab PRICES non è allineata' : 'tab PRICES non sono allineate'} a Regiondo`}>
          <Text size="sm">
            Le vedi nella pagina <Link href="/admin/partners/sincronizza/">Sincronizza tab PRICES</Link>, con le cifre prima e dopo. Niente cambia sul sito finché non premi Sincronizza.
          </Text>
        </Alert>
      )}
      {mancanti > 0 && (
        <Alert color="gray" variant="light" mb="lg">
          {`Regiondo non ha risposto per ${mancanti} ${mancanti === 1 ? 'prodotto' : 'prodotti'}: riprova fra poco.`}
        </Alert>
      )}
      <ListinoTabelle servizi={servizi} lingua="it" statiTab={statiTab} />
    </Guscio>
  );
}
