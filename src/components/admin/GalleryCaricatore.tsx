'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { preparaFoto, type Preparata } from './preparaFoto';
import type { TipoTag } from '@/lib/gallery-tag';
import type { DaRegistrare, Firma } from '@/app/admin/gallery/azioni';

/* CARICARE E TAGGARE, DAL TELEFONO.
 *
 * ── COME FUNZIONA, IN ORDINE ───────────────────────────────────────────
 *  1. si scelgono le foto (trascinandole, o col pulsante che sul telefono
 *     apre la galleria o la fotocamera);
 *  2. ognuna viene preparata NEL BROWSER: data di scatto e orientamento
 *     letti dall'EXIF, rotazione applicata ai pixel, ridimensionamento a
 *     2400px, conversione in WebP. Da qui in poi i metadati non ci sono
 *     piu', GPS compreso;
 *  3. si scrive la descrizione in inglese e si scelgono le pagine;
 *  4. "Invia per approvazione" chiede gli indirizzi firmati, carica i file
 *     dritti nello storage e poi registra le righe.
 *
 * ── PERCHE' IL PULSANTE RESTA SPENTO E SI DICE PERCHE' ─────────────────
 * Si accende solo quando OGNI foto ha la descrizione e almeno una pagina.
 * Ma sopra al pulsante c'e' scritto cosa manca e a quale foto: un pulsante
 * grigio senza spiegazione e' il modo piu' sicuro di far chiudere la
 * pagina a chi sta caricando da un telefono in mezzo a una vigna.
 */

export type Pagina = { key: string; label: string; type: TipoTag; path: string };

type Scheda = {
  /** id locale, solo per React: le foto non hanno ancora un id vero */
  id: string;
  nome: string;
  anteprima: string;
  pronta: Preparata | null;
  errore: string | null;
  alt: string;
  caption: string;
  tag: string[];
  lavorando: boolean;
};

const GRUPPI: { tipo: TipoTag; titolo: string }[] = [
  { tipo: 'home', titolo: 'Home' },
  { tipo: 'cat', titolo: 'Categorie' },
  { tipo: 'port', titolo: 'Porti' },
  { tipo: 'tour', titolo: 'Tour' },
];

