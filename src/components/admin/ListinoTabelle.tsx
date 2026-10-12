'use client';

import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Affix,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Transition,
} from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import {
  IconArrowUp,
  IconMapPin,
  IconRoute,
  IconSearch,
  IconShip,
  IconSteeringWheel,
  IconUsersGroup,
  IconGlassFull,
  IconExternalLink,
  IconPencil,
} from '@tabler/icons-react';
import { raggruppa, righeDelServizio, type ChiaveSezione, type Servizio } from '@/lib/listino';
import { scomponi, tipoCommissione, type Commissioni } from '@/lib/commissioni';
import { testiDi, type Lingua, type Testi } from '@/lib/partners-testi';
import css from './ListinoTabelle.module.css';

/* LE TABELLE DEL LISTINO, per l'admin (italiano) e per il partner (inglese).
 *
 * Client e non server per due motivi: la ricerca per nome si fa mentre si
 * scrive, e le tabelle usano la notazione col punto di Mantine
 * (`Table.Thead`), che in un Server Component diventa `undefined` -- e'
 * il terzo dei tre guasti di confine elencati in CLAUDE.md. Riceve solo
 * dati serializzabili.
 *
 * L'impaginazione e' quella scelta dalla proprieta' il 12/10/2026
 * sull'anteprima «a righe»: le persone si leggono scendendo, le varianti
 * stanno in colonna, e le schede con una variante sola si affiancano.
 *
 * ── SOBRIO, CON UN SOLO ACCENTO PER SEZIONE ─────────────────────────
 * Ottantasei tabelle uguali si leggono come un muro, ma la prima versione
 * a colori (fasce sfumate, intestazioni piene) e' stata giudicata dalla
 * proprieta' «troppo pacchiana» (12/10/2026). Resta un accento minimo: la
 * tinta della sezione nell'icona del titolo e dei bottoni e in una barra
 * sottile a sinistra di ogni scheda -- il resto e' grigio e inchiostro
 * (ListinoTabelle.module.css). Le tinte: cyan, indigo, prestige, vino,
 * teal (le ultime due in Tema.tsx).
 *
 * ── PENSATA ANCHE PER IL TELEFONO ───────────────────────────────────
 * Bottoni di navigazione alti 36px (sotto si sbaglia col dito), titoli di
 * sezione che non finiscono sotto la barra in alto (`scrollMarginTop`), e
 * un pulsante per tornare su: il listino intero, a una colonna, e' lungo
 * decine di schermate.
 *
 * ── RETAIL, NET E COMMISSIONE (dal 12/10/2026) ──────────────────────
 * Con `commissioni` ogni prezzo diventa tre: Retail (Regiondo), Net e
 * commissione (src/lib/commissioni.ts). Due impaginazioni, per richiesta
 * della proprieta':
 *  - DESKTOP: tabella orizzontale, una colonna per opzione (persone,
 *    Adult/Youth...), una riga per variante; nella cella il Retail e
 *    sotto, nella stessa colonna, Net e commissione;
 *  - TELEFONO: una riga per opzione, con tre colonne di prezzi.
 * Sono disegnate tutte e due e il CSS ne mostra una (soglia 48em): con
 * un hook che misura lo schermo, il server non sa la larghezza e al primo
 * disegno si vedrebbe quella sbagliata. */

export type StatoTab = 'uguale' | 'diverso' | 'non_abbinabile';

/** Il prezzo come lo scrive chi legge: «€1,000» in inglese, «€ 1.000» in
 *  italiano. Il punto delle migliaia si mette a mano: con `it-IT` il
 *  browser NON separa i numeri di quattro cifre (scriverebbe «1000»), che
 *  e' la regola di CLDR ma non quella di un listino. */
function euro(n: number, lingua: Lingua): string {
  if (lingua !== 'it') return '€' + n.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  const [intera, dec] = (Math.round(n * 100) / 100).toFixed(Number.isInteger(n) ? 0 : 2).split('.');
  return '€ ' + intera.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
}

const STILE: Record<ChiaveSezione, { colore: string; Icona: typeof IconShip }> = {
  cruise: { colore: 'cyan', Icona: IconShip },
  transfers: { colore: 'indigo', Icona: IconRoute },
  small: { colore: 'prestige', Icona: IconUsersGroup },
  wine: { colore: 'vino', Icona: IconGlassFull },
  private: { colore: 'teal', Icona: IconSteeringWheel },
  other: { colore: 'gray', Icona: IconMapPin },
};

/** Una tinta della sezione come variabile CSS di Mantine. */
const t = (colore: string, tono: number) => `var(--mantine-color-${colore}-${tono})`;

