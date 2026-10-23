'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconPencil,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { CRITERI, guaiDi, siPuoPubblicare, type Guaio, type Recensione } from '@/lib/risposte';
import {
  approva,
  riapri,
  salvaCorrezione,
  salvaTestoRecensione,
  scarta,
  scriviRisposta,
  segnaPubblicata,
  type Esito,
} from '@/app/admin/recensioni/azioni';

/* LA CODA, COME SI GUARDA.
 *
 * ── PERCHE' I CONTROLLI SI RIFANNO QUI, NEL BROWSER ───────────────────
 * `guaiDi()` sta in `src/lib/risposte.ts`, che e' un modulo puro senza
 * direttive: lo stesso codice gira sul server quando scrive il modello e
 * qui mentre si corregge a mano. Non e' una copia -- e' lo stesso file. E
 * serve: correggendo una risposta si vedono gli avvisi cambiare MENTRE si
 * scrive, invece di scoprire dopo il salvataggio che si e' superata la
 * lunghezza o che si e' promesso un rimborso.
 *
 * ── 🔴 PERCHE' NON C'E' UN PULSANTE «PUBBLICA» ────────────────────────
 * Perche' non esiste niente da chiamare. Nessuno dei portali ha un'API
 * per scrivere una risposta. Il giro vero e': approva -> «Copia» ->
 * «Apri nel portale» -> incolla -> «Segna pubblicata». Un pulsante
 * «Pubblica» che in realta' marca una riga sarebbe una bugia
 * nell'interfaccia, e il giorno che qualcuno si fida la risposta non c'e'.
 *
 * ── L'ORA DI USCITA SI MOSTRA, E SI PUO' IGNORARE ─────────────────────
 * Il calcolo del ritardo (src/lib/attesa.ts) dice quando TOCCHEREBBE a
 * ogni risposta: serve a non pubblicarne diciotto nello stesso minuto.
 * Ma qui chi incolla e' una persona, e una persona puo' avere fretta:
 * l'ora e' un suggerimento scritto accanto al pulsante, non un blocco.
 */

export type Riga = {
  id: number;
  fonte: string;
  portale: string;
  prodotto: string;
  titolo: string;
  autore: string;
  voto: number | null;
  lingua: string | null;
  testo: string | null;
  risposta: string | null;
  corretto: string | null;
  stato: string;
  modello: string | null;
  costo: number | null;
  link_risposta: string | null;
  pubblicare_il: string | null;
  pubblicata_il: string | null;
};

const COLORE_FONTE: Record<string, string> = {
  viator: 'teal',
  tripadvisor: 'green',
  getyourguide: 'blue',
};

const COLORE_STATO: Record<string, string> = {
  nuova: 'gray',
  letta: 'yellow',
  bozza: 'orange',
  approvata: 'blue',
  pubblicata: 'green',
  saltata: 'dark',
};

const oraRoma = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function quando(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : oraRoma.format(d);
}

function Numero({ n, che, colore }: { n: number; che: string; colore?: string }) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Text fz={28} fw={800} lh={1.1} c={colore}>
        {n}
      </Text>
      <Text size="xs" c="dimmed">
        {che}
      </Text>
    </Card>
  );
}

