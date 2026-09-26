'use client';

import { Fragment, useState, useTransition } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconExternalLink,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';
import { CRITERI, decidi, spiega, type Criterio, type Impostazioni, type Tag } from '@/lib/gallery-tag';

/* IL REGISTRO DELLE PAGINE.
 *
 * ── LO STATO E' CALCOLATO CON LA FUNZIONE DEL SITO ─────────────────────
 * «Visibile», «Nascosta — sotto soglia 2/3» arrivano da `decidi()` e
 * `spiega()` in gallery-tag.ts, cioe' dalla stessa funzione che la pagina
 * usa per decidere se disegnarsi. Non da un `if` scritto qui: se fossero
 * due, il pannello direbbe «Visibile» su una pagina che non mostra niente,
 * e nessuno saprebbe quale dei due crede.
 *
 * ── PERCHE' TUTTE E 103 E NON SOLO QUELLE CON FOTO ─────────────────────
 * Perche' la domanda vera e' «dove potrei metterle»: un elenco delle sole
 * pagine che ce l'hanno gia' non risponde. Le pagine con zero foto stanno
 * in fondo e si vede subito.
 *
 * ── 🔴 LA CHIAVE STA SUL FRAMMENTO ─────────────────────────────────────
 * Ogni pagina rende DUE righe: la sua, e quella aperta della modifica.
 * Prima erano dentro un `<>` senza chiave, con le chiavi sulle due righe
 * figlie: React avvisa, e la riconciliazione diventa fragile proprio
 * mentre si filtra con la ricerca -- cioe' quando l'elenco cambia
 * lunghezza sotto le mani. `<Fragment key>` e' la forma che accetta una
 * chiave.
 */

export type RigaPagina = {
  id: string;
  key: string;
  label: string;
  path: string;
  quante: number;
  stato: string;
  visibile: boolean;
  senzaTour: boolean;
  orfana: boolean;
  custom_title: string | null;
  custom_subtitle: string | null;
  visibility_override: 'inherit' | 'on' | 'off';
  min_images_override: number | null;
  sort_override: Criterio | null;
};

type Esito = { ok: boolean; errore?: string };

const NOME_CRITERIO: Record<Criterio, string> = {
  manual: 'Manuale',
  newest: 'Più recenti prima',
  oldest: 'Più vecchie prima',
  daily_random: 'Casuale del giorno',
  alternate: 'Alternata verticale/orizzontale',
};

const NOME_VISIBILITA = {
  inherit: 'Segue l’interruttore generale',
  on: 'Sempre accesa (anche a interruttore spento)',
  off: 'Spenta su questa pagina',
} as const;

/* 🔴 PERCHE' TRE POSIZIONI E NON UN INTERRUTTORE A DUE.
 *
 * La proprieta' ha chiesto «un toggle on/off in riga». L'impostazione
 * dietro pero' ha TRE stati, e il terzo non e' un dettaglio: `inherit`
 * vuol dire «segue l'interruttore generale», ed e' lo stato di 102 pagine
 * su 103.
 *
 * Con due sole posizioni, spento avrebbe dovuto voler dire `off`, cioe'
 * «spenta per sempre su questa pagina». Allora: tutte le righe si
 * vedrebbero spente (perche' l'interruttore generale e' spento), e basta
 * sfiorarne una e rimetterla com'era per averla tolta dal gruppo che
 * segue l'interruttore -- senza nessun avviso, e scoprendolo il giorno in
 * cui si accende tutto il sito e quella pagina resta al buio.
 *
 * Tre posizioni costano un centimetro di riga e non perdono niente.
 */
const VISIBILITA = [
  { value: 'inherit', label: 'Segue' },
  { value: 'on', label: 'Accesa' },
  { value: 'off', label: 'Spenta' },
] as const;

