'use client';

import { useMemo, useState } from 'react';
import {
  Anchor,
  Badge,
  Card,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

export type Riga = {
  percorso: string;
  vecchioTitle: string | null;
  vecchiaDescr: string | null;
  nuovoTitle: string | null;
  nuovaDescr: string | null;
  generato: boolean;
};

/* LA TABELLA.
 *
 * Le soglie non sono opinioni: Google mostra circa 60 caratteri di title
 * e circa 155 di description, e quello che avanza lo taglia. Un title
 * tagliato perde la FINE, che e' dove sta il luogo -- "...from
 * Civitavecchia (Rome) Port" diventa "...from Civita".
 *
 * I difetti si contano, non si descrivono: chi apre questa pagina vuole
 * sapere quante righe restano da sistemare, non leggere un giudizio.
 */
const T_MAX = 60;
const D_MAX = 155;
const D_MIN = 80;

/* 🔴 IL SITO E' QUESTO. I link puntavano ancora a
   `prestigerent-web.vercel.app`, il dominio di anteprima di quando il
   WordPress era ancora online: da questa tabella si apriva una copia, non
   la pagina vera, e i controlli su title e description si facevano sul
   posto sbagliato. */
const SITO = 'https://prestigerent.com';

type Difetto = 'lungo' | 'corto' | 'manca' | 'doppione';

function difettiDi(
  title: string | null,
  descr: string | null,
  titleDoppio: boolean
): Difetto[] {
  const d: Difetto[] = [];
  if (!title) d.push('manca');
  else if (title.length > T_MAX) d.push('lungo');
  else if (title.length < 30) d.push('corto');
  if (!descr) d.push('manca');
  else if (descr.length > D_MAX) d.push('lungo');
  else if (descr.length < D_MIN) d.push('corto');
  if (titleDoppio) d.push('doppione');
  return [...new Set(d)];
}

const ETICHETTA: Record<Difetto, string> = {
  lungo: 'troppo lungo',
  corto: 'troppo corto',
  manca: 'manca',
  doppione: 'title duplicato',
};

function Numero({ n, che, male }: { n: number; che: string; male?: boolean }) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Text fz={28} fw={800} lh={1.1} c={male ? 'red' : undefined}>{n}</Text>
      <Text size="xs" c="dimmed">{che}</Text>
    </Card>
  );
}

