'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { Pagina } from './GalleryCaricatore';

/* L'ARCHIVIO DELLE FOTO, con i filtri e le azioni.
 *
 * ── PERCHE' I FILTRI SONO LINK E NON PULSANTI ────────────────────────
 * Passano dall'indirizzo (`?stato=nascosta`). Tre conseguenze pratiche:
 * il filtro si puo' mandare a qualcuno, il tasto «indietro» del browser
 * funziona come uno si aspetta, e la pagina resta renderizzata dal
 * server -- niente elenco di centinaia di foto trascinato nel browser
 * per essere filtrato li'.
 *
 * ── UNA GRIGLIA, NON UNA TABELLA ─────────────────────────────────────
 * Quello che si cerca qui e' UNA FOTO: la si riconosce guardandola, non
 * leggendo una riga. Le informazioni stanno sotto la miniatura, e le
 * azioni compaiono su ogni scheda -- non dietro a un menu, perche' su un
 * telefono un menu a comparsa e' un gesto in piu' per ogni foto.
 */

export type FotoAdmin = {
  id: string;
  alt: string;
  caption: string | null;
  stato: 'in_attesa' | 'approvata' | 'rifiutata' | 'nascosta';
  motivo: string | null;
  larghezza: number;
  altezza: number;
  colore: string | null;
  anteprima: string | null;
  caricata: string;
  scattata: string | null;
  chi: string | null;
  tag: { key: string; label: string }[];
};

type Esito = { ok: boolean; errore?: string };

const NOME_STATO: Record<FotoAdmin['stato'], string> = {
  approvata: 'sul sito',
  nascosta: 'nascosta',
  in_attesa: 'da approvare',
  rifiutata: 'respinta',
};

