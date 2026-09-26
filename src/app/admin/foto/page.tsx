import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { fotoDi, type Blocchi } from '@/components/admin/blocchi';
import { ElencoFotoTour, type RigaTour } from '@/components/admin/ElencoFotoTour';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const LOCALE = 'en';

type Riga = {
  slug: string;
  kind: string | null;
  status: string | null;
  tour_content?: { locale: string; blocks: Blocchi }[];
};

/* L'ELENCO DEI TOUR, ORDINATO PER PROBLEMA.
 *
 * Chi apre questa pagina non cerca "un tour": cerca quello con la
 * copertina sbagliata o con due foto in croce. Per questo i tour con
 * poche foto vengono prima, e l'anteprima mostrata e' la PRIMA foto --
 * cioe' esattamente quella che finisce nell'elenco della home.
 *
 * 🔴 QUI SI LEGGE E BASTA: la tabella la disegna `ElencoFotoTour`, che e'
 * un componente client. Non e' una divisione di comodo -- scritta qui
 * dentro, con `Table.Thead` e compagnia, questa pagina e' andata in 500
 * il 26/09/2026. Il perche' sta scritto in cima a quel file.
 */
export default async function ElencoFoto() {
  const io = await soloGestione();

  const sb = await supabaseServer();
  const { data } = await sb
    .from('tours')
    .select('slug, kind, status, tour_content(locale, blocks)')
    .order('slug');

  const righe: RigaTour[] = ((data ?? []) as unknown as Riga[]).map((r) => {
    const c = r.tour_content?.find((x) => x.locale === LOCALE);
    const foto = fotoDi(c?.blocks);
    return {
      slug: r.slug,
      kind: r.kind,
      status: r.status,
      nome: c?.blocks?.name ?? r.slug.replace(/-/g, ' '),
      quante: foto.length,
      copertina: foto[0]?.src ?? null,
    };
  });

  const ordinate = [...righe].sort((a, b) => a.quante - b.quante || a.slug.localeCompare(b.slug));
  const senzaFoto = ordinate.filter((r) => r.quante === 0).length;
  const pocheFoto = ordinate.filter((r) => r.quante > 0 && r.quante < 5).length;

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Foto dei tour"}
      sottotitolo={<>
          L’ordine delle foto, tour per tour. La prima è la copertina: compare nell’elenco
          della home e nelle anteprime social. {ordinate.length} tour.
        </>}
    >

      <ElencoFotoTour righe={ordinate} senzaFoto={senzaFoto} pocheFoto={pocheFoto} />
    </Guscio>
  );
}
