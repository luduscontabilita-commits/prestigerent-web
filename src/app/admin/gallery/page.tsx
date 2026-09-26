import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Alert,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconClipboardCheck,
  IconFileDescription,
  IconLayoutGrid,
  IconSettings,
  IconUpload,
  IconUser,
} from '@tabler/icons-react';
import { chiSono, haRuolo, RUOLI_CARICAMENTO, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio, vociPerRuolo } from '@/components/admin/Guscio';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* L'INDICE DELLA GALLERY.
 *
 * Non usa `soloGestione()` perche' ci entrano tutti e due i ruoli: un
 * admin vede tutto, una guida vede caricamento e "Le mie foto". Le pagine
 * riservate hanno il loro controllo, e cosi' le azioni.
 *
 * 🔴 QUI SI DICE CHE COSA E' QUESTA GALLERY, e non e' decorazione: in
 * /admin/foto/ si riordinano le foto DEL PRODOTTO, quelle della striscia
 * in cima alle schede. Sono due cose diverse gestite da due pannelli, e
 * senza una riga che lo dica chi ci arriva ne cerca una nell'altra.
 */
export default async function GalleryIndice() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  if (!haRuolo(io, RUOLI_CARICAMENTO)) redirect('/admin/');

  const gestisce = haRuolo(io, RUOLI_GESTIONE);
  const sb = await supabaseServer();

  /* `head: true` e `count`: torna solo il numero, non le righe. La coda
     puo' avere centinaia di foto e qui serve un contatore. */
  const [{ count: inAttesa }, { count: approvate }, { count: pagine }, { data: imp }] =
    await Promise.all([
      sb.from('gallery_images').select('id', { count: 'exact', head: true }).eq('status', 'in_attesa'),
      sb.from('gallery_images').select('id', { count: 'exact', head: true }).eq('status', 'approvata'),
      sb.from('gallery_tags').select('id', { count: 'exact', head: true }).eq('is_orphan', false),
      sb.from('gallery_settings').select('galleries_enabled,min_images').eq('id', 1).maybeSingle(),
    ]);

  const impostazioni = imp as { galleries_enabled: boolean; min_images: number } | null;
  const accesa = impostazioni?.galleries_enabled ?? false;

  const voci = [
    {
      href: '/admin/gallery/carica/',
      titolo: 'Carica e tagga',
      testo: 'Aggiungi foto e scegli su quali pagine devono comparire.',
      icona: IconUpload,
      colore: 'prestige',
      soloAdmin: false,
    },
    {
      href: '/admin/gallery/mie/',
      titolo: 'Le mie foto',
      testo: 'In attesa, approvate, rifiutate. Le rifiutate dicono perché.',
      icona: IconUser,
      colore: 'blue',
      soloAdmin: false,
    },
    {
      href: '/admin/gallery/tutte/',
      titolo: `Tutte le foto${approvate ? ` (${approvate})` : ''}`,
      testo: 'L’archivio completo: guarda, correggi, nascondi o elimina qualunque foto.',
      icona: IconLayoutGrid,
      colore: 'grape',
      soloAdmin: true,
    },
    {
      href: '/admin/gallery/approva/',
      titolo: `Da approvare${inAttesa ? ` (${inAttesa})` : ''}`,
      testo: 'Le foto inviate dalle guide. Approva, correggi o rimanda indietro.',
      icona: IconClipboardCheck,
      colore: inAttesa ? 'red' : 'teal',
      soloAdmin: true,
    },
    {
      href: '/admin/gallery/pagine/',
      titolo: 'Pagine',
      testo: 'Quali pagine hanno la gallery, con che titolo e in che ordine.',
      icona: IconFileDescription,
      colore: 'indigo',
      soloAdmin: true,
    },
    {
      href: '/admin/gallery/impostazioni/',
      titolo: 'Impostazioni',
      testo: 'L’interruttore generale, il numero minimo di foto, i titoli.',
      icona: IconSettings,
      colore: 'gray',
      soloAdmin: true,
    },
  ].filter((v) => !v.soloAdmin || gestisce);

  const numeri = [
    { n: inAttesa ?? 0, testo: 'da approvare', allarme: !!inAttesa },
    { n: approvate ?? 0, testo: 'sul sito', allarme: false },
    { n: pagine ?? 0, testo: 'pagine nel registro', allarme: false },
  ];

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Foto della gallery"
      sottotitolo={
        <>
          Le foto delle giornate, caricate da chi accompagna gli ospiti. Compaiono in
          fondo alle pagine del sito. <b>Non</b> sono le foto dei tour: quelle stanno in{' '}
          <Link href="/admin/foto/">Foto dei tour</Link> e sono la striscia in cima alle
          schede, con la copertina.
        </>
      }
    >
      {/* Lo stato dell'interruttore in cima, sempre: e' la domanda che si
          fa chi non capisce perche' le foto non si vedono sul sito. */}
      <Alert
        variant="light"
        color={accesa ? 'teal' : 'orange'}
        icon={accesa ? <IconCheck size={20} /> : <IconAlertTriangle size={20} />}
        mb="lg"
        radius="md"
      >
        {accesa ? (
          <>
            <b>Le gallery sono accese.</b> Una pagina le mostra quando ha almeno{' '}
            {impostazioni?.min_images ?? 3} foto approvate.
          </>
        ) : (
          <>
            <b>Le gallery sono spente su tutto il sito.</b> Si può caricare, taggare e
            approvare: niente compare ai visitatori finché l’interruttore resta spento.
          </>
        )}
      </Alert>

      <SimpleGrid cols={3} spacing="md" mb="lg">
        {numeri.map((x) => (
          <Paper key={x.testo} withBorder radius="md" p="md">
            <Text fw={800} fz={{ base: 26, sm: 32 }} lh={1} c={x.allarme ? 'red' : undefined}>
              {x.n}
            </Text>
            <Text size="xs" c="dimmed" mt={6} lh={1.3}>{x.testo}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {voci.map((v) => (
          <Card
            key={v.href}
            component={Link}
            href={v.href}
            withBorder
            radius="md"
            padding="lg"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
              <ThemeIcon variant="light" color={v.colore} size={40} radius="md">
                <v.icona size={21} stroke={1.6} />
              </ThemeIcon>
              <IconChevronRight size={17} style={{ opacity: 0.3, flexShrink: 0 }} />
            </Group>
            <Title order={2} size="h5" mb={4}>{v.titolo}</Title>
            <Text size="sm" c="dimmed" lh={1.55}>{v.testo}</Text>
          </Card>
        ))}
      </SimpleGrid>
    </Guscio>
  );
}
