/* IL PANNELLO. Una pagina sola, si legge in trenta secondi.
 *
 * ── COSA NON FA, ED E' UNA SCELTA ───────────────────────────────────
 * Niente grafici, niente filtri, niente menu, niente intervalli da
 * scegliere. Trenta giorni, sempre. Ogni cosa in piu' e' una cosa da
 * decidere prima di poter leggere un numero — e un pannello che si deve
 * configurare non lo apre nessuno.
 *
 * ── OGNI NUMERO PORTA LA SUA DATA ───────────────────────────────────
 * I dati vengono da una fotografia scritta dal lavoro notturno. Se una
 * fonte era giu', quella sezione resta di ieri: e lo dice, invece di far
 * finta di essere fresca.
 *
 * ── E' CHIUSA ───────────────────────────────────────────────────────
 * Stessa guardia del pannello /admin/: chi non ha fatto l'accesso viene
 * mandato alla pagina di entrata. Qui dentro ci sono incassi e spesa
 * pubblicitaria.
 */
import { redirect } from 'next/navigation';
import { chiSono } from '@/lib/auth';
import { leggiTutto } from '@/lib/pannello';
import type { Cassa, Spesa, Imbuto, Prodotto, Campagna, Pubblico, Potenziale } from '@/lib/pannello';
import { Strumenti } from '@/components/michele/Strumenti';
import '@/styles/michele.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n);

function quando(iso?: string) {
  if (!iso) return 'mai';
  const ore = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (ore < 1) return 'adesso';
  if (ore < 24) return `${Math.round(ore)} ore fa`;
  return `${Math.round(ore / 24)} giorni fa`;
}

/** Un riquadro. Il titolo porta sempre l'eta' del dato. */
function Riq({ titolo, eta, largo, children }:
  { titolo: string; eta?: string; largo?: boolean; children: React.ReactNode }) {
  return (
    <section className={'mi-riq' + (largo ? ' mi-largo' : '')}>
      <h2>
        {titolo}
        <em>{quando(eta)}</em>
      </h2>
      {children}
    </section>
  );
}

