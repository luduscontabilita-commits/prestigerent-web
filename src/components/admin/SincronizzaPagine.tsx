'use client';

import { useState, useTransition } from 'react';
import { Alert, Button, Card, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconRefresh } from '@tabler/icons-react';
import type { EsitoSync } from '@/app/admin/gallery/azioni';

/* «SINCRONIZZA PAGINE», IN IMPOSTAZIONI.
 *
 * Stava in cima a «Pagine», sopra la tabella che si usa ogni giorno. Ma
 * e' un'operazione che si fa una volta sola -- all'inizio, e poi quando
 * nasce un tour nuovo o una categoria nuova: le pagine del sito cambiano
 * di rado. Spostata qui il 27/09/2026 su richiesta della proprieta', con
 * le altre cose che valgono per tutto il sito. */
export function SincronizzaPagine({
  pagine,
  sincronizza,
}: {
  /** quante righe ha il registro adesso */
  pagine: number;
  sincronizza: () => Promise<EsitoSync>;
}) {
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  return (
    <Card withBorder radius="md" padding="md" maw={760}>
      <Stack gap="sm">
        <Title order={2} size="h5">Registro delle pagine</Title>
        <Text size="sm">
          {pagine === 0
            ? 'Il registro è vuoto: nessuna pagina può ancora ricevere foto.'
            : `Il registro contiene ${pagine} pagine.`}
        </Text>
        <Text size="xs" c="dimmed">
          Rilegge le pagine dal codice e dal catalogo dei tour. Serve la prima volta e poi solo
          quando nasce un tour o una categoria nuova. Non cancella mai una riga: una pagina che
          non esiste più diventa «orfana» e resta, con le sue foto.
        </Text>

        {esito && (
          <Alert
            color={esito.ok ? 'green' : 'red'}
            icon={esito.ok ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
            withCloseButton
            onClose={() => setEsito(null)}
          >
            {esito.testo}
          </Alert>
        )}

        <Button
          variant="default"
          loading={inCorso}
          leftSection={<IconRefresh size={16} />}
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            avvia(async () => {
              setEsito(null);
              const r = await sincronizza();
              if (!r.ok) { setEsito({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
              const perTipo = Object.entries(r.perTipo ?? {}).map(([t, n]) => `${n} ${t}`).join(', ');
              setEsito({
                ok: true,
                testo: `Registro aggiornato: ${r.aggiunte} nuove, ${r.aggiornate} già c’erano, ${r.orfane} orfane (${perTipo}).`,
              });
            })
          }
        >
          Sincronizza pagine
        </Button>
      </Stack>
    </Card>
  );
}
