import { Anchor, Badge, Card, Code, Group, SimpleGrid, Table, Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { fotoDi, type Blocchi } from '@/components/admin/blocchi';
import { CaricaFotoTour } from '@/components/admin/CaricaFotoTour';
import { aggiungiFoto, firmeTour } from './azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const LOCALE = 'en';

type Riga = {
  slug: string;
  kind: string | null;
  status: string | null;
  tour_content?: { locale: string; blocks: Blocchi }[];
};

/* L'ELENCO DEI TOUR, ORDINATO PER PROBLEMA.
 *
 * Chi apre questa pagina non cerca "un tour": cerca quello con la
 * copertina sbagliata o con due foto in croce. Per questo i tour con
 * poche foto vengono prima, e l'anteprima mostrata e' la PRIMA foto --
 * cioe' esattamente quella che finisce nell'elenco della home.
 */
export default async function ElencoFoto() {
  const io = await soloGestione();

  const sb = await supabaseServer();
  const { data } = await sb
    .from('tours')
    .select('slug, kind, status, tour_content(locale, blocks)')
    .order('slug');

  const righe = ((data ?? []) as unknown as Riga[]).map((r) => {
    const c = r.tour_content?.find((x) => x.locale === LOCALE);
    const foto = fotoDi(c?.blocks);
    return {
      slug: r.slug,
      kind: r.kind,
      status: r.status,
      nome: c?.blocks?.name ?? r.slug.replace(/-/g, ' '),
      quante: foto.length,
      copertina: foto[0]?.src ?? null,
    };
  });

  const ordinate = [...righe].sort((a, b) => a.quante - b.quante || a.slug.localeCompare(b.slug));
  const senzaFoto = ordinate.filter((r) => r.quante === 0).length;
  const pocheFoto = ordinate.filter((r) => r.quante > 0 && r.quante < 5).length;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Foto dei tour"}
      sottotitolo={<>
          L’ordine delle foto, tour per tour. La prima è la copertina: compare nell’elenco
          della home e nelle anteprime social. {ordinate.length} tour.
        </>}
    >

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="md">
        <Card withBorder radius="md" padding="sm">
          <Text fz={28} fw={800} lh={1.1}>{ordinate.length}</Text>
          <Text size="xs" c="dimmed">tour</Text>
        </Card>
        <Card withBorder radius="md" padding="sm">
          <Text fz={28} fw={800} lh={1.1} c={senzaFoto ? 'red' : 'green'}>{senzaFoto}</Text>
          <Text size="xs" c="dimmed">senza nemmeno una foto</Text>
        </Card>
        <Card withBorder radius="md" padding="sm">
          <Text fz={28} fw={800} lh={1.1} c={pocheFoto ? 'red' : 'green'}>{pocheFoto}</Text>
          <Text size="xs" c="dimmed">con meno di 5 foto</Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={620}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={92}>Copertina</Table.Th>
                <Table.Th>Tour</Table.Th>
                <Table.Th w={70}>Foto</Table.Th>
                <Table.Th w={120}>Carica</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ordinate.map((r) => (
                <Table.Tr key={r.slug}>
                  <Table.Td>
                    <Anchor href={`/admin/foto/${r.slug}/`}>
                      {r.copertina ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.copertina}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: 72, height: 54, borderRadius: 6,
                                      background: 'var(--mantine-color-gray-2)' }} />
                      )}
                    </Anchor>
                  </Table.Td>

                  <Table.Td>
                    <Anchor href={`/admin/foto/${r.slug}/`} underline="never">
                      <Text fw={600} size="sm">{r.nome}</Text>
                    </Anchor>
                    <Code>{r.slug}</Code>
                    <Group gap={6} mt={4}>
                      {r.kind && <Badge size="xs" variant="light" color="gray">{r.kind}</Badge>}
                      {r.status !== 'published' && (
                        <Badge size="xs" variant="light" color="red">{r.status ?? 'senza stato'}</Badge>
                      )}
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color={r.quante < 5 ? 'red' : 'gray'}>{r.quante}</Badge>
                  </Table.Td>

                  {/* Il caricamento sta QUI, sulla riga, e non solo dentro la
                      pagina del singolo tour: chi apre questo elenco lo apre
                      ordinato per problema, e i tour senza foto sono i primi.
                      Farlo passare dalla scheda vorrebbe dire due clic e un
                      ritorno indietro per ognuno. */}
                  <Table.Td>
                    <CaricaFotoTour
                      slug={r.slug}
                      nome={r.nome}
                      firme={firmeTour}
                      aggiungi={aggiungiFoto}
                      compatto
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Guscio>
  );
}
