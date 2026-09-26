'use client';

import { useState, useTransition } from 'react';
import {
  Alert,
  Button,
  Card,
  Code,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconDeviceFloppy } from '@tabler/icons-react';
import { CRITERI, type Criterio, type Impostazioni } from '@/lib/gallery-tag';

/* LE IMPOSTAZIONI GENERALI.
 *
 * 🔴 L'INTERRUTTORE E' IN CIMA E CHIEDE CONFERMA PER ACCENDERSI.
 * Accenderlo fa comparire la gallery su ogni pagina che ha abbastanza foto
 * approvate, tutte insieme, su un sito che Google sta scansionando. E'
 * l'unico comando di questo pannello che si vede da fuori, quindi e'
 * l'unico che si fa confermare. Spegnerlo no: spegnere e' sempre la
 * direzione sicura, e chiedere conferma per mettere in salvo vuol dire
 * rallentare qualcuno che ha appena visto qualcosa che non gli piace.
 *
 * ── PERCHE' UN INTERRUTTORE E NON UNA CASELLA DI SPUNTA ────────────────
 * Una casella dice «questa opzione e' scelta»; un interruttore dice
 * «questa cosa e' accesa o spenta, adesso». Qui la seconda e' la domanda
 * vera, ed e' quella che si vuole poter leggere da lontano entrando nella
 * pagina. La scheda intorno cambia colore per lo stesso motivo.
 */

const NOME_CRITERIO: Record<Criterio, string> = {
  manual: 'Manuale (l’ordine che decidi tu)',
  newest: 'Più recenti prima',
  oldest: 'Più vecchie prima',
  daily_random: 'Casuale del giorno',
  alternate: 'Alternata verticale/orizzontale',
};

const NOME_VELOCITA = { slow: 'Lenta', medium: 'Media', fast: 'Veloce' } as const;

export function GalleryImpostazioni({
  iniziali,
  quantePronte,
  salva,
}: {
  iniziali: Impostazioni;
  /** quante pagine mostrerebbero la gallery accendendo l'interruttore:
   *  e' il numero che si vuole sapere PRIMA di accendere */
  quantePronte: number;
  salva: (d: Impostazioni) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [d, setD] = useState<Impostazioni>(iniziali);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const accendendo = d.galleries_enabled && !iniziali.galleries_enabled;

  const invia = () => {
    if (accendendo) {
      const testo =
        quantePronte === 0
          ? 'Nessuna pagina ha ancora abbastanza foto approvate: accendendo ora non comparirà niente. Vuoi accendere comunque?'
          : `La gallery comparirà subito su ${quantePronte} pagine del sito, visibile a tutti. Confermi?`;
      if (!window.confirm(testo)) return;
    }
    avvia(async () => {
      const r = await salva(d);
      setMessaggio(
        r.ok
          ? { ok: true, testo: 'Salvato. Le pagine si aggiornano in pochi secondi.' }
          : { ok: false, testo: r.errore ?? 'Non salvato.' }
      );
    });
  };

  return (
    <Stack gap="md" maw={760}>
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

      <Card
        withBorder
        radius="md"
        padding="md"
        style={{
          borderColor: d.galleries_enabled ? 'var(--mantine-color-green-5)' : undefined,
          background: d.galleries_enabled ? 'var(--mantine-color-green-0)' : undefined,
        }}
      >
        <Switch
          size="lg"
          checked={d.galleries_enabled}
          onChange={(e) => setD({ ...d, galleries_enabled: e.currentTarget.checked })}
          label={<Text fw={700}>Mostra le gallery sul sito</Text>}
          description={
            d.galleries_enabled
              ? `Accesa: ${quantePronte} pagine hanno abbastanza foto e la mostrerebbero.`
              : 'Spenta: nessun visitatore vede niente, su nessuna pagina. Si può caricare e approvare tranquillamente.'
          }
        />
      </Card>

      <Card withBorder radius="md" padding="md">
        <NumberInput
          label="Numero minimo di immagini per mostrare la gallery"
          min={1}
          max={50}
          value={d.min_images}
          onChange={(v) => setD({ ...d, min_images: Number(v) || 1 })}
          description={
            <>
              Sotto questo numero la pagina non mostra niente: né titolo né spazio vuoto.
              Contano solo le foto <b>approvate</b> con il tag di quella pagina.
            </>
          }
        />
      </Card>

      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Title order={2} size="h5">Titoli per le pagine normali (home, categorie, porti)</Title>
          <TextInput
            label="Titolo"
            value={d.default_title}
            onChange={(e) => setD({ ...d, default_title: e.currentTarget.value })}
            description={<>Fra asterischi la parola in corsivo, come nel resto del sito: <Code>Moments from the *road*</Code></>}
          />
          <TextInput
            label={<>Sottotitolo <Text span size="xs" c="dimmed">facoltativo</Text></>}
            value={d.default_subtitle ?? ''}
            onChange={(e) => setD({ ...d, default_subtitle: e.currentTarget.value || null })}
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Title order={2} size="h5">Titoli per le schede dei tour</Title>
          <Text size="xs" c="dimmed">
            Sono separati di proposito: in cima a ogni scheda tour c’è già la striscia delle
            foto del <b>prodotto</b>. Due strisce con lo stesso titolo nella stessa pagina
            sembrano un errore, e queste sono le foto delle giornate vere.
          </Text>
          <TextInput
            label="Titolo"
            value={d.default_title_tour}
            onChange={(e) => setD({ ...d, default_title_tour: e.currentTarget.value })}
          />
          <TextInput
            label={<>Sottotitolo <Text span size="xs" c="dimmed">facoltativo</Text></>}
            value={d.default_subtitle_tour ?? ''}
            onChange={(e) => setD({ ...d, default_subtitle_tour: e.currentTarget.value || null })}
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Select
            label="Ordinamento predefinito delle gallery"
            data={CRITERI.map((c) => ({ value: c, label: NOME_CRITERIO[c] }))}
            value={d.default_sort}
            onChange={(v) => v && setD({ ...d, default_sort: v as Criterio })}
            allowDeselect={false}
            description="«Casuale del giorno» mescola le foto ma tiene lo stesso ordine per tutta la giornata, e cambia a mezzanotte: chi torna sul sito vede una gallery diversa, e le pagine restano in cache."
          />

          <Select
            label="Velocità dello scorrimento automatico"
            data={(Object.keys(NOME_VELOCITA) as (keyof typeof NOME_VELOCITA)[])
              .map((k) => ({ value: k, label: NOME_VELOCITA[k] }))}
            value={d.autoplay_speed}
            onChange={(v) => v && setD({ ...d, autoplay_speed: v as Impostazioni['autoplay_speed'] })}
            allowDeselect={false}
            description="Lo scorrimento si ferma da solo col mouse sopra, col dito, fuori dallo schermo e per chi ha chiesto meno animazioni."
          />
        </Stack>
      </Card>

      <Group justify="flex-end">
        <Button onClick={invia} loading={inCorso} leftSection={<IconDeviceFloppy size={18} />}>
          Salva
        </Button>
      </Group>
    </Stack>
  );
}
