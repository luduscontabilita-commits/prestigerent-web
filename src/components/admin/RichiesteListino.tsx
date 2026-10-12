'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Anchor, Badge, Button, Card, Code, Drawer, Group, SegmentedControl, Stack, Table, Text, Title } from '@mantine/core';
import type { Esito, EsitoApprova } from '@/app/admin/partners/azioni';

/* LE DUE PAGINE «PARTNERS» DEL PANNELLO: le richieste di accesso
 * (/admin/partners/) e i partner attivi (/admin/partners/attivi/).
 *
 * Client per i pulsanti e per la notazione col punto di Mantine
 * (`Table.Tr`), che in un Server Component non si puo' usare -- vedi
 * CLAUDE.md. Le azioni arrivano come proprieta' dalla pagina.
 *
 * La password appena creata si MOSTRA anche qui, oltre a partire per
 * email: se la posta non parte (Microsoft giu', indirizzo sbagliato)
 * l'admin deve poterla consegnare a mano subito, non scoprirlo quando il
 * partner telefona. */

export type RichiestaListino = {
  id: string;
  creata_il: string;
  nome: string;
  cognome: string;
  azienda: string | null;
  tipo_attivita: string | null;
  paese: string | null;
  email: string;
  telefono: string | null;
  sito_web: string | null;
  note: string | null;
  stato: 'in_attesa' | 'approvata' | 'rifiutata';
  decisa_il: string | null;
};

export type Partner = {
  id: string;
  email: string;
  nome: string | null;
  attivo: boolean;
  ultimo_accesso: string | null;
  /** dalla richiesta di accesso: `profili` non li conserva */
  telefono: string | null;
  azienda: string | null;
  /** la richiesta da cui e' nato l'accesso, intera; null per un accesso
   *  creato a mano (il partner di prova) */
  richiesta: RichiestaListino | null;
};

const data = (s: string | null) =>
  s ? new Date(s).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** Il pannello con TUTTO quello che la persona ha scritto registrandosi,
 *  per decisione della proprieta' (12/10/2026): l'admin deve poter
 *  vedere i dati di chi ha accesso, non solo nome ed email. Si apre da
 *  una richiesta o da un partner gia' approvato. */
