import { Anchor, Badge, Group, Stack, Text, Title } from '@mantine/core';
import { FLOTTA, impiegoDi } from '@/lib/flotta';
import { tourDelListino } from '@/lib/regiondo-listino';
import { sezioneDi, type Servizio } from '@/lib/listino';
import { unitaDi } from '@/lib/prezzi';

/* LA FLOTTA, il contenuto: una RIGA per mezzo e i crediti delle foto.
 *
 * A righe e non a schede per decisione della proprieta' (12/10/2026):
 * l'immagine a sinistra, sempre della stessa misura (le foto sono tutte
 * su una tela 800x400, vedi src/lib/flotta.ts), e accanto nome, posti,
 * descrizione e servizi. Sotto i 700px circa l'immagine va sopra il
 * testo: e' il `wrap` del gruppo, senza media query.
 *
 * Lo usano /partners/fleet/ (il partner) e /admin/partners/flotta/
 * (l'admin), ognuna con la sua guardia e il suo guscio. In inglese per
 * tutti e due: e' quello che legge il partner.
 *
 * Server Component: solo componenti Mantine SEMPLICI, senza notazione col
 * punto (regola del confine in CLAUDE.md). */
export async function FlottaVista() {
  /* I tour di ogni mezzo si calcolano dal catalogo, senza chiedere i
     prezzi a Regiondo: qui servono solo nome, sezione e unita'. */
  const tour = await tourDelListino();
  const servizi: Servizio[] = tour.map((t) => ({
    slug: t.slug,
    nome: t.nome,
    sku: t.sku,
    ...sezioneDi(t.categorie),
    unita: unitaDi({ PRICES: t.prices }, t.kind),
    varianti: null,
  }));
  const conCrediti = FLOTTA.filter((m) => m.credito);

  return (
    <Stack gap={0}>
      {FLOTTA.map((m, i) => {
        const usati = impiegoDi(m, servizi).sort((a, b) => a.nome.localeCompare(b.nome));
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
            {/* L'immagine: riquadro fisso 2:1, uguale per tutti i mezzi. */}
            <div
              style={{
                width: 320,
                maxWidth: '100%',
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
                alt={`${m.nome}, ${m.tipo.toLowerCase()} for up to ${m.postiMax} passengers`}
                loading="lazy"
                width={800}
                height={400}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <Stack gap={6} style={{ flex: '1 1 340px', minWidth: 0 }}>
              <Group justify="space-between" align="baseline" wrap="wrap" gap="xs">
                <div style={{ minWidth: 0 }}>
                  <Title order={2} size="h3">{m.nome}</Title>
                  <Text size="sm" c="dimmed">
                    {m.tipo}
                    {m.quanti ? ` · ${m.quanti} in our fleet` : ''}
                  </Text>
                </div>
                <Badge size="lg" variant="light" radius="sm" style={{ textTransform: 'none' }}>
                  Up to {m.postiMax} passengers
                </Badge>
              </Group>

              <Text size="sm">{m.descrizione}</Text>
              {(m.notaPosti || m.bagagli) && (
                <Text size="sm" c="dimmed">
                  {[m.notaPosti, m.bagagli ? `Luggage: ${m.bagagli}.` : null].filter(Boolean).join(' ')}
                </Text>
              )}

              <Text size="sm">
                <Text span fw={700}>Used for: </Text>
                {m.persone
                  ? `private tours, cruise port tours and transfers for parties of ${m.persone[0]} to ${m.persone[1]} people.`
                  : m.gruppi
                    ? 'our small group tours.'
                    : m.suRichiesta}
              </Text>
              {/* L'elenco dei tour solo per il minibus (tre): per le auto
                  erano 83, tolto su richiesta della proprieta'. */}
              {m.gruppi && usati.length > 0 && (
                <Group gap={6}>
                  {usati.map((s) => (
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
              {m.nome}: photo of the model, not of our vehicle, by{' '}
              <Anchor href={m.credito!.fonte} target="_blank" rel="noopener" size="xs" c="dimmed" underline="always">
                {m.credito!.autore}
              </Anchor>
              ,{' '}
              <Anchor href={m.credito!.licenzaUrl} target="_blank" rel="noopener" size="xs" c="dimmed" underline="always">
                {m.credito!.licenza}
              </Anchor>
              , via Wikimedia Commons, background removed.
            </span>
          ))}
        </Text>
      )}
    </Stack>
  );
}
