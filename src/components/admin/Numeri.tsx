'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  List,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconRefresh, IconSearch } from '@tabler/icons-react';
import type { Esito, Parziale } from '@/app/admin/numeri/azioni';

/* LA PAGINA DEI NUMERI.
 *
 * Due cose sole, e in quest'ordine: QUANTO SONO VECCHI i numeri e un
 * pulsante per rifarli. La fotografia presa a mano un mese fa e' identica,
 * a vedersi, a quella presa stamattina: senza la data accanto nessuno sa
 * se quello che il sito sta dichiarando e' ancora vero. Per questo l'eta'
 * sta in alto, grande, e cambia colore da sola.
 *
 * L'aggiornamento dura circa quaranta secondi. Quaranta secondi di rotella
 * che gira sono lunghi abbastanza da far ripremere il pulsante: qui si
 * vede la barra avanzare, il passo che sta girando ("pagina 5 di 8"), i
 * secondi che passano e la riga di ogni pezzo gia' finito. Se si ferma, si
 * vede DOVE si e' fermato.
 */

export type RigaNumeri = {
  slug: string;
  sku: string | null;
  voto: number | null;
  quante: number | null;
  oggi: number | null;
  ultimi_7: number | null;
  prima_libera: string | null;
  posti_prima: number | null;
  esaurite_30gg: number | null;
  date_totali_30gg: number | null;
  /** il piu' recente fra i tre aggiornamenti che riguardano questa riga */
  aggiornato: string | null;
};

type Azioni = {
  recensioni: () => Promise<Esito & { quanti?: number }>;
  prenotazioni: (daPagina: number) => Promise<Esito & { pagine: number; fatte: number; parziali: Parziale[] }>;
  conteggi: (parziali: Parziale[]) => Promise<Esito & { tour?: number }>;
  disponibilita: (da: number) => Promise<Esito & { totale: number; fatti: number }>;
};

/* Freni: se una risposta tornasse sempre "manca ancora un pezzo" il giro
   non finirebbe mai e continuerebbe a martellare Regiondo da solo. */
const MAX_GIRI_PRENOTAZIONI = 30;
const MAX_GIRI_CALENDARI = 40;

