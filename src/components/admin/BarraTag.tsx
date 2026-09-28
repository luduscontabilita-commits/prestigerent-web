'use client';

import { useMemo, useState } from 'react';
import { Button, Group, Paper, Select, Text } from '@mantine/core';
import { IconTagMinus, IconTagPlus } from '@tabler/icons-react';
import type { Pagina } from './GalleryCaricatore';
import { GRUPPI } from './gruppi-pagine';

/* UNA PAGINA SU PIU' FOTO, IN UN GESTO.
 *
 * Chiesto dalla proprieta' il 28/09/2026, per la guida e per l'admin: si
 * selezionano le foto, si sceglie UNA pagina dal menu, si preme Aggiungi o
 * Togli. La stessa barra sta in tre posti -- caricamento, «Le mie foto»,
 * «Tutte le foto» -- cosi' il gesto si impara una volta sola.
 *
 * ── PERCHE' FISSA IN BASSO ─────────────────────────────────────────────
 * Sul telefono l'elenco delle pagine del caricamento stava SOTTO tutte le
 * schede delle foto: con venti foto bisognava scorrere venti schede per
 * arrivarci. La barra resta attaccata al fondo dello schermo mentre si
 * scorre e si spuntano le foto.
 *
 * ── PERCHE' UN MENU A GRUPPI E NON L'ALBERO ────────────────────────────
 * Qui si sceglie UNA pagina per volta: un menu a tendina con ricerca e
 * gruppi (Album, Home, Categorie, Porti, Tour) e' un tocco e due lettere.
 * Le stesse pagine, nello stesso ordine, del menu del caricamento.
 *
 * La barra non sa niente di chi la usa ne' di cosa succede dopo: riceve
 * `applica(chiave, metti)` e basta. Le regole -- una guida su una foto gia'
 * approvata crea una PROPOSTA -- stanno in `tagInBlocco`, sul server. */
export function BarraTag({
  quante,
  descrizione,
  pagine,
  applica,
  occupato = false,
  nota,
}: {
  /** quante foto riceveranno il gesto: con zero i pulsanti sono spenti */
  quante: number;
  /** la frase a sinistra: «3 foto selezionate», «tutte le 12 foto» */
  descrizione: string;
  pagine: Pagina[];
  applica: (chiave: string, metti: boolean) => void;
  occupato?: boolean;
  nota?: string;
}) {
  const [chiave, setChiave] = useState<string | null>(null);

  const dati = useMemo(
    () =>
      GRUPPI.map((g) => ({
        group: g.titolo,
        items: pagine.filter((p) => p.type === g.tipo).map((p) => ({ value: p.key, label: p.label })),
      })).filter((g) => g.items.length),
    [pagine]
  );

  const pronta = quante > 0 && !!chiave && !occupato;

  return (
    <Paper
      withBorder
      shadow="md"
      radius="md"
      p="sm"
      style={{ position: 'sticky', bottom: 12, zIndex: 20 }}
    >
      <Group gap="sm" wrap="wrap" align="center">
        <Text size="sm" fw={600} c={quante ? undefined : 'dimmed'} style={{ flex: '0 0 auto' }}>
          {descrizione}
        </Text>
        <Select
          aria-label="Pagina da aggiungere o togliere"
          placeholder="Scegli la pagina…"
          searchable
          clearable
          data={dati}
          value={chiave}
          onChange={setChiave}
          nothingFoundMessage="Nessuna pagina con questo nome"
          maxDropdownHeight={320}
          comboboxProps={{ withinPortal: true, position: 'top' }}
          style={{ flex: '1 1 240px', minWidth: 0 }}
        />
        <Group gap={6} wrap="nowrap">
          <Button
            leftSection={<IconTagPlus size={16} />}
            disabled={!pronta}
            loading={occupato}
            onClick={() => chiave && applica(chiave, true)}
          >
            Aggiungi
          </Button>
          <Button
            variant="default"
            leftSection={<IconTagMinus size={16} />}
            disabled={!pronta}
            onClick={() => chiave && applica(chiave, false)}
          >
            Togli
          </Button>
        </Group>
      </Group>
      {nota && (
        <Text size="xs" c="dimmed" mt={6}>
          {nota}
        </Text>
      )}
    </Paper>
  );
}