export function TutteLeFoto({
  foto,
  pagine,
  statoAttivo,
  paginaAttiva,
  conteggi,
  cambiaVisibilita,
  elimina,
  aggiornaFoto,
}: {
  foto: FotoAdmin[];
  pagine: Pagina[];
  statoAttivo: string;
  paginaAttiva: string;
  conteggi: Record<string, number>;
  cambiaVisibilita: (id: string, nascondi: boolean) => Promise<Esito>;
  elimina: (id: string) => Promise<Esito>;
  aggiornaFoto: (
    id: string,
    d: { alt: string; caption: string | null; tag: string[] }
  ) => Promise<Esito>;
}) {
  const [lista, setLista] = useState(foto);
  const [apre, setApre] = useState<string | null>(null);
  const [modifica, setModifica] = useState<string | null>(null);
  const [bozza, setBozza] = useState({ alt: '', caption: '', tag: [] as string[] });
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const indirizzo = (s: string, p: string) => {
    const q = new URLSearchParams();
    if (s) q.set('stato', s);
    if (p) q.set('pagina', p);
    const t = q.toString();
    return '/admin/gallery/tutte/' + (t ? `?${t}` : '');
  };

  const FILTRI: { chiave: string; testo: string }[] = [
    { chiave: '', testo: 'Tutte' },
    { chiave: 'approvata', testo: `Sul sito (${conteggi.approvata ?? 0})` },
    { chiave: 'nascosta', testo: `Nascoste (${conteggi.nascosta ?? 0})` },
    { chiave: 'in_attesa', testo: `Da approvare (${conteggi.in_attesa ?? 0})` },
    { chiave: 'rifiutata', testo: `Respinte (${conteggi.rifiutata ?? 0})` },
  ];

  return (
    <div className="tf">
      {messaggio && <p className={messaggio.ok ? 'ad-ok' : 'ad-err'}>{messaggio.testo}</p>}

      <div className="tf-filtri">
        <div className="g-schede">
          {FILTRI.map((f) => (
            <Link
              key={f.chiave || 'tutte'}
              href={indirizzo(f.chiave, paginaAttiva)}
              className={statoAttivo === f.chiave ? 'attiva' : ''}
            >
              {f.testo}
            </Link>
          ))}
        </div>

        <label className="tf-pagina">
          Pagina
          {/* Un <select> e non una lista di link: le pagine sono 103, e
              centotré link non sono un filtro, sono un muro. */}
          <select
            value={paginaAttiva}
            onChange={(e) => {
              window.location.href = indirizzo(statoAttivo, e.target.value);
            }}
          >
            <option value="">tutte le pagine</option>
            {pagine.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>

      {!lista.length && (
        <p className="ad-ok">
          Nessuna foto con questo filtro.{' '}
          {(statoAttivo || paginaAttiva) && <Link href="/admin/gallery/tutte/">Togli i filtri</Link>}
        </p>
      )}

      <div className="tf-griglia">
        {lista.map((f) => {
          const inMod = modifica === f.id;
          return (
            <article className={'tf-card stato-' + f.stato} key={f.id}>
              <button
                type="button"
                className="tf-foto"
                style={{ background: f.colore ?? undefined }}
                onClick={() => setApre(apre === f.id ? null : f.id)}
                aria-label={apre === f.id ? 'Chiudi l’anteprima grande' : 'Apri l’anteprima grande'}
              >
                {f.anteprima ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.anteprima} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="g-scaduta">Anteprima scaduta: ricarica</span>
                )}
                <span className={'tf-bollo ' + f.stato}>{NOME_STATO[f.stato]}</span>
              </button>

              <div className="tf-dati">
                {inMod ? (
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
                    <div className="tf-azioni">
                      <button
                        type="button"
                        disabled={inCorso}
                        onClick={() =>
                          avvia(async () => {
                            const r = await aggiornaFoto(f.id, {
                              alt: bozza.alt,
                              caption: bozza.caption || null,
                              tag: bozza.tag,
                            });
                            if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non salvata.' }); return; }
                            setLista((l) =>
                              l.map((x) =>
                                x.id === f.id
                                  ? {
                                      ...x,
                                      alt: bozza.alt,
                                      caption: bozza.caption || null,
                                      tag: pagine.filter((p) => bozza.tag.includes(p.key)),
                                    }
                                  : x
                              )
                            );
                            setModifica(null);
                            setMessaggio({ ok: true, testo: 'Salvata.' });
                          })
                        }
                      >
                        Salva
                      </button>
                      <button type="button" className="g-annulla" onClick={() => setModifica(null)}>
                        Annulla
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="tf-alt">{f.alt}</p>
                    {f.caption && <p className="g-did">{f.caption}</p>}
                    <p className="tf-meta">
                      {f.larghezza}×{f.altezza}
                      {' · '}
                      {f.chi ?? 'caricata prima che ci fossero gli utenti'}
                      {' · '}
                      {new Date(f.caricata).toLocaleDateString('it-IT')}
                    </p>
                    <p className="g-tag">
                      {f.tag.length ? (
                        f.tag.map((t) => <span key={t.key}>{t.label}</span>)
                      ) : (
                        <i>nessuna pagina: non si vede da nessuna parte</i>
                      )}
                    </p>
                    {f.stato === 'rifiutata' && f.motivo && (
                      <p className="ad-err g-motivo">Respinta: {f.motivo}</p>
                    )}

                    <div className="tf-azioni">
                      <button
                        type="button"
                        className="g-corr"
                        onClick={() => {
                          setModifica(f.id);
                          setBozza({
                            alt: f.alt,
                            caption: f.caption ?? '',
                            tag: f.tag.map((t) => t.key),
                          });
                        }}
                      >
                        Correggi
                      </button>

                      {(f.stato === 'approvata' || f.stato === 'nascosta') && (
                        <button
                          type="button"
                          disabled={inCorso}
                          onClick={() =>
                            avvia(async () => {
                              const nascondi = f.stato === 'approvata';
                              const r = await cambiaVisibilita(f.id, nascondi);
                              if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                              setLista((l) =>
                                l.map((x) =>
                                  x.id === f.id ? { ...x, stato: nascondi ? 'nascosta' : 'approvata' } : x
                                )
                              );
                              setMessaggio({
                                ok: true,
                                testo: nascondi
                                  ? 'Nascosta dal sito. Il file resta: si può rimettere quando vuoi.'
                                  : 'Di nuovo sul sito.',
                              });
                            })
                          }
                        >
                          {f.stato === 'approvata' ? 'Nascondi dal sito' : 'Rimetti sul sito'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="g-no"
                        disabled={inCorso}
                        onClick={() => {
                          /* La conferma c'e' perche' questa e' l'unica
                             azione del pannello che non si annulla: va via
                             la riga E il file dallo storage. */
                          if (!window.confirm(`Eliminare «${f.alt}»? Il file viene cancellato e non si recupera.`)) return;
                          avvia(async () => {
                            const r = await elimina(f.id);
                            if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                            setLista((l) => l.filter((x) => x.id !== f.id));
                            setMessaggio({ ok: true, testo: 'Eliminata.' });
                          });
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* L'anteprima grande, per giudicare una foto invece di
                  indovinarla da una miniatura. */}
              {apre === f.id && f.anteprima && (
                <div className="tf-grande" onClick={() => setApre(null)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.anteprima} alt={f.alt} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