export default async function Pannello() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');

  const f = await leggiTutto();
  const cassa = f.cassa?.dati as Cassa | undefined;
  const spesa = f.spesa?.dati as Spesa | undefined;
  const imbuto = f.imbuto?.dati as Imbuto | undefined;
  const prodotti = f.prodotti?.dati as Prodotto[] | undefined;
  const campagne = f.campagne?.dati as Campagna[] | undefined;
  const pubblici = f.pubblici?.dati as Pubblico[] | undefined;
  const potenziale = f.potenziale?.dati as Potenziale[] | undefined;

  const speso = (spesa?.google ?? 0) + (spesa?.meta ?? 0);
  const reso = speso && cassa ? cassa.diretti.incasso / speso : 0;

  return (
    <main className="mi">
      <header className="mi-testa">
        <h1>Prestige Rent</h1>
        <p>Ultimi 30 giorni · aggiornato {quando(f.cassa?.aggiornato)}</p>
      </header>

      {!cassa && !spesa && (
        <p className="mi-vuoto">
          La fotografia non e&rsquo; ancora stata scritta. Si riempie chiamando
          una volta <code>/api/pannello/?chiave=…</code>, poi ci pensa il lavoro
          notturno.
        </p>
      )}

      {/* ── I TRE NUMERI CHE CONTANO ───────────────────────────────── */}
      <div className="mi-tre">
        <div>
          <span className="mi-eti">incasso diretto</span>
          <strong>&euro;{euro(cassa?.diretti.incasso ?? 0)}</strong>
          <em>{cassa?.diretti.ordini ?? 0} ordini</em>
        </div>
        <div>
          <span className="mi-eti">spesa pubblicitaria</span>
          <strong>&euro;{euro(speso)}</strong>
          <em>Google &euro;{euro(spesa?.google ?? 0)} · Meta &euro;{euro(spesa?.meta ?? 0)}</em>
        </div>
        <div>
          <span className="mi-eti">rapporto</span>
          <strong>{reso ? reso.toFixed(1) + ' : 1' : '—'}</strong>
          <em>incassato per ogni euro speso</em>
        </div>
      </div>

      <Strumenti />

      {/* ── L'IMBUTO ───────────────────────────────────────────────── */}
      <Riq titolo="Dove si fermano" eta={f.imbuto?.aggiornato} largo>
        {imbuto ? (
          <ol className="mi-imbuto">
            {imbuto.passi.map((p, i) => {
              const primo = imbuto.passi[0]?.quanti || 0;
              const perc = primo ? Math.round((p.quanti / primo) * 100) : 0;
              return (
                <li key={p.nome}>
                  <span className="mi-passo">{p.nome}</span>
                  <span className="mi-barra"><i style={{ width: `${perc}%` }} /></span>
                  <b>{euro(p.quanti)}</b>
                  {i > 0 && <em>{perc}%</em>}
                </li>
              );
            })}
          </ol>
        ) : <p className="mi-no">non ancora letto</p>}
      </Riq>

      {/* ── I PRODOTTI ─────────────────────────────────────────────── */}
      <Riq titolo="Cosa vende, e quanto poco direttamente" eta={f.prodotti?.aggiornato} largo>
        {prodotti?.length ? (
          <table className="mi-tab">
            <thead><tr><th>prodotto</th><th>ordini</th><th>incasso</th><th>diretti</th></tr></thead>
            <tbody>
              {prodotti.slice(0, 8).map((p) => {
                const q = p.ordini ? Math.round((p.diretti / p.ordini) * 100) : 0;
                return (
                  <tr key={p.nome}>
                    <td>{p.nome}</td>
                    <td className="mi-n">{euro(p.ordini)}</td>
                    <td className="mi-n">&euro;{euro(p.incasso)}</td>
                    <td className={'mi-n' + (q < 10 ? ' mi-male' : '')}>{q}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="mi-no">non ancora letto</p>}
      </Riq>

      {/* ── LE CAMPAGNE ────────────────────────────────────────────── */}
      <Riq titolo="Campagne" eta={f.campagne?.aggiornato} largo>
        {campagne?.length ? (
          <table className="mi-tab">
            <thead><tr><th>campagna</th><th>spesa</th><th>clic</th><th>CPC</th><th>conv.</th></tr></thead>
            <tbody>
              {campagne.map((c) => (
                <tr key={c.nome} className={c.stato !== 'ENABLED' ? 'mi-spenta' : ''}>
                  <td>{c.nome}</td>
                  <td className="mi-n">&euro;{euro(c.spesa)}</td>
                  <td className="mi-n">{euro(c.clic)}</td>
                  <td className="mi-n">&euro;{c.cpc.toFixed(2)}</td>
                  <td className={'mi-n' + (c.spesa > 300 && !c.conversioni ? ' mi-male' : '')}>
                    {c.conversioni.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mi-no">non ancora letto</p>}
      </Riq>

      {/* ── IL POTENZIALE ──────────────────────────────────────────── */}
      <Riq titolo="Potenziale: cercate, non comprate, senza guerra di offerte"
           eta={f.potenziale?.aggiornato} largo>
        {potenziale?.length ? (
          <table className="mi-tab">
            <thead><tr><th>parola</th><th>ricerche</th><th>concorrenza</th><th>CPC</th></tr></thead>
            <tbody>
              {potenziale.slice(0, 12).map((p) => (
                <tr key={p.parola}>
                  <td>{p.parola}</td>
                  <td className="mi-n">{euro(p.ricerche)}</td>
                  <td className="mi-n">{p.concorrenza === 'LOW' ? 'bassa' : p.concorrenza === 'MEDIUM' ? 'media' : p.concorrenza}</td>
                  <td className="mi-n">&euro;{p.cpc.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mi-no">non ancora letto</p>}
      </Riq>

      {/* ── I PUBBLICI ─────────────────────────────────────────────── */}
      <Riq titolo="Pubblici" eta={f.pubblici?.aggiornato} largo>
        {pubblici?.length ? (
          <table className="mi-tab">
            <thead><tr><th>pubblico</th><th>dove</th><th>quanti</th><th>usato da</th></tr></thead>
            <tbody>
              {pubblici.map((p) => (
                <tr key={p.dove + p.nome}>
                  <td>{p.nome}</td>
                  <td>{p.dove === 'google' ? 'Google' : 'Meta'}</td>
                  <td className="mi-n">{p.quanti ? euro(p.quanti) : '—'}</td>
                  <td className={'mi-n' + (p.usatoDa === 0 ? ' mi-male' : '')}>
                    {p.usatoDa === 0 ? 'nessuno' : p.usatoDa + ' campagne'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mi-no">non ancora letto</p>}
      </Riq>

      {/* ── I CANALI ───────────────────────────────────────────────── */}
      <Riq titolo="Da dove arrivano gli ordini" eta={f.cassa?.aggiornato}>
        {cassa ? (
          <table className="mi-tab">
            <tbody>
              {cassa.perCanale.map((c) => (
                <tr key={c.canale}>
                  <td>{c.canale}</td>
                  <td className="mi-n">{euro(c.ordini)}</td>
                  <td className="mi-n">&euro;{euro(c.incasso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mi-no">non ancora letto</p>}
      </Riq>
    </main>
  );
}