export function GalleryCaricatore({
  pagine,
  approvaSubito,
  chiediFirme,
  registraFoto,
}: {
  pagine: Pagina[];
  /** vero per un admin: le sue foto nascono approvate, quindi il pulsante
   *  si chiama "Pubblica" e non "Invia per approvazione" */
  approvaSubito: boolean;
  chiediFirme: (quante: number) => Promise<{ ok: boolean; errore?: string; firme?: Firma[] }>;
  registraFoto: (foto: DaRegistrare[]) => Promise<{ ok: boolean; errore?: string; quante?: number }>;
}) {
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [selezione, setSelezione] = useState<Set<string>>(new Set());
  const [cerca, setCerca] = useState('');
  const [sopra, setSopra] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [invio, avvia] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  /* ── aggiunta e preparazione ───────────────────────────────────────── */

  const aggiungi = useCallback(async (files: FileList | File[]) => {
    const scelte = Array.from(files).slice(0, 40);
    if (!scelte.length) return;

    const nuove: Scheda[] = scelte.map((f) => ({
      id: crypto.randomUUID(),
      nome: f.name,
      anteprima: URL.createObjectURL(f),
      pronta: null,
      errore: null,
      alt: '',
      caption: '',
      tag: [],
      lavorando: true,
    }));
    setSchede((s) => [...s, ...nuove]);

    /* Una per volta e non tutte insieme: dieci canvas da dodici megapixel
       in parallelo fanno finire la memoria a un telefono, e la scheda si
       ricarica perdendo tutto. In fila ogni foto compare pronta mentre la
       successiva lavora, e si vede che sta succedendo qualcosa. */
    for (let i = 0; i < scelte.length; i++) {
      const r = await preparaFoto(scelte[i]);
      const id = nuove[i].id;
      setSchede((s) =>
        s.map((x) =>
          x.id !== id
            ? x
            : r.ok
              ? { ...x, pronta: r.foto, lavorando: false }
              : { ...x, errore: r.errore, lavorando: false }
        )
      );
    }
  }, []);

  /* ── tag ───────────────────────────────────────────────────────────── */

  const tocca = useCallback((ids: string[], key: string, metti: boolean) => {
    setSchede((s) =>
      s.map((x) =>
        !ids.includes(x.id)
          ? x
          : { ...x, tag: metti ? [...new Set([...x.tag, key])] : x.tag.filter((k) => k !== key) }
      )
    );
  }, []);

  const bersagli = useMemo(
    () => (selezione.size ? [...selezione] : schede.map((s) => s.id)),
    [selezione, schede]
  );

  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    if (!q) return pagine;
    return pagine.filter((p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
  }, [pagine, cerca]);

  /* ── cosa manca ────────────────────────────────────────────────────── */

  const valide = schede.filter((s) => s.pronta && !s.errore);
  const senzaAlt = valide.filter((s) => s.alt.trim().length < 3).length;
  const senzaPagina = valide.filter((s) => !s.tag.length).length;
  const puoInviare = valide.length > 0 && !senzaAlt && !senzaPagina && !invio;

  /* ── invio ─────────────────────────────────────────────────────────── */

  const invia = () => {
    setEsito(null);
    avvia(async () => {
      const r1 = await chiediFirme(valide.length);
      if (!r1.ok || !r1.firme) {
        setEsito({ ok: false, testo: r1.errore ?? 'Non riesco a ottenere il permesso di caricare.' });
        return;
      }

      const daRegistrare: DaRegistrare[] = [];
      for (let i = 0; i < valide.length; i++) {
        const s = valide[i];
        const firma = r1.firme[i];
        /* Il file va dritto nello storage con la firma: non passa dalla
           server action, che ha un limite di 1 MB nel corpo. */
        /* Nessuna chiave nel browser: il permesso e' il token dentro
           l'indirizzo firmato, che vale per QUEL file e per pochi minuti. */
        const su = await fetch(firma.url, {
          method: 'PUT',
          headers: { 'content-type': 'image/webp' },
          body: s.pronta!.blob,
        }).catch(() => null);

        if (!su || !su.ok) {
          setEsito({
            ok: false,
            testo: `«${s.nome}» non è salita. Le altre non sono state registrate: riprova.`,
          });
          return;
        }

        daRegistrare.push({
          bucket: firma.bucket,
          storage_path: firma.percorso,
          width: s.pronta!.width,
          height: s.pronta!.height,
          alt: s.alt,
          caption: s.caption.trim() || null,
          colore: s.pronta!.colore,
          scattata: s.pronta!.scattata ? s.pronta!.scattata.toISOString() : null,
          tag: s.tag,
        });
      }

      const r2 = await registraFoto(daRegistrare);
      if (!r2.ok) {
        setEsito({ ok: false, testo: r2.errore ?? 'Le foto sono salite ma non le ho registrate.' });
        return;
      }

      setEsito({
        ok: true,
        testo: approvaSubito
          ? `${r2.quante} foto pubblicate.`
          : `${r2.quante} foto inviate. Un amministratore le vedrà e le approverà: fino a quel momento non sono sul sito.`,
      });
      /* Si svuota tutto: lasciare le schede dopo un invio riuscito invita
         a premere due volte e a caricare i doppioni. */
      schede.forEach((s) => URL.revokeObjectURL(s.anteprima));
      setSchede([]);
      setSelezione(new Set());
    });
  };

  /* ── disegno ───────────────────────────────────────────────────────── */

  return (
    <div className="gc">
      <div
        className={'gc-zona' + (sopra ? ' sopra' : '')}
        onDragOver={(e) => { e.preventDefault(); setSopra(true); }}
        onDragLeave={() => setSopra(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSopra(false);
          if (e.dataTransfer?.files?.length) aggiungi(e.dataTransfer.files);
        }}
      >
        <strong>Trascina qui le foto</strong>
        {/* Sul telefono il trascinamento non esiste: il pulsante e' la
            strada principale, non l'alternativa. `accept="image/*"` fa
            aprire a iOS la galleria o la fotocamera, e consegna JPEG anche
            quando sul telefono la foto e' HEIC. */}
        <button type="button" className="gc-scegli" onClick={() => input.current?.click()}>
          Scegli foto
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { if (e.target.files) aggiungi(e.target.files); e.target.value = ''; }}
        />
        <span className="gc-nota">
          Fino a 40 per volta. Le foto vengono rimpicciolite e ripulite dei dati nascosti
          (compresa la posizione GPS) qui sul tuo telefono, prima di partire.
        </span>
      </div>

      {schede.length > 0 && (
        <div className="gc-corpo">
          <div className="gc-foto">
            <div className="gc-barra">
              <span>
                {valide.length} foto{selezione.size ? ` · ${selezione.size} selezionate` : ''}
              </span>
              {schede.length > 0 && (
                <button
                  type="button"
                  className="gc-mini"
                  onClick={() => setSelezione(selezione.size ? new Set() : new Set(schede.map((s) => s.id)))}
                >
                  {selezione.size ? 'Deseleziona tutte' : 'Seleziona tutte'}
                </button>
              )}
            </div>

            {schede.map((s) => (
              <div className={'gc-card' + (s.errore ? ' ko' : '')} key={s.id}>
                <label className="gc-sel">
                  <input
                    type="checkbox"
                    checked={selezione.has(s.id)}
                    onChange={(e) => {
                      const n = new Set(selezione);
                      if (e.target.checked) n.add(s.id); else n.delete(s.id);
                      setSelezione(n);
                    }}
                  />
                  <span className="gc-sel-txt">Seleziona</span>
                </label>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="gc-ant" src={s.anteprima} alt="" />

                <div className="gc-dati">
                  <code className="gc-nome">{s.nome}</code>

                  {s.lavorando && <p className="gc-lavoro">Preparo la foto…</p>}

                  {s.errore && <p className="gc-err">{s.errore}</p>}

                  {s.pronta && (
                    <>
                      <p className="gc-misure">
                        {s.pronta.width}×{s.pronta.height}
                        {' · '}
                        {s.pronta.scattata
                          ? `scattata il ${s.pronta.scattata.toLocaleDateString('it-IT')}`
                          : 'senza data di scatto: si userà la data di caricamento'}
                      </p>
                      {s.pronta.avvisi.map((a, i) => (
                        <p className="gc-avviso" key={i}>{a}</p>
                      ))}

                      <label>
                        Descrizione in inglese <b>obbligatoria</b>
                        <input
                          type="text"
                          value={s.alt}
                          placeholder="Guests tasting wine at a Chianti winery"
                          onChange={(e) =>
                            setSchede((x) => x.map((y) => (y.id === s.id ? { ...y, alt: e.target.value } : y)))
                          }
                        />
                        <span className="gc-aiuto">
                          Cosa si vede nella foto, in inglese. La leggono Google e chi non
                          può vedere l’immagine. Non «foto 1» o «Toscana».
                        </span>
                      </label>

                      <label>
                        Didascalia <span className="gc-opt">facoltativa</span>
                        <input
                          type="text"
                          value={s.caption}
                          placeholder="Harvest week in Chianti"
                          onChange={(e) =>
                            setSchede((x) => x.map((y) => (y.id === s.id ? { ...y, caption: e.target.value } : y)))
                          }
                        />
                      </label>

                      <div className="gc-etichette">
                        {s.tag.length === 0 && <span className="gc-manca">Nessuna pagina scelta</span>}
                        {s.tag.map((k) => {
                          const p = pagine.find((x) => x.key === k);
                          return (
                            <span className="gc-etichetta" key={k}>
                              {p?.label ?? k}
                              <button type="button" onClick={() => tocca([s.id], k, false)} aria-label={`Togli ${p?.label ?? k}`}>
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="gc-pagine">
            <h3>Pagine</h3>
            <p className="gc-nota">
              {selezione.size
                ? `Le spunte valgono per le ${selezione.size} foto selezionate.`
                : 'Nessuna foto selezionata: le spunte valgono per tutte.'}
            </p>
            <input
              type="search"
              placeholder="cerca pagina…"
              value={cerca}
              onChange={(e) => setCerca(e.target.value)}
            />

            {GRUPPI.map((g) => {
              const voci = filtrate.filter((p) => p.type === g.tipo);
              if (!voci.length) return null;
              return (
                <details className="gc-gruppo" key={g.tipo} open={g.tipo !== 'tour' || !!cerca.trim()}>
                  <summary>
                    {g.titolo} <span>{voci.length}</span>
                  </summary>
                  {voci.map((p) => {
                    /* La spunta e' piena solo se TUTTE le foto bersaglio
                       hanno quel tag: con una selezione mista si vede
                       subito che non sono d'accordo. */
                    const quante = schede.filter((s) => bersagli.includes(s.id) && s.tag.includes(p.key)).length;
                    const tutte = bersagli.length > 0 && quante === bersagli.length;
                    return (
                      <label className="gc-pagina" key={p.key}>
                        <input
                          type="checkbox"
                          checked={tutte}
                          /* parzialmente spuntata: né vuota né piena */
                          ref={(el) => { if (el) el.indeterminate = quante > 0 && !tutte; }}
                          onChange={(e) => tocca(bersagli, p.key, e.target.checked)}
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </details>
              );
            })}
          </div>
        </div>
      )}

      {schede.length > 0 && (
        <div className="gc-invio">
          {/* COSA MANCA, E A QUANTE FOTO. Un pulsante grigio senza
              spiegazione fa chiudere la pagina. */}
          {!puoInviare && !invio && (
            <ul className="gc-manca-lista">
              {!valide.length && <li>Nessuna foto pronta da inviare.</li>}
              {senzaAlt > 0 && (
                <li>
                  {senzaAlt === 1 ? 'Una foto non ha' : `${senzaAlt} foto non hanno`} la descrizione in inglese.
                </li>
              )}
              {senzaPagina > 0 && (
                <li>
                  {senzaPagina === 1 ? 'Una foto non ha' : `${senzaPagina} foto non hanno`} nessuna pagina.
                </li>
              )}
            </ul>
          )}

          <button type="button" className="gc-invia" disabled={!puoInviare} onClick={invia}>
            {invio
              ? 'Sto caricando…'
              : approvaSubito
                ? `Pubblica ${valide.length || ''}`.trim()
                : `Invia per approvazione ${valide.length || ''}`.trim()}
          </button>

          {esito && <p className={esito.ok ? 'gc-ok' : 'gc-err'}>{esito.testo}</p>}
        </div>
      )}
    </div>
  );
}
