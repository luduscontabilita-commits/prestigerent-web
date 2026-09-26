'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppShell,
  Badge,
  Burger,
  Button,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCamera,
  IconChartBar,
  IconLogout,
  IconPhoto,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react';
import { esciEVai } from '@/app/admin/entra/azioni';

/* IL GUSCIO DEL PANNELLO: barra laterale, intestazione, uscita.
 *
 * ── PERCHE' NON STA NEL LAYOUT ────────────────────────────────────────
 * Perche' la schermata di accesso e' FIGLIA di `admin/layout.tsx`: una
 * barra laterale li' dentro comparirebbe anche sopra al modulo di
 * accesso, e se chiedesse chi sei prima di disegnarsi, la schermata di
 * accesso rimanderebbe a se stessa. Quindi lo includono le PAGINE, che e'
 * anche il posto dove stanno le guardie -- stessa regola, stesso posto.
 *
 * ── LA NAVIGAZIONE CAMBIA COL RUOLO, E NON PER FINTA ─────────────────
 * Una guida non vede SEO, foto dei tour, numeri e utenti. Ma nascondere
 * una voce non e' una difesa: quelle pagine chiamano `soloGestione()` e
 * le loro azioni chiamano `chiAgisce()`. Qui si toglie il rumore, non si
 * chiude la porta -- la porta e' chiusa altrove.
 *
 * ── PERCHE' L'USCITA E' UN <form> ────────────────────────────────────
 * Next PREFETCHA i link visibili o al passaggio del mouse: una rotta GET
 * che cancella i cookie verrebbe chiamata da sola e ci si ritroverebbe
 * disconnessi aprendo il pannello. Un'azione in POST non si prefetcha.
 */

export type VoceMenu = {
  href: string;
  testo: string;
  icona: 'gallery' | 'foto' | 'seo' | 'numeri' | 'utenti';
};

const ICONE = {
  gallery: IconCamera,
  foto: IconPhoto,
  seo: IconSearch,
  numeri: IconChartBar,
  utenti: IconUsers,
};

export function Guscio({
  chi,
  ruolo,
  voci,
  titolo,
  sottotitolo,
  azioni,
  children,
}: {
  chi: string;
  ruolo: string;
  voci: VoceMenu[];
  titolo: string;
  sottotitolo?: React.ReactNode;
  /** comandi propri della pagina, in alto a destra */
  azioni?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [aperta, { toggle, close }] = useDisclosure();
  const percorso = usePathname();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !aperta } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            {/* Il panino compare solo sotto la soglia: sopra, la barra
                laterale c'e' sempre e un pulsante per aprirla sarebbe un
                comando che non fa niente. */}
            <Burger opened={aperta} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" />
            <Text fw={800} size="sm" style={{ letterSpacing: '.04em' }}>
              PRESTIGE RENT
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <Stack gap={0} visibleFrom="xs" align="flex-end">
              <Text size="sm" fw={600} lh={1.2}>{chi}</Text>
              <Text size="xs" c="dimmed" lh={1.2}>
                {ruolo === 'admin' ? 'amministratore' : 'guida'}
              </Text>
            </Stack>
            <form action={esciEVai}>
              <Button type="submit" variant="default" size="xs" leftSection={<IconLogout size={15} />}>
                Esci
              </Button>
            </form>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          {voci.map((v) => {
            const Icona = ICONE[v.icona];
            /* «Attiva» sul prefisso e non sull'uguaglianza: dentro
               /admin/gallery/carica/ la voce «Foto della gallery» deve
               restare accesa, o si perde il senso di dove si e'. */
            const attiva = v.href === '/admin/'
              ? percorso === '/admin' || percorso === '/admin/'
              : percorso.startsWith(v.href.replace(/\/$/, ''));
            return (
              <NavLink
                key={v.href}
                component={Link}
                href={v.href}
                label={v.testo}
                leftSection={<Icona size={18} stroke={1.6} />}
                active={attiva}
                onClick={close}
                style={{ borderRadius: 8 }}
                mb={2}
              />
            );
          })}
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed" px="xs" py="sm">
            Il pannello non è raggiungibile dal sito: l’indirizzo si scrive a mano.
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Group justify="space-between" align="flex-start" wrap="wrap" mb="lg" gap="sm">
          <div style={{ minWidth: 0 }}>
            <Title order={1} size="h2">{titolo}</Title>
            {sottotitolo && (
              <Text c="dimmed" size="sm" mt={4} maw={720}>
                {sottotitolo}
              </Text>
            )}
          </div>
          {azioni && <Group gap="xs">{azioni}</Group>}
        </Group>

        {children}
      </AppShell.Main>
    </AppShell>
  );
}

/** Le voci che tocca a ciascun ruolo. Sta qui e non nelle pagine: se ogni
 *  pagina si costruisse il suo menu, prima o poi due pagine mostrerebbero
 *  due menu diversi e nessuno saprebbe quale e' quello giusto. */
export function vociPerRuolo(ruolo: string): VoceMenu[] {
  const gallery: VoceMenu = { href: '/admin/gallery/', testo: 'Foto della gallery', icona: 'gallery' };
  if (ruolo !== 'admin') return [gallery];
  return [
    gallery,
    { href: '/admin/foto/', testo: 'Foto dei tour', icona: 'foto' },
    { href: '/admin/seo/', testo: 'Title e description', icona: 'seo' },
    { href: '/admin/numeri/', testo: 'Numeri da Regiondo', icona: 'numeri' },
    { href: '/admin/utenti/', testo: 'Utenti', icona: 'utenti' },
  ];
}

/** Il bollino di stato, usato in piu' pagine: verde se la gallery e'
 *  accesa, arancio se e' spenta. */
export function StatoGallery({ accesa, testo }: { accesa: boolean; testo: string }) {
  return (
    <Badge color={accesa ? 'teal' : 'orange'} variant="light" size="lg" radius="sm">
      {testo}
    </Badge>
  );
}