function quantoFa(iso: string, adesso: number): string {
  const min = Math.floor((adesso - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const ore = Math.floor(min / 60);
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`;
  const gg = Math.floor(ore / 24);
  return `${gg} ${gg === 1 ? 'giorno' : 'giorni'} fa`;
}

/** verde fino a tre ore, ambra fino a un giorno, rosso oltre: la soglia
 *  che conta e' "i numeri di oggi", non "i numeri di questo mese" */
function gravita(iso: string | null, adesso: number): 'bene' | 'cosi' | 'male' {
  if (!iso) return 'male';
  const ore = (adesso - new Date(iso).getTime()) / 3600000;
  if (ore < 3) return 'bene';
  if (ore < 24) return 'cosi';
  return 'male';
}

/* L'OROLOGIO, CHE SUL SERVER NON ESISTE.
 *
 * "Aggiornato 2 ore fa" si puo' scrivere solo conoscendo l'ora di ADESSO,
 * e l'ora di adesso durante la costruzione della pagina e' gia' diversa da
 * quella del browser quando la riceve: React se ne accorge e protesta.
 * Qui torna `null` finche' la pagina non e' viva nel browser, e da li' in
 * poi un valore arrotondato ai 30 secondi -- stabile abbastanza da non far
 * ridisegnare la tabella a ogni battito. */
function useOrologio(): number | null {
  return useSyncExternalStore(
    (avvisa) => {
      const t = setInterval(avvisa, 30000);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / 30000) * 30000,
    () => null
  );
}

function data(g: string): string {
  const p = g.split('-');
  return `${p[2]}/${p[1]}`;
}

export function Numeri({
  righe,
  aggiornato,
  quandoAssoluto,
  azioni,
}: {
  righe: RigaNumeri[];
  aggiornato: string | null;
  /** gia' formattato dal server, cosi' la prima pittura non dipende
   *  dall'orologio del browser e non c'e' niente da riconciliare */
  quandoAssoluto: string | null;
  azioni: Azioni;
}) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState(false);
  const [percento, setPercento] = useState(0);
  const [passo, setPasso] = useState('');
  const [fatti, setFatti] = useState<string[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [secondi, setSecondi] = useState(0);
  const [filtro, setFiltro] = useState('');

  const adesso = useOrologio();

  /* I secondi che passano sono la prova che qualcosa sta succedendo anche
     quando la barra sta ferma perche' una pagina di Regiondo ci mette sei
     secondi a rispondere. */
  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => setSecondi((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [inCorso]);

  const elenco = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = q ? righe.filter((r) => r.slug.includes(q) || (r.sku ?? '').toLowerCase().includes(q)) : righe;
    return [...base].sort((a, b) => (b.ultimi_7 ?? 0) - (a.ultimi_7 ?? 0) || (b.quante ?? 0) - (a.quante ?? 0) || a.slug.localeCompare(b.slug));
  }, [righe, filtro]);

  const totali = useMemo(
    () => ({
      agganciati: righe.filter((r) => r.sku).length,
      recensioni: righe.reduce((s, r) => s + (r.quante ?? 0), 0),
      settimana: righe.reduce((s, r) => s + (r.ultimi_7 ?? 0), 0),
      esaurite: righe.reduce((s, r) => s + (r.esaurite_30gg ?? 0), 0),
    }),
    [righe]
  );

  async function aggiorna() {
    setInCorso(true);
    setErrore(null);
    setFatti([]);
    setSecondi(0);
    setPercento(1);

    const fermo = (messaggio: string) => {
      setErrore(messaggio);
      setInCorso(false);
      setPasso('');
    };

    /* 1 — RECENSIONI */
    setPasso('Recensioni: leggo il catalogo Regiondo');
    const r1 = await azioni.recensioni();
    if (!r1.ok) return fermo(r1.errore ?? 'Le recensioni non sono passate.');
    setFatti((f) => [...f, `Recensioni: ${r1.quanti ?? 0} tour ricalcolati`]);
    setPercento(10);

    /* 2 — PRENOTAZIONI, una fetta di pagine alla volta */
    const parziali: Parziale[] = [];
    let pagina = 1;
    let pagine = 1;
    for (let giro = 0; giro < MAX_GIRI_PRENOTAZIONI; giro++) {
      setPasso(`Prenotazioni: pagina ${pagina} di ${pagine > 1 ? pagine : '?'}`);
      const r = await azioni.prenotazioni(pagina);
      if (!r.ok) return fermo(r.errore ?? 'Le prenotazioni non sono passate.');
      pagine = r.pagine;
      parziali.push(...r.parziali);
      setPercento(10 + Math.round((40 * r.fatte) / Math.max(pagine, 1)));
      if (r.fatte >= pagine) break;
      pagina = r.fatte + 1;
    }
    setFatti((f) => [...f, `Prenotazioni: ${pagine} pagine degli ultimi 30 giorni, annullamenti esclusi`]);

    setPasso('Prenotazioni: scrivo i conteggi');
    const r2 = await azioni.conteggi(parziali);
    if (!r2.ok) return fermo(r2.errore ?? 'I conteggi non sono passati.');
    setFatti((f) => [...f, `Conteggi: ${r2.tour ?? 0} tour con almeno una prenotazione`]);
    setPercento(55);

    /* 3 — DISPONIBILITA', un blocco di calendari alla volta */
    let da = 0;
    let totale = 0;
    for (let giro = 0; giro < MAX_GIRI_CALENDARI; giro++) {
      setPasso(`Disponibilita': ${da} di ${totale || '?'} calendari`);
      const r = await azioni.disponibilita(da);
      if (!r.ok) return fermo(r.errore ?? 'La disponibilita’ non e’ passata.');
      totale = r.totale;
      da = r.fatti;
      setPercento(55 + Math.round((45 * da) / Math.max(totale, 1)));
      if (da >= totale) break;
    }
    setFatti((f) => [...f, `Disponibilita’: ${totale} calendari riletti`]);

    setPercento(100);
    setPasso('Fatto: rigenero le pagine pubbliche');
    setInCorso(false);
    /* I dati della tabella arrivano dal server: senza questo restano quelli
       di prima e l'aggiornamento sembra non aver fatto niente. */
    router.refresh();
    setPasso('');
  }

  /* Finche' l'orologio non c'e' la fascia resta neutra: dichiarare "verde"
     prima di sapere che ore sono sarebbe una rassicurazione tirata a
     indovinare, e dura giusto il tempo di essere creduta. */
  const stato = adesso ? gravita(aggiornato, adesso) : 'attesa';

  /* I colori della fascia dell'eta': verde/giallo/rosso arrivano da
     `gravita()`, che e' la stessa funzione che colora la colonna
     «Aggiornato» riga per riga. Un solo giudizio, in due posti. */
  const COLORE = { bene: 'green', cosi: 'yellow', male: 'red', attesa: 'gray' } as const;

  return (
    <Stack gap="md">
      <Card
        withBorder
        radius="md"
        padding="md"
        style={{
          borderColor: `var(--mantine-color-${COLORE[stato]}-5)`,
          background: `var(--mantine-color-${COLORE[stato]}-0)`,
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Stack gap={2} style={{ flex: '1 1 320px' }}>
            <Text fw={700} fz="lg">
              {aggiornato && adesso
                ? `Aggiornato ${quantoFa(aggiornato, adesso)}`
                : aggiornato ? 'Aggiornato' : 'Mai aggiornato'}
            </Text>
            <Text size="sm" c="dimmed">
              {quandoAssoluto
                ? `Ultima lettura da Regiondo: ${quandoAssoluto}. Finché non si preme il pulsante, il sito dichiara questi numeri.`
                : 'Nessuna lettura registrata: i numeri sul sito non vengono da qui.'}
            </Text>
          </Stack>
          <Button
            size="md"
            onClick={aggiorna}
            loading={inCorso}
            leftSection={<IconRefresh size={18} />}
          >
            Aggiorna adesso
          </Button>
        </Group>
      </Card>

      {(inCorso || percento === 100 || errore) && (
        <Card withBorder radius="md" padding="md">
          <Stack gap="xs">
            <Progress value={percento} color={errore ? 'red' : 'prestige'} size="lg" radius="sm" animated={inCorso} />
            <Group justify="space-between">
              <Text size="sm" fw={600}>{errore ? 'Interrotto' : passo || 'Fatto'}</Text>
              <Text size="sm" c="dimmed">{percento}% · {secondi}s</Text>
            </Group>
            {fatti.length > 0 && (
              <List size="sm" spacing={2} icon={<IconCheck size={14} color="var(--mantine-color-green-6)" />}>
                {fatti.map((f, i) => <List.Item key={i}>{f}</List.Item>)}
              </List>
            )}
            {errore && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>{errore}</Alert>
            )}
          </Stack>
        </Card>
      )}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        <Riquadro n={totali.agganciati} che="tour con un prodotto Regiondo" />
        <Riquadro n={totali.recensioni.toLocaleString('it-IT')} che="recensioni Regiondo in totale" />
        <Riquadro n={totali.settimana.toLocaleString('it-IT')} che="prenotazioni negli ultimi 7 giorni" colore="green" />
        <Riquadro n={totali.esaurite} che="date esaurite nei prossimi 30 giorni" colore={totali.esaurite ? 'red' : undefined} />
      </SimpleGrid>

      <Card withBorder radius="md" padding="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <TextInput
            value={filtro}
            onChange={(e) => setFiltro(e.currentTarget.value)}
            placeholder="Cerca uno slug o uno SKU"
            leftSection={<IconSearch size={15} />}
            style={{ flex: '1 1 260px' }}
          />
          <Text size="sm" c="dimmed">{elenco.length} di {righe.length}</Text>
        </Group>
      </Card>

      <Card withBorder radius="md" padding={0}>
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tour</Table.Th>
                <Table.Th w={120}>Recensioni</Table.Th>
                <Table.Th w={140}>Prenotazioni 7gg</Table.Th>
                <Table.Th w={210}>Prima data libera</Table.Th>
                <Table.Th w={110}>Aggiornato</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {elenco.map((r) => (
                <Table.Tr key={r.slug}>
                  <Table.Td>
                    <Text size="sm" fw={600}>{r.slug}</Text>
                    <Code>{r.sku ?? 'nessun prodotto Regiondo'}</Code>
                  </Table.Td>

                  <Table.Td>
                    {r.quante ? (
                      <Text size="sm"><b>{r.voto?.toFixed(1)}</b> <Text span c="dimmed" size="xs">su {r.quante}</Text></Text>
                    ) : (
                      <Text size="sm" c="dimmed">nessuna</Text>
                    )}
                  </Table.Td>

                  <Table.Td>
                    {r.ultimi_7 ? (
                      <Text size="sm">
                        <b>{r.ultimi_7}</b>
                        {r.oggi ? <Text span c="dimmed" size="xs"> · {r.oggi} oggi</Text> : null}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">0</Text>
                    )}
                  </Table.Td>

                  <Table.Td>
                    {r.prima_libera ? (
                      <Text size="sm">
                        <b>{data(r.prima_libera)}</b>
                        {r.posti_prima != null ? <Text span c="dimmed" size="xs"> · {r.posti_prima} posti</Text> : null}
                        {r.esaurite_30gg ? (
                          <Text span c="dimmed" size="xs"> · {r.esaurite_30gg}/{r.date_totali_30gg} piene</Text>
                        ) : null}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">nessuna data</Text>
                    )}
                  </Table.Td>

                  <Table.Td>
                    {r.aggiornato && adesso ? (
                      <Badge size="sm" variant="light" color={COLORE[gravita(r.aggiornato, adesso)]}>
                        {quantoFa(r.aggiornato, adesso)}
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">mai</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}

function Riquadro({ n, che, colore }: { n: number | string; che: string; colore?: string }) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Text fz={28} fw={800} lh={1.1} c={colore}>{n}</Text>
      <Text size="xs" c="dimmed">{che}</Text>
    </Card>
  );
}
