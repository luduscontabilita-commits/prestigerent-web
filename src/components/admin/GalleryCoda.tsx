'use client';

import { useState, useTransition } from 'react';
import type { Pagina } from './GalleryCaricatore';

/* LA CODA DA APPROVARE.
 *
 * ── COSA SI APPROVA ────────────────────────────────────────────────────
 * La foto INSIEME al suo alt, alla didascalia e alle sue pagine. Un tag
 * messo da una guida arriva sul sito solo con l'approvazione: se si
 * approvasse solo l'immagine, una foto giusta finirebbe su una pagina
 * sbagliata senza che nessuno l'abbia deciso.
 *
 * ── PERCHE' «CORREGGI E APPROVA» E NON SOLO «RIMANDA INDIETRO» ─────────
 * Nove volte su dieci il problema e' l'alt scritto in italiano o una
 * pagina di troppo. Rimandare indietro per quello vuol dire far rifare il
 * giro a una persona che e' in mezzo al lavoro, per una riga che qui si
 * cambia in cinque secondi. Il rifiuto resta per le foto che non vanno
 * bene come foto.
 *
 * ── LE ANTEPRIME SCADONO ───────────────────────────────────────────────
 * Sono indirizzi firmati validi dieci minuti, perche' le foto in attesa
 * stanno in un bucket privato e non hanno nessun indirizzo pubblico. Se la
 * pagina resta aperta piu' a lungo le immagini smettono di comparire: si
 * ricarica e tornano. E' il prezzo del fatto che una foto non approvata non
 * sia raggiungibile da nessuno.
 */

export type InCoda = {
  id: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  colore: string | null;
  anteprima: string | null;
  caricata: string;
  scattata: string | null;
  chi: string;
  tag: string[];
  avvisi: string[];
};

type Esito = { ok: boolean; errore?: string };

