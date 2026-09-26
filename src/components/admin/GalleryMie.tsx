'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  Alert,
  AspectRatio,
  Badge,
  Button,
  Card,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { IconAlertTriangle, IconPhotoUp, IconRefresh, IconTrash } from '@tabler/icons-react';

/* «LE MIE FOTO», in tre schede.
 *
 * 🔴 RISCRITTO CON MANTINE IL 26/09/2026 insieme all'archivio: il guscio
 * era nuovo e il contenuto no, e si vedeva.
 *
 * La scheda che conta e' RIFIUTATE: e' l'unica che ha qualcosa da fare, e
 * l'unica dove si legge il motivo. Per questo si apre da sola quando ce
 * n'e' almeno una -- se no una persona apre la pagina, vede le approvate
 * e non scopre mai che tre foto aspettano una correzione.
 */

export type MiaFoto = {
  id: string;
  alt: string;
  caption: string | null;
  stato: 'in_attesa' | 'approvata' | 'rifiutata' | 'nascosta';
  motivo: string | null;
  colore: string | null;
  anteprima: string | null;
  caricata: string;
  pagine: string[];
};

type Esito = { ok: boolean; errore?: string };

const SCHEDE = [
  { id: 'rifiutata', titolo: 'Rifiutate' },
  { id: 'in_attesa', titolo: 'In attesa' },
  { id: 'approvata', titolo: 'Approvate' },
] as const;

export function GalleryMie({
  foto,
  reinvia,
  elimina,
}: {
  foto: MiaFoto[];
  reinvia: (id: string) => Promise<Esito>;
  elimina: (id: string) => Promise<Esito>;
}) {
  const conta = (s: string) =>
    s === 'approvata'
      ? foto.filter((f) => f.stato === 'approvata' || f.stato === 'nascosta').length
      : foto.filter((f) => f.stato === s).length;

  const [scheda, setScheda] = useState<string>(
    conta('rifiutata') ? 'rifiutata' : conta('in_attesa') ? 'in_attesa' : 'approvata'
  );
  const [resto, setResto] = useState(foto);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  if (!foto.length) {
    return (
      <Alert color="blue" variant="light" radius="md" icon={<IconPhotoUp size={20} />}>
        Non hai ancora caricato niente.{' '}
        <Link href="/admin/gallery/carica/">Carica le prime foto</Link>.
      </Alert>
    );
  }

  const visibili = resto.filter((f) =>
    scheda === 'approvata' ? f.stato === 'approvata' || f.stato === 'nascosta' : f.stato === scheda
  );

  return (
    <Stack gap="lg">
      {messaggio && (
        <Alert color={messaggio.ok ? 'teal' : 'red'} variant="light" radius="md"
          withCloseButton onClose={() => setMessaggio(null)}>
          {messaggio.testo}
        </Alert>
      )}

      <Tabs value={scheda} onChange={(v) => setScheda(v ?? 'approvata')} variant="pills" radius="xl">
        <Tabs.List>
          {SCHEDE.map((s) => (
            <Tabs.Tab
              key={s.id}
              value={s.id}
              rightSection={
                <Badge size="sm" circle variant={scheda === s.id ? 'white' : 'light'}>
                  {conta(s.id)}
                </Badge>
              }
            >
              {s.titolo}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {!visibili.length && (
        <Alert color="gray" variant="light" radius="md">Niente in questa scheda.</Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 4 }} spacing="md">
        {visibili.map((f) => (
          <Card key={f.id} withBorder radius="md" padding={0}>
            <Card.Section pos="relative">
              <AspectRatio ratio={4 / 3} bg={f.colore ?? 'var(--mantine-color-gray-1)'}>
                {f.anteprima ? (
                  <Image src={f.anteprima} alt={f.alt} fit="contain" loading="lazy" />
                ) : (
                  <Text size="xs" c="dimmed" ta="center" p="md">
                    Anteprima scaduta: ricarica la pagina
                  </Text>
                )}
              </AspectRatio>
              {f.stato === 'nascosta' && (
                <Badge color="gray" variant="filled" radius="sm" pos="absolute" top={8} left={8}>
                  nascosta dal sito
                </Badge>
              )}
            </Card.Section>

            <Stack gap={6} p="sm">
              <Text fw={600} size="sm" lineClamp={2}>{f.alt}</Text>
              {f.caption && <Text size="xs" c="dimmed" lineClamp={1}>{f.caption}</Text>}

              <Group gap={4}>
                {f.pagine.length ? (
                  f.pagine.map((l) => (
                    <Badge key={l} variant="light" color="gray" size="sm" radius="sm">{l}</Badge>
                  ))
                ) : (
                  <Badge variant="light" color="red" size="sm" radius="sm">nessuna pagina</Badge>
                )}
              </Group>

              <Text size="xs" c="dimmed">
                Caricata il {new Date(f.caricata).toLocaleDateString('it-IT')}
              </Text>

              {f.stato === 'rifiutata' && (
                <>
                  <Alert
                    color="red"
                    variant="light"
                    radius="sm"
                    p="xs"
                    icon={<IconAlertTriangle size={16} />}
                  >
                    <Text size="xs" lh={1.5}>
                      <b>Perché è tornata indietro:</b> {f.motivo}
                    </Text>
                  </Alert>

                  <Group gap={6}>
                    <Button
                      size="compact-sm"
                      variant="default"
                      leftSection={<IconRefresh size={14} />}
                      loading={inCorso}
                      onClick={() =>
                        avvia(async () => {
                          const r = await reinvia(f.id);
                          if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                          setResto((x) => x.map((y) => (y.id === f.id ? { ...y, stato: 'in_attesa', motivo: null } : y)));
                          setMessaggio({ ok: true, testo: 'Rimandata: aspetta di nuovo l’approvazione.' });
                        })
                      }
                    >
                      Rimanda così com’è
                    </Button>
                    <Button
                      size="compact-sm"
                      color="red"
                      variant="light"
                      leftSection={<IconTrash size={14} />}
                      loading={inCorso}
                      onClick={() =>
                        avvia(async () => {
                          const r = await elimina(f.id);
                          if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                          setResto((x) => x.filter((y) => y.id !== f.id));
                          setMessaggio({ ok: true, testo: 'Eliminata.' });
                        })
                      }
                    >
                      Elimina
                    </Button>
                  </Group>
                </>
              )}

              {f.stato === 'in_attesa' && (
                <Button
                  size="compact-sm"
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={14} />}
                  loading={inCorso}
                  onClick={() =>
                    avvia(async () => {
                      const r = await elimina(f.id);
                      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                      setResto((x) => x.filter((y) => y.id !== f.id));
                      setMessaggio({ ok: true, testo: 'Ritirata.' });
                    })
                  }
                >
                  Ritira
                </Button>
              )}
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
