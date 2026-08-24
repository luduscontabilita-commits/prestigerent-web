'use client';

import { useMemo, useState } from 'react';
import { SearchBar, type Partenza } from './SearchBar';
import { testo } from '@/lib/prosa';

export type SchedaTour = {
  slug: string;
  href: string;
  nome: string;
  kind: string;
  foto: string | null;
  punti: string[];
  prezzo: number | null;
  ore: number | null;
  partenza: string;
  maxOspiti: number | null;
};

const ETICHETTA: Record<string, string> = {
  small_group: 'Small group',
  private: 'Private tour',
  cruise: 'From the port',
  transfer: 'Transfer',
  other: 'Tour',
};

export function HomeTours({
  tours,
  partenze,
}: {
  tours: SchedaTour[];
  partenze: Partenza[];
}) {
  const [filtro, setFiltro] = useState<{ da: string; persone: number } | null>(null);
  const [categoria, setCategoria] = useState<string>('');

  const visibili = useMemo(() => {
    return tours.filter((t) => {
      if (categoria && t.kind !== categoria) return false;
      if (filtro?.da && t.partenza !== filtro.da) return false;
      /* Un tour privato da 8 posti non serve a chi e' in dodici: nasconderlo
         evita la telefonata "ma allora perche' me lo avete mostrato?". */
      if (filtro?.persone && t.maxOspiti && filtro.persone > t.maxOspiti) return false;
      return true;
    });
  }, [tours, filtro, categoria]);

  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tours) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  return (
    <>
      <SearchBar partenze={partenze} onCerca={setFiltro} />

      <section className="pr-sec" id="tours">
        <div className="pr-wrap wide">
          <div className="hm-cats">
            <button
              type="button"
              className="hm-cat"
              style={categoria === '' ? { borderColor: 'var(--orange)', color: 'var(--orange)' } : undefined}
              onClick={() => setCategoria('')}
            >
              All tours <b>{tours.length}</b>
            </button>
            {conteggi.map(([k, n]) => (
              <button
                key={k}
                type="button"
                className="hm-cat"
                style={categoria === k ? { borderColor: 'var(--orange)', color: 'var(--orange)' } : undefined}
                onClick={() => setCategoria(k)}
              >
                {ETICHETTA[k] ?? k} <b>{n}</b>
              </button>
            ))}
          </div>

          <div className="pr-head" style={{ marginBottom: 18 }}>
            <h2 className="pr-title">
              {visibili.length} {visibili.length === 1 ? 'tour' : 'tours'}
            </h2>
            {filtro?.da && (
              <p className="pr-lead">
                Departing from {partenze.find((p) => p.valore === filtro.da)?.etichetta}
                {filtro.persone ? ` · ${filtro.persone} guests` : ''}
              </p>
            )}
          </div>

          {visibili.length === 0 ? (
            <p className="pr-lead" style={{ textAlign: 'center' }}>
              Nothing matches that combination yet —{' '}
              <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
                message us on WhatsApp
              </a>{' '}
              and we will build the day around you.
            </p>
          ) : (
            <div className="hm-grid">
              {visibili.map((t) => (
                <a className="hm-card" href={t.href} key={t.slug}>
                  <div className="hm-card-img">
                    <span className="hm-card-tag">{ETICHETTA[t.kind] ?? t.kind}</span>
                    {t.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.foto} alt={t.nome} loading="lazy" decoding="async" />
                    )}
                    <h3 className="hm-card-name">{testo(t.nome)}</h3>
                  </div>
                  <div className="hm-card-body">
                    <div className="hm-meta">
                      {t.ore ? <span>{t.ore} hours</span> : null}
                      {t.maxOspiti ? <span>up to {t.maxOspiti} guests</span> : null}
                    </div>
                    {t.punti.length > 0 && (
                      <ul className="hm-hl">
                        {t.punti.slice(0, 3).map((p) => (
                          <li key={p}>{testo(p)}</li>
                        ))}
                      </ul>
                    )}
                    <div className="hm-price">
                      {t.prezzo != null ? (
                        <>
                          <small>from</small>
                          <b>&euro;{t.prezzo.toFixed(0)}</b>
                        </>
                      ) : (
                        <span className="ask">Price on request</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
