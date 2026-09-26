'use client';

import { SceltaPagine } from './SceltaPagine';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  ActionIcon,
  Alert,
  Anchor,
  AspectRatio,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconEdit,
  IconEye,
  IconEyeOff,
  IconMaximize,
  IconTrash,
} from '@tabler/icons-react';
import type { Pagina } from './GalleryCaricatore';

/* L'ARCHIVIO DELLE FOTO.
 *
 * 🔴 RISCRITTO CON MANTINE IL 26/09/2026. La prima versione usava classi
 * `.tf-*` per cui non avevo mai scritto il CSS: le foto uscivano nude,
 * alla loro dimensione naturale, senza griglia. Non era «brutto», era
 * mancante -- e si vedeva solo aprendo la pagina da dentro.
 *
 * ── PERCHE' UNA GRIGLIA DI SCHEDE E NON UNA TABELLA ──────────────────
 * Quello che si cerca qui e' UNA FOTO, e una foto la si riconosce
 * guardandola, non leggendo una riga. Le informazioni stanno sotto la
 * miniatura e i comandi su ogni scheda -- non dietro a un menu, perche'
 * su un telefono un menu a comparsa e' un gesto in piu' per ogni foto.
 *
 * ── PERCHE' I FILTRI SONO LINK ───────────────────────────────────────
 * Passano dall'indirizzo (`?stato=nascosta`): il filtro si puo' mandare a
 * qualcuno, il tasto «indietro» funziona, e la pagina resta renderizzata
 * dal server invece di trascinarsi centinaia di foto nel browser per
 * filtrarle li'.
 */

export type FotoAdmin = {
  id: string;
  alt: string;
  caption: string | null;
  stato: 'in_attesa' | 'approvata' | 'rifiutata' | 'nascosta';
  motivo: string | null;
  larghezza: number;
  altezza: number;
  colore: string | null;
  anteprima: string | null;
  caricata: string;
  scattata: string | null;
  chi: string | null;
  tag: { key: string; label: string }[];
};

type Esito = { ok: boolean; errore?: string };

const STATO: Record<FotoAdmin['stato'], { testo: string; colore: string }> = {
  approvata: { testo: 'sul sito', colore: 'teal' },
  nascosta: { testo: 'nascosta', colore: 'gray' },
  in_attesa: { testo: 'da approvare', colore: 'orange' },
  rifiutata: { testo: 'respinta', colore: 'red' },
};