export function ListinoTabelle({
  servizi,
  lingua,
  statiTab,
  commissioni,
}: {
  servizi: Servizio[];
  /** la lingua dei testi: l'admin in italiano, il partner quella scelta
   *  col selettore EN/IT (src/lib/partners-testi.ts) */
  lingua: Lingua;
  /** solo per l'admin: lo stato della tab PRICES di ogni pagina */
  statiTab?: Record<string, StatoTab>;
  /** le percentuali: ogni prezzo diventa Retail, Net e commissione */
  commissioni?: Commissioni;
}) {
  const [cerca, setCerca] = useState('');
  const [scroll, scrollTo] = useWindowScroll();
  const T = testiDi(lingua);
  /* Le cose da admin (SKU, stato della tab PRICES, messaggi che nominano
     Regiondo) solo quando arrivano gli stati delle tab: il partner non li
     riceve mai, in nessuna lingua. */
  const admin = !!statiTab;

  const sezioni = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return raggruppa(q ? servizi.filter((s) => s.nome.toLowerCase().includes(q)) : servizi);
  }, [servizi, cerca]);

  return (
    <Stack gap={40}>
      <Stack gap="sm">
        {commissioni && <Legenda T={T} commissioni={commissioni} />}
        <TextInput
          id="cerca-listino"
          placeholder={T.cerca}
          aria-label={T.cercaEtichetta}
          leftSection={<IconSearch size={16} />}
          value={cerca}
          onChange={(e) => setCerca(e.currentTarget.value)}
          radius="xl"
          size="md"
        />
        <Group gap={8} wrap="wrap">
          {sezioni.map((s) => {
            const { colore, Icona } = STILE[s.chiave];
            return (
              <Button
                key={s.chiave}
                component="a"
                href={`#sez-${s.chiave}`}
                variant="default"
                size="sm"
                radius="xl"
                leftSection={<Icona size={16} stroke={1.6} color={t(colore, 7)} />}
                rightSection={
                  <Text span size="xs" c="dimmed" fw={600}>
                    {s.totale}
                  </Text>
                }
              >
                {T.sezioni[s.chiave]}
              </Button>
            );
          })}
        </Group>
      </Stack>

      {!sezioni.length && (
        <Text c="dimmed">{T.nessuno}</Text>
      )}

      {sezioni.map((s) => {
        const { colore, Icona } = STILE[s.chiave];
        return (
          <Stack key={s.chiave} gap="lg" id={`sez-${s.chiave}`} style={{ scrollMarginTop: 80 }}>
            <Group gap="sm" wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', paddingBottom: 10 }}>
              <ThemeIcon size={36} radius="md" color={colore} variant="light">
                <Icona size={20} stroke={1.6} />
              </ThemeIcon>
              <div style={{ minWidth: 0 }}>
                <Title order={2} size="h3" lh={1.15}>
                  {T.sezioni[s.chiave]}
                </Title>
                <Text c="dimmed" size="sm">
                  {s.totale} {T.servizi}
                </Text>
              </div>
            </Group>
            {s.gruppi.map((g) => (
              <Stack key={g.gruppo ?? '-'} gap="sm">
                {g.gruppo && (
                  <Group gap={6}>
                    <Badge
                      size="lg"
                      variant="default"
                      radius="sm"
                      leftSection={<IconMapPin size={14} />}
                      style={{ textTransform: 'none', letterSpacing: '.02em' }}
                    >
                      {s.chiave === 'cruise' && g.gruppo !== 'Other ports' ? T.porto + g.gruppo : T.gruppi[g.gruppo] ?? g.gruppo}
                    </Badge>
                  </Group>
                )}
                <Box
                  style={{
                    display: 'grid',
                    gap: 16,
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                    alignItems: 'start',
                  }}
                >
                  {g.servizi.map((x) => (
                    <Scheda key={x.slug} s={x} T={T} admin={admin} stato={statiTab?.[x.slug]} colore={colore} lingua={lingua} commissioni={commissioni} />
                  ))}
                </Box>
              </Stack>
            ))}
          </Stack>
        );
      })}

      {/* Il ritorno in cima: compare solo dopo aver scrollato un po'. */}
      <Affix position={{ bottom: 20, right: 20 }}>
        <Transition transition="slide-up" mounted={scroll.y > 700}>
          {(stile) => (
            <ActionIcon
              style={stile}
              size={48}
              radius="xl"
              color="dark"
              variant="filled"
              aria-label={T.suTop}
              onClick={() => scrollTo({ y: 0 })}
            >
              <IconArrowUp size={22} />
            </ActionIcon>
          )}
        </Transition>
      </Affix>
    </Stack>
  );
}

