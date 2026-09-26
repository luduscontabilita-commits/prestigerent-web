import { comeSiChiama } from '@/lib/accesso';
import { Guscio, vociPerRuolo } from '@/components/admin/Guscio';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { firmaAnteprime } from '@/lib/gallery-file';
import { urlFoto } from '@/lib/gallery-dati';
import { TutteLeFoto, type FotoAdmin } from '@/components/admin/TutteLeFoto';
import { aggiornaFoto, cambiaVisibilita, elimina, pagineTaggabili } from '../azioni';
import '@/styles/gallery-admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* TUTTE LE FOTO DELLA GALLERY.
 *
 * 🔴 QUESTA PAGINA MANCAVA, e la mancanza si vedeva solo usando il
 * pannello. C'erano tre modi di guardare le foto e nessuno mostrava
 * TUTTE:
 *   - «Da approvare» filtra `status = 'in_attesa'`;
 *   - «Le mie foto» filtra `uploaded_by = io.id`;
 *   - l'indice e «Pagine» mostrano solo conteggi.
 * Risultato: con sedici foto approvate in archivio, un amministratore
 * vedeva il numero 16 e non vedeva una sola immagine -- e non aveva
 * nessun modo di nasconderne una, correggerne la descrizione o
 * cancellarla.
 *
 * Qui si vede tutto e si agisce su tutto. E' una pagina da
 * amministratore: `soloGestione()`, non `soloCaricatori()`. Una guida
 * continua a vedere soltanto le proprie foto, in «Le mie foto» -- che e'
 * esattamente la regola chiesta dalla proprieta'.
 */

type Riga = {
  id: string;
  alt: string;
  caption: string | null;
  status: string;
  bucket: string;
  storage_path: string;
  width: number;
  height: number;
  blur_data_url: string | null;
  created_at: string;
  taken_at: string | null;
  review_note: string | null;
  profili: { nome: string | null; username: string | null; email: string } | null;
  gallery_image_tags: { gallery_tags: { key: string; label: string } | null }[];
};

export default async function Tutte({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string; pagina?: string }>;
}) {
  const io = await soloGestione();
  const { stato, pagina } = await searchParams;
  const sb = await supabaseServer();

  let q = sb
    .from('gallery_images')
    .select(
      'id,alt,caption,status,bucket,storage_path,width,height,blur_data_url,created_at,taken_at,review_note,' +
        'profili:uploaded_by(nome,username,email),gallery_image_tags(gallery_tags(key,label))'
    )
    .order('created_at', { ascending: false });

  /* Il filtro si controlla contro i valori ammessi invece di passarlo
     alla query: un `stato` arbitrario nell'indirizzo diventerebbe un
     `eq` su un valore che il vincolo non conosce -- nessun errore,
     nessuna riga, e una pagina vuota che sembra un guasto. */
  const STATI = ['in_attesa', 'approvata', 'rifiutata', 'nascosta'];
  if (stato && STATI.includes(stato)) q = q.eq('status', stato);

  const [{ data }, pagine] = await Promise.all([q, pagineTaggabili()]);
  let righe = (data ?? []) as unknown as Riga[];

  /* Il filtro per pagina si applica qui e non nella query: filtrare su
     una tabella collegata con PostgREST richiede una `!inner` che
     cambierebbe anche il modo in cui tornano gli altri tag della stessa
     foto. Sono poche centinaia di righe: si filtra in memoria e si
     continua a vedere, per ogni foto, TUTTE le pagine a cui appartiene. */
  if (pagina) {
    righe = righe.filter((r) =>
      r.gallery_image_tags.some((t) => t.gallery_tags?.key === pagina)
    );
  }

  /* Le foto ancora nell'inbox non hanno indirizzo pubblico: servono le
     firme, e si chiedono TUTTE INSIEME invece che una per foto. */
  const daFirmare = righe.filter((r) => r.bucket !== 'gallery').map((r) => r.storage_path);
  const firme = await firmaAnteprime(daFirmare);

  const foto: FotoAdmin[] = righe.map((r) => ({
    id: r.id,
    alt: r.alt,
    caption: r.caption,
    stato: r.status as FotoAdmin['stato'],
    motivo: r.review_note,
    larghezza: r.width,
    altezza: r.height,
    colore: r.blur_data_url,
    anteprima:
      r.bucket === 'gallery'
        ? urlFoto({ bucket: r.bucket, storage_path: r.storage_path })
        : (firme[r.storage_path] ?? null),
    caricata: r.created_at,
    scattata: r.taken_at,
    /* Mai l'email: per una guida sarebbe l'indirizzo interno finto.
       `null` quando la foto non ha un caricatore -- succede per i dati di
       prova e per le foto di chi e' stato cancellato. */
    chi: r.profili ? comeSiChiama(r.profili) : null,
    tag: r.gallery_image_tags
      .map((t) => t.gallery_tags)
      .filter((t): t is { key: string; label: string } => !!t),
  }));

  const conta = (s: string) => foto.filter((f) => f.stato === s).length;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Tutte le foto"}
      sottotitolo={<>
          L’archivio completo della gallery: {foto.length}{' '}
          {foto.length === 1 ? 'foto' : 'foto'}
          {stato || pagina ? ' con questo filtro' : ''}. Da qui si nasconde, si corregge e
          si elimina.
        </>}
    >

      <TutteLeFoto
        foto={foto}
        pagine={pagine}
        statoAttivo={stato ?? ''}
        paginaAttiva={pagina ?? ''}
        conteggi={{
          approvata: conta('approvata'),
          nascosta: conta('nascosta'),
          in_attesa: conta('in_attesa'),
          rifiutata: conta('rifiutata'),
        }}
        cambiaVisibilita={cambiaVisibilita}
        elimina={elimina}
        aggiornaFoto={aggiornaFoto}
      />
    </Guscio>
  );
}
