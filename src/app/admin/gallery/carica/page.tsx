import Link from 'next/link';
import { chiSono, haRuolo, RUOLI_CARICAMENTO, RUOLI_GESTIONE } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { GalleryCaricatore } from '@/components/admin/GalleryCaricatore';
import { chiediFirme, pagineTaggabili, registraFoto } from '../azioni';
import '@/styles/admin.css';
import '@/styles/gallery-admin.css';

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
    <main className="ad-main ad-largo">
      <header className="ad-head">
        <div>
          <h1>Carica e tagga</h1>
          <p>
            {haRuolo(io, RUOLI_GESTIONE)
              ? 'Le tue foto vengono pubblicate subito: sei tu che approvi.'
              : 'Le foto che carichi vengono viste da un amministratore prima di comparire sul sito.'}
          </p>
        </div>
        <Link className="ad-back" href="/admin/gallery/">&larr; Gallery</Link>
      </header>

      {pagine.length === 0 ? (
        /* Senza registro non si puo' taggare, e senza tag non si puo'
           inviare: meglio dirlo qui che lasciare un elenco vuoto e un
           pulsante che non si accende mai. */
        <p className="ad-err">
          Il registro delle pagine è vuoto. Un amministratore deve premere
          «Sincronizza pagine» in <Link href="/admin/gallery/pagine/">Pagine</Link>.
        </p>
      ) : (
        <GalleryCaricatore
          pagine={pagine}
          approvaSubito={haRuolo(io, RUOLI_GESTIONE)}
          chiediFirme={chiediFirme}
          registraFoto={registraFoto}
        />
      )}
    </main>
  );
}