/** La pagina dei PREZZI del prodotto nel pannello di Regiondo (passo 3
 *  della scheda prodotto). Il numero e' la parte finale dello SKU:
 *  T-PR193-299825 -> 299825. L'indirizzo che usa Regiondo porta anche un
 *  `draft_id`, che cambia a ogni modifica e da qui non si conosce: senza,
 *  Regiondo apre la scheda e ne crea uno. Serve aver fatto l'accesso a
 *  Regiondo nello stesso browser. */
function linkRegiondo(sku: string): string | null {
  const n = sku.match(/^T-PR\d+-(\d+)$/)?.[1];
  return n ? `https://www.regiondo.it/product/ticket/create/step/3/edit/${n}/lang/3` : null;
}

/** Le variabili della tinta di una scheda, lette da ListinoTabelle.module.css. */
function tinta(colore: string): React.CSSProperties {
  const v: Record<string, string> = {};
  for (const k of [0, 1, 2, 3, 6, 7, 8, 9]) v[`--k${k}`] = t(colore, k);
  return v as React.CSSProperties;
}

function Scheda({
  s,
  T,
  admin,
  stato,
  colore,
  lingua,
  commissioni,
}: {
  s: Servizio;
  T: Testi;
  admin: boolean;
  stato?: StatoTab;
  colore: string;
  lingua: Lingua;
  commissioni?: Commissioni;
}) {
  /* Con le commissioni la tabella e' orizzontale: ogni scheda prende
     tutta la riga, o le colonne delle persone non ci starebbero. */
  const largo = !!commissioni || (s.varianti?.length ?? 0) > 1;
  const percentuale = commissioni ? commissioni[tipoCommissione(s)] : null;
  return (
    <div className={`${css.scheda} ${largo ? css.larga : ''}`} style={tinta(colore)}>
      {/* La fascia della scheda: nella tinta della sezione, con il nome
          che porta alla pagina del tour. */}
      <div className={css.fascia}>
        <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
          <a href={`https://prestigerent.com/tour/${s.slug}/`} target="_blank" rel="noopener" className={css.nome}>
            {s.nome}
            <IconExternalLink size={13} style={{ marginLeft: 5, verticalAlign: '-1px', opacity: 0.55 }} />
          </a>
          <Group gap={6}>
            <Badge variant="default" radius="sm" tt="none" fw={600}>
              {s.unita === 'per person' ? T.perPersona : T.perGruppo}
            </Badge>
            {percentuale != null && (
              <Badge variant="light" color="gray" radius="sm" tt="none" fw={600}>
                {T.commissioneDi(percentuale)}
              </Badge>
            )}
            {stato && (
              <Badge
                variant="light"
                radius="xl"
                color={stato === 'uguale' ? 'teal' : stato === 'diverso' ? 'orange' : 'grape'}
              >
                {stato === 'uguale' ? 'tab PRICES allineata' : stato === 'diverso' ? 'tab PRICES da aggiornare' : 'tab PRICES non abbinabile'}
              </Badge>
            )}
          </Group>
        </Group>
        {admin && s.sku && (
          <Group gap="xs" mt={4} wrap="wrap">
            <Text size="xs" c="dimmed" ff="monospace">{s.sku}</Text>
            {linkRegiondo(s.sku) && (
              /* Dalla tabella alla pagina dei prezzi del prodotto su
                 Regiondo, per correggerli al volo (richiesta della
                 proprieta', 12/10/2026). Solo per l'admin: al partner lo
                 SKU non arriva nemmeno. */
              <Button
                component="a"
                href={linkRegiondo(s.sku)!}
                target="_blank"
                rel="noopener noreferrer"
                size="compact-xs"
                variant="default"
                leftSection={<IconPencil size={13} />}
              >
                Modifica prezzi su Regiondo
              </Button>
            )}
          </Group>
        )}
      </div>

      <div>
        {s.varianti?.length ? (
          percentuale != null ? (
            <PrezziConCommissione s={s} T={T} lingua={lingua} percentuale={percentuale} />
          ) : (
            <Prezzi s={s} T={T} lingua={lingua} />
          )
        ) : (
          <Text size="sm" c="dimmed" p="xs">
            {admin ? 'Regiondo non ha risposto per questo prodotto: riprova fra poco.' : T.nonDisponibile}
          </Text>
        )}
      </div>
    </div>
  );
}

/* Una tabella HTML semplice e non `Table` di Mantine: e' la parte che si
   ripete centinaia di volte, e ogni attributo in piu' per cella pesava
   sull'HTML della pagina (vedi ListinoTabelle.module.css). */
