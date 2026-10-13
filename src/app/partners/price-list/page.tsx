import { Alert, Button, Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloPartner } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { ListinoTabelle } from '@/components/admin/ListinoTabelle';
import { vociPartner } from '@/lib/menu-admin';
import { listino } from '@/lib/regiondo-listino';
import { leggiCommissioni } from '@/lib/commissioni-db';
import { linguaPartner } from '@/lib/partners-lingua';
import { testiDi } from '@/lib/partners-testi';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Price list · Prestige Rent Partners' };

/* IL LISTINO DEL PARTNER: prestigerent.com/partners/price-list/, in
 * inglese o in italiano (selettore EN/IT, src/lib/partners-lingua.ts).
 *
 * Gli stessi prezzi della vista dell'admin (/admin/partners/listino/),
 * letti da Regiondo, ma senza lo stato delle tab PRICES e SENZA i codici
 * Regiondo: non si vedono a schermo e non devono nemmeno viaggiare nei
 * dati della pagina (trovato il 12/10/2026 sull'HTML pubblicato).
 *
 * Il menu e' sempre quello del partner -- anche quando la apre un admin,
 * che cosi' vede esattamente cosa vede un'agenzia. */
export default async function ListinoPartner() {
  const io = await soloPartner();
  const lingua = await linguaPartner();
  const T = testiDi(lingua);
  const [{ servizi }, { privato, gruppo }] = await Promise.all([listino(false), leggiCommissioni()]);
  const mancanti = servizi.filter((s) => !s.varianti).length;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo="listino"
      lingua={lingua}
      voci={vociPartner(lingua)}
      titolo={T.listinoTitolo}
      /* Generico, senza ora di lettura ne' sistema di prenotazione: al
         partner non interessano (proprieta', 12/10/2026). */
      sottotitolo={T.listinoSotto}
      /* Il listino in PDF con Retail, Net e commissione (proprieta',
         13/10/2026), nelle due lingue: /partners/price-list/pdf/. Link
         normali e non azioni: e' un file da scaricare. `component="a"`
         e non `{Link}`: questo e' un Server Component (CLAUDE.md). La
         lingua scelta col selettore va per prima. */
      azioni={
        <>
          {(lingua === 'it' ? (['it', 'en'] as const) : (['en', 'it'] as const)).map((l, i) => (
            <Button
              key={l}
              component="a"
              href={`/partners/price-list/pdf/?lingua=${l}`}
              variant={i === 0 ? 'filled' : 'default'}
              size="sm"
              title={T.scaricaPdfNota}
            >
              {T.scaricaPdf(l === 'it' ? 'Italiano' : 'English')}
            </Button>
          ))}
        </>
      }
    >
      {mancanti > 0 && (
        <Alert color="gray" variant="light" mb="lg">
          {T.listinoMancanti}
        </Alert>
      )}
      <ListinoTabelle servizi={servizi.map((s) => ({ ...s, sku: '' }))} lingua={lingua} commissioni={{ privato, gruppo }} />
      <Text size="sm" c="dimmed" mt="xl">
        {T.listinoPiede}
      </Text>
    </Guscio>
  );
}