function SchedaDati({ r, p }: { r: RichiestaListino | null; p?: Partner }) {
  const riga = (etichetta: string, valore: React.ReactNode) => (
    <Table.Tr key={etichetta}>
      <Table.Th w={150} style={{ verticalAlign: 'top' }}>{etichetta}</Table.Th>
      <Table.Td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{valore || '—'}</Table.Td>
    </Table.Tr>
  );
  return (
    <Stack gap="md">
      {!r && (
        <Alert color="gray" variant="light">
          Questo accesso non è nato da una registrazione (è stato creato a mano): non ci sono dati inseriti dall’utente.
        </Alert>
      )}
      <Table withRowBorders verticalSpacing="xs">
        <Table.Tbody>
          {r && riga('Nome', r.nome)}
          {r && riga('Cognome', r.cognome)}
          {r && riga('Azienda', r.azienda)}
          {r && riga('Tipo di attività', r.tipo_attivita)}
          {r && riga('Paese', r.paese)}
          {riga('Email', <Anchor href={`mailto:${r?.email ?? p?.email}`}>{r?.email ?? p?.email}</Anchor>)}
          {r && riga('Telefono', r.telefono ? <Anchor href={`tel:${r.telefono.replace(/[^\d+]/g, '')}`}>{r.telefono}</Anchor> : null)}
          {r && riga('Sito', r.sito_web ? <Anchor href={r.sito_web} target="_blank" rel="noopener noreferrer">{r.sito_web}</Anchor> : null)}
          {r && riga('Note', r.note)}
          {r && riga('Richiesta arrivata', data(r.creata_il))}
          {r && riga('Stato', r.stato === 'in_attesa' ? 'in attesa' : r.stato === 'approvata' ? `approvata il ${data(r.decisa_il)}` : `rifiutata il ${data(r.decisa_il)}`)}
          {p && riga('Accesso', p.attivo ? 'attivo' : 'chiuso')}
          {p && riga('Ultimo accesso', data(p.ultimo_accesso))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

export function RichiesteListino({
  mostra,
  richieste,
  partner,
  approva,
  rifiuta,
  nuovaPassword,
  cambiaAttivo,
}: {
  /** quale delle due pagine «Partners»: le richieste, o chi ha gia' accesso */
  mostra: 'richieste' | 'attivi';
  richieste: RichiestaListino[];
  partner: Partner[];
  approva: (id: string) => Promise<EsitoApprova>;
  rifiuta: (id: string) => Promise<Esito>;
  nuovaPassword: (idProfilo: string) => Promise<EsitoApprova>;
  cambiaAttivo: (idProfilo: string, attivo: boolean) => Promise<Esito>;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<'in_attesa' | 'decise'>('in_attesa');
  const [lavoro, setLavoro] = useState<string | null>(null);
  /* 🔴 L'ESITO SOPRAVVIVE AL RICARICAMENTO DELLA PAGINA.
     Provato il 12/10/2026 in Chrome sul sito pubblicato: dopo un'azione
     il `router.refresh()` riceve dal server un identificativo di build
     diverso da quello del client e Next ricarica la pagina per intero
     (fetch-server-response.js, «The server build does not match the
     client build»). Lo stato del componente si perde, e con lui il
     riquadro con la PASSWORD appena creata: si vedeva per un istante e
     spariva. Qui l'esito passa dalla sessione del browser: si scrive
     prima del ricaricamento e si cancella appena riletto. */
  const [esito, setEsitoVero] = useState<{ colore: string; titolo: string; testo?: string; password?: string } | null>(null);
  const setEsito = (e: { colore: string; titolo: string; testo?: string; password?: string } | null) => {
    setEsitoVero(e);
    try {
      if (e) sessionStorage.setItem('partners-esito', JSON.stringify(e));
      else sessionStorage.removeItem('partners-esito');
    } catch {}
  };
  /* Riletto DOPO il montaggio e non nel valore iniziale: cosi' il primo
     disegno nel browser e' identico a quello del server (niente errore di
     idratazione). `queueMicrotask` perche' l'aggiornamento non avvenga
     dentro il corpo dell'effetto. */
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const s = sessionStorage.getItem('partners-esito');
        if (s) {
          sessionStorage.removeItem('partners-esito');
          setEsitoVero(JSON.parse(s));
        }
      } catch {}
    });
  }, []);
  const [scheda, setScheda] = useState<{ titolo: string; r: RichiestaListino | null; p?: Partner } | null>(null);

  const inAttesa = richieste.filter((r) => r.stato === 'in_attesa');
  const decise = richieste.filter((r) => r.stato !== 'in_attesa');
  const elenco = vista === 'in_attesa' ? inAttesa : decise;

  const conPassword = (r: EsitoApprova, cosa: string) => {
    if (!r.ok) return setEsito({ colore: 'red', titolo: r.errore ?? 'Non è andata.' });
    setEsito({
      colore: r.inviata ? 'teal' : 'orange',
      titolo: r.inviata ? `${cosa}: email con la password mandata a ${r.email}.` : `${cosa}, ma l’email a ${r.email} NON è partita.`,
      testo: r.inviata ? 'La password è anche qui sotto, se serve.' : 'Consegna tu la password: si entra da prestigerent.com/partners/ con email e password.',
      password: r.password,
    });
  };

  const fai = async (chiave: string, f: () => Promise<void>) => {
    setLavoro(chiave);
    setEsito(null);
    await f();
    setLavoro(null);
    router.refresh();
  };

  return (
    <Stack gap="xl">
      <Drawer
        opened={!!scheda}
        onClose={() => setScheda(null)}
        position="right"
        size="md"
        title={<Text fw={800}>{scheda?.titolo}</Text>}
      >
        {scheda && <SchedaDati r={scheda.r} p={scheda.p} />}
      </Drawer>

      {esito && (
        <Alert color={esito.colore} variant="light" title={esito.titolo} withCloseButton onClose={() => setEsito(null)}>
          {esito.testo && <Text size="sm">{esito.testo}</Text>}
          {esito.password && (
            <Text size="sm" mt={4}>
              Password: <Code>{esito.password}</Code>
            </Text>
          )}
        </Alert>
      )}

      {mostra === 'richieste' && (
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <Title order={2} size="h3">Richieste</Title>
          <SegmentedControl
            value={vista}
            onChange={(v) => setVista(v as 'in_attesa' | 'decise')}
            data={[
              { value: 'in_attesa', label: `In attesa (${inAttesa.length})` },
              { value: 'decise', label: `Già decise (${decise.length})` },
            ]}
          />
        </Group>

        {!elenco.length ? (
          <Card withBorder radius="md" padding="lg">
            <Text c="dimmed">{vista === 'in_attesa' ? 'Nessuna richiesta in attesa.' : 'Nessuna richiesta decisa finora.'}</Text>
          </Card>
        ) : (
          elenco.map((r) => (
            <Card key={r.id} withBorder radius="md" padding="md">
              <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                <Stack gap={2} style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <Text fw={800}>
                    {r.nome} {r.cognome}
                    {r.azienda ? <Text span c="dimmed" fw={500}> · {r.azienda}</Text> : null}
                  </Text>
                  <Text size="sm">
                    {[r.tipo_attivita, r.paese].filter(Boolean).join(' · ')}
                  </Text>
                  <Text size="sm">
                    <Anchor href={`mailto:${r.email}`} size="sm">{r.email}</Anchor>
                    {r.telefono ? ` · ${r.telefono}` : ''}
                    {r.sito_web ? (
                      <>
                        {' · '}
                        <Anchor href={r.sito_web} target="_blank" rel="noopener noreferrer" size="sm">{r.sito_web}</Anchor>
                      </>
                    ) : null}
                  </Text>
                  {r.note && <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{r.note}</Text>}
                  <Text size="xs" c="dimmed">Arrivata il {data(r.creata_il)}{r.decisa_il ? ` · decisa il ${data(r.decisa_il)}` : ''}</Text>
                </Stack>
                {r.stato === 'in_attesa' ? (
                  <Group gap="xs">
                    <Button size="sm" variant="subtle" onClick={() => setScheda({ titolo: `${r.nome} ${r.cognome}`, r })}>
                      Dati
                    </Button>
                    <Button
                      size="sm"
                      loading={lavoro === 'ok:' + r.id}
                      disabled={!!lavoro}
                      onClick={() => fai('ok:' + r.id, async () => conPassword(await approva(r.id), 'Approvata'))}
                    >
                      Approva
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      loading={lavoro === 'no:' + r.id}
                      disabled={!!lavoro}
                      onClick={() =>
                        fai('no:' + r.id, async () => {
                          const e = await rifiuta(r.id);
                          setEsito(e.ok ? { colore: 'gray', titolo: 'Richiesta rifiutata. Non è stata mandata nessuna email.' } : { colore: 'red', titolo: e.errore ?? 'Non è andata.' });
                        })
                      }
                    >
                      Rifiuta
                    </Button>
                  </Group>
                ) : (
                  <Group gap="xs">
                    <Button size="sm" variant="subtle" onClick={() => setScheda({ titolo: `${r.nome} ${r.cognome}`, r })}>
                      Dati
                    </Button>
                    <Badge variant="light" color={r.stato === 'approvata' ? 'teal' : 'gray'}>
                      {r.stato === 'approvata' ? 'approvata' : 'rifiutata'}
                    </Badge>
                  </Group>
                )}
              </Group>
            </Card>
          ))
        )}
      </Stack>
      )}

      {mostra === 'attivi' && (
      <Stack gap="sm">
        <Title order={2} size="h3">Partner attivi ({partner.length})</Title>
        {!partner.length ? (
          <Card withBorder radius="md" padding="lg">
            <Text c="dimmed">Ancora nessuno: compariranno qui dopo la prima approvazione.</Text>
          </Card>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Persona</Table.Th>
                  <Table.Th>Ultimo accesso</Table.Th>
                  <Table.Th>Stato</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {partner.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {p.nome ?? p.email}
                        {p.azienda ? <Text span c="dimmed" fw={500}> · {p.azienda}</Text> : null}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {p.email}
                        {p.telefono ? ` · ${p.telefono}` : ''}
                      </Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{data(p.ultimo_accesso)}</Text></Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={p.attivo ? 'teal' : 'gray'}>{p.attivo ? 'attivo' : 'chiuso'}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => setScheda({ titolo: p.nome ?? p.email, r: p.richiesta, p })}
                        >
                          Dati
                        </Button>
                        <Button
                          size="xs"
                          variant="default"
                          loading={lavoro === 'pw:' + p.id}
                          disabled={!!lavoro || !p.attivo}
                          onClick={() => fai('pw:' + p.id, async () => conPassword(await nuovaPassword(p.id), 'Password nuova'))}
                        >
                          Nuova password
                        </Button>
                        <Button
                          size="xs"
                          variant={p.attivo ? 'light' : 'default'}
                          color={p.attivo ? 'red' : undefined}
                          loading={lavoro === 'on:' + p.id}
                          disabled={!!lavoro}
                          onClick={() =>
                            fai('on:' + p.id, async () => {
                              const e = await cambiaAttivo(p.id, !p.attivo);
                              setEsito(e.ok ? { colore: 'gray', titolo: p.attivo ? 'Accesso chiuso.' : 'Accesso riaperto.' } : { colore: 'red', titolo: e.errore ?? 'Non è andata.' });
                            })
                          }
                        >
                          {p.attivo ? 'Chiudi l’accesso' : 'Riapri'}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
      )}
    </Stack>
  );
}
