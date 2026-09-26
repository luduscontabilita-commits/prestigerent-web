'use client';

import { useState, useTransition } from 'react';
import { CRITERI, type Criterio } from '@/lib/gallery-tag';

/* IL REGISTRO DELLE PAGINE.
 *
 * ── LO STATO E' CALCOLATO CON LA FUNZIONE DEL SITO ─────────────────────
 * «Visibile», «Nascosta — sotto soglia 2/3» arrivano da `decidi()` e
 * `spiega()` in gallery-tag.ts, cioe' dalla stessa funzione che la pagina
 * usa per decidere se disegnarsi. Non da un `if` scritto qui: se fossero
 * due, il pannello direbbe «Visibile» su una pagina che non mostra niente,
 * e nessuno saprebbe quale dei due crede.
 *
 * ── PERCHE' TUTTE E 103 E NON SOLO QUELLE CON FOTO ─────────────────────
 * Perche' la domanda vera e' «dove potrei metterle»: un elenco delle sole
 * pagine che ce l'hanno gia' non risponde. Le pagine con zero foto stanno
 * in fondo e si vede subito.
 */

export type RigaPagina = {
  id: string;
  key: string;
  label: string;
  path: string;
  quante: number;
  stato: string;
  visibile: boolean;
  senzaTour: boolean;
  orfana: boolean;
  custom_title: string | null;
  custom_subtitle: string | null;
  visibility_override: 'inherit' | 'on' | 'off';
  min_images_override: number | null;
  sort_override: Criterio | null;
};

type Esito = { ok: boolean; errore?: string };

const NOME_CRITERIO: Record<Criterio, string> = {
  manual: 'Manuale',
  newest: 'Più recenti prima',
  oldest: 'Più vecchie prima',
  daily_random: 'Casuale del giorno',
  alternate: 'Alternata verticale/orizzontale',
};

const NOME_VISIBILITA = {
  inherit: 'Segue l’interruttore generale',
  on: 'Sempre accesa (anche a interruttore spento)',
  off: 'Spenta su questa pagina',
} as const;

