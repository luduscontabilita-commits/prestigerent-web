import { Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { decidi, spiega, type Impostazioni, type Tag } from '@/lib/gallery-tag';
import { GalleryPagine, type RigaPagina } from '@/components/admin/GalleryPagine';
import { salvaPagina, sincronizzaPagine } from '../azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function Pagine() {
  const io = await soloGestione();
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

  /* L'ORDINE: prima quelle che la gallery ce l'hanno davvero.
   *
   * Il registro ha 103 pagine e cento di queste non hanno nemmeno una
   * foto: in ordine alfabetico, le tre che contano finiscono sparse in
   * mezzo, e chi apre la pagina per vedere «dove si vede la gallery»
   * deve cercarle. Quindi: prima le visibili, dentro ognuno dei due
   * gruppi le piu' fotografate in cima, e a parita' l'ordine alfabetico
   * perche' due righe identiche non si scambino di posto a ogni
   * ricarica.
   *
   * 🔴 L'ordine si decide QUI, sul server, e non nel componente: la'
   * cambia lo stato di una riga appena si tocca il suo interruttore, e
   * una riga che salta di posizione sotto le dita e' il modo piu' sicuro
   * di far cliccare quella sbagliata. Si riordina alla prossima
   * apertura. */
  righe.sort((a, b) =>
    Number(b.visibile) - Number(a.visibile) ||
    b.quante - a.quante ||
    a.label.localeCompare(b.label, 'it')
  );

  const visibili = righe.filter((r) => r.visibile).length;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Pagine"}
      sottotitolo={<>
          {righe.length} pagine nel registro, {visibili} mostrano la gallery adesso.
          {!impostazioni.galleries_enabled && (
            <> L’interruttore generale è <b>spento</b>: contano solo le pagine messe su «sempre accesa».</>
          )}
        </>}
    >

      {righe.length === 0 && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} mb="md">
          Il registro è vuoto: premi «Sincronizza pagine» qui sotto per riempirlo dal
          codice e dal catalogo.
        </Alert>
      )}

      {/* Le impostazioni generali servono al componente per RICALCOLARE lo
          stato di una riga appena si cambia il suo interruttore, con le
          stesse `decidi()` e `spiega()` usate qui sopra. Senza, la colonna
          «Stato» resterebbe quella calcolata al caricamento e mentirebbe
          fino alla ricarica successiva. */}
      <GalleryPagine
        righe={righe}
        impostazioni={impostazioni}
        sincronizza={sincronizzaPagine}
        salva={salvaPagina}
      />
    </Guscio>
  );
}
