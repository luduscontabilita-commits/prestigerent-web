import { Alert, Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloPartner } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { ListinoTabelle } from '@/components/admin/ListinoTabelle';
import { vociPerRuolo } from '@/lib/menu-admin';
import { listino } from '@/lib/regiondo-listino';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price list · Prestige Rent Partners' };

/* IL LISTINO DEL PARTNER: prestigerent.com/partners/price-list/.
 *
 * Gli stessi prezzi della vista dell'admin (/admin/partners/listino/), letti da
 * Regiondo, ma in inglese, senza lo stato delle tab PRICES e SENZA i
 * codici Regiondo: non si vedono a schermo e non devono nemmeno viaggiare
 * nei dati della pagina (trovato il 12/10/2026 sull'HTML pubblicato).
 *
 * Il menu e' sempre quello del partner -- anche quando la apre un admin,
 * che cosi' vede esattamente cosa vede un'agenzia. */
export default async function ListinoPartner() {
  const io = await soloPartner();
  const { servizi, letto } = await listino(false);
  const mancanti = servizi.filter((s) => !s.varianti).length;
  const quando = new Date(letto).toLocaleString('en-GB', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo="listino"
      voci={vociPerRuolo('listino')}
      titolo="Price list"
      sottotitolo={`Public prices in euro for every service and option, read from our booking system on ${quando}. They always match the prices on prestigerent.com.`}
    >
      {mancanti > 0 && (
        <Alert color="gray" variant="light" mb="lg">
          Some prices could not be loaded right now. Please reload the page in a few minutes.
        </Alert>
      )}
      <ListinoTabelle servizi={servizi.map((s) => ({ ...s, sku: '' }))} lingua="en" />
      <Text size="sm" c="dimmed" mt="xl">
        Prices per party are for the whole vehicle and group, not per person. For larger parties or custom itineraries,
        write to usa@prestigerent.com.
      </Text>
    </Guscio>
  );
}
