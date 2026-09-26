'use client';

import { useState, useTransition } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  CopyButton,
  Group,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconKey,
  IconLock,
  IconLockOpen,
  IconUserPlus,
} from '@tabler/icons-react';

/* GLI UTENTI DEL PANNELLO.
 *
 * ── 🔴 LE PASSWORD NON SI POSSONO MOSTRARE, E VA DETTO QUI ────────────
 * Supabase conserva l'IMPRONTA bcrypt della password, non la password:
 * e' un calcolo a senso unico, e dall'impronta non si torna indietro --
 * ne' noi, ne' Supabase, ne' chi avesse il database in mano. E' il motivo
 * per cui si usa bcrypt.
 *
 * Quindi al posto di «vedere» c'e' il CONTROLLO, che per lavorare serve
 * allo stesso modo:
 *  - alla creazione l'admin puo' SCEGLIERE la password, e quindi la sa;
 *  - in qualunque momento puo' ASSEGNARNE UNA NUOVA, scelta o generata.
 * Una guida non puo' cambiarsela: l'unico che decide e' l'admin.
 *
 * ── LA PASSWORD GENERATA SI VEDE UNA VOLTA SOLA ──────────────────────
 * Per lo stesso motivo: chiuso il riquadro, quella password non la sa
 * piu' nessuno. Se invece l'ha scritta l'admin, il riquadro non lo dice:
 * spaventare per una password che chi legge ha appena scelto sarebbe
 * rumore.
 */

export type Utente = {
  id: string;
  username: string | null;
  nome: string | null;
  ruolo: string;
  attivo: boolean;
  contatto: string | null;
  ultimoAccesso: string | null;
  foto: number;
  sonoIo: boolean;
};

type Credenziali = { username?: string; password?: string; consegna?: string; generata?: boolean };
type Esito = { ok: boolean; errore?: string } & Credenziali;