export function TutteLeFoto({
  foto,
  pagine,
  statoAttivo,
  paginaAttiva,
  conteggi,
  cambiaVisibilita,
  elimina,
  aggiornaFoto,
}: {
  foto: FotoAdmin[];
  pagine: Pagina[];
  statoAttivo: string;
  paginaAttiva: string;
  conteggi: Record<string, number>;
  cambiaVisibilita: (id: string, nascondi: boolean) => Promise<Esito>;
  elimina: (id: string) => Promise<Esito>;
  aggiornaFoto: (
    id: string,
    d: { alt: string; caption: string | null; tag: string[] }
  ) => Promise<Esito>;
}) {
  const [lista, setLista] = useState(foto);
  const [grande, setGrande] = useState<FotoAdmin | null>(null);
  const [modifica, setModifica] = useState<FotoAdmin | null>(null);
  const [bozza, setBozza] = useState({ alt: '', caption: '', tag: [] as string[] });
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const indirizzo = (s: string, p: string) => {
    const q = new URLSearchParams();
    if (s) q.set('stato', s);
    if (p) q.set('pagina', p);
    const t = q.toString();
    return '/admin/gallery/tutte/' + (t ? `?${t}` : '');
  };

  const FILTRI = [
    { chiave: '', testo: 'Tutte' },
    { chiave: 'approvata', testo: `Sul sito (${conteggi.approvata ?? 0})` },
    { chiave: 'nascosta', testo: `Nascoste (${conteggi.nascosta ?? 0})` },
    { chiave: 'in_attesa', testo: `Da approvare (${conteggi.in_attesa ?? 0})` },
    { chiave: 'rifiutata', testo: `Respinte (${conteggi.rifiutata ?? 0})` },
  ];

  const apriModifica = (f: FotoAdmin) => {
    setModifica(f);
    setBozza({ alt: f.alt, caption: f.caption ?? '', tag: f.tag.map((t) => t.key) });
  };

  return (
    <Stack gap="lg">
      {messaggio && (
        <Alert color={messaggio.ok ? 'teal' : 'red'} variant="light" radius="md" withCloseButton
          onClose={() => setMessaggio(null)}>
          {messaggio.testo}
        </Alert>
      )}

      <Paper withBorder radius="md" p="sm">
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Group gap={6} wrap="wrap">
            {FILTRI.map((f) => (
              <Button
                key={f.chiave || 'tutte'}
                component={Link}
                href={indirizzo(f.chiave, paginaAttiva)}
                size="xs"
                radius="xl"
                variant={statoAttivo === f.chiave ? 'filled' : 'default'}
              >
                {f.testo}
              </Button>
            ))}
          </Group>

          {/* Un Select e non una fila di link: le pagine sono 103, e
              centotre' link non sono un filtro, sono un muro. */}
          <Select
            size="xs"
            w={{ base: '100%', sm: 300 }}
            placeholder="tutte le pagine"
            searchable
            clearable
            value={paginaAttiva || null}
            data={pagine.map((p) => ({ value: p.key, label: p.label }))}
            onChange={(v) => { window.location.href = indirizzo(statoAttivo, v ?? ''); }}
          />
        </Group>
      </Paper>

      {!lista.length && (
        <Alert color="gray" variant="light" radius="md">
          Nessuna foto con questo filtro.{' '}
          {(statoAttivo || paginaAttiva) && (
            <Anchor component={Link} href="/admin/gallery/tutte/">Togli i filtri</Anchor>
          )}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 3, xl: 4 }} spacing="md">
        {lista.map((f) => (
          <Card key={f.id} withBorder radius="md" padding={0} opacity={f.stato === 'nascosta' ? 0.65 : 1}>
            <Card.Section pos="relative">
              {/* `AspectRatio` tiene la griglia regolare anche con foto
                  verticali e orizzontali mescolate: senza, ogni scheda
                  sarebbe alta quanto la sua foto e la griglia ballerebbe. */}
              <AspectRatio ratio={4 / 3} bg={f.colore ?? 'var(--mantine-color-gray-1)'}>
                {f.anteprima ? (
                  <Image src={f.anteprima} alt={f.alt} fit="contain" loading="lazy" />
                ) : (
                  <Text size="xs" c="dimmed" ta="center" p="md">
                    Anteprima scaduta: ricarica la pagina
                  </Text>
                )}
              </AspectRatio>

              <Badge
                color={STATO[f.stato].colore}
                variant="filled"
                radius="sm"
                pos="absolute"
                top={8}
                left={8}
              >
                {STATO[f.stato].testo}
              </Badge>

              <Tooltip label="Guarda grande">
                <ActionIcon
                  variant="default"
                  radius="xl"
                  pos="absolute"
                  top={8}
                  right={8}
                  onClick={() => setGrande(f)}
                  aria-label="Guarda la foto grande"
                  disabled={!f.anteprima}
                >
                  <IconMaximize size={16} />
                </ActionIcon>
              </Tooltip>
            </Card.Section>

            <Stack gap={6} p="sm">
              <Text fw={600} size="sm" lineClamp={2}>{f.alt}</Text>
              {f.caption && <Text size="xs" c="dimmed" lineClamp={1}>{f.caption}</Text>}

              <Text size="xs" c="dimmed">
                {f.larghezza}×{f.altezza} ·{' '}
                {f.chi ?? 'caricata prima che ci fossero gli utenti'} ·{' '}
                {new Date(f.caricata).toLocaleDateString('it-IT')}
              </Text>

              <Group gap={4}>
                {f.tag.length ? (
                  f.tag.map((t) => (
                    <Badge key={t.key} variant="light" color="gray" size="sm" radius="sm">
                      {t.label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="light" color="red" size="sm" radius="sm">
                    nessuna pagina: non si vede da nessuna parte
                  </Badge>
                )}
              </Group>

              {f.stato === 'rifiutata' && f.motivo && (
                <Text size="xs" c="red">Respinta: {f.motivo}</Text>
              )}

              <Group gap={6} mt={4}>
                <Button size="compact-sm" variant="default" leftSection={<IconEdit size={14} />}
                  onClick={() => apriModifica(f)}>
                  Correggi
                </Button>

                {(f.stato === 'approvata' || f.stato === 'nascosta') && (
                  <Button
                    size="compact-sm"
                    variant="default"
                    loading={inCorso}
                    leftSection={f.stato === 'approvata' ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                    onClick={() =>
                      avvia(async () => {
                        const nascondi = f.stato === 'approvata';
                        const r = await cambiaVisibilita(f.id, nascondi);
                        if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                        setLista((l) => l.map((x) => (x.id === f.id ? { ...x, stato: nascondi ? 'nascosta' : 'approvata' } : x)));
                        setMessaggio({
                          ok: true,
                          testo: nascondi
                            ? 'Nascosta dal sito. Il file resta: si può rimettere quando vuoi.'
                            : 'Di nuovo sul sito.',
                        });
                      })
                    }
                  >
                    {f.stato === 'approvata' ? 'Nascondi' : 'Rimetti'}
                  </Button>
                )}

                <Tooltip label="Elimina per sempre">
                  <ActionIcon
                    color="red"
                    variant="light"
                    size="lg"
                    aria-label="Elimina"
                    onClick={() => {
                      /* La conferma c'e' perche' questa e' l'unica azione
                         del pannello che non si annulla: va via la riga E
                         il file dallo storage. */
                      if (!window.confirm(`Eliminare «${f.alt}»? Il file viene cancellato e non si recupera.`)) return;
                      avvia(async () => {
                        const r = await elimina(f.id);
                        if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                        setLista((l) => l.filter((x) => x.id !== f.id));
                        setMessaggio({ ok: true, testo: 'Eliminata.' });
                      });
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      {/* ── la foto grande ── */}
      <Modal
        opened={!!grande}
        onClose={() => setGrande(null)}
        size="xl"
        centered
        title={grande?.alt}
      >
        {grande?.anteprima && (
          <Stack gap="sm">
            <Image src={grande.anteprima} alt={grande.alt} fit="contain" mah="70vh" />
            <Text size="sm" c="dimmed">
              {grande.larghezza}×{grande.altezza}
              {grande.scattata
                ? ` · scattata il ${new Date(grande.scattata).toLocaleDateString('it-IT')}`
                : ' · senza data di scatto'}
            </Text>
          </Stack>
        )}
      </Modal>

      {/* ── correggi ── */}
      <Modal
        opened={!!modifica}
        onClose={() => setModifica(null)}
        title="Correggi la foto"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Descrizione in inglese"
            description="Cosa si vede nella foto. La leggono Google e chi non può vedere l’immagine."
            value={bozza.alt}
            onChange={(e) => setBozza({ ...bozza, alt: e.currentTarget.value })}
          />
          <TextInput
            label="Didascalia"
            description="Facoltativa: compare sulla foto, sul sito."
            value={bozza.caption}
            onChange={(e) => setBozza({ ...bozza, caption: e.currentTarget.value })}
          />

          <SceltaPagine
            pagine={pagine}
            valore={bozza.tag}
            cambia={(v) => setBozza({ ...bozza, tag: v })}
            altezza={260}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModifica(null)}>Annulla</Button>
            <Button
              loading={inCorso}
              onClick={() =>
                avvia(async () => {
                  if (!modifica) return;
                  const r = await aggiornaFoto(modifica.id, {
                    alt: bozza.alt,
                    caption: bozza.caption || null,
                    tag: bozza.tag,
                  });
                  if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non salvata.' }); return; }
                  setLista((l) =>
                    l.map((x) =>
                      x.id === modifica.id
                        ? {
                            ...x,
                            alt: bozza.alt,
                            caption: bozza.caption || null,
                            tag: pagine.filter((p) => bozza.tag.includes(p.key)),
                          }
                        : x
                    )
                  );
                  setModifica(null);
                  setMessaggio({ ok: true, testo: 'Salvata.' });
                })
              }
            >
              Salva
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
