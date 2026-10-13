import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge, Card, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import {
  IconCamera,
  IconChartBar,
  IconChevronRight,
  IconPhoto,
  IconReceiptEuro,
  IconSearch,
  IconUserShield,
  IconUsers,
} from '@tabler/icons-react';
import { chiSono, haRuolo, RUOLI_GESTIONE } from '@/lib/auth';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';

export const dynamic = 'force-dynamic';

/* L'INDICE DEL PANNELLO, E PERCHE' QUI LA GUARDIA E' DIVERSA.
 *
 * Tutte le altre pagine chiamano `soloGestione()`, che rimanda qui chi
 * non gestisce. Questa non puo' fare lo stesso: si rimanderebbe a se
 * stessa, e una guida girerebbe in tondo senza vedere niente. Quindi qui
 * si chiede solo di aver fatto l'accesso, e cambia COSA si vede.
 */
export default async function Pannello() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  /* L'utente del listino non ha un indice: ha due pagine, e la prima e'
     il listino. E' anche il posto dove lo rimandano tutte le altre pagine
     del pannello (`soloGestione()` manda qui chi non gestisce), quindi
     questa riga e' quella che lo tiene dentro il suo recinto. */
  if (io.ruolo === 'listino') redirect('/partners/welcome/');

  const gestisce = haRuolo(io, RUOLI_GESTIONE);

  const voci = gestisce
    ? [
        {
          href: '/admin/gallery/',
          titolo: 'Foto della gallery',
          testo:
            'Le foto delle giornate, caricate da chi accompagna gli ospiti. Compaiono in fondo alle pagine, dopo approvazione.',
          icona: IconCamera,
          colore: 'prestige',
        },
        {
          href: '/admin/foto/',
          titolo: 'Foto dei tour',
          testo:
            'L’ordine delle foto DEL PRODOTTO: la striscia in cima alle schede. La prima è la copertina, usata nell’elenco della home e nelle anteprime social.',
          icona: IconPhoto,
          colore: 'blue',
        },
        {
          href: '/admin/seo/',
          titolo: 'Title e description',
          testo: 'I testi che compaiono su Google, pagina per pagina. 123 pagine.',
          icona: IconSearch,
          colore: 'grape',
        },
        {
          href: '/admin/numeri/',
          titolo: 'Numeri da Regiondo',
          testo:
            'Recensioni, prenotazioni e disponibilità. Si riaggiornano con un pulsante e dicono quanti anni hanno.',
          icona: IconChartBar,
          colore: 'teal',
        },
        {
          href: '/admin/partners/listino/',
          titolo: 'Listino prezzi',
          testo:
            'Tutti i servizi con i prezzi di ogni opzione, letti da Regiondo, e la flotta. Da qui si allineano le tab PRICES delle schede.',
          icona: IconReceiptEuro,
          colore: 'orange',
        },
        {
          href: '/admin/partners/',
          titolo: 'Partners',
          testo:
            'Agenzie, hotel e tour operator dell’area prestigerent.com/partners/ (listino e flotta): le richieste da approvare e chi ha già accesso, con i suoi dati.',
          icona: IconUserShield,
          colore: 'red',
        },
        {
          href: '/admin/utenti/',
          titolo: 'Utenti',
          testo:
            'Chi può entrare nel pannello. Da qui si creano le guide e si consegnano loro le credenziali.',
          icona: IconUsers,
          colore: 'indigo',
        },
      ]
    : [
        {
          href: '/admin/gallery/',
          titolo: 'Foto della gallery',
          testo:
            'Carica le foto delle giornate e dì a quali pagine appartengono. Le vede un amministratore prima che compaiano sul sito.',
          icona: IconCamera,
          colore: 'prestige',
        },
      ];

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={`Ciao ${comeSiChiama(io).split(' ')[0]}`}
      sottotitolo={
        gestisce
          ? 'Da qui si governa tutto quello che il sito mostra e non mostra.'
          : 'Da qui carichi le foto delle giornate e dici a quali pagine appartengono.'
      }
      azioni={
        <Badge variant="light" color={gestisce ? 'indigo' : 'teal'} size="lg" radius="sm">
          {gestisce ? 'amministratore' : 'guida'}
        </Badge>
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {voci.map((v) => (
          /* 🔴 IL LINK STA FUORI, LA CARD DENTRO.
             `component={Link}` passerebbe una FUNZIONE da un Server
             Component a un componente client, e quello non si puo'
             serializzare: il risultato era un errore 500 subito dopo
             l'accesso. In `Guscio` la stessa cosa e' lecita, perche'
             quello e' gia' un componente client. */
          <Link
            key={v.href}
            href={v.href}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
          <Card withBorder radius="md" padding="lg" h="100%">
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
              <ThemeIcon variant="light" color={v.colore} size={40} radius="md">
                <v.icona size={21} stroke={1.6} />
              </ThemeIcon>
              <IconChevronRight size={17} style={{ opacity: 0.3, flexShrink: 0 }} />
            </Group>
            <Text fw={700} mb={4}>{v.titolo}</Text>
            <Text size="sm" c="dimmed" lh={1.55}>{v.testo}</Text>
          </Card>
          </Link>
        ))}
      </SimpleGrid>
    </Guscio>
  );
}
