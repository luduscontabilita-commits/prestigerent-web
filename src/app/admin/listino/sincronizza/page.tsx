import { Button } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { SincronizzaPrezzi, type TabDaVedere } from '@/components/admin/SincronizzaPrezzi';
import { vociPerRuolo } from '@/lib/menu-admin';
import { listino } from '@/lib/regiondo-listino';
import { confronta } from '@/lib/prezzi-tab';
import { annullaSincronizzazione, sincronizzaTab } from '../azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* LE MODIFICHE DA FARE ALLE TAB PRICES, PRIMA DI FARLE.
 *
 * Per decisione della proprieta' (12/10/2026) le tab non si allineano da
 * sole: questa pagina mostra, opzione per opzione, la cifra scritta sul
 * sito e quella di Regiondo, e cambia la pagina solo quando l'admin preme
 * «Sincronizza». Solo admin (`soloGestione()`).
 *
 * Qui Regiondo si legge SEMPRE senza cache: una tabella che dice «da
 * aggiornare» su un prezzo di cinque minuti fa farebbe premere il
 * pulsante per niente. */
export default async function Sincronizza() {
  const io = await soloGestione();
  const { servizi, tour, letto } = await listino(true);

  const sb = await supabaseServer();
  const { data: storico } = await sb
    .from('prezzi_tab_storico')
    .select('tour_slug, fatto_il, importi')
    .eq('annullata', false)
    .order('fatto_il', { ascending: false });
  const ultima = new Map<string, { quando: string; importi: number }>();
  for (const s of (storico ?? []) as { tour_slug: string; fatto_il: string; importi: number }[]) {
    if (!ultima.has(s.tour_slug)) ultima.set(s.tour_slug, { quando: s.fatto_il, importi: s.importi });
  }

  const tabs: TabDaVedere[] = tour
    .map((t) => {
      const s = servizi.find((x) => x.slug === t.slug)!;
      const u = ultima.get(t.slug) ?? null;
      if (!s.varianti) {
        return { slug: t.slug, nome: t.nome, stato: 'non_abbinabile' as const, motivo: 'Regiondo non ha risposto per questo prodotto.', righe: [], ultima: u };
      }
      const c = confronta(t.prices, s.varianti);
      return {
        slug: t.slug,
        nome: t.nome,
        stato: c.stato,
        motivo: c.stato === 'non_abbinabile' ? c.motivo : null,
        righe: c.righe.map((r) => ({
          variante: r.variante,
          opzione: r.opzione,
          riga: r.importo.riga,
          sito: r.importo.valore,
          regiondo: r.nuovo,
        })),
        ultima: u,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const quando = new Date(letto).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Sincronizza tab PRICES"
      sottotitolo={`Confronto fra i prezzi scritti nella tab PRICES di ogni pagina e i prezzi di Regiondo, opzione per opzione, letti il ${quando}. Niente cambia sul sito finché non premi Sincronizza: cambiano solo le cifre, il testo della tab resta com’è.`}
      azioni={
        <Button component="a" href="/admin/listino/sincronizza/" variant="default" size="sm">
          Rileggi da Regiondo
        </Button>
      }
    >
      <SincronizzaPrezzi tabs={tabs} sincronizza={sincronizzaTab} annulla={annullaSincronizzazione} />
    </Guscio>
  );
}
