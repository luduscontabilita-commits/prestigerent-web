'use client';

import { Anchor, Badge, Box, Group, Stack, Text, Title } from '@mantine/core';
import { CAMPI_TESTO, FLOTTA, testiMezzo, type CampoTesto, type ModificaTesto } from '@/lib/flotta';
import { testiDi, type Lingua } from '@/lib/partners-testi';
import classi from './FlottaRighe.module.css';

/* LA FLOTTA, le righe: una per mezzo, e i crediti delle foto.
 *
 * A righe e non a schede per decisione della proprieta' (12/10/2026):
 * l'immagine a sinistra, sempre della stessa misura (le foto sono tutte
 * su una tela 800x400, vedi src/lib/flotta.ts), e accanto nome, posti,
 * descrizione e servizi. Sotto i 700px circa l'immagine va sopra il
 * testo: e' il `wrap` del gruppo, senza media query.
 *
 * CLIENT perche' la stessa riga serve a due cose: al partner, da leggere
 * (/partners/fleet/, via FlottaVista), e all'admin, con i testi
 * cliccabili (/admin/partners/flotta/, via FlottaModifica). Riceve solo
 * dati serializzabili: i mezzi li legge da src/lib/flotta.ts. */

export type TourDelMezzo = { slug: string; nome: string };

export function FlottaRighe({
  lingua,
  modifiche,
  usati,
  modifica,
  aperto,
}: {
  lingua: Lingua;
  /** i testi cambiati dall'admin (tabella `flotta_testi`) */
  modifiche: ModificaTesto[];
  /** i tour di ogni mezzo, per chiave (oggi solo l'Isuzu ne mostra) */
  usati: Record<string, TourDelMezzo[]>;
  /** solo nel pannello: rende i testi cliccabili */
  modifica?: (chiave: string, campo: CampoTesto, el: HTMLElement) => void;
  /** il testo aperto nella finestra, per tenerlo evidenziato */
  aperto?: { chiave: string; campo: CampoTesto } | null;
}) {
  const T = testiDi(lingua);
  const conCrediti = FLOTTA.filter((m) => m.credito);

  return (
    <Stack gap={0}>
      {FLOTTA.map((m, i) => {
        const tm = testiMezzo(m, lingua, modifiche);
        const tour = usati[m.chiave] ?? [];

        /** Un testo: semplice per il partner, cliccabile per l'admin. Un
         *  campo facoltativo vuoto si vede solo nel pannello, come invito
         *  ad aggiungerlo. */
        const testo = (campo: CampoTesto, valore: string | null) => {
          if (!modifica) return valore;
          const nome = CAMPI_TESTO.find((c) => c.campo === campo)!.nome;
          const acceso = aperto?.chiave === m.chiave && aperto.campo === campo;
          const apri = (e: React.SyntheticEvent<HTMLElement>) => modifica(m.chiave, campo, e.currentTarget);
          return (
            <span
              role="button"
              tabIndex={0}
              title={`Modifica: ${nome}`}
              className={[classi.modificabile, acceso ? classi.aperto : '', valore ? '' : classi.vuoto].join(' ')}
              onClick={apri}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  apri(e);
                }
              }}
            >
              {valore || `+ ${nome.toLowerCase()}`}
            </span>
          );
        };

        /* la riga sotto la descrizione e' UN testo, si modifica intera */
        const dettagli = tm.dettagli || modifica;
        /* «Per cosa si usa» e' un testo solo per i mezzi che non hanno una
           regola (l'Atego): per gli altri lo scrive la regola stessa. */
        const usoLibero = !m.persone && !m.gruppi;

        return (
          <Group
            key={m.chiave}
            align="center"
            wrap="wrap"
            gap="xl"
            py="lg"
            style={{
              borderTop: i === 0 ? '1px solid var(--mantine-color-gray-3)' : undefined,
              borderBottom: '1px solid var(--mantine-color-gray-3)',
            }}
          >
            {/* L'immagine: riquadro fisso 2:1, uguale per tutti i mezzi.
                Largo 320px accanto al testo; sul telefono a tutta
                larghezza, sopra il testo. */}
            <Box
              w={{ base: '100%', xs: 320 }}
              style={{
                aspectRatio: '2 / 1',
                flexShrink: 0,
                background: 'linear-gradient(180deg, var(--mantine-color-gray-0), var(--mantine-color-gray-1))',
                borderRadius: 10,
              }}
            >
              {/* `<img>` e non `next/image`: scelta di tutto il progetto,
                  vedi src/lib/foto.ts. WebP 800x400 gia' pronti. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.foto}
                alt={`${tm.nome}, ${tm.tipo.toLowerCase()}: ${T.finoA(m.postiMax).toLowerCase()}`}
                loading="lazy"
                width={800}
                height={400}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </Box>

            <Stack gap={6} style={{ flex: '1 1 340px', minWidth: 0 }}>
              <Group justify="space-between" align="baseline" wrap="wrap" gap="xs">
                <div style={{ minWidth: 0 }}>
                  <Title order={2} size="h3">{testo('nome', tm.nome)}</Title>
                  <Text size="sm" c="dimmed">
                    {testo('tipo', tm.tipo)}
                    {m.quanti ? ` · ${T.inFlotta(m.quanti)}` : ''}
                  </Text>
                </div>
                <Badge size="lg" variant="light" radius="sm" style={{ textTransform: 'none' }}>
                  {T.finoA(m.postiMax)}
                </Badge>
              </Group>

              <Text size="sm">{testo('descrizione', tm.descrizione)}</Text>
              {dettagli && (
                <Text size="sm" c="dimmed">
                  {testo('dettagli', tm.dettagli)}
                </Text>
              )}

              <Text size="sm">
                <Text span fw={700}>{T.usatoPer} </Text>
                {m.persone
                  ? T.perGruppiDi(m.persone[0], m.persone[1])
                  : m.gruppi
                    ? T.perSmallGroup
                    : usoLibero && testo('suRichiesta', tm.suRichiesta)}
              </Text>
              {/* L'elenco dei tour solo per il minibus (tre): per le auto
                  erano 83, tolto su richiesta della proprieta'. */}
              {m.gruppi && tour.length > 0 && (
                <Group gap={6}>
                  {tour.map((s) => (
                    <Badge key={s.slug} variant="default" radius="xl" style={{ textTransform: 'none' }}>
                      {s.nome}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </Group>
        );
      })}

      {/* 🔴 I CREDITI NON SI TOLGONO: la licenza CC delle foto che non sono
          nostre obbliga a citare l'autore. Oggi resta solo l'Atego. */}
      {conCrediti.length > 0 && (
        <Text size="xs" c="dimmed" mt="lg" lh={1.7}>
          {conCrediti.map((m, i) => (
            <span key={m.chiave}>
              {i > 0 ? ' · ' : ''}
              {m.nome}: {T.creditoFoto}{' '}
              <Anchor href={m.credito!.fonte} target="_blank" rel="noopener" size="xs" c="dimmed" underline="always">
                {m.credito!.autore}
              </Anchor>
              ,{' '}
              <Anchor href={m.credito!.licenzaUrl} target="_blank" rel="noopener" size="xs" c="dimmed" underline="always">
                {m.credito!.licenza}
              </Anchor>
              , {T.creditoVia}
            </span>
          ))}
        </Text>
      )}
    </Stack>
  );
}
