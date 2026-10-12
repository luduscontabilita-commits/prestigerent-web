'use client';

import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Affix,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Transition,
} from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import {
  IconArrowUp,
  IconMapPin,
  IconRoute,
  IconSearch,
  IconShip,
  IconSteeringWheel,
  IconUsersGroup,
  IconGlassFull,
  IconExternalLink,
} from '@tabler/icons-react';
import { raggruppa, righeDelServizio, type ChiaveSezione, type Servizio } from '@/lib/listino';
import { testiDi, type Lingua, type Testi } from '@/lib/partners-testi';

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
 * stanno in colonna, e le schede con una variante sola si affiancano.
 *
 * ── OGNI SEZIONE HA IL SUO COLORE (proprieta', 12/10/2026: «cosi' e'
 * tutto molto piatto, sii professionale ma anche creativo») ───────────
 * Ottantasei tabelle uguali si leggono come un muro. Qui ogni sezione ha
 * una tinta e un'icona -- il mare per i porti, il vino per le
 * degustazioni -- ripresi dal bottone di navigazione, dal titolo della
 * sezione, dalla fascia di ogni scheda e dall'intestazione della tabella:
 * scorrendo si capisce dove si e' anche senza leggere. Le tinte sono
 * quelle di Mantine piu' `prestige` e `vino`, definite in Tema.tsx.
 *
 * ── PENSATA ANCHE PER IL TELEFONO ───────────────────────────────────
 * Bottoni di navigazione alti 36px (sotto si sbaglia col dito), titoli di
 * sezione che non finiscono sotto la barra in alto (`scrollMarginTop`), e
 * un pulsante per tornare su: il listino intero, a una colonna, e' lungo
 * decine di schermate. */

export type StatoTab = 'uguale' | 'diverso' | 'non_abbinabile';

const eur = (n: number) => '€' + n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

const STILE: Record<ChiaveSezione, { colore: string; Icona: typeof IconShip }> = {
  cruise: { colore: 'cyan', Icona: IconShip },
  transfers: { colore: 'indigo', Icona: IconRoute },
  small: { colore: 'prestige', Icona: IconUsersGroup },
  wine: { colore: 'vino', Icona: IconGlassFull },
  private: { colore: 'teal', Icona: IconSteeringWheel },
  other: { colore: 'gray', Icona: IconMapPin },
};

/** Una tinta della sezione come variabile CSS di Mantine. */
const t = (colore: string, tono: number) => `var(--mantine-color-${colore}-${tono})`;

export function ListinoTabelle({
  servizi,
  lingua,
  statiTab,
}: {
  servizi: Servizio[];
  /** la lingua dei testi: l'admin in italiano, il partner quella scelta
   *  col selettore EN/IT (src/lib/partners-testi.ts) */
  lingua: Lingua;
  /** solo per l'admin: lo stato della tab PRICES di ogni pagina */
  statiTab?: Record<string, StatoTab>;
}) {
  const [cerca, setCerca] = useState('');
  const [scroll, scrollTo] = useWindowScroll();
  const T = testiDi(lingua);
  /* Le cose da admin (SKU, stato della tab PRICES, messaggi che nominano
     Regiondo) solo quando arrivano gli stati delle tab: il partner non li
     riceve mai, in nessuna lingua. */
  const admin = !!statiTab;

  const sezioni = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return raggruppa(q ? servizi.filter((s) => s.nome.toLowerCase().includes(q)) : servizi);
  }, [servizi, cerca]);

  return (
    <Stack gap={40}>
      <Stack gap="sm">
        <TextInput
          id="cerca-listino"
          placeholder={T.cerca}
          aria-label={T.cercaEtichetta}
          leftSection={<IconSearch size={16} />}
          value={cerca}
          onChange={(e) => setCerca(e.currentTarget.value)}
          radius="xl"
          size="md"
        />
        <Group gap={8} wrap="wrap">
          {sezioni.map((s) => {
            const { colore, Icona } = STILE[s.chiave];
            return (
              <Button
                key={s.chiave}
                component="a"
                href={`#sez-${s.chiave}`}
                variant="light"
                color={colore}
                size="sm"
                radius="xl"
                leftSection={<Icona size={16} stroke={1.7} />}
                rightSection={
                  <Badge size="sm" circle color={colore} variant="filled">
                    {s.totale}
                  </Badge>
                }
              >
                {T.sezioni[s.chiave]}
              </Button>
            );
          })}
        </Group>
      </Stack>

      {!sezioni.length && (
        <Text c="dimmed">{T.nessuno}</Text>
      )}

      {sezioni.map((s) => {
        const { colore, Icona } = STILE[s.chiave];
        return (
          <Stack key={s.chiave} gap="lg" id={`sez-${s.chiave}`} style={{ scrollMarginTop: 80 }}>
            <Group gap="md" wrap="nowrap" style={{ borderBottom: `3px solid ${t(colore, 6)}`, paddingBottom: 10 }}>
              <ThemeIcon size={44} radius="md" color={colore} variant="filled">
                <Icona size={24} stroke={1.6} />
              </ThemeIcon>
              <div style={{ minWidth: 0 }}>
                <Title order={2} size="h3" c={t(colore, 9)} lh={1.15}>
                  {T.sezioni[s.chiave]}
                </Title>
                <Text c="dimmed" size="sm">
                  {s.totale} {T.servizi}
                </Text>
              </div>
            </Group>
            {s.gruppi.map((g) => (
              <Stack key={g.gruppo ?? '-'} gap="sm">
                {g.gruppo && (
                  <Group gap={6}>
                    <Badge
                      size="lg"
                      variant="light"
                      color={colore}
                      radius="sm"
                      leftSection={<IconMapPin size={14} />}
                      style={{ textTransform: 'none', letterSpacing: '.02em' }}
                    >
                      {s.chiave === 'cruise' && g.gruppo !== 'Other ports' ? T.porto + g.gruppo : T.gruppi[g.gruppo] ?? g.gruppo}
                    </Badge>
                  </Group>
                )}
                <Box
                  style={{
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                    alignItems: 'start',
                  }}
                >
                  {g.servizi.map((x) => (
                    <Scheda key={x.slug} s={x} T={T} admin={admin} stato={statiTab?.[x.slug]} colore={colore} />
                  ))}
                </Box>
              </Stack>
            ))}
          </Stack>
        );
      })}

      {/* Il ritorno in cima: compare solo dopo aver scrollato un po'. */}
      <Affix position={{ bottom: 20, right: 20 }}>
        <Transition transition="slide-up" mounted={scroll.y > 700}>
          {(stile) => (
            <ActionIcon
              style={stile}
              size={48}
              radius="xl"
              color="prestige"
              variant="filled"
              aria-label={T.suTop}
              onClick={() => scrollTo({ y: 0 })}
            >
              <IconArrowUp size={22} />
            </ActionIcon>
          )}
        </Transition>
      </Affix>
    </Stack>
  );
}

