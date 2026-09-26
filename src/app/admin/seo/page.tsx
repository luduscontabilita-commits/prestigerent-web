import { comeSiChiama } from '@/lib/accesso';
import { Guscio, vociPerRuolo } from '@/components/admin/Guscio';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { TabellaSeo, type Riga } from '@/components/admin/TabellaSeo';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* TITLE E DESCRIPTION, UNA RIGA PER PAGINA.
 *
 * E' un gestionale, non un rapporto: si scorre, si filtra, si vede subito
 * cosa e' rotto e si corregge sul posto. Le due colonne affiancate --
 * quello che c'e' oggi su WordPress e quello che propongo -- servono a
 * decidere in un colpo d'occhio, senza aprire due schede.
 *
 * I contatori in alto sono la cosa che si guarda per prima: dicono quanto
 * lavoro resta, non quanto ne e' stato fatto.
 */
export default async function SeoPannello() {
  const io = await soloGestione();

  const sb = await supabaseServer();
  const [{ data: nuovi }, { data: vecchi }] = await Promise.all([
    sb.from('seo').select('percorso,title,description,generato,aggiornato').eq('locale', 'en'),
    sb.from('seo_wordpress').select('percorso,title,description'),
  ]);

  const mappaVecchi = new Map((vecchi ?? []).map((v) => [v.percorso, v]));
  const mappaNuovi = new Map((nuovi ?? []).map((v) => [v.percorso, v]));

  /* Tutti i percorsi conosciuti, da entrambe le parti: cosi' si vedono
     anche le pagine che esistono su WordPress e per cui non ho ancora
     scritto niente -- che sono esattamente quelle da fare. */
  const percorsi = [...new Set([...mappaVecchi.keys(), ...mappaNuovi.keys()])].sort();

  const righe: Riga[] = percorsi.map((p) => {
    const v = mappaVecchi.get(p);
    const n = mappaNuovi.get(p);
    return {
      percorso: p,
      vecchioTitle: v?.title ?? null,
      vecchiaDescr: v?.description ?? null,
      nuovoTitle: n?.title ?? null,
      nuovaDescr: n?.description ?? null,
      generato: n?.generato ?? true,
    };
  });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Title e description"}
      sottotitolo={<>
          Quello che compare su Google, pagina per pagina. A sinistra il sito attuale, a
          destra la proposta. {righe.length} pagine.
        </>}
    >

      <TabellaSeo righe={righe} />
    </Guscio>
  );
}
