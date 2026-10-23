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
 * giorno per giorno nel mese e le risposte anche».
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

  const totali = useMemo(() => {
    let a = 0;
    let u = 0;
    for (const c of celle) {
      if (!c) continue;
      a += c.arrivate.length;
      u += c.uscite.length;
    }
    return { a, u };
  }, [celle]);

  const giornoScelto = celle.find((c) => c && c.chiave === scelto) ?? null;

  function cambiaMese(di: number) {
    const d = new Date(anno, mese + di, 1);
    setAnno(d.getFullYear());
    setMese(d.getMonth());
    setScelto(null);
  }

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" align="center" mb="sm" wrap="wrap">
        <Group gap="xs">
          <ActionIcon variant="default" onClick={() => cambiaMese(-1)} aria-label="mese prima">
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Title order={4} style={{ textTransform: 'capitalize', minWidth: 180, textAlign: 'center' }}>
            {MESI[mese]} {anno}
          </Title>
          <ActionIcon variant="default" onClick={() => cambiaMese(1)} aria-label="mese dopo">
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
        <Group gap="md">
          <Group gap={6}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--mantine-color-orange-5)', display: 'inline-block' }} />
            <Text size="xs">
              <b>{totali.a}</b> recensioni arrivate
            </Text>
          </Group>
          <Group gap={6}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--mantine-color-green-6)', display: 'inline-block' }} />
            <Text size="xs">
              <b>{totali.u}</b> risposte pubblicate
            </Text>
          </Group>
        </Group>
      </Group>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 4,
        }}
      >
        {GIORNI.map((g) => (
          <Text key={g} size="xs" c="dimmed" ta="center" fw={600} py={2}>
            {g}
          </Text>
        ))}
        {celle.map((c, i) =>
          c === null ? (
            <div key={`v${i}`} />
          ) : (
            <button
              key={c.chiave}
              type="button"
              onClick={() => setScelto(c.chiave === scelto ? null : c.chiave)}
              style={{
                border: `1px solid ${c.chiave === scelto ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)'}`,
                background:
                  c.chiave === oggi
                    ? 'var(--mantine-color-blue-0)'
                    : c.uscite.length
                      ? 'var(--mantine-color-green-0)'
                      : 'white',
                borderRadius: 8,
                padding: '6px 6px 4px',
                minHeight: 62,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <Group justify="space-between" gap={2} wrap="nowrap">
                <Text size="xs" fw={c.chiave === oggi ? 800 : 600} c={c.chiave === oggi ? 'blue.8' : undefined}>
                  {c.numero}
                </Text>
                {meteo[c.chiave] ? (
                  <Text
                    size="xs"
                    c="dimmed"
                    title={`${descriviMeteo(meteo[c.chiave].codice).testo}, ${meteo[c.chiave].min}°/${meteo[c.chiave].max}°${meteo[c.chiave].pioggia ? `, ${meteo[c.chiave].pioggia} mm di pioggia` : ''}`}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {/* dentro il JSX le sequenze \u non si interpretano:
                        il grado va scritto come carattere */}
                    {descriviMeteo(meteo[c.chiave].codice).simbolo} {meteo[c.chiave].max}°
                  </Text>
                ) : null}
              </Group>
              {(() => {
                const s = stelleDi(c.arrivate);
                return s ? (
                  <Text size="xs" fw={700} c={s.critiche ? 'red.8' : 'yellow.8'} title={`${s.quante} recensioni, media ${s.media}${s.critiche ? `, ${s.critiche} sotto le quattro stelle` : ''}`}>
                    {'★'} {s.media}
                    {s.critiche ? ` · ${s.critiche} critic${s.critiche === 1 ? 'a' : 'he'}` : ''}
                  </Text>
                ) : null;
              })()}
              <Group gap={4} wrap="wrap">
                {c.arrivate.length ? (
                  <Badge size="xs" color="orange" variant="filled" title="recensioni arrivate" circle={c.arrivate.length < 10}>
                    {c.arrivate.length}
                  </Badge>
                ) : null}
                {c.uscite.length ? (
                  <Badge size="xs" color="green" variant="filled" title="risposte pubblicate" circle={c.uscite.length < 10}>
                    {c.uscite.length}
                  </Badge>
                ) : null}
              </Group>
            </button>
          )
        )}
      </div>

      {giornoScelto ? (
        <Stack gap={4} mt="sm">
          <Text size="sm" fw={700}>
            {giornoScelto.numero} {MESI[mese]}: {giornoScelto.arrivate.length} arrivate, {giornoScelto.uscite.length} pubblicate
            {meteo[giornoScelto.chiave]
              ? ` · ${descriviMeteo(meteo[giornoScelto.chiave].codice).simbolo} ${descriviMeteo(meteo[giornoScelto.chiave].codice).testo}, ${meteo[giornoScelto.chiave].min}°/${meteo[giornoScelto.chiave].max}°${meteo[giornoScelto.chiave].pioggia ? `, ${meteo[giornoScelto.chiave].pioggia} mm` : ''}`
              : ''}
          </Text>
          <Text size="xs" c="dimmed">
            Il meteo e&rsquo; quello di Firenze in questo giorno di calendario. Il tempo che conta per una
            recensione e&rsquo; quello del giorno del <b>servizio</b>, che i portali non dicono: quando la
            data del servizio e&rsquo; nota, la riga della recensione mostra quello.
          </Text>
          {giornoScelto.uscite.map((r) => (
            <Group key={`u${r.id}`} gap="xs" wrap="wrap">
              <Badge size="xs" color="green" variant="light">
                pubblicata
              </Badge>
              <Text size="xs" fw={600}>
                {r.autore || 'senza nome'}
              </Text>
              <Text size="xs" c="dimmed">
                {r.titolo}
              </Text>
              <Text size="xs" c="dimmed">
                · {r.modello ?? 'a mano'}
              </Text>
            </Group>
          ))}
          {giornoScelto.arrivate.map((r) => (
            <Group key={`a${r.id}`} gap="xs" wrap="wrap">
              <Badge size="xs" color="orange" variant="light">
                arrivata
              </Badge>
              <Text size="xs" fw={600}>
                {r.autore || 'senza nome'}
              </Text>
              <Text size="xs" c="dimmed">
                {r.titolo}
              </Text>
              {r.voto !== null ? (
                <Text size="xs" fw={700} c={r.voto <= 3 ? 'red.8' : 'yellow.8'}>
                  {'★'.repeat(Math.round(r.voto))}
                </Text>
              ) : null}
              <Badge size="xs" variant="outline" color="gray">
                {r.stato}
              </Badge>
            </Group>
          ))}
          {!giornoScelto.arrivate.length && !giornoScelto.uscite.length ? (
            <Text size="xs" c="dimmed">
              niente in questo giorno
            </Text>
          ) : null}
        </Stack>
      ) : null}
    </Card>
  );
}
