'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { Esito, Parziale } from '@/app/admin/numeri/azioni';

/* LA PAGINA DEI NUMERI.
 *
 * Due cose sole, e in quest'ordine: QUANTO SONO VECCHI i numeri e un
 * pulsante per rifarli. La fotografia presa a mano un mese fa e' identica,
 * a vedersi, a quella presa stamattina: senza la data accanto nessuno sa
 * se quello che il sito sta dichiarando e' ancora vero. Per questo l'eta'
 * sta in alto, grande, e cambia colore da sola.
 *
 * L'aggiornamento dura circa quaranta secondi. Quaranta secondi di rotella
 * che gira sono lunghi abbastanza da far ripremere il pulsante: qui si
 * vede la barra avanzare, il passo che sta girando ("pagina 5 di 8"), i
 * secondi che passano e la riga di ogni pezzo gia' finito. Se si ferma, si
 * vede DOVE si e' fermato.
 */

export type RigaNumeri = {
  slug: string;
  sku: string | null;
  voto: number | null;
  quante: number | null;
  oggi: number | null;
  ultimi_7: number | null;
  prima_libera: string | null;
  posti_prima: number | null;
  esaurite_30gg: number | null;
  date_totali_30gg: number | null;
  /** il piu' recente fra i tre aggiornamenti che riguardano questa riga */
  aggiornato: string | null;
};

type Azioni = {
  recensioni: () => Promise<Esito & { quanti?: number }>;
  prenotazioni: (daPagina: number) => Promise<Esito & { pagine: number; fatte: number; parziali: Parziale[] }>;
  conteggi: (parziali: Parziale[]) => Promise<Esito & { tour?: number }>;
  disponibilita: (da: number) => Promise<Esito & { totale: number; fatti: number }>;
};

/* Freni: se una risposta tornasse sempre "manca ancora un pezzo" il giro
   non finirebbe mai e continuerebbe a martellare Regiondo da solo. */
const MAX_GIRI_PRENOTAZIONI = 30;
const MAX_GIRI_CALENDARI = 40;

