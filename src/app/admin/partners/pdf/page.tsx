import { Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* LISTINO PREZZI → PDF BROCHURE: i due download della brochure da fiera
 * (src/lib/listino-pdf.ts), voce di menu propria per richiesta della
 * proprieta' (12/10/2026). Il file si genera al momento del clic, con i
 * prezzi letti da Regiondo in quell'istante: non c'e' niente da
 * aggiornare a mano.
 *
 * Solo componenti Mantine semplici: e' un Server Component. */
const VERSIONI = [
  { lingua: 'it', titolo: 'Italiano', testo: 'Per i clienti italiani: testi, sezioni e prezzi in formato italiano (€ 1.000).' },
  { lingua: 'en', titolo: 'English', testo: 'Per i clienti esteri: testi e sezioni in inglese, prezzi in formato inglese (€1,000).' },
];

export default async function PdfBrochure() {
  const io = await soloGestione();
  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Listino prezzi · PDF brochure"
      sottotitolo="La brochure da stampare e mostrare ai clienti in fiera: due facciate A4 con il logo, una breve presentazione di Prestige Rent, i contatti e tutti i servizi con i prezzi di Regiondo letti al momento del download."
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" maw={820}>
        {VERSIONI.map((v) => (
          <Card key={v.lingua} withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Title order={2} size="h4">{v.titolo}</Title>
              <Text size="sm" c="dimmed">{v.testo}</Text>
              <Group>
                <Button component="a" href={`/admin/partners/listino/pdf/?lingua=${v.lingua}`}>
                  Scarica il PDF
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      <Text size="sm" c="dimmed" mt="xl" maw={820}>
        Il file contiene sempre i prezzi di quel momento: se cambi un prezzo su Regiondo, basta scaricarlo di nuovo
        (al massimo dopo cinque minuti, il tempo per cui il sito tiene in memoria i prezzi).
      </Text>
    </Guscio>
  );
}