function Scheda({ s, T, admin, stato, colore }: { s: Servizio; T: Testi; admin: boolean; stato?: StatoTab; colore: string }) {
  const largo = (s.varianti?.length ?? 0) > 1;
  return (
    <Box
      style={{
        gridColumn: largo ? '1 / -1' : undefined,
        border: `1px solid ${t(colore, 2)}`,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--mantine-color-white)',
        boxShadow: '0 1px 2px rgba(16, 24, 40, .04), 0 4px 14px rgba(16, 24, 40, .05)',
      }}
    >
      {/* La fascia della scheda: nella tinta della sezione, con il nome
          che porta alla pagina del tour. */}
      <Box
        px="md"
        py="sm"
        style={{
          background: `linear-gradient(135deg, ${t(colore, 0)}, ${t(colore, 1)})`,
          borderBottom: `1px solid ${t(colore, 2)}`,
          borderLeft: `5px solid ${t(colore, 6)}`,
        }}
      >
        <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
          <Anchor
            href={`https://prestigerent.com/tour/${s.slug}/`}
            target="_blank"
            rel="noopener"
            fw={800}
            c={t(colore, 9)}
            style={{ minWidth: 0, flex: '1 1 200px', display: 'inline-block', paddingBlock: 4, lineHeight: 1.3 }}
          >
            {s.nome}
            <IconExternalLink size={13} style={{ marginLeft: 5, verticalAlign: '-1px', opacity: 0.55 }} />
          </Anchor>
          <Group gap={6}>
            <Badge variant="white" color={colore} radius="xl" style={{ border: `1px solid ${t(colore, 3)}` }}>
              {s.unita === 'per person' ? T.perPersona : T.perGruppo}
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
        {admin && s.sku && <Text size="xs" c={t(colore, 8)} ff="monospace" mt={2}>{s.sku}</Text>}
      </Box>

      <Box p="sm">
        {s.varianti?.length ? (
          <Prezzi s={s} T={T} colore={colore} />
        ) : (
          <Text size="sm" c="dimmed" p="xs">
            {admin ? 'Regiondo non ha risposto per questo prodotto: riprova fra poco.' : T.nonDisponibile}
          </Text>
        )}
      </Box>
    </Box>
  );
}

function Prezzi({ s, T, colore }: { s: Servizio; T: Testi; colore: string }) {
  const varianti = s.varianti!;
  const { perPersone, righe } = righeDelServizio(varianti);
  const una = varianti.length === 1;
  const testata = {
    background: t(colore, 7),
    color: 'var(--mantine-color-white)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.06em',
    textTransform: 'uppercase' as const,
    verticalAlign: 'bottom' as const,
  };
  return (
    <Table.ScrollContainer minWidth={una ? 220 : 120 + varianti.length * 130} type="native">
      <Table
        withRowBorders={false}
        verticalSpacing={6}
        horizontalSpacing="sm"
        style={{ fontVariantNumeric: 'tabular-nums', borderRadius: 10, overflow: 'hidden', borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ ...testata, borderTopLeftRadius: 10 }}>
              {perPersone ? T.persone : T.opzione}
            </Table.Th>
            {una ? (
              <Table.Th ta="right" style={{ ...testata, borderTopRightRadius: 10 }}>{T.prezzo}</Table.Th>
            ) : (
              varianti.map((v, i) => (
                <Table.Th
                  key={v.id}
                  ta="right"
                  style={{
                    ...testata,
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontSize: 12,
                    maxWidth: 220,
                    borderTopRightRadius: i === varianti.length - 1 ? 10 : undefined,
                  }}
                >
                  {v.titolo}
                </Table.Th>
              ))
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {righe.map((r, i) => (
            <Table.Tr key={r.etichetta} style={{ background: i % 2 ? t(colore, 0) : undefined }}>
              <Table.Th scope="row" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {perPersone ? (
                  /* il numero di persone in un tondo: si trova la propria
                     riga a colpo d'occhio, anche sul telefono */
                  <Box
                    component="span"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: t(colore, 1),
                      color: t(colore, 9),
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {r.etichetta}
                  </Box>
                ) : (
                  r.etichetta
                )}
              </Table.Th>
              {r.prezzi.map((p, k) => (
                <Table.Td
                  key={k}
                  ta="right"
                  fw={p == null ? 400 : 800}
                  c={p == null ? 'dimmed' : t(colore, 9)}
                  style={{ fontSize: 15 }}
                >
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
