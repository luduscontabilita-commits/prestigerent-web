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
import {
  Checkbox,
  Collapse,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconPencil, IconPhotoUp, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import type { Pagina } from './GalleryCaricatore';

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
  /** le CHIAVI dei tag, non le etichette: il modulo di correzione deve
   *  rimettere le spunte su quello che c'era */
  chiavi: string[];
};

type Esito = { ok: boolean; errore?: string };

const SCHEDE = [
  { id: 'rifiutata', titolo: 'Rifiutate' },
  { id: 'in_attesa', titolo: 'In attesa' },
  { id: 'approvata', titolo: 'Approvate' },
] as const;

export function GalleryMie({
  foto,
  pagine,
  reinvia,
  elimina,
  aggiornaFoto,
}: {
  foto: MiaFoto[];
  /** tutte le pagine taggabili, per il modulo di correzione */
  pagine: Pagina[];
  reinvia: (id: string) => Promise<Esito>;
  elimina: (id: string) => Promise<Esito>;
  aggiornaFoto: (id: string, d: { alt: string; caption: string | null; tag: string[] }) => Promise<Esito>;
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

  /* Quale foto si sta correggendo, e la bozza. Una per volta: due moduli
     aperti insieme su un telefono sono due colonne di campi in cui non si
     capisce piu' a quale foto appartengono. */
  const [corregge, setCorregge] = useState<string | null>(null);
  const [bozza, setBozza] = useState<{ alt: string; caption: string; tag: string[] }>({ alt: '', caption: '', tag: [] });

  const apriCorrezione = (f: MiaFoto) => {
    setCorregge(f.id);
    setBozza({ alt: f.alt, caption: f.caption ?? '', tag: [...f.chiavi] });
    setMessaggio(null);
  };

  /** Salva le correzioni E rimanda in coda, in un gesto solo.
   *
   *  Separare «salva» da «rimanda» lascerebbe la foto corretta ma ferma
   *  fra le rifiutate, e chi l'ha corretta penserebbe di aver finito. */
  const salvaERimanda = (f: MiaFoto) =>
    avvia(async () => {
      setMessaggio(null);
      /* Una chiamata sola, non due. `aggiornaFoto` rimette da se' in
         coda una foto che era rifiutata -- deve farlo, altrimenti la
         policy respinge tutta la modifica. Chiamare `reinvia` dopo
         fallirebbe, perche' a quel punto la foto non e' piu' fra le
         rifiutate. */
      const r1 = await aggiornaFoto(f.id, {
        alt: bozza.alt,
        caption: bozza.caption.trim() || null,
        tag: bozza.tag,
      });
      if (!r1.ok) { setMessaggio({ ok: false, testo: r1.errore ?? 'Non salvata.' }); return; }
      const etichette = bozza.tag.map((k) => pagine.find((p) => p.key === k)?.label ?? k);
      setResto((x) => x.map((y) => (y.id === f.id
        ? { ...y, stato: 'in_attesa' as const, motivo: null, alt: bozza.alt,
            caption: bozza.caption.trim() || null, chiavi: [...bozza.tag], pagine: etichette }
        : y)));
      setCorregge(null);
      setMessaggio({ ok: true, testo: 'Corretta e rimandata: aspetta di nuovo l’approvazione.' });
    });

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
                    {/* 🔴 CORREGGERE, e non solo rimandare.
                        Fino al 26/09/2026 qui c'erano due soli comandi:
                        «Rimanda cosi' com'e'» ed «Elimina». Ma il motivo
                        piu' comune del rifiuto e' proprio un tag
                        sbagliato o una descrizione in italiano: chiedere
                        una correzione e non dare il modo di farla
                        lasciava una sola strada vera, cancellare la foto
                        e ricaricarla da capo. Il server lo permetteva
                        gia' -- `aggiornaFoto` ammette chi carica sulle
                        proprie foto non approvate -- mancava il modulo. */}
                    <Button
                      size="compact-sm"
                      variant="filled"
                      leftSection={<IconPencil size={14} />}
                      onClick={() => (corregge === f.id ? setCorregge(null) : apriCorrezione(f))}
                    >
                      {corregge === f.id ? 'Chiudi' : 'Correggi'}
                    </Button>
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

                  <Collapse expanded={corregge === f.id}>
                    <Stack gap="xs" mt="xs">
                      <TextInput
                        size="xs"
                        label="Descrizione in inglese"
                        value={bozza.alt}
                        onChange={(e) => setBozza({ ...bozza, alt: e.currentTarget.value })}
                        description="Cosa si vede nella foto, in inglese."
                      />
                      <TextInput
                        size="xs"
                        label="Didascalia"
                        value={bozza.caption}
                        onChange={(e) => setBozza({ ...bozza, caption: e.currentTarget.value })}
                      />
                      <Checkbox.Group
                        label="Pagine"
                        value={bozza.tag}
                        onChange={(v) => setBozza({ ...bozza, tag: v })}
                      >
                        {/* Altezza limitata con scorrimento proprio: le
                            pagine sono molte e questa scheda sta dentro
                            una griglia, su un telefono. */}
                        <Stack gap={6} mt={6} mah={200} style={{ overflowY: 'auto' }}>
                          {pagine.map((p) => (
                            <Checkbox key={p.key} value={p.key} label={p.label} size="xs" />
                          ))}
                        </Stack>
                      </Checkbox.Group>

                      <Group gap={6}>
                        <Button
                          size="compact-sm"
                          leftSection={<IconCheck size={14} />}
                          loading={inCorso}
                          disabled={bozza.alt.trim().length < 3 || bozza.tag.length === 0}
                          onClick={() => salvaERimanda(f)}
                        >
                          Salva e rimanda
                        </Button>
                        <Button
                          size="compact-sm"
                          variant="subtle"
                          leftSection={<IconX size={14} />}
                          onClick={() => setCorregge(null)}
                        >
                          Annulla
                        </Button>
                      </Group>
                      {(bozza.alt.trim().length < 3 || bozza.tag.length === 0) && (
                        <Text size="xs" c="orange">
                          {bozza.alt.trim().length < 3
                            ? 'Serve la descrizione in inglese.'
                            : 'Serve almeno una pagina.'}
                        </Text>
                      )}
                    </Stack>
                  </Collapse>
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
