import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { decidi, type Impostazioni, type Tag } from '@/lib/gallery-tag';
import { GalleryImpostazioni } from '@/components/admin/GalleryImpostazioni';
import { salvaImpostazioni } from '../azioni';
import '@/styles/gallery-admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function ImpostazioniGallery() {
  const io = await soloGestione();
  const sb = await supabaseServer();

  const [{ data: imp }, { data: tag }, { data: conteggi }] = await Promise.all([
    sb.from('gallery_settings').select('*').eq('id', 1).maybeSingle(),
    sb.from('gallery_tags').select('*'),
    sb.from('gallery_public').select('tag_key'),
  ]);

  const impostazioni = (imp ?? {}) as Impostazioni;

  const perChiave: Record<string, number> = {};
  for (const r of (conteggi ?? []) as { tag_key: string }[]) {
    perChiave[r.tag_key] = (perChiave[r.tag_key] ?? 0) + 1;
  }

  /* QUANTE PAGINE COMPARIREBBERO ACCENDENDO L'INTERRUTTORE.
     Si calcola con la stessa `decidi()` del sito, facendo finta che
     l'interruttore sia acceso: e' il numero che chi sta per accendere
     vuole sapere prima, non dopo. */
  const comeSeAcceso: Impostazioni = { ...impostazioni, galleries_enabled: true };
  const quantePronte = ((tag ?? []) as Tag[]).filter(
    (t) => !t.is_orphan && decidi(comeSeAcceso, t, perChiave[t.key] ?? 0).visibile
  ).length;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Impostazioni della gallery"}
      sottotitolo={"Valgono per tutto il sito. Ogni pagina può scavalcarle da «Pagine»."}
    >

      <GalleryImpostazioni
        iniziali={impostazioni}
        quantePronte={quantePronte}
        salva={salvaImpostazioni}
      />
    </Guscio>
  );
}
