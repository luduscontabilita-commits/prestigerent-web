'use client';

import { useMemo, useState } from 'react';
import { ActionIcon, Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { MeteoGiorno, Riga } from './CodaRecensioni';
import { descriviMeteo } from '@/lib/meteo';

/* IL CALENDARIO DEL MESE, IN CIMA A TUTTO.
 *
 * Chiesto dalla proprieta' il 23/10/2026: «un calendario fatto benissimo
 * graficamente e chiaro, sopra a tutto, con le recensioni pubblicate
 * giorno per giorno nel mese e le risposte anche», col numero di stelle
 * e il meteo, e «D'IMPATTO».
 *
 * ── COSA MOSTRA, E PERCHE' DUE NUMERI ─────────────────────────────────
 * Per ogni giorno due cose diverse, che non vanno confuse:
 *   - quante RECENSIONI sono ARRIVATE quel giorno (la data che mostra il
 *     portale: `data_recensione`);
 *   - quante RISPOSTE sono USCITE quel giorno (`pubblicata_il`).
 * Il primo numero dice quanto lavoro e' entrato, il secondo quanto ne e'
 * uscito. Un mese in cui il primo cresce e il secondo no si vede a colpo
 * d'occhio, ed e' esattamente la cosa che questo calendario deve far
 * vedere.
 *
 * ── 🔴 PERCHE' LA PRIMA VERSIONE NON ANDAVA ──────────────────────────
 * Il meteo c'era (30 simboli in pagina) ma a 11px in grigio: «non si
 * vede una mazza». Un dato che c'e' e non si legge non esiste. Quindi:
 * il tempo e' il pezzo piu' grande della cella, la temperatura e' in
 * grassetto, le stelle sono dorate e grandi, i contatori hanno la parola
 * accanto («2 arrivate», non «2»), e il giorno cambia colore di fondo a
 * seconda di quello che e' successo -- verde se e' uscito qualcosa,
 * bordo rosso se e' arrivata una critica.
 *
 * ── NIENTE LIBRERIA DI DATE ───────────────────────────────────────────
 * `@mantine/dates` non e' installata, e per una griglia di un mese non
 * serve: si contano i giorni e si parte dal lunedi'. Le date si
 * confrontano come stringhe «AAAA-MM-GG» calcolate nel fuso di Roma,
 * perche' il server sta in UTC e una risposta uscita alle 00:30 italiane
 * deve finire nel giorno giusto.
 */

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** «AAAA-MM-GG» di un istante, nel fuso di Roma. */
function giornoARoma(iso: string): string {
  const p = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}

function chiave(anno: number, mese: number, giorno: number): string {
  return `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
}

type Giorno = {
  chiave: string;
  numero: number;
  arrivate: Riga[];
  uscite: Riga[];
};

/** Le stelle di un gruppo di recensioni: media e quante sotto le quattro.
 *  Il numero delle critiche si scrive a parte perche' una media di 4,7
 *  nasconde il 2 stelle in mezzo a dieci 5 -- e quello e' il giorno da
 *  guardare. */
function stelleDi(righe: Riga[]): { media: number; critiche: number; quante: number } | null {
  const voti = righe.map((r) => r.voto).filter((v): v is number => v !== null);
  if (!voti.length) return null;
  const media = voti.reduce((a, b) => a + b, 0) / voti.length;
  return { media: Math.round(media * 10) / 10, critiche: voti.filter((v) => v <= 3).length, quante: voti.length };
}

/** Il colore di fondo di una cella: dice cosa e' successo prima ancora
 *  di leggere i numeri. */
function fondoDi(c: Giorno, oggi: boolean, scelto: boolean): string {
  if (scelto) return 'var(--mantine-color-blue-1)';
  if (oggi) return 'var(--mantine-color-blue-0)';
  if (c.uscite.length) return 'var(--mantine-color-green-0)';
  if (c.arrivate.length) return 'var(--mantine-color-yellow-0)';
  return 'white';
}

function Pillola({ n, che, colore }: { n: number; che: string; colore: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: `var(--mantine-color-${colore}-6)`,
        color: 'white',
        borderRadius: 999,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      {n} {che}
    </span>
  );
}

export function CalendarioRecensioni({
  righe,
  meteo,
}: {
  righe: Riga[];
  /** «AAAA-MM-GG» -> meteo a Firenze: storico e previsione. Vuoto se
   *  Open-Meteo non ha risposto; il calendario si disegna lo stesso. */
  meteo: Record<string, MeteoGiorno>;
}) {
  const oggi = giornoARoma(new Date().toISOString());
  const [anno, setAnno] = useState(Number(oggi.slice(0, 4)));
  const [mese, setMese] = useState(Number(oggi.slice(5, 7)) - 1);
  const [scelto, setScelto] = useState<string | null>(oggi);

  /* le righe raggruppate per giorno, una volta sola per mese */
  const perGiorno = useMemo(() => {
    const arrivate = new Map<string, Riga[]>();
    const uscite = new Map<string, Riga[]>();
    for (const r of righe) {
      if (r.data_recensione) {
        const k = r.data_recensione.slice(0, 10);
        arrivate.set(k, [...(arrivate.get(k) ?? []), r]);
      }
      if (r.stato === 'pubblicata' && r.pubblicata_il) {
        const k = giornoARoma(r.pubblicata_il);
        uscite.set(k, [...(uscite.get(k) ?? []), r]);
      }
    }
    return { arrivate, uscite };
  }, [righe]);

  /* la griglia: celle vuote fino al primo giorno (lunedi' = 0), poi i
     giorni del mese */
  const celle = useMemo(() => {
    const primo = new Date(anno, mese, 1);
    const vuote = (primo.getDay() + 6) % 7;
    const quanti = new Date(anno, mese + 1, 0).getDate();
    const out: (Giorno | null)[] = Array.from({ length: vuote }, () => null);
    for (let g = 1; g <= quanti; g++) {
      const k = chiave(anno, mese, g);
      out.push({
        chiave: k,
        numero: g,
        arrivate: perGiorno.arrivate.get(k) ?? [],
        uscite: perGiorno.uscite.get(k) ?? [],
      });
    }
    while (out.length % 7) out.push(null);
    return out;
  }, [anno, mese, perGiorno]);

  /* i totali del mese, compreso il tempo: quanti giorni di sole e di
     pioggia, che per un'azienda di tour all'aperto e' un numero che
     spiega da solo meta' delle recensioni */
  const totali = useMemo(() => {
    let a = 0;
    let u = 0;
    let critiche = 0;
    let sole = 0;
    let pioggia = 0;
    const voti: number[] = [];
    for (const c of celle) {
      if (!c) continue;
      a += c.arrivate.length;
      u += c.uscite.length;
      for (const r of c.arrivate) {
        if (r.voto !== null) {
          voti.push(r.voto);
          if (r.voto <= 3) critiche++;
        }
      }
      const m = meteo[c.chiave];
      if (m) {
        if (m.codice <= 2) sole++;
        if (m.codice >= 51) pioggia++;
      }
    }
    const media = voti.length ? Math.round((voti.reduce((x, y) => x + y, 0) / voti.length) * 10) / 10 : null;
    return { a, u, critiche, sole, pioggia, media };
  }, [celle, meteo]);

  const giornoScelto = celle.find((c) => c && c.chiave === scelto) ?? null;

  function cambiaMese(di: number) {
    const d = new Date(anno, mese + di, 1);
    setAnno(d.getFullYear());
    setMese(d.getMonth());
    setScelto(null);
  }

  return (
    <Card withBorder radius="lg" padding="lg" style={{ borderColor: 'var(--mantine-color-gray-3)' }}>
      {/* ── TESTATA: mese, frecce, e i numeri grandi del mese ── */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
        <Group gap="sm">
          <ActionIcon variant="default" size="lg" radius="xl" onClick={() => cambiaMese(-1)} aria-label="mese prima">
            <IconChevronLeft size={18} />
          </ActionIcon>
          <Title order={2} style={{ textTransform: 'capitalize', minWidth: 230, textAlign: 'center', letterSpacing: -0.5 }}>
            {MESI[mese]} {anno}
          </Title>
          <ActionIcon variant="default" size="lg" radius="xl" onClick={() => cambiaMese(1)} aria-label="mese dopo">
            <IconChevronRight size={18} />
          </ActionIcon>
        </Group>
        <Group gap="xs" wrap="wrap">
          <Statistica n={totali.a} che="arrivate" colore="orange" />
          <Statistica n={totali.u} che="pubblicate" colore="green" />
          {totali.media !== null ? (
            <Statistica n={totali.media} che="stelle in media" colore="yellow" simbolo={'★'} />
          ) : null}
          {totali.critiche ? <Statistica n={totali.critiche} che="critiche" colore="red" /> : null}
          {totali.sole || totali.pioggia ? (
            <Statistica n={totali.sole} che="giorni di sole" colore="blue" simbolo={'☀️'} secondo={`${totali.pioggia} di pioggia`} />
          ) : null}
        </Group>
      </Group>

      {/* ── LA GRIGLIA ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {GIORNI.map((g, i) => (
          <Text key={g} size="xs" c={i >= 5 ? 'red.7' : 'dimmed'} ta="center" fw={700} py={4} tt="uppercase" style={{ letterSpacing: 1 }}>
            {g}
          </Text>
        ))}
        {celle.map((c, i) => {
          if (c === null) return <div key={`v${i}`} />;
          const eOggi = c.chiave === oggi;
          const eScelto = c.chiave === scelto;
          const m = meteo[c.chiave];
          const s = stelleDi(c.arrivate);
          const critica = !!s && s.critiche > 0;
          return (
            <button
              key={c.chiave}
              type="button"
              onClick={() => setScelto(eScelto ? null : c.chiave)}
              title={m ? `${descriviMeteo(m.codice).testo}, ${m.min}°/${m.max}°${m.pioggia ? `, ${m.pioggia} mm di pioggia` : ''}` : undefined}
              style={{
                border: eScelto ? '2px solid var(--mantine-color-blue-6)' : eOggi ? '2px solid var(--mantine-color-blue-4)' : '1px solid var(--mantine-color-gray-3)',
                borderLeft: critica ? '5px solid var(--mantine-color-red-6)' : undefined,
                background: fondoDi(c, eOggi, eScelto),
                borderRadius: 12,
                padding: '8px 9px 8px',
                minHeight: 104,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                boxShadow: c.uscite.length || c.arrivate.length ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'transform 80ms',
              }}
            >
              {/* giorno a sinistra, tempo a destra: il tempo e' la cosa
                  piu' grande della cella, di proposito */}
              <Group justify="space-between" align="flex-start" gap={4} wrap="nowrap">
                <Text fz={eOggi ? 20 : 17} fw={eOggi ? 900 : 700} lh={1} c={eOggi ? 'blue.8' : critica ? 'red.8' : 'dark.6'}>
                  {c.numero}
                  {eOggi ? <Text component="span" fz={9} fw={800} ml={4} c="blue.6">OGGI</Text> : null}
                </Text>
                {m ? (
                  <div style={{ textAlign: 'right', lineHeight: 1 }}>
                    <span style={{ fontSize: 22 }}>{descriviMeteo(m.codice).simbolo}</span>
                    <Text fz={12} fw={800} lh={1.1} c="dark.5">
                      {m.max}°
                      <Text component="span" fz={10} fw={500} c="dimmed"> /{m.min}°</Text>
                    </Text>
                  </div>
                ) : null}
              </Group>

              {s ? (
                <Text fz={14} fw={800} lh={1} c={critica ? 'red.7' : 'yellow.8'} title={`${s.quante} recensioni, media ${s.media}`}>
                  {'★'} {s.media}
                  {critica ? <Text component="span" fz={10} fw={800} c="red.7"> · {s.critiche} critic{s.critiche === 1 ? 'a' : 'he'}</Text> : null}
                </Text>
              ) : (
                <div style={{ height: 14 }} />
              )}

              <Group gap={4} wrap="wrap" mt="auto">
                {c.arrivate.length ? <Pillola n={c.arrivate.length} che={c.arrivate.length === 1 ? 'arrivata' : 'arrivate'} colore="orange" /> : null}
                {c.uscite.length ? <Pillola n={c.uscite.length} che={c.uscite.length === 1 ? 'uscita' : 'uscite'} colore="green" /> : null}
              </Group>
            </button>
          );
        })}
      </div>

      {/* ── IL GIORNO SCELTO ── */}
      {giornoScelto ? (
        <Card withBorder radius="md" padding="md" mt="md" bg="var(--mantine-color-gray-0)">
          <Group justify="space-between" wrap="wrap" mb={6}>
            <Text fz="lg" fw={800}>
              {giornoScelto.numero} {MESI[mese]}
              <Text component="span" fz="sm" fw={500} c="dimmed"> — {giornoScelto.arrivate.length} arrivate, {giornoScelto.uscite.length} pubblicate</Text>
            </Text>
            {meteo[giornoScelto.chiave] ? (
              <Text fz="md" fw={700}>
                <span style={{ fontSize: 22, verticalAlign: 'middle' }}>{descriviMeteo(meteo[giornoScelto.chiave].codice).simbolo}</span>{' '}
                {descriviMeteo(meteo[giornoScelto.chiave].codice).testo}, {meteo[giornoScelto.chiave].min}°/{meteo[giornoScelto.chiave].max}°
                {meteo[giornoScelto.chiave].pioggia ? <Text component="span" c="blue.7"> · {meteo[giornoScelto.chiave].pioggia} mm</Text> : null}
              </Text>
            ) : null}
          </Group>
          <Text size="xs" c="dimmed" mb="xs">
            Il tempo e&rsquo; quello di Firenze in questo giorno di calendario. Per una recensione conta il giorno del{' '}
            <b>servizio</b>, che i portali non dicono: quando e&rsquo; noto, lo mostra la riga della recensione.
          </Text>
          <Stack gap={6}>
            {giornoScelto.uscite.map((r) => (
              <Group key={`u${r.id}`} gap="xs" wrap="wrap">
                <Badge size="sm" color="green" variant="filled">uscita</Badge>
                <Text size="sm" fw={700}>{r.autore || 'senza nome'}</Text>
                {r.voto !== null ? <Text size="sm" fw={800} c="yellow.8">{'★'.repeat(Math.round(r.voto))}</Text> : null}
                <Text size="sm" c="dimmed">{r.titolo}</Text>
                <Text size="xs" c="dimmed">· {r.modello ?? 'a mano'}</Text>
              </Group>
            ))}
            {giornoScelto.arrivate.map((r) => (
              <Group key={`a${r.id}`} gap="xs" wrap="wrap">
                <Badge size="sm" color="orange" variant="filled">arrivata</Badge>
                <Text size="sm" fw={700}>{r.autore || 'senza nome'}</Text>
                {r.voto !== null ? (
                  <Text size="sm" fw={800} c={r.voto <= 3 ? 'red.7' : 'yellow.8'}>{'★'.repeat(Math.round(r.voto))}</Text>
                ) : null}
                <Text size="sm" c="dimmed">{r.titolo}</Text>
                <Badge size="xs" variant="outline" color="gray">{r.stato}</Badge>
              </Group>
            ))}
            {!giornoScelto.arrivate.length && !giornoScelto.uscite.length ? (
              <Text size="sm" c="dimmed">niente in questo giorno</Text>
            ) : null}
          </Stack>
        </Card>
      ) : null}
    </Card>
  );
}

/** Un numero grande con la sua parola: i totali del mese in testata. */
function Statistica({
  n,
  che,
  colore,
  simbolo,
  secondo,
}: {
  n: number;
  che: string;
  colore: string;
  simbolo?: string;
  secondo?: string;
}) {
  return (
    <div
      style={{
        background: `var(--mantine-color-${colore}-0)`,
        border: `1px solid var(--mantine-color-${colore}-3)`,
        borderRadius: 12,
        padding: '6px 12px',
        minWidth: 92,
        lineHeight: 1.05,
      }}
    >
      <Text fz={22} fw={900} c={`${colore}.8`} lh={1}>
        {simbolo ? <span style={{ fontSize: 16, marginRight: 4 }}>{simbolo}</span> : null}
        {n}
      </Text>
      <Text fz={10} fw={700} c={`${colore}.9`} tt="uppercase" style={{ letterSpacing: 0.6 }}>
        {che}
      </Text>
      {secondo ? <Text fz={10} c="dimmed">{secondo}</Text> : null}
    </div>
  );
}
