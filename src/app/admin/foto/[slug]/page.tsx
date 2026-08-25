import { notFound, redirect } from 'next/navigation';
import { chiSono, supabaseServer } from '@/lib/auth';
import { fotoDi, type Blocchi } from '@/components/admin/blocchi';
import { RiordinaFoto } from '@/components/admin/RiordinaFoto';
import { salvaFoto } from '../azioni';
import '@/styles/admin.css';

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
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');

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
    <main className="ad-main ad-largo">
      <header className="ad-head">
        <div>
          <h1>{nome}</h1>
          <p>
            <code>{slug}</code> · {foto.length} foto ·{' '}
            <a href={`/tour/${slug}/`} target="_blank" rel="noopener">
              vedi la pagina
            </a>
          </p>
        </div>
        <a className="ad-back" href="/admin/foto/">
          &larr; Foto dei tour
        </a>
      </header>

      <p className="ad-avviso">
        Trascina per riordinare. La <b>prima</b> foto e&apos; la copertina: e&apos; quella che si
        vede nell&apos;elenco della home e quando qualcuno condivide il link. Le modifiche
        vanno in pagina solo dopo <b>Salva</b>.
      </p>

      {foto.length === 0 ? (
        <p className="ad-vuoto">
          Questo tour non ha nessuna foto in <code>blocks.images</code>. Vanno caricate prima
          altrove: qui si riordina, non si aggiunge.
        </p>
      ) : (
        <RiordinaFoto slug={slug} iniziali={foto} salva={salvaFoto} />
      )}
    </main>
  );
}