export function GestioneUtenti({
  utenti,
  creaGuida,
  rigeneraPassword,
  cambiaAttivo,
}: {
  utenti: Utente[];
  creaGuida: (d: {
    username: string;
    nome: string;
    contatto: string;
    password?: string;
  }) => Promise<Esito>;
  rigeneraPassword: (id: string, scelta?: string) => Promise<Esito>;
  cambiaAttivo: (id: string, attivo: boolean) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [lista, setLista] = useState(utenti);
  const [form, setForm] = useState({ username: '', nome: '', contatto: '', password: '' });
  const [cred, setCred] = useState<Credenziali | null>(null);
  const [nuova, setNuova] = useState<{ id: string; nome: string; pw: string } | null>(null);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const guide = lista.filter((u) => u.ruolo === 'guida');
  const admin = lista.filter((u) => u.ruolo === 'admin');

  return (
    <Stack gap="lg">
      {messaggio && (
        <Alert color={messaggio.ok ? 'teal' : 'red'} variant="light" radius="md"
          withCloseButton onClose={() => setMessaggio(null)}>
          {messaggio.testo}
        </Alert>
      )}

      {/* ── le credenziali appena create ── */}
      {cred?.password && (
        <Card withBorder radius="md" p="lg" bg="teal.0" style={{ borderColor: 'var(--mantine-color-teal-4)' }}>
          <Title order={2} size="h4" mb="xs">Credenziali di «{cred.username}»</Title>

          {cred.generata && (
            <Alert color="orange" variant="light" radius="sm" mb="md" icon={<IconAlertTriangle size={18} />}>
              <b>Questa password si vede una volta sola.</b> Non è conservata da nessuna
              parte: in Supabase resta solo la sua impronta, che non si può riportare
              indietro. Copiala e mandala adesso — se la perdi, gliene assegni un’altra.
            </Alert>
          )}

          <Textarea readOnly autosize minRows={8} value={cred.consegna} mb="sm"
            onFocus={(e) => e.currentTarget.select()} />

          <Group>
            <CopyButton value={cred.consegna ?? ''} timeout={2500}>
              {({ copied, copy }) => (
                <Button color={copied ? 'teal' : undefined} onClick={copy}
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}>
                  {copied ? 'Copiato' : 'Copia il messaggio'}
                </Button>
              )}
            </CopyButton>
            <Button variant="default" onClick={() => setCred(null)}>Ho finito, chiudi</Button>
          </Group>
        </Card>
      )}

      {/* ── nuova guida ── */}
      <Card withBorder radius="md" p="lg">
        <Title order={2} size="h4" mb="md">Nuova guida</Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
          <TextInput
            label="Nome utente"
            description="Da 3 a 32 caratteri: minuscole, numeri, punto, trattino. È quello che scriverà per entrare."
            placeholder="mario"
            value={form.username}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setForm({ ...form, username: e.currentTarget.value })}
          />
          <TextInput
            label="Nome e cognome"
            description="È quello che si vede nel pannello accanto alle sue foto."
            placeholder="Mario Rossi"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.currentTarget.value })}
          />
          <TextInput
            label="Email di contatto"
            description="Solo per scriverle: non è l’indirizzo con cui entra."
            placeholder="mario@esempio.com"
            value={form.contatto}
            autoCapitalize="off"
            onChange={(e) => setForm({ ...form, contatto: e.currentTarget.value })}
          />
          <PasswordInput
            label="Password"
            description="Lasciala vuota e la genero io. Minimo 8 caratteri."
            placeholder="la scelgo io se resta vuota"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.currentTarget.value })}
          />
        </SimpleGrid>

        <Button
          leftSection={<IconUserPlus size={17} />}
          loading={inCorso}
          onClick={() =>
            avvia(async () => {
              setMessaggio(null);
              const r = await creaGuida(form);
              if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
              setCred({ username: r.username, password: r.password, consegna: r.consegna, generata: r.generata });
              setForm({ username: '', nome: '', contatto: '', password: '' });
              setMessaggio({ ok: true, testo: 'Guida creata. Ricarica la pagina per vederla nell’elenco.' });
            })
          }
        >
          Crea la guida
        </Button>
      </Card>

      {/* ── le guide ── */}
      <Card withBorder radius="md" p="lg">
        <Title order={2} size="h4" mb="xs">Guide ({guide.length})</Title>
        <Text size="sm" c="dimmed" mb="md">
          Tutti i dati di accesso. La <b>password non si può mostrare</b>: Supabase ne
          conserva solo l’impronta, che non si riporta indietro. Quello che puoi fare
          sempre è <b>assegnarne una nuova</b>, scegliendola tu.
        </Text>

        {!guide.length ? (
          <Alert color="gray" variant="light" radius="sm">
            Nessuna guida. Creane una qui sopra e mandale le credenziali.
          </Alert>
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Persona</Table.Th>
                  <Table.Th>Nome utente</Table.Th>
                  <Table.Th>Contatto</Table.Th>
                  <Table.Th>Ultimo accesso</Table.Th>
                  <Table.Th>Foto</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {guide.map((u) => (
                  <Table.Tr key={u.id} opacity={u.attivo ? 1 : 0.55}>
                    <Table.Td>
                      <Text fw={600} size="sm">{u.nome ?? '—'}</Text>
                      {!u.attivo && (
                        <Badge color="red" variant="light" size="sm" radius="sm" mt={2}>
                          accesso chiuso
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap">
                        <Text ff="monospace" size="sm">{u.username ?? '—'}</Text>
                        {u.username && (
                          <CopyButton value={u.username} timeout={1500}>
                            {({ copied, copy }) => (
                              <Tooltip label={copied ? 'Copiato' : 'Copia'}>
                                <ActionIcon variant="subtle" size="sm" onClick={copy}
                                  aria-label="Copia il nome utente">
                                  {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={u.contatto ? undefined : 'dimmed'}>
                        {u.contatto ?? 'non indicato'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={u.ultimoAccesso ? undefined : 'dimmed'}>
                        {u.ultimoAccesso
                          ? new Date(u.ultimoAccesso).toLocaleDateString('it-IT')
                          : 'mai entrata'}
                      </Text>
                    </Table.Td>
                    <Table.Td><Text size="sm">{u.foto}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={6} justify="flex-end" wrap="nowrap">
                        <Button size="compact-sm" variant="default" leftSection={<IconKey size={14} />}
                          onClick={() => setNuova({ id: u.id, nome: u.nome ?? u.username ?? '', pw: '' })}>
                          Password
                        </Button>
                        <Tooltip label={u.attivo ? 'Chiudi l’accesso' : 'Riapri l’accesso'}>
                          <ActionIcon
                            variant="light"
                            color={u.attivo ? 'red' : 'teal'}
                            size="lg"
                            loading={inCorso}
                            aria-label={u.attivo ? 'Chiudi l’accesso' : 'Riapri l’accesso'}
                            onClick={() =>
                              avvia(async () => {
                                const r = await cambiaAttivo(u.id, !u.attivo);
                                if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                                setLista((l) => l.map((x) => (x.id === u.id ? { ...x, attivo: !u.attivo } : x)));
                                setMessaggio({
                                  ok: true,
                                  testo: u.attivo
                                    ? 'Accesso chiuso. Le foto già caricate restano dove sono, col suo nome.'
                                    : 'Accesso riaperto.',
                                });
                              })
                            }
                          >
                            {u.attivo ? <IconLock size={16} /> : <IconLockOpen size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {/* ── gli amministratori ── */}
      <Card withBorder radius="md" p="lg">
        <Title order={2} size="h4" mb="xs">Amministratori ({admin.length})</Title>
        <Text size="sm" c="dimmed" mb="md">
          Hanno tutti la <b>stessa password</b>, per scelta. Si cambia da Supabase →
          Authentication → Users, e va cambiata su tutti e tre insieme: da qui non si
          tocca, o i tre si troverebbero con password diverse senza accorgersene.
        </Text>
        <Group gap="sm">
          {admin.map((u) => (
            <Paper key={u.id} withBorder radius="md" p="sm">
              <Text fw={600} size="sm">{u.nome ?? u.username}</Text>
              <Text ff="monospace" size="xs" c="dimmed">{u.username ?? '—'}</Text>
              <Text size="xs" c="dimmed" mt={4}>
                {u.ultimoAccesso
                  ? `ultimo accesso ${new Date(u.ultimoAccesso).toLocaleDateString('it-IT')}`
                  : 'mai entrato'}
                {u.sonoIo && ' · sei tu'}
              </Text>
            </Paper>
          ))}
        </Group>
      </Card>

      {/* ── assegna una password nuova ── */}
      <Modal opened={!!nuova} onClose={() => setNuova(null)} title={`Password di ${nuova?.nome ?? ''}`}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            La password attuale non si può leggere: quello che si fa è <b>sostituirla</b>.
            Da quel momento la vecchia non funziona più.
          </Text>
          <PasswordInput
            label="Password nuova"
            description="Lasciala vuota e la genero io. Minimo 8 caratteri."
            placeholder="la genero io se resta vuota"
            value={nuova?.pw ?? ''}
            onChange={(e) => setNuova((n) => (n ? { ...n, pw: e.currentTarget.value } : n))}
            data-autofocus
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setNuova(null)}>Annulla</Button>
            <Button
              loading={inCorso}
              onClick={() =>
                avvia(async () => {
                  if (!nuova) return;
                  const r = await rigeneraPassword(nuova.id, nuova.pw || undefined);
                  if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                  setCred({ username: r.username, password: r.password, consegna: r.consegna, generata: r.generata });
                  setNuova(null);
                })
              }
            >
              Assegna
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