function Prezzi({ s, T, lingua }: { s: Servizio; T: Testi; lingua: Lingua }) {
  const varianti = s.varianti!;
  const { perPersone, righe } = righeDelServizio(varianti);
  const una = varianti.length === 1;
  return (
    <div className={css.scorre}>
      <table className={css.tabella} style={{ minWidth: una ? 220 : 120 + varianti.length * 130 }}>
        <thead className={css.testa}>
          <tr>
            <th>{perPersone ? T.persone : T.opzione}</th>
            {una ? (
              <th className={css.destra}>{T.prezzo}</th>
            ) : (
              varianti.map((v) => (
                <th key={v.id} className={`${css.destra} ${css.variante}`}>
                  {v.titolo}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r.etichetta}>
              <th scope="row">{r.etichetta}</th>
              {r.prezzi.map((p, k) =>
                p == null ? (
                  <td key={k} className={css.vuoto}>—</td>
                ) : (
                  <td key={k} className={css.prezzo}>{euro(p, lingua)}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** La legenda sopra il listino: cosa vogliono dire Retail, Net e
 *  commissione, con le percentuali di oggi. */
function Legenda({ T, commissioni }: { T: Testi; commissioni: Commissioni }) {
  return (
    <div className={css.legenda}>
      <Text fw={700} size="sm" mb={4}>
        {T.legendaTitolo}
      </Text>
      <Text size="sm">
        <b>{T.retail}</b> — {T.legendaRetail}
      </Text>
      <Text size="sm">
        <b>{T.net}</b> — {T.legendaNet}
      </Text>
      <Text size="sm">
        <b>{T.commissione}</b> — {T.legendaCommissione(commissioni.privato, commissioni.gruppo)}
      </Text>
    </div>
  );
}

/** Tre cifre impilate nella stessa colonna: Retail, Net, commissione. */
function Tre({ p, percentuale, lingua }: { p: number; percentuale: number; lingua: Lingua }) {
  const x = scomponi(p, percentuale);
  return (
    <>
      <span className={css.r}>{euro(x.retail, lingua)}</span>
      <span className={css.n}>{euro(x.net, lingua)}</span>
      <span className={css.c}>{euro(x.commissione, lingua)}</span>
    </>
  );
}

function PrezziConCommissione({ s, T, lingua, percentuale }: { s: Servizio; T: Testi; lingua: Lingua; percentuale: number }) {
  const varianti = s.varianti!;
  const { perPersone, righe } = righeDelServizio(varianti);
  const una = varianti.length === 1;
  return (
    <>
      {/* DESKTOP: una colonna per opzione, una riga per variante. */}
      <div className={`${css.scorre} ${css.soloDesktop}`}>
        <table className={css.tabella} style={{ minWidth: 150 + righe.length * 96 }}>
          <thead className={css.testa}>
            <tr>
              <th>{perPersone ? T.persone : T.opzione}</th>
              {righe.map((r) => (
                <th key={r.etichetta} className={css.destra}>
                  {r.etichetta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {varianti.map((v, i) => (
              <tr key={v.id}>
                <th scope="row" className={css.etichette}>
                  {!una && <span className={css.titoloRiga} title={v.titolo}>{v.titolo}</span>}
                  <span className={css.r}>{T.retail}</span>
                  <span className={css.n}>{T.net}</span>
                  <span className={css.c}>{T.commissione}</span>
                </th>
                {righe.map((r) => {
                  const p = r.prezzi[i];
                  return p == null ? (
                    <td key={r.etichetta} className={css.vuoto}>—</td>
                  ) : (
                    <td key={r.etichetta} className={css.cella}>
                      {/* una riga vuota all'altezza del titolo della
                          variante, perche' le cifre restino allineate alle
                          loro etichette */}
                      {!una && <span className={css.titoloRiga} aria-hidden="true">&nbsp;</span>}
                      <Tre p={p} percentuale={percentuale} lingua={lingua} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TELEFONO: per ogni variante, una riga per opzione e tre colonne. */}
      <div className={css.soloMobile}>
        {varianti.map((v, i) => (
          <div key={v.id}>
            {!una && <div className={css.variantePiccola}>{v.titolo}</div>}
            <table className={css.tabella}>
              <thead className={css.testa}>
                <tr>
                  <th>{perPersone ? T.persone : T.opzione}</th>
                  <th className={css.destra}>{T.retail}</th>
                  <th className={css.destra}>{T.net}</th>
                  <th className={css.destra}>{T.commBreve}</th>
                </tr>
              </thead>
              <tbody>
                {righe
                  .filter((r) => r.prezzi[i] != null)
                  .map((r) => {
                    const x = scomponi(r.prezzi[i]!, percentuale);
                    return (
                      <tr key={r.etichetta}>
                        <th scope="row">{r.etichetta}</th>
                        <td className={css.prezzo}>{euro(x.retail, lingua)}</td>
                        <td className={css.netto}>{euro(x.net, lingua)}</td>
                        <td className={css.comm}>{euro(x.commissione, lingua)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
