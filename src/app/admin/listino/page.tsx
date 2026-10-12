import Link from 'next/link';
import { Alert, Button, Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { haRuolo, RUOLI_GESTIONE, soloListino } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { ListinoTabelle, type StatoTab } from '@/components/admin/ListinoTabelle';
import { vociPerRuolo } from '@/lib/menu-admin';
import { listino } from '@/lib/regiondo-listino';
import { confronta } from '@/lib/prezzi-tab';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price list · Prestige Rent', robots: { index: false, follow: false } };

/* IL LISTINO PREZZI: tutti i servizi del sito con i prezzi di ogni
 * variante e opzione, letti da Regiondo (src/lib/regiondo-listino.ts).
 *
 * La vedono l'admin, in italiano, e gli utenti del listino (agenzie,
 * hotel, partner approvati), in inglese. All'admin si aggiunge lo stato
 * della tab PRICES di ogni pagina e il pulsante per rileggere subito.
 *
 * 🔴 L'HTML DELLE TAB NON ARRIVA AL BROWSER. Il confronto con la tab si
 * fa qui sul server e al componente passa solo l'esito («allineata»,
 * «da aggiornare»): il partner riceve i prezzi e basta.
 */
export default async function Listino({
  searchParams,
}: {
  searchParams: Promise<{ fresco?: string }>;
}) {
  const io = await soloListino();
  const admin = haRuolo(io, RUOLI_GESTIONE);
  /* «Rileggi adesso» salta la cache di cinque minuti: lo puo' fare solo
     l'admin, perche' sono 86 richieste a Regiondo ogni volta. */
  const fresco = admin && (await searchParams).fresco === '1';

  const { servizi, tour, letto } = await listino(fresco);

  let statiTab: Record<string, StatoTab> | undefined;
  let daAggiornare = 0;
  if (admin) {
    statiTab = {};
    for (const t of tour) {
      const s = servizi.find((x) => x.slug === t.slug);
      if (!s?.varianti) continue;
      const c = confronta(t.prices, s.varianti);
      statiTab[t.slug] = c.stato;
      if (c.stato !== 'uguale') daAggiornare++;
    }
  }

  const mancanti = servizi.filter((s) => !s.varianti).length;
  const quando = new Date(letto).toLocaleString(admin ? 'it-IT' : 'en-GB', {
    timeZone: 'Europe/Rome',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={admin ? 'Listino prezzi' : 'Price list'}
      sottotitolo={
        admin
          ? `Tutti i servizi del sito con i prezzi di ogni variante e opzione, letti da Regiondo il ${quando}. Si rileggono da soli ogni cinque minuti.`
          : `Public prices in euro for every service and option, read from our booking system on ${quando}. They always match the prices on prestigerent.com.`
      }
      azioni={
        admin ? (
          <Button component="a" href="/admin/listino/?fresco=1" variant="default" size="sm">
            Rileggi adesso da Regiondo
          </Button>
        ) : undefined
      }
    >
      {admin && daAggiornare > 0 && (
        <Alert color="orange" variant="light" mb="lg" title={`${daAggiornare} ${daAggiornare === 1 ? 'tab PRICES non è allineata' : 'tab PRICES non sono allineate'} a Regiondo`}>
          <Text size="sm">
            Le vedi nella pagina <Link href="/admin/listino/sincronizza/">Sincronizza tab PRICES</Link>, con le cifre prima e dopo. Niente cambia sul sito finché non premi Sincronizza.
          </Text>
        </Alert>
      )}
      {mancanti > 0 && (
        <Alert color="gray" variant="light" mb="lg">
          {admin
            ? `Regiondo non ha risposto per ${mancanti} ${mancanti === 1 ? 'prodotto' : 'prodotti'}: riprova fra poco.`
            : 'Some prices could not be loaded right now. Please reload the page in a few minutes.'}
        </Alert>
      )}
      <ListinoTabelle servizi={servizi} lingua={admin ? 'it' : 'en'} statiTab={statiTab} />
      {!admin && (
        <Text size="sm" c="dimmed" mt="xl">
          Prices per party are for the whole vehicle and group, not per person. For larger parties or custom itineraries,
          write to usa@prestigerent.com.
        </Text>
      )}
    </Guscio>
  );
}
