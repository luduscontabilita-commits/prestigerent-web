import { Anchor, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { haRuolo, RUOLI_GESTIONE, soloListino } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { FLOTTA, impiegoDi } from '@/lib/flotta';
import { tourDelListino } from '@/lib/regiondo-listino';
import { sezioneDi, type Servizio } from '@/lib/listino';
import { unitaDi } from '@/lib/prezzi';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Our fleet · Prestige Rent', robots: { index: false, follow: false } };

/* LA FLOTTA, per chi ha accesso al listino. Solo con l'accesso: chiama
 * `soloListino()` come il listino.
 *
 * In inglese anche per l'admin: e' la stessa pagina che vede il partner,
 * e l'admin la apre per sapere cosa vede lui. I dati e le scelte (numeri,
 * foto, licenze) stanno in src/lib/flotta.ts.
 *
 * Qui solo componenti Mantine SEMPLICI, senza notazione col punto: questa
 * pagina e' un Server Component (regola del confine in CLAUDE.md). */
export default async function Flotta() {
  const io = await soloListino();
  const admin = haRuolo(io, RUOLI_GESTIONE);

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

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Our fleet"
      sottotitolo="The vehicles we use for our tours and transfers: how many people each one takes and which services it runs. We own and maintain all of them, with our own drivers."
    >
      {admin && (
        <Text size="sm" c="dimmed" mb="lg">
          Questa è la pagina come la vede un partner del listino. Mezzi, posti e descrizioni si cambiano in src/lib/flotta.ts.
        </Text>
      )}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {FLOTTA.map((m) => {
          const usati = impiegoDi(m, servizi).sort((a, b) => a.nome.localeCompare(b.nome));
          return (
            <Card key={m.chiave} withBorder radius="md" padding="lg">
              <Stack gap="sm">
                <div
                  style={{
                    background: 'linear-gradient(180deg, var(--mantine-color-gray-0), var(--mantine-color-gray-2))',
                    borderRadius: 8,
                    padding: '18px 22px 10px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    aspectRatio: '16 / 8',
                  }}
                >
                  {/* `<img>` e non `next/image`: scelta di tutto il progetto,
                      vedi src/lib/foto.ts. Sono WebP gia' ridotti a 900px. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.foto}
                    alt={`${m.nome}, ${m.tipo.toLowerCase()} for up to ${m.postiMax} passengers (photo of the model)`}
                    loading="lazy"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </div>

                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                  <div style={{ minWidth: 0 }}>
                    <Title order={2} size="h3">{m.nome}</Title>
                    <Text size="sm" c="dimmed">
                      {m.tipo}
                      {m.quanti ? ` · ${m.quanti} in our fleet` : ''}
                    </Text>
                  </div>
                  <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                    <Text fw={800} size="xl" lh={1} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {m.postiMax}
                    </Text>
                    <Text size="xs" c="dimmed">passengers max</Text>
                  </Stack>
                </Group>

                {(m.notaPosti || m.bagagli) && (
                  <Text size="sm">
                    {[m.notaPosti, m.bagagli ? `Luggage: ${m.bagagli}.` : null].filter(Boolean).join(' ')}
                  </Text>
                )}
                <Text size="sm">{m.descrizione}</Text>

                <div>
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" mb={6} style={{ letterSpacing: '.08em' }}>
                    Used for
                  </Text>
                  {m.persone && (
                    <Text size="sm" mb={6}>
                      Private tours, cruise port tours and transfers for parties of{' '}
                      <b>{m.persone[0]} to {m.persone[1]} people</b>.
                    </Text>
                  )}
                  {m.suRichiesta && <Text size="sm">{m.suRichiesta}</Text>}
                  {usati.length > 0 && (
                    m.gruppi ? (
                      <Group gap={6}>
                        {usati.map((s) => (
                          <Badge key={s.slug} variant="light" radius="xl" style={{ textTransform: 'none' }}>
                            {s.nome}
                          </Badge>
                        ))}
                      </Group>
                    ) : (
                      <details>
                        <summary style={{ cursor: 'pointer', fontSize: 14 }}>
                          Show the {usati.length} services
                        </summary>
                        <Text size="sm" mt={6} c="dimmed" lh={1.7}>
                          {usati.map((s) => s.nome).join(' · ')}
                        </Text>
                      </details>
                    )
                  )}
                </div>

                <Text size="xs" c="dimmed">
                  Photo of the model, not of our vehicle: {m.credito.autore},{' '}
                  <Anchor href={m.credito.licenzaUrl} target="_blank" rel="noopener" size="xs">
                    {m.credito.licenza}
                  </Anchor>
                  , via{' '}
                  <Anchor href={m.credito.fonte} target="_blank" rel="noopener" size="xs">
                    Wikimedia Commons
                  </Anchor>
                  ; background removed.
                </Text>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Guscio>
  );
}