export function TabellaSeo({ righe }: { righe: Riga[] }) {
  const [cerca, setCerca] = useState('');
  const [filtro, setFiltro] = useState<'tutte' | 'da-fare' | 'rotte'>('tutte');

  /* I title duplicati si trovano solo guardando TUTTE le righe insieme,
     non riga per riga: due pagine con lo stesso title si tolgono
     posizioni a vicenda, e nessuna delle due lo sa. */
  const doppiVecchi = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of righe) if (r.vecchioTitle) c.set(r.vecchioTitle, (c.get(r.vecchioTitle) ?? 0) + 1);
    return new Set([...c].filter(([, n]) => n > 1).map(([t]) => t));
  }, [righe]);

  const doppiNuovi = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of righe) if (r.nuovoTitle) c.set(r.nuovoTitle, (c.get(r.nuovoTitle) ?? 0) + 1);
    return new Set([...c].filter(([, n]) => n > 1).map(([t]) => t));
  }, [righe]);

  const conDifetti = useMemo(
    () =>
      righe.map((r) => ({
        ...r,
        primaDif: difettiDi(r.vecchioTitle, r.vecchiaDescr, doppiVecchi.has(r.vecchioTitle ?? '')),
        dopoDif: difettiDi(r.nuovoTitle, r.nuovaDescr, doppiNuovi.has(r.nuovoTitle ?? '')),
      })),
    [righe, doppiVecchi, doppiNuovi]
  );

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return conDifetti.filter((r) => {
      if (filtro === 'da-fare' && r.nuovoTitle) return false;
      if (filtro === 'rotte' && r.primaDif.length === 0) return false;
      if (!q) return true;
      return (
        r.percorso.toLowerCase().includes(q) ||
        (r.vecchioTitle ?? '').toLowerCase().includes(q) ||
        (r.nuovoTitle ?? '').toLowerCase().includes(q)
      );
    });
  }, [conDifetti, cerca, filtro]);

  const conta = useMemo(() => {
    const c = { totale: righe.length, prima: 0, dopo: 0, daFare: 0, aMano: 0 };
    for (const r of conDifetti) {
      if (r.primaDif.length) c.prima++;
      if (r.dopoDif.length) c.dopo++;
      if (!r.nuovoTitle) c.daFare++;
      if (!r.generato) c.aMano++;
    }
    return c;
  }, [conDifetti, righe.length]);

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
        <Numero n={conta.totale} che="pagine" />
        <Numero n={conta.prima} che="con difetti oggi su WordPress" male={conta.prima > 0} />
        <Numero n={conta.dopo} che="con difetti dopo la correzione" male={conta.dopo > 0} />
        <Numero n={conta.daFare} che="ancora da scrivere" male={conta.daFare > 0} />
        <Numero n={conta.aMano} che="corrette a mano" />
      </SimpleGrid>

      <Card withBorder radius="md" padding="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <TextInput
            type="search"
            placeholder="Cerca un percorso o un title…"
            leftSection={<IconSearch size={15} />}
            value={cerca}
            onChange={(e) => setCerca(e.currentTarget.value)}
            style={{ flex: '1 1 260px' }}
          />
          <SegmentedControl
            value={filtro}
            onChange={(v) => setFiltro(v as typeof filtro)}
            data={[
              { value: 'tutte', label: 'Tutte' },
              { value: 'rotte', label: 'Rotte oggi' },
              { value: 'da-fare', label: 'Da scrivere' },
            ]}
          />
          <Text size="sm" c="dimmed">{visibili.length} righe</Text>
        </Group>
      </Card>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={820}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={230}>Pagina</Table.Th>
                <Table.Th>Oggi su WordPress</Table.Th>
                <Table.Th>Proposta</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visibili.map((r) => (
                <Table.Tr key={r.percorso}>
                  <Table.Td style={{ verticalAlign: 'top' }}>
                    <Anchor
                      href={SITO + r.percorso}
                      target="_blank"
                      rel="noopener"
                      size="xs"
                      style={{ wordBreak: 'break-all' }}
                    >
                      {r.percorso}
                    </Anchor>
                    {!r.generato && (
                      <Badge size="xs" variant="light" color="gray" mt={4}>corretta a mano</Badge>
                    )}
                  </Table.Td>

                  <Table.Td style={{ verticalAlign: 'top' }}>
                    <Cella title={r.vecchioTitle} descr={r.vecchiaDescr} difetti={r.primaDif} />
                  </Table.Td>

                  <Table.Td style={{ verticalAlign: 'top' }}>
                    {r.nuovoTitle ? (
                      <Cella title={r.nuovoTitle} descr={r.nuovaDescr} difetti={r.dopoDif} />
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">da scrivere</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

function Cella({
  title,
  descr,
  difetti,
}: {
  title: string | null;
  descr: string | null;
  difetti: Difetto[];
}) {
  return (
    <Stack gap={4}>
      <Group gap={6} align="flex-start" wrap="nowrap">
        <Text size="sm" fw={600} style={{ flex: 1, minWidth: 0 }}>
          {title || <Text span c="dimmed" fs="italic">manca</Text>}
        </Text>
        {title && (
          <Badge size="xs" variant="light" color={title.length > T_MAX ? 'red' : 'gray'}>
            {title.length}
          </Badge>
        )}
      </Group>

      <Group gap={6} align="flex-start" wrap="nowrap">
        <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
          {descr || <Text span fs="italic">manca</Text>}
        </Text>
        {descr && (
          <Badge
            size="xs"
            variant="light"
            color={descr.length > D_MAX || descr.length < D_MIN ? 'red' : 'gray'}
          >
            {descr.length}
          </Badge>
        )}
      </Group>

      {difetti.length > 0 && (
        <Group gap={4}>
          {difetti.map((d) => (
            <Badge key={d} size="xs" color="red" variant="light">{ETICHETTA[d]}</Badge>
          ))}
        </Group>
      )}
    </Stack>
  );
}