export function GalleryPagine({
  righe,
  impostazioni,
  sincronizza,
  salva,
}: {
  righe: RigaPagina[];
  /** servono a ricalcolare lo stato di una riga appena cambia, con la
   *  stessa funzione che usa il sito */
  impostazioni: Impostazioni;
  sincronizza: () => Promise<{ ok: boolean; errore?: string; aggiunte?: number; aggiornate?: number; orfane?: number; perTipo?: Record<string, number> }>;
  salva: (
    id: string,
    d: {
      custom_title: string | null;
      custom_subtitle: string | null;
      visibility_override: 'inherit' | 'on' | 'off';
      min_images_override: number | null;
      sort_override: Criterio | null;
    }
  ) => Promise<Esito>;
}) {
  const [dati, setDati] = useState(righe);
  const [aperta, setAperta] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();
  const [cerca, setCerca] = useState('');

  const filtrate = dati.filter((r) => {
    const q = cerca.trim().toLowerCase();
    return !q || r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q);
  });

  const cambia = (id: string, patch: Partial<RigaPagina>) =>
    setDati((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* Lo stato della riga si RICALCOLA qui, con le stesse `decidi()` e
     `spiega()` che usa il sito -- non si tiene quello arrivato dal
     server. Altrimenti si cambia l'interruttore di una pagina e la
     colonna «Stato» continua a raccontare la situazione di prima fino
     alla ricarica: cioe' il pannello direbbe una cosa falsa proprio nel
     momento in cui lo si sta guardando per sapere se ha funzionato. */
  const statoDi = (r: RigaPagina) => {
    const e = decidi(
      impostazioni,
      {
        visibility_override: r.visibility_override,
        min_images_override: r.min_images_override,
      } as Tag,
      r.quante
    );
    return { testo: spiega(e), visibile: e.visibile };
  };

  /** L'interruttore in riga salva SUBITO. Doverlo confermare con un
   *  «Salva» dentro «Modifica» sarebbe esattamente il giro che si voleva
   *  evitare mettendolo in riga. Se il salvataggio fallisce si rimette
   *  com'era: una riga che mostra uno stato che il database non ha e' la
   *  cosa peggiore che possa restare su questa pagina. */
  const cambiaVisibilita = (r: RigaPagina, v: RigaPagina['visibility_override']) => {
    const prima = r.visibility_override;
    if (v === prima) return;
    cambia(r.id, { visibility_override: v });
    setMessaggio(null);
    avvia(async () => {
      const e = await salva(r.id, {
        custom_title: r.custom_title,
        custom_subtitle: r.custom_subtitle,
        visibility_override: v,
        min_images_override: r.min_images_override,
        sort_override: r.sort_override,
      });
      if (!e.ok) {
        cambia(r.id, { visibility_override: prima });
        setMessaggio({ ok: false, testo: e.errore ?? `«${r.label}» non è stata salvata: l’ho rimessa com’era.` });
        return;
      }
      setMessaggio({
        ok: true,
        testo:
          v === 'on'
            ? `«${r.label}»: gallery accesa su questa pagina, anche a interruttore generale spento.`
            : v === 'off'
              ? `«${r.label}»: gallery spenta su questa pagina.`
              : `«${r.label}»: torna a seguire l’interruttore generale.`,
      });
    });
  };

  return (
    <Stack gap="md">
      {messaggio && (
        <Alert
          color={messaggio.ok ? 'green' : 'red'}
          icon={messaggio.ok ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setMessaggio(null)}
        >
          {messaggio.testo}
        </Alert>
      )}

      <Card withBorder radius="md" padding="sm">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
          <Stack gap={4} style={{ flex: '1 1 320px' }}>
            <Button
              loading={inCorso}
              leftSection={<IconRefresh size={16} />}
              style={{ alignSelf: 'flex-start' }}
              onClick={() =>
                avvia(async () => {
                  setMessaggio(null);
                  const r = await sincronizza();
                  if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                  const perTipo = Object.entries(r.perTipo ?? {}).map(([t, n]) => `${n} ${t}`).join(', ');
                  setMessaggio({
                    ok: true,
                    testo: `Registro aggiornato: ${r.aggiunte} nuove, ${r.aggiornate} già c’erano, ${r.orfane} orfane. (${perTipo}). Ricarica per vedere l’elenco aggiornato.`,
                  });
                })
              }
            >
              Sincronizza pagine
            </Button>
            <Text size="xs" c="dimmed">
              Rilegge le pagine dal codice e dal catalogo. Non cancella mai una riga: una
              pagina che non esiste più diventa «orfana» e resta, con le sue foto.
            </Text>
          </Stack>

          <TextInput
            type="search"
            placeholder="cerca pagina…"
            leftSection={<IconSearch size={15} />}
            value={cerca}
            onChange={(e) => setCerca(e.currentTarget.value)}
            style={{ flex: '0 1 260px' }}
          />
        </Group>
      </Card>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={640}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pagina</Table.Th>
                <Table.Th w={70}>Foto</Table.Th>
                <Table.Th w={210}>Gallery su questa pagina</Table.Th>
                <Table.Th>Stato</Table.Th>
                <Table.Th w={150} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtrate.map((r) => (
                <Fragment key={r.id}>
                  <Table.Tr>
                    <Table.Td>
                      <Text fw={600} size="sm">{r.label}</Text>
                      <Code>{r.path}</Code>
                      <Group gap={6} mt={4}>
                        {r.orfana && <Badge size="xs" color="red" variant="light">orfana: non è più nel codice</Badge>}
                        {r.senzaTour && <Badge size="xs" color="yellow" variant="light">nessun tour dentro</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={r.quante ? 'gray' : 'red'}>{r.quante}</Badge>
                    </Table.Td>
                    {/* L'interruttore della singola pagina, in riga e non
                        sepolto dentro «Modifica»: e' la cosa che si viene a
                        fare qui piu' spesso. */}
                    <Table.Td>
                      <SegmentedControl
                        size="xs"
                        fullWidth
                        disabled={inCorso}
                        data={VISIBILITA as unknown as { value: string; label: string }[]}
                        value={r.visibility_override}
                        onChange={(v) => cambiaVisibilita(r, v as RigaPagina['visibility_override'])}
                        color={r.visibility_override === 'on' ? 'green' : r.visibility_override === 'off' ? 'red' : 'gray'}
                        aria-label={`Gallery su ${r.label}`}
                      />
                    </Table.Td>

                    <Table.Td>
                      {(() => {
                        const s = statoDi(r);
                        return (
                          <Text size="sm" c={s.visibile ? 'green' : 'dimmed'} fw={s.visibile ? 600 : 400}>
                            {s.testo}
                          </Text>
                        );
                      })()}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <Button
                          size="compact-xs"
                          variant={aperta === r.id ? 'filled' : 'default'}
                          onClick={() => setAperta(aperta === r.id ? null : r.id)}
                        >
                          {aperta === r.id ? 'Chiudi' : 'Modifica'}
                        </Button>
                        <Anchor href={r.path} target="_blank" rel="noreferrer" size="xs">
                          <Group gap={3} wrap="nowrap"><IconExternalLink size={13} /> Apri</Group>
                        </Anchor>
                      </Group>
                    </Table.Td>
                  </Table.Tr>

                  {aperta === r.id && (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ background: 'var(--mantine-color-gray-0)' }}>
                        <Stack gap="sm" py="xs">
                          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <TextInput
                              label="Titolo solo per questa pagina"
                              size="sm"
                              value={r.custom_title ?? ''}
                              placeholder="vuoto = usa il titolo predefinito"
                              onChange={(e) => cambia(r.id, { custom_title: e.currentTarget.value })}
                              description={<>Fra asterischi la parola in corsivo: <Code>Moments from the *road*</Code></>}
                            />

                            <TextInput
                              label="Sottotitolo solo per questa pagina"
                              size="sm"
                              value={r.custom_subtitle ?? ''}
                              placeholder="vuoto = usa il sottotitolo predefinito"
                              onChange={(e) => cambia(r.id, { custom_subtitle: e.currentTarget.value })}
                            />

                            <Select
                              label="Visibilità"
                              size="sm"
                              allowDeselect={false}
                              data={(Object.keys(NOME_VISIBILITA) as (keyof typeof NOME_VISIBILITA)[])
                                .map((k) => ({ value: k, label: NOME_VISIBILITA[k] }))}
                              value={r.visibility_override}
                              onChange={(v) => v && cambia(r.id, { visibility_override: v as RigaPagina['visibility_override'] })}
                              description="«Sempre accesa» serve a provare la gallery su una pagina sola mentre il resto del sito non mostra niente."
                            />

                            <NumberInput
                              label="Minimo foto per questa pagina"
                              size="sm"
                              min={1}
                              max={50}
                              value={r.min_images_override ?? ''}
                              placeholder="vuoto = soglia generale"
                              onChange={(v) =>
                                cambia(r.id, { min_images_override: v === '' || v === null ? null : Number(v) })
                              }
                            />

                            <Select
                              label="Ordinamento di questa pagina"
                              size="sm"
                              data={[
                                { value: '', label: 'Usa l’ordinamento predefinito' },
                                ...CRITERI.map((c) => ({ value: c, label: NOME_CRITERIO[c] })),
                              ]}
                              value={r.sort_override ?? ''}
                              onChange={(v) => cambia(r.id, { sort_override: v ? (v as Criterio) : null })}
                              allowDeselect={false}
                            />
                          </SimpleGrid>

                          <Group>
                            <Button
                              size="sm"
                              loading={inCorso}
                              leftSection={<IconCheck size={16} />}
                              onClick={() =>
                                avvia(async () => {
                                  const e = await salva(r.id, {
                                    custom_title: r.custom_title,
                                    custom_subtitle: r.custom_subtitle,
                                    visibility_override: r.visibility_override,
                                    min_images_override: r.min_images_override,
                                    sort_override: r.sort_override,
                                  });
                                  setMessaggio(
                                    e.ok
                                      ? { ok: true, testo: `«${r.label}» salvata. La pagina si aggiorna in pochi secondi.` }
                                      : { ok: false, testo: e.errore ?? 'Non salvata.' }
                                  );
                                  if (e.ok) setAperta(null);
                                })
                              }
                            >
                              Salva
                            </Button>
                          </Group>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Fragment>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