/** Gli avvisi dei controlli, come si leggono accanto al testo. */
function Avvisi({ guai }: { guai: Guaio[] }) {
  if (!guai.length) {
    return (
      <Group gap={6}>
        <IconCheck size={15} color="var(--mantine-color-green-7)" />
        <Text size="xs" c="green.7" fw={600}>
          tutti i controlli passati
        </Text>
      </Group>
    );
  }
  return (
    <Stack gap={4}>
      {guai.map((g, i) => (
        <Group key={i} gap={6} wrap="nowrap" align="flex-start">
          <Badge
            size="xs"
            variant="filled"
            color={g.gravita === 'blocca' ? 'red' : 'yellow'}
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            {g.gravita === 'blocca' ? 'blocca' : 'pesa'}
          </Badge>
          <Text size="xs" c={g.gravita === 'blocca' ? 'red.8' : 'dimmed'}>
            {g.perche}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

function Riquadro({ r }: { r: Riga }) {
  const [testoRec, setTestoRec] = useState(r.testo ?? '');
  const [risposta, setRisposta] = useState(r.corretto ?? r.risposta ?? '');
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [inCorso, parti] = useTransition();

  /* I controlli, ricalcolati a ogni battuta. La recensione che si passa e'
     quella con il testo CORRENTE della casella, non quello salvato: se si
     incolla il testo e si corregge la risposta nello stesso momento, gli
     avvisi guardano quello che si ha davanti. */
  const guai = useMemo(() => {
    if (!risposta.trim()) return [];
    const rec: Recensione = {
      id: r.id,
      fonte: r.fonte,
      autore: r.autore,
      voto: r.voto,
      titolo: r.titolo,
      testo: testoRec,
      lingua: r.lingua,
      tour_slug: r.prodotto,
      data: null,
    };
    return guaiDi(risposta, rec);
  }, [risposta, testoRec, r]);

  const cambiata = risposta.trim() !== (r.corretto ?? r.risposta ?? '').trim();
  const testoCambiato = testoRec.trim() !== (r.testo ?? '').trim();

  function esegui(azione: () => Promise<Esito>) {
    setMessaggio(null);
    parti(async () => {
      const esito = await azione();
      if (!esito.ok) setMessaggio(esito.errore ?? 'Non e` andata.');
    });
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(risposta);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setMessaggio('Il browser non ha concesso la copia: seleziona il testo e copialo a mano.');
    }
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="xs">
        {/* chi, dove, quanto */}
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap={8} wrap="wrap">
            <Badge color={COLORE_FONTE[r.fonte] ?? 'gray'} variant="light">
              {r.fonte}
            </Badge>
            <Badge color={COLORE_STATO[r.stato] ?? 'gray'} variant="filled">
              {r.stato}
            </Badge>
            <Text fw={700} size="sm">
              {r.voto !== null ? `${r.voto}★` : '—'}
            </Text>
            <Text size="sm" c="dimmed">
              {r.autore || 'senza nome'}
            </Text>
            {r.lingua ? (
              <Badge size="xs" variant="outline" color="gray">
                {r.lingua}
              </Badge>
            ) : null}
          </Group>
          <Text size="xs" c="dimmed">
            {r.stato === 'pubblicata'
              ? `incollata il ${quando(r.pubblicata_il)}`
              : r.pubblicare_il
                ? `uscirebbe il ${quando(r.pubblicare_il)}`
                : 'nessun orario assegnato'}
          </Text>
        </Group>

        <Text size="xs" c="dimmed">
          {r.prodotto || 'prodotto non indicato'}
        </Text>
        {r.titolo ? <Text fw={600}>«{r.titolo}»</Text> : null}

        {/* il testo della recensione: se manca, si incolla */}
        {r.testo ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {r.testo}
          </Text>
        ) : (
          <>
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
              <Text size="xs">
                Le email dei portali non contengono il testo della recensione: aprila nel portale e
                incollalo qui. Senza il testo si puo` scrivere solo una risposta prestampata.
              </Text>
            </Alert>
            <Textarea
              label="Testo della recensione"
              placeholder="Incolla qui quello che ha scritto il cliente"
              autosize
              minRows={3}
              value={testoRec}
              onChange={(e) => setTestoRec(e.currentTarget.value)}
            />
            <Group gap="xs">
              <Button
                size="xs"
                variant="default"
                disabled={!testoCambiato || inCorso}
                onClick={() => esegui(() => salvaTestoRecensione(r.id, testoRec))}
              >
                Salva il testo
              </Button>
            </Group>
          </>
        )}

        <Divider my={4} />

        {/* la risposta */}
        <Textarea
          label="La risposta"
          description={
            r.modello
              ? `scritta da ${r.modello}${r.costo ? ` — ${(Number(r.costo) * 100).toFixed(3)} centesimi` : ''}`
              : 'ancora da scrivere'
          }
          placeholder="Premi «Scrivi la risposta», poi correggila come vuoi."
          autosize
          minRows={4}
          value={risposta}
          onChange={(e) => setRisposta(e.currentTarget.value)}
        />
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Avvisi guai={guai} />
          <Text size="xs" c={risposta.length > 700 ? 'red.8' : 'dimmed'}>
            {risposta.length} caratteri
          </Text>
        </Group>

        {messaggio ? (
          <Alert color="red" variant="light" p="xs">
            <Text size="xs">{messaggio}</Text>
          </Alert>
        ) : null}

        {/* i comandi */}
        <Group gap="xs" wrap="wrap">
          <Button
            size="xs"
            leftSection={<IconSparkles size={14} />}
            loading={inCorso}
            disabled={!r.testo}
            onClick={() => esegui(() => scriviRisposta(r.id))}
          >
            {r.risposta ? 'Riscrivi' : 'Scrivi la risposta'}
          </Button>

          <Button
            size="xs"
            variant="default"
            leftSection={<IconPencil size={14} />}
            disabled={!cambiata || inCorso}
            onClick={() => esegui(() => salvaCorrezione(r.id, risposta))}
          >
            Salva la correzione
          </Button>

          <Button
            size="xs"
            variant="default"
            leftSection={<IconCopy size={14} />}
            disabled={!risposta.trim()}
            onClick={copia}
          >
            {copiato ? 'copiata' : 'Copia'}
          </Button>

          {r.link_risposta ? (
            <Button
              size="xs"
              variant="default"
              component="a"
              href={r.link_risposta}
              target="_blank"
              rel="noreferrer"
              leftSection={<IconExternalLink size={14} />}
            >
              Apri nel portale
            </Button>
          ) : null}

          {r.stato === 'approvata' ? (
            <>
              <Button
                size="xs"
                color="green"
                leftSection={<IconCheck size={14} />}
                loading={inCorso}
                onClick={() => esegui(() => segnaPubblicata(r.id))}
              >
                L&rsquo;ho incollata nel portale
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                disabled={inCorso}
                onClick={() => esegui(() => riapri(r.id))}
              >
                Rimetti in bozza
              </Button>
            </>
          ) : r.stato === 'pubblicata' ? null : (
            <Button
              size="xs"
              color="blue"
              leftSection={<IconCheck size={14} />}
              loading={inCorso}
              disabled={!risposta.trim()}
              onClick={() =>
                esegui(async () => {
                  /* se c'e' una correzione non salvata, si salva prima:
                     approvare un testo diverso da quello che si ha
                     davanti e' il modo piu' semplice di pubblicare la
                     cosa sbagliata */
                  if (cambiata) {
                    const s = await salvaCorrezione(r.id, risposta);
                    if (!s.ok) return s;
                  }
                  return approva(r.id);
                })
              }
            >
              Approva
            </Button>
          )}

          {r.stato !== 'pubblicata' && r.stato !== 'saltata' ? (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              disabled={inCorso}
              onClick={() => esegui(() => scarta(r.id))}
            >
              Non rispondere
            </Button>
          ) : null}
        </Group>

        {!siPuoPubblicare(guai) ? (
          <Text size="xs" c="red.8">
            Un controllo dice «blocca»: si puo` approvare comunque, ma leggi prima l&rsquo;avviso.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

type Filtro = 'da-fare' | 'bozze' | 'approvate' | 'pubblicate' | 'tutte';

export function CodaRecensioni({ righe }: { righe: Riga[] }) {
  const [filtro, setFiltro] = useState<Filtro>('bozze');
  const [criteriAperti, setCriteriAperti] = useState(false);

  const conti = useMemo(() => {
    const c = { daFare: 0, bozze: 0, approvate: 0, pubblicate: 0, speso: 0 };
    for (const r of righe) {
      if (r.stato === 'nuova' || r.stato === 'letta') c.daFare++;
      if (r.stato === 'bozza') c.bozze++;
      if (r.stato === 'approvata') c.approvate++;
      if (r.stato === 'pubblicata') c.pubblicate++;
      c.speso += Number(r.costo ?? 0);
    }
    return c;
  }, [righe]);

  const viste = useMemo(() => {
    if (filtro === 'tutte') return righe;
    if (filtro === 'da-fare') return righe.filter((r) => r.stato === 'nuova' || r.stato === 'letta');
    if (filtro === 'bozze') return righe.filter((r) => r.stato === 'bozza');
    if (filtro === 'approvate') return righe.filter((r) => r.stato === 'approvata');
    return righe.filter((r) => r.stato === 'pubblicata');
  }, [righe, filtro]);

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
        <Numero n={conti.daFare} che="senza risposta" colore={conti.daFare ? 'orange.8' : undefined} />
        <Numero n={conti.bozze} che="bozze da leggere" />
        <Numero n={conti.approvate} che="approvate, da incollare" colore="blue.8" />
        <Numero n={conti.pubblicate} che="incollate nel portale" colore="green.8" />
        <Card withBorder radius="md" padding="sm">
          <Text fz={28} fw={800} lh={1.1}>
            {(conti.speso * 100).toFixed(2)}
          </Text>
          <Text size="xs" c="dimmed">
            centesimi di dollaro spesi in tutto
          </Text>
        </Card>
      </SimpleGrid>

      <Alert color="gray" variant="light" p="sm">
        <Text size="xs">
          <b>Nessun portale permette di pubblicare da qui.</b> Viator, Tripadvisor e GetYourGuide non
          hanno un&rsquo;API per scrivere una risposta: il giro e` <b>approva</b> →{' '}
          <b>Copia</b> → <b>Apri nel portale</b> → incolla → <b>«L&rsquo;ho incollata»</b>. L&rsquo;ora
          scritta accanto a ogni risposta dice quando toccherebbe a quella, per non pubblicarne
          quindici nello stesso minuto.
        </Text>
      </Alert>

      <Group justify="space-between" wrap="wrap" gap="xs">
        <SegmentedControl
          size="xs"
          value={filtro}
          onChange={(v) => setFiltro(v as Filtro)}
          data={[
            { label: `Da fare (${conti.daFare})`, value: 'da-fare' },
            { label: `Bozze (${conti.bozze})`, value: 'bozze' },
            { label: `Approvate (${conti.approvate})`, value: 'approvate' },
            { label: `Fatte (${conti.pubblicate})`, value: 'pubblicate' },
            { label: `Tutte (${righe.length})`, value: 'tutte' },
          ]}
        />
        <Anchor component="button" type="button" size="xs" onClick={() => setCriteriAperti((x) => !x)}>
          {criteriAperti ? 'nascondi i criteri' : `i ${CRITERI.length} criteri`}
        </Anchor>
      </Group>

      {criteriAperti ? (
        <Card withBorder radius="md" padding="md">
          <Title order={5} mb="xs">
            I criteri con cui si scrive
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Sono gli stessi che finiscono nelle istruzioni del modello e che il codice controlla:
            stanno scritti in un posto solo (<code>src/lib/risposte.ts</code>).
          </Text>
          <Stack gap={6}>
            {CRITERI.map((c, i) => (
              <Text key={i} size="xs">
                <b>{i + 1}.</b> {c}
              </Text>
            ))}
          </Stack>
        </Card>
      ) : null}

      {viste.length === 0 ? (
        <Card withBorder radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Niente in questo elenco.
          </Text>
        </Card>
      ) : (
        <Stack gap="md">
          {viste.map((r) => (
            <Riquadro key={r.id} r={r} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
