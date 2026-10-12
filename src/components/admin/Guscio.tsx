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
  IconBus,
  IconCamera,
  IconChartBar,
  IconLogout,
  IconPhoto,
  IconReceiptEuro,
  IconSearch,
  IconUserShield,
  IconUsers,
} from '@tabler/icons-react';
import { esciEVai } from '@/app/admin/entra/azioni';
import { esciPartner } from '@/app/partners/azioni';
import type { VoceMenu } from '@/lib/menu-admin';
import { testiDi, type Lingua } from '@/lib/partners-testi';
import { SelettoreLingua } from '@/components/partners/SelettoreLingua';

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
  listino: IconReceiptEuro,
  flotta: IconBus,
  accessi: IconUserShield,
};

/** Come si chiama il ruolo in testata. L'utente del listino e' un
 *  partner esterno e legge in inglese: «guida» sotto il suo nome sarebbe
 *  sbagliato in due modi. */
const NOME_RUOLO: Record<string, string> = {
  admin: 'amministratore',
  guida: 'guida',
  listino: 'partner',
};

export function Guscio({
  chi,
  ruolo,
  voci,
  titolo,
  sottotitolo,
  azioni,
  lingua,
  children,
}: {
  chi: string;
  ruolo: string;
  voci: VoceMenu[];
  titolo: string;
  sottotitolo?: React.ReactNode;
  /** comandi propri della pagina, in alto a destra */
  azioni?: React.ReactNode;
  /** solo per l'area partner: la lingua scelta col selettore EN/IT */
  lingua?: Lingua;
  children: React.ReactNode;
}) {
  const [aperta, { toggle, close }] = useDisclosure();
  const percorso = usePathname();
  /* Il partner ha la sua area, in inglese o in italiano a scelta
     (src/lib/partners-testi.ts); il pannello dell'admin e' in italiano. */
  const partner = ruolo === 'listino';
  const T = testiDi(lingua);
  /* La voce accesa e' quella col prefisso PIU' LUNGO che combacia. Con il
     solo prefisso, dentro la flotta si accendevano insieme «Price list»
     e «Our fleet»: la prima era prefisso della seconda. Oggi vale per
     «Partners» (/admin/partners/) e «Listino prezzi»
     (/admin/partners/listino/). */
  const combacia = (href: string) => percorso.startsWith(href.replace(/\/$/, ''));
  const migliore = voci
    .filter((v) => v.href !== '/admin/' && combacia(v.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

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
            {/* 44px di bersaglio: e' il pulsante che si preme di piu' dal
                telefono, e a 28px (la misura di prima) lo si mancava. */}
            <Burger opened={aperta} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Menu" style={{ width: 44, height: 44 }} />
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
            {/* Sotto i 576px resta solo il logo: con il selettore EN|IT e
                «Esci» accanto, la scritta andava a capo su due righe. */}
            <Text fw={800} size="sm" visibleFrom="xs" style={{ letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
              PRESTIGE RENT
            </Text>
          </Group>

          <Group gap="sm" wrap="nowrap">
            <Stack gap={0} visibleFrom="xs" align="flex-end">
              <Text size="sm" fw={600} lh={1.2}>{chi}</Text>
              <Text size="xs" c="dimmed" lh={1.2}>
                {partner ? T.ruolo : NOME_RUOLO[ruolo] ?? ruolo}
              </Text>
            </Stack>
            {/* Il partner esce verso /partners/, non verso la schermata di
                accesso del pannello: quella e' in italiano e chiede un nome
                utente che lui non ha. */}
            {partner && <SelettoreLingua lingua={lingua ?? 'en'} />}
            <form action={partner ? esciPartner : esciEVai}>
              <Button type="submit" variant="default" size="sm" leftSection={<IconLogout size={15} />}>
                {partner ? T.esci : 'Esci'}
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
              : v.href === migliore;
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
            {partner
              ? T.piede
              : 'Il pannello non è raggiungibile dal sito: l’indirizzo si scrive a mano.'}
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