export function GalleryPagine({
  righe,
  sincronizza,
  salva,
}: {
  righe: RigaPagina[];
  sincronizza: () => Promise<{ ok: boolean; errore?: string; aggiunte?: number; aggiornate?: number; orfane?: number; perTipo?: Record<string, number> }>;
  salva: (
    id: string,
    d: {
      custom_title: string | null;
      custom_subtitle: string | null;
      visibility_override: 'inherit' | 'on' | 'off';
      min_images_override: number | null;
      sort_override: Criterio | null;
    }
  ) => Promise<Esito>;
}) {
  const [dati, setDati] = useState(righe);
  const [aperta, setAperta] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();
  const [cerca, setCerca] = useState('');

  const filtrate = dati.filter((r) => {
    const q = cerca.trim().toLowerCase();
    return !q || r.label.toLowerCase().includes(q) || r.path.toLowerCase().includes(q);
  });

  const cambia = (id: string, patch: Partial<RigaPagina>) =>
    setDati((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="g-pagine">
      {messaggio && <p className={messaggio.ok ? 'ad-ok' : 'ad-err'}>{messaggio.testo}</p>}

      <div className="g-pagine-testa">
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            avvia(async () => {
              setMessaggio(null);
              const r = await sincronizza();
              if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
              const perTipo = Object.entries(r.perTipo ?? {}).map(([t, n]) => `${n} ${t}`).join(', ');
              setMessaggio({
                ok: true,
                testo: `Registro aggiornato: ${r.aggiunte} nuove, ${r.aggiornate} già c’erano, ${r.orfane} orfane. (${perTipo}). Ricarica per vedere l’elenco aggiornato.`,
              });
            })
          }
        >
          Sincronizza pagine
        </button>
        <span className="gc-aiuto">
          Rilegge le pagine dal codice e dal catalogo. Non cancella mai una riga: una
          pagina che non esiste più diventa «orfana» e resta, con le sue foto.
        </span>
        <input
          type="search"
          placeholder="cerca pagina…"
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      </div>

      <div className="ad-tab-wrap">
        <table className="ad-tab g-tab">
          <thead>
            <tr>
              <th>Pagina</th>
              <th className="ad-col-n">Foto</th>
              <th>Stato</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrate.map((r) => (
              <>
                <tr key={r.id} className={r.orfana ? 'g-orfana' : undefined}>
                  <td>
                    <strong>{r.label}</strong>
                    <br />
                    <code>{r.path}</code>
                    {r.orfana && <em className="ad-tag-ko"> orfana: non è più nel codice</em>}
                    {r.senzaTour && <em className="ad-tag-ko"> nessun tour dentro</em>}
                  </td>
                  <td className="ad-col-n">
                    <span className={'ad-n' + (r.quante ? '' : ' ko')}>{r.quante}</span>
                  </td>
                  <td className={r.visibile ? 'g-si' : 'g-nascosta'}>{r.stato}</td>
                  <td>
                    <button type="button" className="gc-mini" onClick={() => setAperta(aperta === r.id ? null : r.id)}>
                      {aperta === r.id ? 'Chiudi' : 'Modifica'}
                    </button>{' '}
                    <a className="gc-mini" href={r.path} target="_blank" rel="noreferrer">Apri pagina</a>
                  </td>
                </tr>

                {aperta === r.id && (
                  <tr key={r.id + '-mod'}>
                    <td colSpan={4} className="g-mod">
                      <div className="g-mod-griglia">
                        <label>
                          Titolo solo per questa pagina
                          <input
                            type="text"
                            value={r.custom_title ?? ''}
                            placeholder="vuoto = usa il titolo predefinito"
                            onChange={(e) => cambia(r.id, { custom_title: e.target.value })}
                          />
                          <span className="gc-aiuto">
                            Fra asterischi la parola in corsivo: <code>Moments from the *road*</code>
                          </span>
                        </label>

                        <label>
                          Sottotitolo solo per questa pagina
                          <input
                            type="text"
                            value={r.custom_subtitle ?? ''}
                            placeholder="vuoto = usa il sottotitolo predefinito"
                            onChange={(e) => cambia(r.id, { custom_subtitle: e.target.value })}
                          />
                        </label>

                        <label>
                          Visibilità
                          <select
                            value={r.visibility_override}
                            onChange={(e) => cambia(r.id, { visibility_override: e.target.value as RigaPagina['visibility_override'] })}
                          >
                            {(Object.keys(NOME_VISIBILITA) as (keyof typeof NOME_VISIBILITA)[]).map((k) => (
                              <option key={k} value={k}>{NOME_VISIBILITA[k]}</option>
                            ))}
                          </select>
                          <span className="gc-aiuto">
                            «Sempre accesa» serve a provare la gallery su una pagina sola
                            mentre il resto del sito non mostra niente.
                          </span>
                        </label>

                        <label>
                          Minimo foto per questa pagina
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={r.min_images_override ?? ''}
                            placeholder="vuoto = soglia generale"
                            onChange={(e) =>
                              cambia(r.id, {
                                min_images_override: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        </label>

                        <label>
                          Ordinamento di questa pagina
                          <select
                            value={r.sort_override ?? ''}
                            onChange={(e) =>
                              cambia(r.id, { sort_override: e.target.value === '' ? null : (e.target.value as Criterio) })
                            }
                          >
                            <option value="">Usa l’ordinamento predefinito</option>
                            {CRITERI.map((c) => (
                              <option key={c} value={c}>{NOME_CRITERIO[c]}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={inCorso}
                        onClick={() =>
                          avvia(async () => {
                            const e = await salva(r.id, {
                              custom_title: r.custom_title,
                              custom_subtitle: r.custom_subtitle,
                              visibility_override: r.visibility_override,
                              min_images_override: r.min_images_override,
                              sort_override: r.sort_override,
                            });
                            setMessaggio(
                              e.ok
                                ? { ok: true, testo: `«${r.label}» salvata. La pagina si aggiorna in pochi secondi.` }
                                : { ok: false, testo: e.errore ?? 'Non salvata.' }
                            );
                            if (e.ok) setAperta(null);
                          })
                        }
                      >
                        Salva
                      </button>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
