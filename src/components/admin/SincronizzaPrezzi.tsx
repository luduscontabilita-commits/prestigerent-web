'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Anchor, Badge, Button, Card, Checkbox, Group, Stack, Table, Text } from '@mantine/core';
import type { EsitoSync, Esito } from '@/app/admin/listino/azioni';

/* LA TABELLA PRIMA/DOPO DELLE TAB PRICES, CON I PULSANTI.
 *
 * Riceve solo dati gia' calcolati sul server (src/app/admin/listino/
 * sincronizza/page.tsx) e le due azioni. Il pulsante «Sincronizza tutto»
 * non agisce al primo clic: apre una conferma che dice quante pagine e
 * quanti importi cambiano -- `confirm()` del browser no, perche' su
 * telefono e' facile premerlo per sbaglio e non spiega niente. */

export type TabDaVedere = {
  slug: string;
  nome: string;
  stato: 'uguale' | 'diverso' | 'non_abbinabile';
  motivo: string | null;
  righe: { variante: string; opzione: string; riga: string; sito: number; regiondo: number }[];
  ultima: { quando: string; importi: number } | null;
};

const eur = (n: number) => '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SincronizzaPrezzi({
  tabs,
  sincronizza,
  annulla,
}: {
  tabs: TabDaVedere[];
  sincronizza: (slugs: string[]) => Promise<EsitoSync>;
  annulla: (slug: string) => Promise<Esito>;
}) {
  const router = useRouter();
  const [soloDiverse, setSoloDiverse] = useState(true);
  const [conferma, setConferma] = useState(false);
  const [lavoro, setLavoro] = useState<string | null>(null);
  const [esito, setEsito] = useState<{ colore: string; testo: string } | null>(null);

  const diverse = tabs.filter((t) => t.stato === 'diverso');
  const nonAbbinabili = tabs.filter((t) => t.stato === 'non_abbinabile');
  const importi = diverse.reduce((a, t) => a + t.righe.filter((r) => r.sito !== r.regiondo).length, 0);
  const visibili = soloDiverse ? tabs.filter((t) => t.stato !== 'uguale') : tabs;

  const esegui = async (chiave: string, slugs: string[]) => {
    setLavoro(chiave);
    setEsito(null);
    const r = await sincronizza(slugs);
    setLavoro(null);
    setConferma(false);
    if (!r.ok) {
      setEsito({ colore: 'red', testo: r.errore ?? 'Non è andata.' });
      return;
    }
    const n = r.fatte?.length ?? 0;
    const cifre = (r.fatte ?? []).reduce((a, f) => a + f.importi, 0);
    const salti = (r.saltate ?? []).map((s) => `${s.slug}: ${s.motivo}`).join(' · ');
    setEsito({
      colore: salti ? 'orange' : 'teal',
      testo:
        (n ? `Aggiornate ${n} ${n === 1 ? 'pagina' : 'pagine'} (${cifre} importi). Sul sito si vedono subito.` : 'Nessuna pagina da aggiornare: i prezzi coincidevano già.') +
        (salti ? ` Saltate: ${salti}` : ''),
    });
    router.refresh();
  };

  const rimetti = async (slug: string) => {
    setLavoro('annulla:' + slug);
    setEsito(null);
    const r = await annulla(slug);
    setLavoro(null);
    setEsito(r.ok ? { colore: 'teal', testo: 'Tab rimessa com’era prima della sincronizzazione.' } : { colore: 'red', testo: r.errore ?? 'Non è andata.' });
    router.refresh();
  };

  return (
    <Stack gap="lg">
      <Group gap="md" wrap="wrap">
        <Badge size="lg" variant="light" color={diverse.length ? 'orange' : 'teal'} radius="sm">
          {diverse.length} da aggiornare
        </Badge>
        <Badge size="lg" variant="light" color="teal" radius="sm">
          {tabs.filter((t) => t.stato === 'uguale').length} allineate
        </Badge>
        {nonAbbinabili.length > 0 && (
          <Badge size="lg" variant="light" color="grape" radius="sm">
            {nonAbbinabili.length} da sistemare a mano
          </Badge>
        )}
        <Button ml="auto" disabled={!diverse.length || !!lavoro} onClick={() => setConferma(true)}>
          Sincronizza tutto con Regiondo
        </Button>
      </Group>

      {conferma && (
        <Alert color="orange" variant="light" title={`Stai per aggiornare ${diverse.length} ${diverse.length === 1 ? 'pagina' : 'pagine'} (${importi} importi)`}>
          <Stack gap="xs">
            <Text size="sm">
              Cambiano solo le cifre nella tab PRICES; il testo resta com’è. La versione di prima viene conservata e per ogni
              pagina c’è «Annulla».
            </Text>
            <Group gap="xs">
              <Button size="xs" variant="default" onClick={() => setConferma(false)} disabled={!!lavoro}>
                Lascia stare
              </Button>
              <Button size="xs" color="orange" loading={lavoro === 'tutto'} onClick={() => esegui('tutto', diverse.map((t) => t.slug))}>
                Conferma e sincronizza
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {esito && (
        <Alert color={esito.colore} variant="light" role="status">
          {esito.testo}
        </Alert>
      )}

      <Checkbox
        id="solo-diverse"
        label="Mostra solo le pagine da aggiornare o da sistemare"
        checked={soloDiverse}
        onChange={(e) => setSoloDiverse(e.currentTarget.checked)}
      />

      {!visibili.length && (
        <Card withBorder radius="md" padding="lg">
          <Text c="dimmed">Tutte le tab PRICES sono allineate a Regiondo.</Text>
        </Card>
      )}

      {visibili.map((t) => {
        const n = t.righe.filter((r) => r.sito !== r.regiondo).length;
        return (
          <Card key={t.slug} withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Group justify="space-between" wrap="wrap" gap="xs">
                <div style={{ minWidth: 0 }}>
                  <Text fw={800}>{t.nome}</Text>
                  <Anchor href={`https://prestigerent.com/tour/${t.slug}/`} target="_blank" rel="noopener" size="xs">
                    /tour/{t.slug}/
                  </Anchor>
                </div>
                <Group gap="xs">
                  <Badge variant="light" color={t.stato === 'uguale' ? 'teal' : t.stato === 'diverso' ? 'orange' : 'grape'}>
                    {t.stato === 'uguale' ? 'allineata' : t.stato === 'diverso' ? `${n} da aggiornare` : 'da sistemare a mano'}
                  </Badge>
                  {t.stato === 'diverso' && (
                    <Button size="xs" loading={lavoro === t.slug} disabled={!!lavoro && lavoro !== t.slug} onClick={() => esegui(t.slug, [t.slug])}>
                      Sincronizza
                    </Button>
                  )}
                  {t.ultima && (
                    <Button
                      size="xs"
                      variant="default"
                      loading={lavoro === 'annulla:' + t.slug}
                      disabled={!!lavoro && lavoro !== 'annulla:' + t.slug}
                      onClick={() => rimetti(t.slug)}
                      title={`Ultima sincronizzazione: ${new Date(t.ultima.quando).toLocaleString('it-IT')}`}
                    >
                      Annulla ultima sincronizzazione
                    </Button>
                  )}
                </Group>
              </Group>

              {t.motivo && <Text size="sm" c="grape">{t.motivo}</Text>}

              {t.righe.length > 0 && (
                <Table.ScrollContainer minWidth={560}>
                  <Table striped verticalSpacing={4} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Variante · opzione</Table.Th>
                        <Table.Th ta="right">Sul sito</Table.Th>
                        <Table.Th ta="right">Su Regiondo</Table.Th>
                        <Table.Th ta="right">Differenza</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {t.righe
                        .filter((r) => !soloDiverse || r.sito !== r.regiondo)
                        .map((r, i) => {
                          const d = r.regiondo - r.sito;
                          return (
                            <Table.Tr key={i}>
                              <Table.Td>
                                <Text size="sm">{r.variante} · {r.opzione}</Text>
                                <Text size="xs" c="dimmed">{r.riga}</Text>
                              </Table.Td>
                              <Table.Td ta="right" c={d ? 'dimmed' : undefined} td={d ? 'line-through' : undefined}>
                                {eur(r.sito)}
                              </Table.Td>
                              <Table.Td ta="right" fw={700}>{eur(r.regiondo)}</Table.Td>
                              <Table.Td ta="right" fw={700} c={d === 0 ? 'dimmed' : d < 0 ? 'teal' : 'orange'}>
                                {d === 0 ? '—' : (d > 0 ? '+' : '−') + eur(Math.abs(d))}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Stack>
          </Card>
        );
      })}

      <Text size="xs" c="dimmed">
        Gli importi che non sono prezzi del tour (per esempio «Siena Cathedral, Euro 15,00 per person» sotto «Optional») non
        vengono confrontati né toccati. Una pagina «da sistemare a mano» ha una tab che non corrisponde alle opzioni di
        Regiondo (numero di righe o di persone diverso): va corretta a mano, il pulsante non la tocca.
      </Text>
    </Stack>
  );
}
