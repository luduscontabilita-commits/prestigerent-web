'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Anchor, Button, Card, Code, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconDownload, IconQrcode } from '@tabler/icons-react';
import type { Esito } from '@/app/admin/partners/azioni';

/* IL QR CODE DELLA FIERA, nel pannello: anteprima, download, e la
 * destinazione modificabile.
 *
 * Il PNG non cambia mai: contiene l'indirizzo fisso del sito. Cambiando
 * la destinazione qui, i QR gia' stampati portano subito alla pagina
 * nuova. Per questo il salvataggio NON tocca l'immagine. */

const MISURE = [512, 1024, 2048];

export function GestioneQr({
  codice,
  indirizzoQr,
  destinazione,
  aggiornato,
  salva,
}: {
  codice: string;
  indirizzoQr: string;
  destinazione: string;
  aggiornato: string | null;
  salva: (codice: string, destinazione: string) => Promise<Esito>;
}) {
  const router = useRouter();
  const [valore, setValore] = useState(destinazione);
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState<{ colore: string; testo: string } | null>(null);
  const cambiato = valore.trim() !== destinazione;

  const salvaOra = async () => {
    setInvio(true);
    setEsito(null);
    const r = await salva(codice, valore);
    setInvio(false);
    setEsito(r.ok ? { colore: 'teal', testo: 'Salvato: da adesso il QR porta al nuovo indirizzo, anche quello già stampato.' } : { colore: 'red', testo: r.errore ?? 'Non è andata.' });
    if (r.ok) router.refresh();
  };

  return (
    <Group align="flex-start" gap="xl" wrap="wrap">
      <Card withBorder radius="md" padding="lg" style={{ flex: '0 0 auto' }}>
        <Stack gap="sm" align="center">
          {/* sfondo a scacchi: si vede che il PNG e' trasparente */}
          <div
            style={{
              width: 260,
              height: 260,
              backgroundImage:
                'linear-gradient(45deg,#eee 25%,transparent 25%),linear-gradient(-45deg,#eee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eee 75%),linear-gradient(-45deg,transparent 75%,#eee 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
              borderRadius: 8,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/admin/partners/qrcode/png/?misura=520" alt="QR code verso l’area partner" width={260} height={260} />
          </div>
          <Text size="xs" c="dimmed" ta="center" maw={260}>
            PNG trasparente: va stampato su un fondo chiaro.
          </Text>
          <Group gap="xs" justify="center">
            {MISURE.map((m) => (
              <Button
                key={m}
                component="a"
                href={`/admin/partners/qrcode/png/?misura=${m}&scarica=1`}
                size="xs"
                variant={m === 1024 ? 'filled' : 'default'}
                leftSection={<IconDownload size={14} />}
              >
                {m} px
              </Button>
            ))}
          </Group>
        </Stack>
      </Card>

      <Stack gap="md" style={{ flex: '1 1 380px', minWidth: 0 }}>
        <div>
          <Title order={2} size="h4">
            <IconQrcode size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            Indirizzo stampato nel QR
          </Title>
          <Code block mt={6}>{indirizzoQr}</Code>
          <Text size="sm" c="dimmed" mt={6}>
            Non cambia mai: è quello dentro il QR. Chi lo scansiona viene mandato alla destinazione qui sotto.
          </Text>
        </div>

        <TextInput
          id="destinazione-qr"
          label="Dove porta il QR"
          description="Un indirizzo completo, con https://. Cambiandolo, cambiano anche i QR già stampati."
          value={valore}
          onChange={(e) => setValore(e.currentTarget.value)}
          size="md"
        />
        <Group gap="sm">
          <Button onClick={salvaOra} loading={invio} disabled={!cambiato || !valore.trim()}>
            Salva la destinazione
          </Button>
          <Anchor href={valore} target="_blank" rel="noopener" size="sm">
            Apri la destinazione
          </Anchor>
          <Anchor href={indirizzoQr} target="_blank" rel="noopener" size="sm">
            Prova il QR (apre l’indirizzo stampato)
          </Anchor>
        </Group>
        {aggiornato && (
          <Text size="xs" c="dimmed">
            Ultima modifica: {new Date(aggiornato).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        )}
        {esito && (
          <Alert color={esito.colore} variant="light" withCloseButton onClose={() => setEsito(null)}>
            {esito.testo}
          </Alert>
        )}
      </Stack>
    </Group>
  );
}
