import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { fotoDi, type Blocchi } from '@/components/admin/blocchi';
import { CaricaFotoTour } from '@/components/admin/CaricaFotoTour';
import { aggiungiFoto, firmeTour } from './azioni';

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
 */
export default async function ElencoFoto() {
  const io = await soloGestione();

  const sb = await supabaseServer();
  const { data } = await sb
    .from('tours')
    .select('slug, kind, status, tour_content(locale, blocks)')
    .order('slug');

  const righe = ((data ?? []) as unknown as Riga[]).map((r) => {
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

      <div className="ad-conta">
        <div>
          <b>{ordinate.length}</b>
          <span>tour</span>
        </div>
        <div className={senzaFoto ? 'male' : 'bene'}>
          <b>{senzaFoto}</b>
          <span>senza nemmeno una foto</span>
        </div>
        <div className={pocheFoto ? 'male' : 'bene'}>
          <b>{pocheFoto}</b>
          <span>con meno di 5 foto</span>
        </div>
      </div>

      <div className="ad-tab-wrap">
        <table className="ad-tab">
          <thead>
            <tr>
              <th className="ad-col-ant">Copertina</th>
              <th>Tour</th>
              <th className="ad-col-n">Foto</th>
              <th className="ad-col-n">Carica</th>
            </tr>
          </thead>
          <tbody>
            {ordinate.map((r) => (
              <tr key={r.slug}>
                <td className="ad-col-ant">
                  <a href={`/admin/foto/${r.slug}/`}>
                    {r.copertina ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="ad-ant" src={r.copertina} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className="ad-ant ad-ant-vuota" />
                    )}
                  </a>
                </td>

                <td>
                  <a className="ad-riga-tour" href={`/admin/foto/${r.slug}/`}>
                    <strong>{r.nome}</strong>
                    <code>{r.slug}</code>
                  </a>
                  <div className="ad-tag ad-tag-neutro">
                    {r.kind && <em>{r.kind}</em>}
                    {r.status !== 'published' && <em className="ad-tag-ko">{r.status ?? 'senza stato'}</em>}
                  </div>
                </td>

                <td className="ad-col-n">
                  <span className={'ad-n' + (r.quante < 5 ? ' ko' : '')}>{r.quante}</span>
                </td>

                {/* Il caricamento sta QUI, sulla riga, e non solo dentro la
                    pagina del singolo tour: chi apre questo elenco lo apre
                    ordinato per problema, e i tour senza foto sono i primi.
                    Farlo passare dalla scheda vorrebbe dire due clic e un
                    ritorno indietro per ognuno. */}
                <td className="ad-col-n">
                  <CaricaFotoTour
                    slug={r.slug}
                    nome={r.nome}
                    firme={firmeTour}
                    aggiungi={aggiungiFoto}
                    compatto
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Guscio>
  );
}
