import { FLOTTA, impiegoDi, type ModificaTesto } from '@/lib/flotta';
import { modificheFlotta } from '@/lib/flotta-testi';
import { type Lingua } from '@/lib/partners-testi';
import { tourDelListino } from '@/lib/regiondo-listino';
import { sezioneDi, type Servizio } from '@/lib/listino';
import { unitaDi } from '@/lib/prezzi';
import { FlottaRighe, type TourDelMezzo } from './FlottaRighe';

/* LA FLOTTA, i dati: i tour di ogni mezzo e i testi modificati
 * dall'admin. Le righe le disegna FlottaRighe (client), la stessa che
 * nel pannello rende i testi cliccabili (src/components/admin/
 * FlottaModifica.tsx).
 *
 * Server Component: nessun componente Mantine qui, solo dati
 * serializzabili verso il client (regola del confine in CLAUDE.md). */

export async function datiFlotta(): Promise<{ usati: Record<string, TourDelMezzo[]>; modifiche: ModificaTesto[] }> {
  /* I tour di ogni mezzo si calcolano dal catalogo, senza chiedere i
     prezzi a Regiondo: qui servono solo nome, sezione e unita'. */
  const [tour, modifiche] = await Promise.all([tourDelListino(), modificheFlotta()]);
  const servizi: Servizio[] = tour.map((t) => ({
    slug: t.slug,
    nome: t.nome,
    sku: t.sku,
    ...sezioneDi(t.categorie),
    unita: unitaDi({ PRICES: t.prices }, t.kind),
    varianti: null,
  }));
  const usati: Record<string, TourDelMezzo[]> = {};
  for (const m of FLOTTA) {
    /* Solo i tour che la pagina mostra, cioe' quelli del minibus: gli 83
       delle auto sarebbero peso inutile. E solo slug e nome: lo SKU non
       deve finire nella pagina del partner. */
    usati[m.chiave] = m.gruppi
      ? impiegoDi(m, servizi)
          .map((s) => ({ slug: s.slug, nome: s.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome))
      : [];
  }
  return { usati, modifiche };
}

export async function FlottaVista({ lingua }: { lingua: Lingua }) {
  const { usati, modifiche } = await datiFlotta();
  return <FlottaRighe lingua={lingua} modifiche={modifiche} usati={usati} />;
}
