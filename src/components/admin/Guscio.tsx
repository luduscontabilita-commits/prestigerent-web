'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppShell,
  Box,
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
import type { VoceMenu } from '@/lib/menu-admin';

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
            {/* Lo stesso logo trasparente della schermata di accesso e
                dell'intestazione del sito: sta su Supabase Storage, non in
                `public/`, quindi non c'e' una seconda copia da tenere
                allineata il giorno che cambia.
                `alt=""` e `aria-hidden`: accanto c'e' gia' scritto
                PRESTIGE RENT, e un lettore di schermo che legge due volte
                lo stesso nome e' rumore, non informazione. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              style={{ display: 'block', flexShrink: 0 }}
            />
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
            /* 🔴 LE SOTTOVOCI NON VANNO DENTRO `<NavLink>` COME FIGLI.
               Il 26/09/2026 le ci ho messe, e il clic su «Foto della
               gallery» ha smesso del tutto di funzionare. Il motivo sta
               nel codice di Mantine: una NavLink CON FIGLI chiama
               `event.preventDefault()` e si limita ad aprire o chiudere
               il gruppo -- la navigazione viene annullata di proposito,
               perche' quel componente li' e' pensato come interruttore.
               E avendole dato anche `opened` controllato senza
               `onChange`, non apriva nemmeno: il clic non faceva niente.

               Qui invece il titolo resta una voce NORMALE, che naviga, e
               le sue pagine sono altre voci normali disegnate sotto,
               rientrate. Il gruppo si mostra quando si e' dentro la
               sezione: e' la stessa cosa a vedersi, senza l'interruttore
               che mangia il clic. */
            const aperto = attiva && !!v.sotto?.length;
            return (
              <div key={v.href}>
                <NavLink
                  component={Link}
                  href={v.href}
                  label={v.testo}
                  leftSection={<Icona size={18} stroke={1.6} />}
                  active={attiva}
                  onClick={close}
                  style={{ borderRadius: 8 }}
                  mb={2}
                />
                {aperto && (
                  <Box ml={30} mb={4}>
                    {v.sotto!.map((s) => (
                      <NavLink
                        key={s.href}
                        component={Link}
                        href={s.href}
                        label={s.testo}
                        /* uguaglianza e non prefisso: `/admin/gallery/` e'
                           prefisso di tutte, e le accenderebbe insieme */
                        active={percorso.replace(/\/$/, '') === s.href.replace(/\/$/, '')}
                        onClick={close}
                        style={{ borderRadius: 8 }}
                        py={6}
                      />
                    ))}
                  </Box>
                )}
              </div>
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
