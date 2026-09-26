'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

/* «LE MIE FOTO», in tre schede.
 *
 * La scheda che conta e' RIFIUTATE: e' l'unica che ha qualcosa da fare, e
 * l'unica dove si legge il motivo. Per questo si apre da sola quando ce
 * n'e' almeno una -- se no una persona apre la pagina, vede le approvate e
 * non scopre mai che tre foto aspettano una correzione.
 */

export type MiaFoto = {
  id: string;
  alt: string;
  caption: string | null;
  stato: 'in_attesa' | 'approvata' | 'rifiutata' | 'nascosta';
  motivo: string | null;
  colore: string | null;
  anteprima: string | null;
  caricata: string;
  pagine: string[];
};

type Esito = { ok: boolean; errore?: string };

const SCHEDE = [
  { id: 'rifiutata', titolo: 'Rifiutate' },
  { id: 'in_attesa', titolo: 'In attesa' },
  { id: 'approvata', titolo: 'Approvate' },
] as const;

export function GalleryMie({
  foto,
  reinvia,
  elimina,
}: {
  foto: MiaFoto[];
  reinvia: (id: string) => Promise<Esito>;
  elimina: (id: string) => Promise<Esito>;
}) {
  const conta = (s: string) =>
    s === 'approvata'
      ? foto.filter((f) => f.stato === 'approvata' || f.stato === 'nascosta').length
      : foto.filter((f) => f.stato === s).length;

  const [scheda, setScheda] = useState<string>(
    conta('rifiutata') ? 'rifiutata' : conta('in_attesa') ? 'in_attesa' : 'approvata'
  );
  const [resto, setResto] = useState(foto);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const visibili = resto.filter((f) =>
    scheda === 'approvata' ? f.stato === 'approvata' || f.stato === 'nascosta' : f.stato === scheda
  );

  if (!foto.length) {
    return (
      <p className="ad-ok">
        Non hai ancora caricato niente. <Link href="/admin/gallery/carica/">Carica le prime foto</Link>.
      </p>
    );
  }

  return (
    <div className="g-mie">
      {messaggio && <p className={messaggio.ok ? 'ad-ok' : 'ad-err'}>{messaggio.testo}</p>}

      <div className="g-schede">
        {SCHEDE.map((s) => (
          <button
            key={s.id}
            type="button"
            className={scheda === s.id ? 'attiva' : ''}
            onClick={() => setScheda(s.id)}
          >
            {s.titolo} <span>{conta(s.id)}</span>
          </button>
        ))}
      </div>

      {!visibili.length && <p className="ad-ok">Niente in questa scheda.</p>}

      {visibili.map((f) => (
        <article className="g-riga" key={f.id}>
          <div className="g-riga-foto" style={{ background: f.colore ?? undefined }}>
            {f.anteprima ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.anteprima} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="g-scaduta">Anteprima scaduta: ricarica la pagina</span>
            )}
          </div>

          <div className="g-riga-dati">
            <p className="g-alt">{f.alt}</p>
            {f.caption && <p className="g-did">{f.caption}</p>}
            <p className="g-tag">
              {f.pagine.length ? f.pagine.map((l) => <span key={l}>{l}</span>) : <i>nessuna pagina</i>}
            </p>
            <p className="g-chi">
              Caricata il {new Date(f.caricata).toLocaleDateString('it-IT')}
              {f.stato === 'nascosta' && ' · nascosta dal sito da un amministratore'}
            </p>

            {f.stato === 'rifiutata' && (
              <>
                <p className="ad-err g-motivo">
                  <b>Perché è tornata indietro:</b> {f.motivo}
                </p>
                <div className="g-azioni">
                  {/* «Correggi» porta al caricamento perche' il modo di
                      rifare una foto sbagliata e' ricaricarla: l'alt e i
                      tag si possono cambiare, ma se il problema e'
                      l'immagine non c'e' niente da correggere qui. */}
                  <button
                    type="button"
                    disabled={inCorso}
                    onClick={() =>
                      avvia(async () => {
                        const r = await reinvia(f.id);
                        if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                        setResto((x) => x.map((y) => (y.id === f.id ? { ...y, stato: 'in_attesa', motivo: null } : y)));
                        setMessaggio({ ok: true, testo: 'Rimandata: aspetta di nuovo l’approvazione.' });
                      })
                    }
                  >
                    Rimanda così com’è
                  </button>
                  <button
                    type="button"
                    className="g-no"
                    disabled={inCorso}
                    onClick={() =>
                      avvia(async () => {
                        const r = await elimina(f.id);
                        if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                        setResto((x) => x.filter((y) => y.id !== f.id));
                        setMessaggio({ ok: true, testo: 'Eliminata.' });
                      })
                    }
                  >
                    Elimina
                  </button>
                </div>
              </>
            )}

            {f.stato === 'in_attesa' && (
              <div className="g-azioni">
                <button
                  type="button"
                  className="g-no"
                  disabled={inCorso}
                  onClick={() =>
                    avvia(async () => {
                      const r = await elimina(f.id);
                      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                      setResto((x) => x.filter((y) => y.id !== f.id));
                      setMessaggio({ ok: true, testo: 'Ritirata.' });
                    })
                  }
                >
                  Ritira
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
