'use client';

import { useMemo, useState } from 'react';

export type Riga = {
  percorso: string;
  vecchioTitle: string | null;
  vecchiaDescr: string | null;
  nuovoTitle: string | null;
  nuovaDescr: string | null;
  generato: boolean;
};

/* LA TABELLA.
 *
 * Le soglie non sono opinioni: Google mostra circa 60 caratteri di title
 * e circa 155 di description, e quello che avanza lo taglia. Un title
 * tagliato perde la FINE, che e' dove sta il luogo -- "...from
 * Civitavecchia (Rome) Port" diventa "...from Civita".
 *
 * I difetti si contano, non si descrivono: chi apre questa pagina vuole
 * sapere quante righe restano da sistemare, non leggere un giudizio.
 */
const T_MAX = 60;
const D_MAX = 155;
const D_MIN = 80;

type Difetto = 'lungo' | 'corto' | 'manca' | 'doppione';

function difettiDi(
  title: string | null,
  descr: string | null,
  titleDoppio: boolean
): Difetto[] {
  const d: Difetto[] = [];
  if (!title) d.push('manca');
  else if (title.length > T_MAX) d.push('lungo');
  else if (title.length < 30) d.push('corto');
  if (!descr) d.push('manca');
  else if (descr.length > D_MAX) d.push('lungo');
  else if (descr.length < D_MIN) d.push('corto');
  if (titleDoppio) d.push('doppione');
  return [...new Set(d)];
}

const ETICHETTA: Record<Difetto, string> = {
  lungo: 'troppo lungo',
  corto: 'troppo corto',
  manca: 'manca',
  doppione: 'title duplicato',
};

export function TabellaSeo({ righe }: { righe: Riga[] }) {
  const [cerca, setCerca] = useState('');
  const [filtro, setFiltro] = useState<'tutte' | 'da-fare' | 'rotte'>('tutte');

  /* I title duplicati si trovano solo guardando TUTTE le righe insieme,
     non riga per riga: due pagine con lo stesso title si tolgono
     posizioni a vicenda, e nessuna delle due lo sa. */
  const doppiVecchi = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of righe) if (r.vecchioTitle) c.set(r.vecchioTitle, (c.get(r.vecchioTitle) ?? 0) + 1);
    return new Set([...c].filter(([, n]) => n > 1).map(([t]) => t));
  }, [righe]);

  const doppiNuovi = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of righe) if (r.nuovoTitle) c.set(r.nuovoTitle, (c.get(r.nuovoTitle) ?? 0) + 1);
    return new Set([...c].filter(([, n]) => n > 1).map(([t]) => t));
  }, [righe]);

  const conDifetti = useMemo(
    () =>
      righe.map((r) => ({
        ...r,
        primaDif: difettiDi(r.vecchioTitle, r.vecchiaDescr, doppiVecchi.has(r.vecchioTitle ?? '')),
        dopoDif: difettiDi(r.nuovoTitle, r.nuovaDescr, doppiNuovi.has(r.nuovoTitle ?? '')),
      })),
    [righe, doppiVecchi, doppiNuovi]
  );

  const visibili = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return conDifetti.filter((r) => {
      if (filtro === 'da-fare' && r.nuovoTitle) return false;
      if (filtro === 'rotte' && r.primaDif.length === 0) return false;
      if (!q) return true;
      return (
        r.percorso.toLowerCase().includes(q) ||
        (r.vecchioTitle ?? '').toLowerCase().includes(q) ||
        (r.nuovoTitle ?? '').toLowerCase().includes(q)
      );
    });
  }, [conDifetti, cerca, filtro]);

  const conta = useMemo(() => {
    const c = { totale: righe.length, prima: 0, dopo: 0, daFare: 0, aMano: 0 };
    for (const r of conDifetti) {
      if (r.primaDif.length) c.prima++;
      if (r.dopoDif.length) c.dopo++;
      if (!r.nuovoTitle) c.daFare++;
      if (!r.generato) c.aMano++;
    }
    return c;
  }, [conDifetti, righe.length]);

  return (
    <>
      <div className="ad-conta">
        <div>
          <b>{conta.totale}</b>
          <span>pagine</span>
        </div>
        <div className="male">
          <b>{conta.prima}</b>
          <span>con difetti oggi su WordPress</span>
        </div>
        <div className={conta.dopo ? 'male' : 'bene'}>
          <b>{conta.dopo}</b>
          <span>con difetti dopo la correzione</span>
        </div>
        <div className={conta.daFare ? 'male' : 'bene'}>
          <b>{conta.daFare}</b>
          <span>ancora da scrivere</span>
        </div>
        <div>
          <b>{conta.aMano}</b>
          <span>corrette a mano</span>
        </div>
      </div>

      <div className="ad-barra">
        <input
          type="search"
          placeholder="Cerca un percorso o un title…"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
        {(['tutte', 'rotte', 'da-fare'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filtro === f ? 'on' : ''}
            onClick={() => setFiltro(f)}
          >
            {f === 'tutte' ? 'Tutte' : f === 'rotte' ? 'Rotte oggi' : 'Da scrivere'}
          </button>
        ))}
        <span className="ad-quante">{visibili.length} righe</span>
      </div>

      <div className="ad-tab-wrap">
        <table className="ad-tab">
          <thead>
            <tr>
              <th>Pagina</th>
              <th>Oggi su WordPress</th>
              <th>Proposta</th>
            </tr>
          </thead>
          <tbody>
            {visibili.map((r) => (
              <tr key={r.percorso}>
                <td className="ad-perc">
                  <a href={'https://prestigerent-web.vercel.app' + r.percorso} target="_blank" rel="noopener">
                    {r.percorso}
                  </a>
                  {!r.generato && <em className="ad-mano">corretta a mano</em>}
                </td>

                <td className="ad-prima">
                  <Cella title={r.vecchioTitle} descr={r.vecchiaDescr} difetti={r.primaDif} />
                </td>

                <td className="ad-dopo">
                  {r.nuovoTitle ? (
                    <Cella title={r.nuovoTitle} descr={r.nuovaDescr} difetti={r.dopoDif} />
                  ) : (
                    <span className="ad-vuoto">da scrivere</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cella({
  title,
  descr,
  difetti,
}: {
  title: string | null;
  descr: string | null;
  difetti: Difetto[];
}) {
  return (
    <>
      <div className="ad-t">
        {title || <i>manca</i>}
        {title && (
          <span className={'ad-n' + (title.length > T_MAX ? ' ko' : '')}>{title.length}</span>
        )}
      </div>
      <div className="ad-d">
        {descr || <i>manca</i>}
        {descr && (
          <span className={'ad-n' + (descr.length > D_MAX || descr.length < D_MIN ? ' ko' : '')}>
            {descr.length}
          </span>
        )}
      </div>
      {difetti.length > 0 && (
        <div className="ad-tag">
          {difetti.map((d) => (
            <em key={d}>{ETICHETTA[d]}</em>
          ))}
        </div>
      )}
    </>
  );
}
