import Link from 'next/link';
import { chiSono, haRuolo, RUOLI_CARICAMENTO, supabaseServer } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { firmaAnteprime } from '@/lib/gallery-file';
import { urlFoto } from '@/lib/gallery-dati';
import { GalleryMie, type MiaFoto } from '@/components/admin/GalleryMie';
import { elimina, reinvia } from '../azioni';
import '@/styles/admin.css';
import '@/styles/admin-telefono.css';
import '@/styles/gallery-admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

type Riga = {
  id: string;
  alt: string;
  caption: string | null;
  status: string;
  review_note: string | null;
  bucket: string;
  storage_path: string;
  created_at: string;
  blur_data_url: string | null;
  gallery_image_tags: { gallery_tags: { label: string } | null }[];
};

/* «LE MIE FOTO»: dove una guida vede cosa e' successo a quello che ha
 * mandato, e soprattutto PERCHE' una foto e' tornata indietro.
 *
 * La RLS fa il lavoro: la policy `lettura_gallery_images_mie` lascia
 * vedere le proprie righe in qualunque stato, e un admin vede tutto. Non
 * serve nessun filtro su `uploaded_by` in questa query -- e non metterlo
 * e' meglio che metterlo, perche' cosi' anche un admin che apre questa
 * pagina vede le proprie, non un elenco a caso.
 */
export default async function Mie() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  if (!haRuolo(io, RUOLI_CARICAMENTO)) redirect('/admin/');

  const sb = await supabaseServer();
  const { data } = await sb
    .from('gallery_images')
    .select(
      'id,alt,caption,status,review_note,bucket,storage_path,created_at,blur_data_url,' +
        'gallery_image_tags(gallery_tags(label))'
    )
    .eq('uploaded_by', io.id)
    .order('created_at', { ascending: false });

  const righe = (data ?? []) as unknown as Riga[];

  /* Le foto ancora nell'inbox non hanno indirizzo pubblico: servono le
     firme. Quelle approvate o nascoste stanno nel bucket pubblico e
     l'indirizzo si costruisce senza chiedere niente. */
  const daFirmare = righe.filter((r) => r.bucket !== 'gallery').map((r) => r.storage_path);
  const firme = await firmaAnteprime(daFirmare);

  const foto: MiaFoto[] = righe.map((r) => ({
    id: r.id,
    alt: r.alt,
    caption: r.caption,
    stato: r.status as MiaFoto['stato'],
    motivo: r.review_note,
    colore: r.blur_data_url,
    anteprima:
      r.bucket === 'gallery'
        ? urlFoto({ bucket: r.bucket, storage_path: r.storage_path })
        : (firme[r.storage_path] ?? null),
    caricata: r.created_at,
    pagine: r.gallery_image_tags.map((t) => t.gallery_tags?.label).filter((l): l is string => !!l),
  }));

  return (
    <main className="ad-main ad-largo">
      <header className="ad-head">
        <div>
          <h1>Le mie foto</h1>
          <p>Quello che hai caricato, e a che punto è.</p>
        </div>
        <Link className="ad-back" href="/admin/gallery/">&larr; Gallery</Link>
      </header>

      <GalleryMie foto={foto} reinvia={reinvia} elimina={elimina} />
    </main>
  );
}