function quantoFa(iso: string, adesso: number): string {
  const min = Math.floor((adesso - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const ore = Math.floor(min / 60);
  if (ore < 24) return `${ore} ${ore === 1 ? 'ora' : 'ore'} fa`;
  const gg = Math.floor(ore / 24);
  return `${gg} ${gg === 1 ? 'giorno' : 'giorni'} fa`;
}

/** verde fino a tre ore, ambra fino a un giorno, rosso oltre: la soglia
 *  che conta e' "i numeri di oggi", non "i numeri di questo mese" */
function gravita(iso: string | null, adesso: number): 'bene' | 'cosi' | 'male' {
  if (!iso) return 'male';
  const ore = (adesso - new Date(iso).getTime()) / 3600000;
  if (ore < 3) return 'bene';
  if (ore < 24) return 'cosi';
  return 'male';
}

/* L'OROLOGIO, CHE SUL SERVER NON ESISTE.
 *
 * "Aggiornato 2 ore fa" si puo' scrivere solo conoscendo l'ora di ADESSO,
 * e l'ora di adesso durante la costruzione della pagina e' gia' diversa da
 * quella del browser quando la riceve: React se ne accorge e protesta.
 * Qui torna `null` finche' la pagina non e' viva nel browser, e da li' in
 * poi un valore arrotondato ai 30 secondi -- stabile abbastanza da non far
 * ridisegnare la tabella a ogni battito. */
function useOrologio(): number | null {
  return useSyncExternalStore(
    (avvisa) => {
      const t = setInterval(avvisa, 30000);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / 30000) * 30000,
    () => null
  );
}

function data(g: string): string {
  const p = g.split('-');
  return `${p[2]}/${p[1]}`;
}

export function Numeri({
  righe,
  aggiornato,
  quandoAssoluto,
  azioni,
}: {
  righe: RigaNumeri[];
  aggiornato: string | null;
  /** gia' formattato dal server, cosi' la prima pittura non dipende
   *  dall'orologio del browser e non c'e' niente da riconciliare */
  quandoAssoluto: string | null;
  azioni: Azioni;
}) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState(false);
  const [percento, setPercento] = useState(0);
  const [passo, setPasso] = useState('');
  const [fatti, setFatti] = useState<string[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [secondi, setSecondi] = useState(0);
  const [filtro, setFiltro] = useState('');

  const adesso = useOrologio();

  /* I secondi che passano sono la prova che qualcosa sta succedendo anche
     quando la barra sta ferma perche' una pagina di Regiondo ci mette sei
     secondi a rispondere. */
  useEffect(() => {
    if (!inCorso) return;
    const t = setInterval(() => setSecondi((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [inCorso]);

  const elenco = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = q ? righe.filter((r) => r.slug.includes(q) || (r.sku ?? '').toLowerCase().includes(q)) : righe;
    return [...base].sort((a, b) => (b.ultimi_7 ?? 0) - (a.ultimi_7 ?? 0) || (b.quante ?? 0) - (a.quante ?? 0) || a.slug.localeCompare(b.slug));
  }, [righe, filtro]);

  const totali = useMemo(
    () => ({
      agganciati: righe.filter((r) => r.sku).length,
      recensioni: righe.reduce((s, r) => s + (r.quante ?? 0), 0),
      settimana: righe.reduce((s, r) => s + (r.ultimi_7 ?? 0), 0),
      esaurite: righe.reduce((s, r) => s + (r.esaurite_30gg ?? 0), 0),
    }),
    [righe]
  );

  async function aggiorna() {
    setInCorso(true);
    setErrore(null);
    setFatti([]);
    setSecondi(0);
    setPercento(1);

    const fermo = (messaggio: string) => {
      setErrore(messaggio);
      setInCorso(false);
      setPasso('');
    };

    /* 1 — RECENSIONI */
    setPasso('Recensioni: leggo il catalogo Regiondo');
    const r1 = await azioni.recensioni();
    if (!r1.ok) return fermo(r1.errore ?? 'Le recensioni non sono passate.');
    setFatti((f) => [...f, `Recensioni: ${r1.quanti ?? 0} tour ricalcolati`]);
    setPercento(10);

    /* 2 — PRENOTAZIONI, una fetta di pagine alla volta */
    const parziali: Parziale[] = [];
    let pagina = 1;
    let pagine = 1;
    for (let giro = 0; giro < MAX_GIRI_PRENOTAZIONI; giro++) {
      setPasso(`Prenotazioni: pagina ${pagina} di ${pagine > 1 ? pagine : '?'}`);
      const r = await azioni.prenotazioni(pagina);
      if (!r.ok) return fermo(r.errore ?? 'Le prenotazioni non sono passate.');
      pagine = r.pagine;
      parziali.push(...r.parziali);
      setPercento(10 + Math.round((40 * r.fatte) / Math.max(pagine, 1)));
      if (r.fatte >= pagine) break;
      pagina = r.fatte + 1;
    }
    setFatti((f) => [...f, `Prenotazioni: ${pagine} pagine degli ultimi 30 giorni, annullamenti esclusi`]);

    setPasso('Prenotazioni: scrivo i conteggi');
    const r2 = await azioni.conteggi(parziali);
    if (!r2.ok) return fermo(r2.errore ?? 'I conteggi non sono passati.');
    setFatti((f) => [...f, `Conteggi: ${r2.tour ?? 0} tour con almeno una prenotazione`]);
    setPercento(55);

    /* 3 — DISPONIBILITA', un blocco di calendari alla volta */
    let da = 0;
    let totale = 0;
    for (let giro = 0; giro < MAX_GIRI_CALENDARI; giro++) {
      setPasso(`Disponibilita': ${da} di ${totale || '?'} calendari`);
      const r = await azioni.disponibilita(da);
      if (!r.ok) return fermo(r.errore ?? 'La disponibilita’ non e’ passata.');
      totale = r.totale;
      da = r.fatti;
      setPercento(55 + Math.round((45 * da) / Math.max(totale, 1)));
      if (da >= totale) break;
    }
    setFatti((f) => [...f, `Disponibilita’: ${totale} calendari riletti`]);

    setPercento(100);
    setPasso('Fatto: rigenero le pagine pubbliche');
    setInCorso(false);
    /* I dati della tabella arrivano dal server: senza questo restano quelli
       di prima e l'aggiornamento sembra non aver fatto niente. */
    router.refresh();
    setPasso('');
  }

  /* Finche' l'orologio non c'e' la fascia resta neutra: dichiarare "verde"
     prima di sapere che ore sono sarebbe una rassicurazione tirata a
     indovinare, e dura giusto il tempo di essere creduta. */
  const stato = adesso ? gravita(aggiornato, adesso) : 'attesa';

  return (
    <>
      <div className={`ad-fresco ad-fresco-${stato}`}>
        <div>
          <b>
            {aggiornato && adesso ? `Aggiornato ${quantoFa(aggiornato, adesso)}` : aggiornato ? 'Aggiornato' : 'Mai aggiornato'}
          </b>
          <span>
            {quandoAssoluto
              ? `Ultima lettura da Regiondo: ${quandoAssoluto}. Finche' non si preme il pulsante, il sito dichiara questi numeri.`
              : 'Nessuna lettura registrata: i numeri sul sito non vengono da qui.'}
          </span>
        </div>
        <button className="ad-aggiorna" onClick={aggiorna} disabled={inCorso}>
          {inCorso ? 'Sto aggiornando…' : 'Aggiorna adesso'}
        </button>
      </div>

      {(inCorso || percento === 100 || errore) && (
        <div className="ad-avanza">
          <div className="ad-avanza-barra">
            <i style={{ width: `${percento}%` }} />
          </div>
          <p className="ad-avanza-passo">
            <span>{errore ? 'Interrotto' : passo || 'Fatto'}</span>
            <em>
              {percento}% &middot; {secondi}s
            </em>
          </p>
          {fatti.length > 0 && (
            <ul className="ad-avanza-fatti">
              {fatti.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
          {errore && <p className="ad-esito-ko">{errore}</p>}
        </div>
      )}

      <div className="ad-conta">
        <div>
          <b>{totali.agganciati}</b>
          <span>tour con un prodotto Regiondo</span>
        </div>
        <div>
          <b>{totali.recensioni.toLocaleString('it-IT')}</b>
          <span>recensioni Regiondo in totale</span>
        </div>
        <div className="bene">
          <b>{totali.settimana.toLocaleString('it-IT')}</b>
          <span>prenotazioni negli ultimi 7 giorni</span>
        </div>
        <div className={totali.esaurite ? 'male' : ''}>
          <b>{totali.esaurite}</b>
          <span>date esaurite nei prossimi 30 giorni</span>
        </div>
      </div>

      <div className="ad-barra">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Cerca uno slug o uno SKU"
        />
        <span className="ad-quante">
          {elenco.length} di {righe.length}
        </span>
      </div>

      <div className="ad-tab-wrap">
        <table className="ad-tab">
          <thead>
            <tr>
              <th>Tour</th>
              <th className="ad-num">Recensioni</th>
              <th className="ad-num">Prenotazioni 7gg</th>
              <th>Prima data libera</th>
              <th className="ad-num">Aggiornato</th>
            </tr>
          </thead>
          <tbody>
            {elenco.map((r) => (
              <tr key={r.slug}>
                <td>
                  <span className="ad-riga-tour">
                    <strong>{r.slug}</strong>
                    <code>{r.sku ?? 'nessun prodotto Regiondo'}</code>
                  </span>
                </td>
                <td className="ad-num">
                  {r.quante ? (
                    <>
                      <b>{r.voto?.toFixed(1)}</b> <span className="ad-fioco">su {r.quante}</span>
                    </>
                  ) : (
                    <span className="ad-vuoto">nessuna</span>
                  )}
                </td>
                <td className="ad-num">
                  {r.ultimi_7 ? (
                    <>
                      <b>{r.ultimi_7}</b>
                      {r.oggi ? <span className="ad-fioco"> · {r.oggi} oggi</span> : null}
                    </>
                  ) : (
                    <span className="ad-vuoto">0</span>
                  )}
                </td>
                <td>
                  {r.prima_libera ? (
                    <>
                      <b>{data(r.prima_libera)}</b>
                      {r.posti_prima != null ? (
                        <span className="ad-fioco"> · {r.posti_prima} posti</span>
                      ) : null}
                      {r.esaurite_30gg ? (
                        <span className="ad-fioco">
                          {' '}
                          · {r.esaurite_30gg}/{r.date_totali_30gg} piene
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="ad-vuoto">nessuna data</span>
                  )}
                </td>
                <td className="ad-num">
                  {r.aggiornato && adesso ? (
                    <span className={`ad-eta ad-eta-${gravita(r.aggiornato, adesso)}`}>
                      {quantoFa(r.aggiornato, adesso)}
                    </span>
                  ) : (
                    <span className="ad-vuoto">mai</span>
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
