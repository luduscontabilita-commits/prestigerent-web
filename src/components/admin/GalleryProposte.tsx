'use client';

import { useState, useTransition } from 'react';
import { Alert, Badge, Button, Card, Checkbox, Group, Image, Stack, Text, Title } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

/* I TAG PROPOSTI DALLE GUIDE, in coda (28/09/2026).
 *
 * Una guida ha aggiunto una pagina a una sua foto GIA' APPROVATA. La foto
 * e' gia' sul sito dov'era; qui si decide se deve comparire ANCHE sulla
 * pagina proposta. Approvare mette la foto in fondo a quella pagina,
 * rifiutare cancella la proposta: la foto non si tocca in nessuno dei due
 * casi.
 *
 * Una riga per proposta, non per foto: la stessa foto proposta su due
 * pagine si puo' approvare su una e rifiutare sull'altra. */

export type Proposta = {
  image_id: string;
  tag_id: string;
  pagina: string;
  path: string;
  alt: string;
  anteprima: string;
  colore: string | null;
  chi: string;
  quando: string;
};

type Esito = { ok: boolean; errore?: string; quante?: number };

const chiave = (p: Pick<Proposta, 'image_id' | 'tag_id'>) => `${p.image_id}|${p.tag_id}`;

export function GalleryProposte({
  proposte,
  decidiProposte,
}: {
  proposte: Proposta[];
  decidiProposte: (voci: { image_id: string; tag_id: string }[], approva: boolean) => Promise<Esito>;
}) {
  const [resto, setResto] = useState(proposte);
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  if (!resto.length && !messaggio) return null;

  const decidi = (voci: Proposta[], approva: boolean) =>
    avvia(async () => {
      setMessaggio(null);
      const r = await decidiProposte(voci.map((v) => ({ image_id: v.image_id, tag_id: v.tag_id })), approva);
      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
      const via = new Set(voci.map(chiave));
      setResto((x) => x.filter((p) => !via.has(chiave(p))));
      setScelte((s) => new Set([...s].filter((k) => !via.has(k))));
      setMessaggio({
        ok: true,
        testo: approva
          ? `${r.quante} approvate: le foto compaiono ora anche su quelle pagine.`
          : `${r.quante} rifiutate: le foto restano solo dove erano.`,
      });
    });

  const selezionate = resto.filter((p) => scelte.has(chiave(p)));

  return (
    <Card withBorder radius="md" padding="md" mb="lg">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Title order={2} size="h5">
            Pagine proposte su foto già pubblicate {resto.length > 0 && <Badge ml={6} color="orange">{resto.length}</Badge>}
          </Title>
          {resto.length > 0 && (
            <Group gap={6}>
              <Button
                size="compact-sm"
                variant="subtle"
                onClick={() =>
                  setScelte(selezionate.length === resto.length ? new Set() : new Set(resto.map(chiave)))
                }
              >
                {selezionate.length === resto.length ? 'Deseleziona tutte' : 'Seleziona tutte'}
              </Button>
              <Button
                size="compact-sm"
                leftSection={<IconCheck size={14} />}
                disabled={!selezionate.length}
                loading={inCorso}
                onClick={() => decidi(selezionate, true)}
              >
                Approva {selezionate.length || ''}
              </Button>
              <Button
                size="compact-sm"
                variant="light"
                color="red"
                leftSection={<IconX size={14} />}
                disabled={!selezionate.length}
                onClick={() => decidi(selezionate, false)}
              >
                Rifiuta {selezionate.length || ''}
              </Button>
            </Group>
          )}
        </Group>

        <Text size="xs" c="dimmed">
          Le foto sono già sul sito. Approvando compaiono <b>anche</b> sulla pagina proposta; rifiutando
          restano solo dove erano.
        </Text>

        {messaggio && (
          <Alert color={messaggio.ok ? 'teal' : 'red'} variant="light" withCloseButton onClose={() => setMessaggio(null)}>
            {messaggio.testo}
          </Alert>
        )}

        {resto.map((p) => (
          <Group key={chiave(p)} gap="sm" wrap="nowrap" align="center">
            <Checkbox
              aria-label={`Seleziona la proposta per ${p.pagina}`}
              checked={scelte.has(chiave(p))}
              onChange={(e) => {
                const n = new Set(scelte);
                if (e.currentTarget.checked) n.add(chiave(p)); else n.delete(chiave(p));
                setScelte(n);
              }}
            />
            <Image
              src={p.anteprima}
              alt={p.alt}
              w={72}
              h={54}
              radius="sm"
              fit="cover"
              bg={p.colore ?? 'var(--mantine-color-gray-1)'}
              style={{ flex: '0 0 auto' }}
            />
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={600} lineClamp={1}>{p.alt}</Text>
              <Text size="xs">
                → <b>{p.pagina}</b>
              </Text>
              <Text size="xs" c="dimmed">
                proposta da {p.chi} il {new Date(p.quando).toLocaleDateString('it-IT')}
              </Text>
            </Stack>
            <Group gap={4} wrap="nowrap">
              <Button size="compact-xs" variant="light" loading={inCorso} onClick={() => decidi([p], true)}>
                Approva
              </Button>
              <Button size="compact-xs" variant="subtle" color="red" onClick={() => decidi([p], false)}>
                Rifiuta
              </Button>
            </Group>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
