import { Alert } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { notFound } from 'next/navigation';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { fotoDi, type Blocchi } from '@/components/admin/blocchi';
import { RiordinaFoto } from '@/components/admin/RiordinaFoto';
import { CaricaFotoTour } from '@/components/admin/CaricaFotoTour';
import { aggiungiFoto, firmeTour, salvaFoto } from '../azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const LOCALE = 'en';

/* IL RIORDINO DI UN TOUR.
 *
 * Si lavora sulla sola riga `en`: le altre lingue condividono le stesse
 * foto e, quando non hanno contenuto proprio, la pagina ricade sull'inglese
 * (vedi src/app/[locale]/tour/[slug]/page.tsx). Riordinare tre volte la
 * stessa sequenza sarebbe solo un modo in piu' per farle divergere.
 */
export default async function RiordinaPagina({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const io = await soloGestione();

  const { slug } = await params;

  const sb = await supabaseServer();
  const { data } = await sb
    .from('tours')
    .select('slug, status, tour_content(locale, blocks)')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) notFound();

  const riga = data as unknown as {
    slug: string;
    status: string | null;
    tour_content?: { locale: string; blocks: Blocchi }[];
  };
  const contenuto = riga.tour_content?.find((x) => x.locale === LOCALE);
  const foto = fotoDi(contenuto?.blocks);
  const nome = contenuto?.blocks?.name ?? slug.replace(/-/g, ' ');

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={nome}
      sottotitolo={
        <>
          <code>{slug}</code> · {foto.length} foto ·{' '}
          <a href={`/tour/${slug}/`} target="_blank" rel="noopener">vedi la pagina sul sito</a>
        </>
      }
      azioni={
        <CaricaFotoTour slug={slug} nome={nome} firme={firmeTour} aggiungi={aggiungiFoto} />
      }
    >

      <Alert color="blue" icon={<IconInfoCircle size={18} />} mb="md">
        Trascina per riordinare. La <b>prima</b> foto e&apos; la copertina: e&apos; quella che si
        vede nell&apos;elenco della home e quando qualcuno condivide il link. Le modifiche
        vanno in pagina solo dopo <b>Salva</b>.
      </Alert>

      {foto.length === 0 ? (
        /* Fino al 26/09/2026 qui c'era scritto «vanno caricate prima
           altrove», e altrove non esisteva: un tour senza copertina
           restava senza copertina. Ora il pulsante e' in alto a destra. */
        <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
          Questo tour non ha nessuna foto. Usa <b>Aggiungi foto</b> qui sopra: la prima che
          carichi diventa la copertina, quella che si vede nell’elenco della home.
        </Alert>
      ) : (
        <RiordinaFoto slug={slug} iniziali={foto} salva={salvaFoto} />
      )}
    </Guscio>
  );
}
