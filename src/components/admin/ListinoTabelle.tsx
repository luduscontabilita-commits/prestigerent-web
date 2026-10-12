'use client';

import { useMemo, useState } from 'react';
import {
  Anchor,
  Badge,
  Box,
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { raggruppa, righeDelServizio, type Servizio } from '@/lib/listino';

/* LE TABELLE DEL LISTINO, per l'admin (italiano) e per il partner (inglese).
 *
 * Client e non server per due motivi: la ricerca per nome si fa mentre si
 * scrive, e le tabelle usano la notazione col punto di Mantine
 * (`Table.Thead`), che in un Server Component diventa `undefined` -- e'
 * il terzo dei tre guasti di confine elencati in CLAUDE.md. Riceve solo
 * dati serializzabili.
 *
 * L'impaginazione e' quella scelta dalla proprieta' il 12/10/2026
 * sull'anteprima «a righe»: le persone si leggono scendendo, le varianti
 * stanno in colonna, e le schede con una variante sola si affiancano. */

export type StatoTab = 'uguale' | 'diverso' | 'non_abbinabile';

const eur = (n: number) => '€' + n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

export function ListinoTabelle({
  servizi,
  lingua,
  statiTab,
}: {
  servizi: Servizio[];
  lingua: 'it' | 'en';
  /** solo per l'admin: lo stato della tab PRICES di ogni pagina */
  statiTab?: Record<string, StatoTab>;
}) {
  const [cerca, setCerca] = useState('');
  const it = lingua === 'it';

  const sezioni = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return raggruppa(q ? servizi.filter((s) => s.nome.toLowerCase().includes(q)) : servizi);
  }, [servizi, cerca]);

  return (
    <Stack gap="xl">
      <Group gap="sm" wrap="wrap">
        <TextInput
          id="cerca-listino"
          placeholder={it ? 'Cerca un servizio per nome…' : 'Search a service by name…'}
          aria-label={it ? 'Cerca un servizio' : 'Search a service'}
          leftSection={<IconSearch size={16} />}
          value={cerca}
          onChange={(e) => setCerca(e.currentTarget.value)}
          style={{ flex: '1 1 280px' }}
          radius="xl"
        />
        <Group gap={6} wrap="wrap">
          {sezioni.map((s) => (
            <Badge
              key={s.chiave}
              component="a"
              href={`#sez-${s.chiave}`}
              variant="default"
              size="lg"
              radius="xl"
              style={{ cursor: 'pointer', textTransform: 'none' }}
            >
              {it ? s.it : s.en} · {s.totale}
            </Badge>
          ))}
        </Group>
      </Group>

      {!sezioni.length && (
        <Text c="dimmed">{it ? 'Nessun servizio con questo nome.' : 'No service matches this name.'}</Text>
      )}

      {sezioni.map((s) => (
        <Stack key={s.chiave} gap="md" id={`sez-${s.chiave}`}>
          <Group gap="sm" align="baseline" style={{ borderBottom: '2px solid var(--mantine-color-text)', paddingBottom: 6 }}>
            <Title order={2} size="h3">{it ? s.it : s.en}</Title>
            <Text c="dimmed" size="sm">
              {s.totale} {it ? 'servizi' : 'services'}
            </Text>
          </Group>
          {s.gruppi.map((g) => (
            <Stack key={g.gruppo ?? '-'} gap="sm">
              {g.gruppo && (
                <Text size="xs" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '.09em' }}>
                  {s.chiave === 'cruise' ? (it ? 'Porto di ' : 'From ') + g.gruppo : g.gruppo}
                </Text>
              )}
              <Box
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
                  alignItems: 'start',
                }}
              >
                {g.servizi.map((x) => (
                  <Scheda key={x.slug} s={x} it={it} stato={statiTab?.[x.slug]} />
                ))}
              </Box>
            </Stack>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function Scheda({ s, it, stato }: { s: Servizio; it: boolean; stato?: StatoTab }) {
  const largo = (s.varianti?.length ?? 0) > 1;
  return (
    <Card withBorder radius="md" padding="md" style={largo ? { gridColumn: '1 / -1' } : undefined}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
          <Anchor
            href={`https://prestigerent.com/tour/${s.slug}/`}
            target="_blank"
            rel="noopener"
            fw={800}
            c="var(--mantine-color-text)"
            style={{ minWidth: 0 }}
          >
            {s.nome}
          </Anchor>
          <Group gap={6}>
            <Badge variant="default" radius="xl">
              {s.unita === 'per person' ? (it ? 'a persona' : 'per person') : it ? 'per gruppo' : 'per party'}
            </Badge>
            {stato && (
              <Badge
                variant="light"
                radius="xl"
                color={stato === 'uguale' ? 'teal' : stato === 'diverso' ? 'orange' : 'grape'}
              >
                {stato === 'uguale' ? 'tab PRICES allineata' : stato === 'diverso' ? 'tab PRICES da aggiornare' : 'tab PRICES non abbinabile'}
              </Badge>
            )}
          </Group>
        </Group>
        {it && <Text size="xs" c="dimmed" ff="monospace">{s.sku}</Text>}
        {s.varianti?.length ? (
          <Prezzi s={s} it={it} />
        ) : (
          <Text size="sm" c="dimmed">
            {it
              ? 'Regiondo non ha risposto per questo prodotto: riprova fra poco.'
              : 'Prices are not available right now. Please try again in a few minutes.'}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function Prezzi({ s, it }: { s: Servizio; it: boolean }) {
  const varianti = s.varianti!;
  const { perPersone, righe } = righeDelServizio(varianti);
  const una = varianti.length === 1;
  return (
    <Table.ScrollContainer minWidth={una ? 220 : 120 + varianti.length * 130}>
      <Table striped withRowBorders={false} verticalSpacing={5} horizontalSpacing="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{perPersone ? (it ? 'Persone' : 'People') : it ? 'Opzione' : 'Option'}</Table.Th>
            {una ? (
              <Table.Th ta="right">{it ? 'Prezzo' : 'Price'}</Table.Th>
            ) : (
              varianti.map((v) => (
                <Table.Th key={v.id} ta="right" style={{ fontWeight: 600, fontSize: 12, verticalAlign: 'bottom', maxWidth: 220 }}>
                  {v.titolo}
                </Table.Th>
              ))
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {righe.map((r) => (
            <Table.Tr key={r.etichetta}>
              <Table.Th scope="row" fw={600}>{r.etichetta}</Table.Th>
              {r.prezzi.map((p, i) => (
                <Table.Td key={i} ta="right" fw={p == null ? 400 : 700} c={p == null ? 'dimmed' : undefined}>
                  {p == null ? '—' : eur(p)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
