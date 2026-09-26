import { Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import Link from 'next/link';
import { chiSono, haRuolo, RUOLI_CARICAMENTO, RUOLI_GESTIONE } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { GalleryCaricatore } from '@/components/admin/GalleryCaricatore';
import { chiediFirme, pagineTaggabili, registraFoto } from '../azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* Le pagine si leggono QUI, sul server, e arrivano al componente come
   dati: sono 103 righe leggere e non cambiano durante il caricamento.
   Chiederle dal browser vorrebbe dire una schermata vuota per il primo
   mezzo secondo, sulla pagina che si apre col telefono in mano. */
export default async function Carica() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  if (!haRuolo(io, RUOLI_CARICAMENTO)) redirect('/admin/');

  const pagine = await pagineTaggabili();

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Carica e tagga"}
      sottotitolo={haRuolo(io, RUOLI_GESTIONE) ? 'Le tue foto vengono pubblicate subito: sei tu che approvi.' : 'Le foto che carichi vengono viste da un amministratore prima di comparire sul sito.'}
    >

      {pagine.length === 0 ? (
        /* Senza registro non si puo' taggare, e senza tag non si puo'
           inviare: meglio dirlo qui che lasciare un elenco vuoto e un
           pulsante che non si accende mai. */
        <Alert color="red" icon={<IconAlertTriangle size={18} />} mb="md">
          Il registro delle pagine è vuoto. Un amministratore deve premere
          «Sincronizza pagine» in <Link href="/admin/gallery/pagine/">Pagine</Link>.
        </Alert>
      ) : (
        <GalleryCaricatore
          pagine={pagine}
          approvaSubito={haRuolo(io, RUOLI_GESTIONE)}
          chiediFirme={chiediFirme}
          registraFoto={registraFoto}
        />
      )}
    </Guscio>
  );
}