export function GalleryCoda({
  foto,
  pagine,
  approva,
  rifiuta,
  aggiornaFoto,
}: {
  foto: InCoda[];
  pagine: Pagina[];
  approva: (ids: string[]) => Promise<Esito & { quante?: number }>;
  rifiuta: (id: string, motivo: string) => Promise<Esito>;
  aggiornaFoto: (id: string, d: { alt: string; caption: string | null; tag: string[] }) => Promise<Esito>;
}) {
  const [resto, setResto] = useState(foto);
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [modifica, setModifica] = useState<string | null>(null);
  const [bozza, setBozza] = useState<{ alt: string; caption: string; tag: string[] }>({ alt: '', caption: '', tag: [] });
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const nome = (k: string) => pagine.find((p) => p.key === k)?.label ?? k;

  const togli = (ids: string[]) => {
    setResto((r) => r.filter((f) => !ids.includes(f.id)));
    setScelte((s) => {
      const n = new Set(s);
      ids.forEach((i) => n.delete(i));
      return n;
    });
  };

  const fai = (azione: () => Promise<Esito & { quante?: number }>, ids: string[], fatto: string) =>
    avvia(async () => {
      setMessaggio(null);
      const r = await azione();
      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
      togli(ids);
      setMessaggio({ ok: true, testo: r.errore ?? fatto });
    });

  if (!resto.length) {
    return (
      <p className="ad-ok">
        Niente da approvare. {messaggio?.ok && messaggio.testo}
      </p>
    );
  }

  return (
    <div className="g-coda">
      {messaggio && <p className={messaggio.ok ? 'ad-ok' : 'ad-err'}>{messaggio.testo}</p>}

      <div className="g-coda-barra">
        <label>
          <input
            type="checkbox"
            checked={scelte.size === resto.length}
            onChange={(e) => setScelte(e.target.checked ? new Set(resto.map((f) => f.id)) : new Set())}
          />{' '}
          Seleziona tutte ({resto.length})
        </label>
        <button
          type="button"
          disabled={!scelte.size || inCorso}
          onClick={() => fai(() => approva([...scelte]), [...scelte], `${scelte.size} foto approvate.`)}
        >
          Approva le {scelte.size || ''} selezionate
        </button>
      </div>

      {resto.map((f) => {
        const inModifica = modifica === f.id;
        return (
          <article className="g-riga" key={f.id}>
            <label className="g-riga-sel">
              <input
                type="checkbox"
                checked={scelte.has(f.id)}
                onChange={(e) => {
                  const n = new Set(scelte);
                  if (e.target.checked) n.add(f.id); else n.delete(f.id);
                  setScelte(n);
                }}
              />
              <span className="gc-sel-txt">Seleziona</span>
            </label>

            <div className="g-riga-foto" style={{ background: f.colore ?? undefined }}>
              {f.anteprima ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.anteprima} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="g-scaduta">
                  Anteprima scaduta: ricarica la pagina
                </span>
              )}
            </div>

            <div className="g-riga-dati">
              <p className="g-chi">
                <b>{f.chi}</b> · caricata il {new Date(f.caricata).toLocaleDateString('it-IT')}
                {' · '}
                {f.width}×{f.height} ({f.height > f.width ? 'verticale' : 'orizzontale'})
                {' · '}
                {f.scattata
                  ? `scattata il ${new Date(f.scattata).toLocaleDateString('it-IT')}`
                  : 'senza data di scatto'}
              </p>

              {f.avvisi.map((a, i) => (
                <p className="gc-avviso" key={i}>{a}</p>
              ))}

              {inModifica ? (
                <>
                  <label>
                    Descrizione in inglese
                    <input
                      type="text"
                      value={bozza.alt}
                      onChange={(e) => setBozza({ ...bozza, alt: e.target.value })}
                    />
                  </label>
                  <label>
                    Didascalia
                    <input
                      type="text"
                      value={bozza.caption}
                      onChange={(e) => setBozza({ ...bozza, caption: e.target.value })}
                    />
                  </label>
                  <div className="g-pagine-scelta">
                    {pagine.map((p) => (
                      <label key={p.key}>
                        <input
                          type="checkbox"
                          checked={bozza.tag.includes(p.key)}
                          onChange={(e) =>
                            setBozza({
                              ...bozza,
                              tag: e.target.checked
                                ? [...bozza.tag, p.key]
                                : bozza.tag.filter((k) => k !== p.key),
                            })
                          }
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="g-azioni">
                    <button
                      type="button"
                      disabled={inCorso}
                      onClick={() =>
                        avvia(async () => {
                          const r1 = await aggiornaFoto(f.id, {
                            alt: bozza.alt,
                            caption: bozza.caption || null,
                            tag: bozza.tag,
                          });
                          if (!r1.ok) { setMessaggio({ ok: false, testo: r1.errore ?? 'Non salvata.' }); return; }
                          const r2 = await approva([f.id]);
                          if (!r2.ok) { setMessaggio({ ok: false, testo: r2.errore ?? 'Corretta ma non approvata.' }); return; }
                          togli([f.id]);
                          setModifica(null);
                          setMessaggio({ ok: true, testo: 'Corretta e approvata.' });
                        })
                      }
                    >
                      Salva e approva
                    </button>
                    <button type="button" className="g-annulla" onClick={() => setModifica(null)}>
                      Annulla
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="g-alt">{f.alt}</p>
                  {f.caption && <p className="g-did">{f.caption}</p>}
                  <p className="g-tag">
                    {f.tag.length ? f.tag.map((k) => <span key={k}>{nome(k)}</span>) : <i>nessuna pagina</i>}
                  </p>

                  <div className="g-azioni">
                    <button
                      type="button"
                      disabled={inCorso}
                      onClick={() => fai(() => approva([f.id]), [f.id], 'Approvata.')}
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      className="g-corr"
                      onClick={() => {
                        setModifica(f.id);
                        setBozza({ alt: f.alt, caption: f.caption ?? '', tag: [...f.tag] });
                      }}
                    >
                      Correggi e approva
                    </button>
                  </div>

                  <details className="g-rifiuto">
                    <summary>Rimanda indietro</summary>
                    <label>
                      Motivo <b>obbligatorio</b>
                      <input
                        type="text"
                        value={motivo[f.id] ?? ''}
                        placeholder="Es.: la descrizione è in italiano, riscrivila in inglese"
                        onChange={(e) => setMotivo({ ...motivo, [f.id]: e.target.value })}
                      />
                      <span className="gc-aiuto">
                        Lo legge chi ha caricato la foto, e da lì capisce cosa cambiare.
                        Senza motivo il database rifiuta il rifiuto.
                      </span>
                    </label>
                    <button
                      type="button"
                      className="g-no"
                      disabled={inCorso || !(motivo[f.id] ?? '').trim()}
                      onClick={() => fai(() => rifiuta(f.id, motivo[f.id] ?? ''), [f.id], 'Rimandata indietro.')}
                    >
                      Rimanda indietro
                    </button>
                  </details>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
