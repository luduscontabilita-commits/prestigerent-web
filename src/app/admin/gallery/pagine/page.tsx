import Link from 'next/link';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { decidi, spiega, type Impostazioni, type Tag } from '@/lib/gallery-tag';
import { GalleryPagine, type RigaPagina } from '@/components/admin/GalleryPagine';
import { salvaPagina, sincronizzaPagine } from '../azioni';
import '@/styles/admin.css';
import '@/styles/admin-telefono.css';
import '@/styles/gallery-admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function Pagine() {
  await soloGestione();
  const sb = await supabaseServer();

  const [{ data: imp }, { data: tag }, { data: conteggi }] = await Promise.all([
    sb.from('gallery_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('gallery_tags').select('*').order('type').order('label'),
    /* Le foto APPROVATE per pagina. Si legge dalla vista pubblica, che
       filtra da se' sullo stato: cosi' il conteggio del pannello e' per
       costruzione lo stesso che usa la soglia sul sito. */
    sb.from('gallery_public').select('tag_key'),
  ]);

  const impostazioni = (imp ?? {}) as Impostazioni;
  const perChiave: Record<string, number> = {};
  for (const r of (conteggi ?? []) as { tag_key: string }[]) {
    perChiave[r.tag_key] = (perChiave[r.tag_key] ?? 0) + 1;
  }

  const righe: RigaPagina[] = ((tag ?? []) as Tag[]).map((t) => {
    const quante = perChiave[t.key] ?? 0;
    /* 🔴 LA STESSA FUNZIONE DEL SITO. Se qui ci fosse un `if` scritto a
       mano, il pannello potrebbe dire «Visibile» su una pagina che non
       mostra niente -- ed e' esattamente il tipo di bugia che fa perdere
       un pomeriggio a cercare un guasto che non c'e'. */
    const e = decidi(impostazioni, t, quante);
    return {
      id: t.id,
      key: t.key,
      label: t.label,
      path: t.path,
      quante,
      stato: spiega(e),
      visibile: e.visibile,
      senzaTour: t.senza_tour,
      orfana: t.is_orphan,
      custom_title: t.custom_title,
      custom_subtitle: t.custom_subtitle,
      visibility_override: t.visibility_override,
      min_images_override: t.min_images_override,
      sort_override: t.sort_override,
    };
  });

  const visibili = righe.filter((r) => r.visibile).length;

  return (
    <main className="ad-main ad-largo">
      <header className="ad-head">
        <div>
          <h1>Pagine</h1>
          <p>
            {righe.length} pagine nel registro, {visibili} mostrano la gallery adesso.
            {!impostazioni.galleries_enabled && (
              <> L’interruttore generale è <b>spento</b>: contano solo le pagine messe su «sempre accesa».</>
            )}
          </p>
        </div>
        <Link className="ad-back" href="/admin/gallery/">&larr; Gallery</Link>
      </header>

      {righe.length === 0 && (
        <p className="ad-err">
          Il registro è vuoto: premi «Sincronizza pagine» qui sotto per riempirlo dal
          codice e dal catalogo.
        </p>
      )}

      <GalleryPagine righe={righe} sincronizza={sincronizzaPagine} salva={salvaPagina} />
    </main>
  );
}
