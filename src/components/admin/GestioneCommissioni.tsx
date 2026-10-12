'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Group, List, NumberInput, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { scomponi } from '@/lib/commissioni';
import type { EsitoCommissioni } from '@/app/admin/partners/commissioni/azioni';

/* LE COMMISSIONI DEI PARTNER, nel pannello: le due percentuali, con
 * l'esempio calcolato mentre si scrive e l'elenco dei servizi a cui si
 * applicano. Il salvataggio e' esplicito (un pulsante), non automatico:
 * cambia quello che pagano tutte le agenzie, meglio un gesto deciso. */

const ESEMPI = { privato: 685, gruppo: 89 };

function euro(n: number) {
  const [i, d] = (Math.round(n * 100) / 100).toFixed(Number.isInteger(n) ? 0 : 2).split('.');
  return '€ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '');
}

export function GestioneCommissioni({
  privato,
  gruppo,
  aggiornato,
  gruppi,
  privati,
  salva,
}: {
  privato: number;
  gruppo: number;
  aggiornato: string | null;
  /** i nomi dei tour di gruppo (a persona) */
  gruppi: string[];
  /** quanti servizi privati, per sezione */
  privati: { sezione: string; quanti: number }[];
  salva: (privato: number, gruppo: number) => Promise<EsitoCommissioni>;
}) {
  const router = useRouter();
  const [p, setP] = useState<number | string>(privato);
  const [g, setG] = useState<number | string>(gruppo);
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState<{ colore: string; testo: string } | null>(null);
  const cambiato = Number(p) !== privato || Number(g) !== gruppo;
  const totPrivati = privati.reduce((a, x) => a + x.quanti, 0);

  const salvaOra = async () => {
    setInvio(true);
    setEsito(null);
    const r = await salva(Number(p), Number(g));
    setInvio(false);
    setEsito(
      r.ok
        ? { colore: 'teal', testo: 'Salvate: il listino dei partner usa già le nuove percentuali.' }
        : { colore: 'red', testo: r.errore ?? 'Non è andata.' }
    );
    if (r.ok) router.refresh();
  };

  const scheda = (titolo: string, valore: number | string, set: (v: number | string) => void, esempio: number, sotto: React.ReactNode) => {
    const x = scomponi(esempio, Number(valore) || 0);
    return (
      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Title order={2} size="h4">{titolo}</Title>
          <NumberInput
            label="Commissione"
            value={valore}
            onChange={set}
            min={0}
            max={99}
            step={1}
            decimalScale={2}
            decimalSeparator=","
            suffix=" %"
            size="md"
            maw={180}
          />
          <Text size="sm" c="dimmed">
            Esempio: Retail <b>{euro(x.retail)}</b> → Net <b>{euro(x.net)}</b>, commissione <b>{euro(x.commissione)}</b>
          </Text>
          {sotto}
        </Stack>
      </Card>
    );
  };

  return (
    <Stack gap="lg" maw={900}>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {scheda(
          'Servizi privati',
          p,
          setP,
          ESEMPI.privato,
          <Text size="sm">
            {totPrivati} servizi con il prezzo per gruppo/veicolo:{' '}
            {privati.map((x) => `${x.sezione} ${x.quanti}`).join(', ')}.
          </Text>
        )}
        {scheda(
          'Tour di gruppo',
          g,
          setG,
          ESEMPI.gruppo,
          <>
            <Text size="sm">{gruppi.length} tour con il prezzo a persona:</Text>
            <List size="sm" spacing={2}>
              {gruppi.map((n) => (
                <List.Item key={n}>{n}</List.Item>
              ))}
            </List>
          </>
        )}
      </SimpleGrid>

      <Group gap="sm">
        <Button onClick={salvaOra} loading={invio} disabled={!cambiato}>
          Salva le commissioni
        </Button>
        {aggiornato && (
          <Text size="xs" c="dimmed">
            Ultima modifica: {new Date(aggiornato).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        )}
      </Group>
      {esito && (
        <Alert color={esito.colore} variant="light" withCloseButton onClose={() => setEsito(null)}>
          {esito.testo}
        </Alert>
      )}
    </Stack>
  );
}
