'use client';

import { useState, useTransition } from 'react';
import { CRITERI, type Criterio, type Impostazioni } from '@/lib/gallery-tag';

/* LE IMPOSTAZIONI GENERALI.
 *
 * 🔴 L'INTERRUTTORE E' IN CIMA E CHIEDE CONFERMA PER ACCENDERSI.
 * Accenderlo fa comparire la gallery su ogni pagina che ha abbastanza foto
 * approvate, tutte insieme, su un sito che Google sta scansionando. E'
 * l'unico comando di questo pannello che si vede da fuori, quindi e'
 * l'unico che si fa confermare. Spegnerlo no: spegnere e' sempre la
 * direzione sicura, e chiedere conferma per mettere in salvo vuol dire
 * rallentare qualcuno che ha appena visto qualcosa che non gli piace.
 */

const NOME_CRITERIO: Record<Criterio, string> = {
  manual: 'Manuale (l’ordine che decidi tu)',
  newest: 'Più recenti prima',
  oldest: 'Più vecchie prima',
  daily_random: 'Casuale del giorno',
  alternate: 'Alternata verticale/orizzontale',
};

const NOME_VELOCITA = { slow: 'Lenta', medium: 'Media', fast: 'Veloce' } as const;

export function GalleryImpostazioni({
  iniziali,
  quantePronte,
  salva,
}: {
  iniziali: Impostazioni;
  /** quante pagine mostrerebbero la gallery accendendo l'interruttore:
   *  e' il numero che si vuole sapere PRIMA di accendere */
  quantePronte: number;
  salva: (d: Impostazioni) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [d, setD] = useState<Impostazioni>(iniziali);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const accendendo = d.galleries_enabled && !iniziali.galleries_enabled;

  const invia = () => {
    if (accendendo) {
      const testo =
        quantePronte === 0
          ? 'Nessuna pagina ha ancora abbastanza foto approvate: accendendo ora non comparirà niente. Vuoi accendere comunque?'
          : `La gallery comparirà subito su ${quantePronte} pagine del sito, visibile a tutti. Confermi?`;
      if (!window.confirm(testo)) return;
    }
    avvia(async () => {
      const r = await salva(d);
      setMessaggio(
        r.ok
          ? { ok: true, testo: 'Salvato. Le pagine si aggiornano in pochi secondi.' }
          : { ok: false, testo: r.errore ?? 'Non salvato.' }
      );
    });
  };

  return (
    <div className="g-imp">
      {messaggio && <p className={messaggio.ok ? 'ad-ok' : 'ad-err'}>{messaggio.testo}</p>}

      <div className={'g-interruttore ' + (d.galleries_enabled ? 'on' : 'off')}>
        <label>
          <input
            type="checkbox"
            checked={d.galleries_enabled}
            onChange={(e) => setD({ ...d, galleries_enabled: e.target.checked })}
          />
          <b>Mostra le gallery sul sito</b>
        </label>
        <p>
          {d.galleries_enabled
            ? `Accesa: ${quantePronte} pagine hanno abbastanza foto e la mostrerebbero.`
            : 'Spenta: nessun visitatore vede niente, su nessuna pagina. Si può caricare e approvare tranquillamente.'}
        </p>
      </div>

      <label>
        Numero minimo di immagini per mostrare la gallery
        <input
          type="number"
          min={1}
          max={50}
          value={d.min_images}
          onChange={(e) => setD({ ...d, min_images: Number(e.target.value) })}
        />
        <span className="gc-aiuto">
          Sotto questo numero la pagina non mostra niente: né titolo né spazio vuoto.
          Contano solo le foto <b>approvate</b> con il tag di quella pagina.
        </span>
      </label>

      <fieldset className="g-fieldset">
        <legend>Titoli per le pagine normali (home, categorie, porti)</legend>
        <label>
          Titolo
          <input
            type="text"
            value={d.default_title}
            onChange={(e) => setD({ ...d, default_title: e.target.value })}
          />
          <span className="gc-aiuto">
            Fra asterischi la parola in corsivo, come nel resto del sito:
            <code> Moments from the *road*</code>
          </span>
        </label>
        <label>
          Sottotitolo <span className="gc-opt">facoltativo</span>
          <input
            type="text"
            value={d.default_subtitle ?? ''}
            onChange={(e) => setD({ ...d, default_subtitle: e.target.value || null })}
          />
        </label>
      </fieldset>

      <fieldset className="g-fieldset">
        <legend>Titoli per le schede dei tour</legend>
        <p className="gc-aiuto">
          Sono separati di proposito: in cima a ogni scheda tour c’è già la striscia delle
          foto del <b>prodotto</b>. Due strisce con lo stesso titolo nella stessa pagina
          sembrano un errore, e queste sono le foto delle giornate vere.
        </p>
        <label>
          Titolo
          <input
            type="text"
            value={d.default_title_tour}
            onChange={(e) => setD({ ...d, default_title_tour: e.target.value })}
          />
        </label>
        <label>
          Sottotitolo <span className="gc-opt">facoltativo</span>
          <input
            type="text"
            value={d.default_subtitle_tour ?? ''}
            onChange={(e) => setD({ ...d, default_subtitle_tour: e.target.value || null })}
          />
        </label>
      </fieldset>

      <label>
        Ordinamento predefinito delle gallery
        <select
          value={d.default_sort}
          onChange={(e) => setD({ ...d, default_sort: e.target.value as Criterio })}
        >
          {CRITERI.map((c) => (
            <option key={c} value={c}>{NOME_CRITERIO[c]}</option>
          ))}
        </select>
        <span className="gc-aiuto">
          «Casuale del giorno» mescola le foto ma tiene lo stesso ordine per tutta la
          giornata, e cambia a mezzanotte: chi torna sul sito vede una gallery diversa,
          e le pagine restano in cache.
        </span>
      </label>

      <label>
        Velocità dello scorrimento automatico
        <select
          value={d.autoplay_speed}
          onChange={(e) => setD({ ...d, autoplay_speed: e.target.value as Impostazioni['autoplay_speed'] })}
        >
          {(Object.keys(NOME_VELOCITA) as (keyof typeof NOME_VELOCITA)[]).map((k) => (
            <option key={k} value={k}>{NOME_VELOCITA[k]}</option>
          ))}
        </select>
        <span className="gc-aiuto">
          Lo scorrimento si ferma da solo col mouse sopra, col dito, fuori dallo schermo e
          per chi ha chiesto meno animazioni.
        </span>
      </label>

      <button type="button" onClick={invia} disabled={inCorso}>
        {inCorso ? 'Salvo…' : 'Salva'}
      </button>
    </div>
  );
}
