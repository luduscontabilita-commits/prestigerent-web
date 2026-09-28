import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { firmaAnteprime } from '@/lib/gallery-file';
import { bassaRisoluzione, verraRitagliata } from '@/lib/gallery-tag';
import { GalleryCoda, type InCoda } from '@/components/admin/GalleryCoda';
import { GalleryProposte, type Proposta } from '@/components/admin/GalleryProposte';
import { urlFoto } from '@/lib/gallery-dati';
import { aggiornaFoto, approva, decidiProposte, pagineTaggabili, rifiuta } from '../azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

type Riga = {
  id: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  blur_data_url: string | null;
  storage_path: string;
  created_at: string;
  taken_at: string | null;
  profili: { nome: string | null; email: string } | null;
  gallery_image_tags: { gallery_tags: { key: string } | null }[];
};

export default async function Approva() {
  const io = await soloGestione();

  const sb = await supabaseServer();
  const [{ data }, pagine, { data: pr }] = await Promise.all([
    sb
      .from('gallery_images')
      .select(
        'id,alt,caption,width,height,blur_data_url,storage_path,created_at,taken_at,' +
          'profili:uploaded_by(nome,email),gallery_image_tags(gallery_tags(key))'
      )
      .eq('status', 'in_attesa')
      /* Le piu' vecchie prima: e' una coda, e chi ha aspettato di piu' va
         guardato per primo. */
      .order('created_at', { ascending: true }),
    pagineTaggabili(),
    /* Le pagine proposte dalle guide su foto GIA' approvate (28/09/2026).
       Le foto stanno nel bucket pubblico: l'indirizzo non va firmato. */
    sb
      .from('gallery_image_tags')
      .select(
        'image_id,tag_id,proposto_il,gallery_tags(label,path),' +
          'gallery_images(alt,bucket,storage_path,blur_data_url),profili:proposto_da(nome,email)'
      )
      .eq('in_attesa', true)
      .order('proposto_il', { ascending: true }),
  ]);

  type RigaProposta = {
    image_id: string;
    tag_id: string;
    proposto_il: string;
    gallery_tags: { label: string; path: string } | null;
    gallery_images: { alt: string; bucket: string; storage_path: string; blur_data_url: string | null } | null;
    profili: { nome: string | null; email: string } | null;
  };
  const proposte: Proposta[] = ((pr ?? []) as unknown as RigaProposta[])
    .filter((r) => r.gallery_tags && r.gallery_images)
    .map((r) => ({
      image_id: r.image_id,
      tag_id: r.tag_id,
      pagina: r.gallery_tags!.label,
      path: r.gallery_tags!.path,
      alt: r.gallery_images!.alt,
      anteprima: urlFoto({ bucket: r.gallery_images!.bucket, storage_path: r.gallery_images!.storage_path }),
      colore: r.gallery_images!.blur_data_url,
      /* Mai l'email di una guida: e' l'indirizzo interno finto. */
      chi: r.profili?.nome ?? 'una guida',
      quando: r.proposto_il,
    }));

  const righe = (data ?? []) as unknown as Riga[];

  /* UN SOLO GIRO DI FIRME PER TUTTA LA CODA, non una per foto: le foto in
     attesa stanno nel bucket privato e senza firma non hanno indirizzo. */
  const firme = await firmaAnteprime(righe.map((r) => r.storage_path));

  const foto: InCoda[] = righe.map((r) => {
    const avvisi: string[] = [];
    /* Gli stessi avvisi che ha visto chi ha caricato, ricalcolati con la
       stessa funzione del sito: se il pannello ne usasse una sua, admin e
       guida leggerebbero due giudizi diversi sulla stessa foto. */
    if (bassaRisoluzione(r)) {
      avvisi.push(`Risoluzione bassa (${r.width}×${r.height}): aperta a schermo pieno risulterà sgranata.`);
    }
    if (verraRitagliata(r)) {
      avvisi.push('Proporzioni molto allungate: nella striscia verrà ritagliata al centro.');
    }
    return {
      id: r.id,
      alt: r.alt,
      caption: r.caption,
      width: r.width,
      height: r.height,
      colore: r.blur_data_url,
      anteprima: firme[r.storage_path] ?? null,
      caricata: r.created_at,
      scattata: r.taken_at,
      chi: r.profili?.nome ?? r.profili?.email ?? 'sconosciuto',
      tag: r.gallery_image_tags.map((t) => t.gallery_tags?.key).filter((k): k is string => !!k),
      avvisi,
    };
  });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={`Da approvare${foto.length + proposte.length ? ` (${foto.length + proposte.length})` : ''}`}
      sottotitolo={<>
          Si approva la foto <b>insieme</b> alla sua descrizione e alle sue pagine: un tag
          messo da una guida arriva sul sito solo da qui.
        </>}
    >

      <GalleryProposte proposte={proposte} decidiProposte={decidiProposte} />
      <GalleryCoda
        foto={foto}
        pagine={pagine}
        approva={approva}
        rifiuta={rifiuta}
        aggiornaFoto={aggiornaFoto}
      />
    </Guscio>
  );
}
