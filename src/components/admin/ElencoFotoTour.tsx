'use client';

import { Anchor, Badge, Card, Code, Group, SimpleGrid, Table, Text } from '@mantine/core';
import { CaricaFotoTour } from './CaricaFotoTour';
import { aggiungiFoto, firmeTour } from '@/app/admin/foto/azioni';

/* L'ELENCO DEI TOUR CON LE LORO FOTO.
 *
 * ── 🔴 PERCHE' E' UN COMPONENTE CLIENT, E NON LA PAGINA ────────────────
 * Perche' il 26/09/2026 questa tabella, scritta dentro il Server
 * Component della pagina, ha mandato /admin/foto/ in 500 -- errore React
 * #130, «tipo di elemento non valido: undefined».
 *
 * La causa e' il confine fra Server e Client Component. Quando un Server
 * Component importa da un modulo client -- e tutto @mantine/core lo e' --
 * non riceve i componenti veri: riceve dei RIFERIMENTI, che Next
 * sostituisce nel browser. Un riferimento pero' non ha le proprieta'
 * statiche dell'originale: `Table.Thead`, `Table.Tbody`,
 * `Table.ScrollContainer` diventano `undefined`, e React si trova a
 * rendere `undefined` come se fosse un componente.
 *
 * Non e' una stranezza di Mantine: vale per QUALUNQUE componente
 * composto importato in un Server Component. E' lo stesso confine che il
 * 26/09/2026 aveva gia' fatto cadere tutto il pannello in 500 con
 * `vociPerRuolo()` e con `component={Link}` su una Card -- terza volta
 * dello stesso errore, in tre forme diverse.
 *
 * ── LA REGOLA, per non ripensarci ──────────────────────────────────────
 * In un Server Component si usano solo componenti SEMPLICI di Mantine
 * (`Alert`, `Card`, `Text`, `Badge`...). Appena serve la notazione col
 * punto, quel pezzo va in un componente client come questo. Le pagine
 * `/admin/seo/` e `/admin/numeri/` hanno sempre funzionato proprio
 * perche' le loro tabelle stavano gia' dentro un componente client.
 *
 * ── COSA ATTRAVERSA IL CONFINE ─────────────────────────────────────────
 * Solo dati: stringhe e numeri. Le due server action non arrivano come
 * proprieta' dalla pagina, se le importa direttamente questo modulo --
 * da un componente client diventano chiamate di rete, ed e' il modo
 * previsto.
 */

export type RigaTour = {
  slug: string;
  nome: string;
  kind: string | null;
  status: string | null;
  quante: number;
  copertina: string | null;
};

export function ElencoFotoTour({
  righe,
  senzaFoto,
  pocheFoto,
}: {
  righe: RigaTour[];
  senzaFoto: number;
  pocheFoto: number;
}) {
  return (
    <>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="md">
        <Card withBorder radius="md" padding="sm">
          <Text fz={28} fw={800} lh={1.1}>{righe.length}</Text>
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
              {righe.map((r) => (
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
                    {/* `c="inherit"`: il nome del tour e' il CONTENUTO della
                        riga, non un comando. Con il colore predefinito di
                        Anchor diventava arancione, e in una tabella di 87
                        righe ottantasette titoli accesi sono rumore: non
                        indicano piu' niente, perche' sono tutti uguali.
                        Resta cliccabile, e si sottolinea al passaggio. */}
                    <Anchor href={`/admin/foto/${r.slug}/`} c="inherit" underline="hover">
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
    </>
  );
}
