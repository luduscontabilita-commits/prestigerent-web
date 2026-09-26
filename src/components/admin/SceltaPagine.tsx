'use client';

import { useMemo, useState } from 'react';
import { Badge, Checkbox, Group, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { Pagina } from './GalleryCaricatore';

/* SU QUALI PAGINE VA QUESTA FOTO.
 *
 * ── PERCHE' UN COMPONENTE SOLO ─────────────────────────────────────────
 * La stessa scelta serve in tre posti: «Correggi la foto» nell'archivio,
 * «Correggi e approva» nella coda, e la correzione di una foto rimandata
 * indietro. Erano tre elenchi di caselle scritti tre volte, e sarebbero
 * diventati tre comportamenti diversi alla prima modifica.
 *
 * ── PERCHE' LA RICERCA NON E' UN LUSSO ─────────────────────────────────
 * Il registro e' passato da 3 a 103 pagine con la sincronizzazione del
 * 26/09/2026: 87 sono schede di tour, con nomi lunghi e che si
 * assomigliano. Scorrere centotre caselle per trovarne una e' il modo in
 * cui si spunta quella sbagliata.
 *
 * ── PERCHE' IL RIEPILOGO STA IN CIMA ───────────────────────────────────
 * Appena si cerca, l'elenco si accorcia e le pagine gia' scelte spariscono
 * dalla vista: senza un riepilogo si perde di vista cosa si e' messo, e
 * si finisce per togliere la ricerca solo per ricontrollare. Le
 * etichette restano sempre visibili, e da li' si tolgono con un clic.
 */
export function SceltaPagine({
  pagine,
  valore,
  cambia,
  altezza = 240,
  etichetta = 'Pagine',
}: {
  pagine: Pagina[];
  valore: string[];
  cambia: (v: string[]) => void;
  altezza?: number;
  etichetta?: string;
}) {
  const [cerca, setCerca] = useState('');

  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    if (!q) return pagine;
    return pagine.filter(
      (p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
    );
  }, [pagine, cerca]);

  const scelte = valore
    .map((k) => pagine.find((p) => p.key === k) ?? { key: k, label: k, path: '', type: 'tour' as const })
    .sort((a, b) => a.label.localeCompare(b.label, 'it'));

  const togli = (k: string) => cambia(valore.filter((x) => x !== k));

  return (
    <div>
      <Text size="sm" fw={500} mb={6}>
        {etichetta}{' '}
        <Text span size="xs" c={valore.length ? 'dimmed' : 'red'}>
          {valore.length ? `· ${valore.length} scelte` : '· nessuna scelta'}
        </Text>
      </Text>

      {/* il riepilogo: sempre visibile, anche mentre si cerca */}
      {scelte.length > 0 && (
        <Group gap={6} mb="xs">
          {scelte.map((p) => (
            <Badge
              key={p.key}
              variant="light"
              color="prestige"
              style={{ textTransform: 'none' }}
              rightSection={
                <Text
                  component="span"
                  role="button"
                  aria-label={`Togli ${p.label}`}
                  style={{ cursor: 'pointer', lineHeight: 1, paddingLeft: 2 }}
                  onClick={() => togli(p.key)}
                >
                  ×
                </Text>
              }
            >
              {p.label}
            </Badge>
          ))}
        </Group>
      )}

      <TextInput
        size="xs"
        type="search"
        placeholder={`cerca fra ${pagine.length} pagine…`}
        leftSection={<IconSearch size={14} />}
        value={cerca}
        onChange={(e) => setCerca(e.currentTarget.value)}
        mb={6}
      />

      <ScrollArea.Autosize mah={altezza} type="auto">
        <Stack gap={4} pr="sm">
          {filtrate.length === 0 ? (
            <Text size="xs" c="dimmed">Nessuna pagina con «{cerca}».</Text>
          ) : (
            filtrate.map((p) => (
              <Checkbox
                key={p.key}
                size="sm"
                label={p.label}
                checked={valore.includes(p.key)}
                onChange={(e) =>
                  cambia(
                    e.currentTarget.checked
                      ? [...valore, p.key]
                      : valore.filter((k) => k !== p.key)
                  )
                }
              />
            ))
          )}
        </Stack>
      </ScrollArea.Autosize>
    </div>
  );
}
