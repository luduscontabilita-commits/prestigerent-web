'use client';

/* I DUE STRUMENTI: aggiorna adesso, e interroga il Pianificatore.
 *
 * Sono l'unica parte del pannello che ha bisogno del browser -- il resto
 * e' testo servito dal server. Per questo stanno in un componente a
 * parte: cosi' il resto della pagina non paga JavaScript per niente.
 *
 * IL PIANIFICATORE MOSTRA ANCHE GLI ZERI, ED E' IL PUNTO.
 * Serve a scoprire che una parola non la cerca nessuno PRIMA di scriverci
 * sopra una campagna. Nascondere gli zeri toglierebbe proprio la risposta
 * che si e' venuti a cercare.
 */
import { useActionState, useState, useTransition } from 'react';
import { aggiornaAdesso, interroga } from '@/app/michele/azioni';
import type { Potenziale } from '@/lib/pannello';

const PAESI: [string, string][] = [
  ['2840', 'Stati Uniti'],
  ['2826', 'Regno Unito'],
  ['2124', 'Canada'],
  ['2036', 'Australia'],
  ['2372', 'Irlanda'],
  ['2276', 'Germania'],
  ['2250', 'Francia'],
  ['2380', 'Italia'],
];

export function Strumenti() {
  const [inCorso, parti] = useTransition();
  const [esito, setEsito] = useState<string>('');
  const [stato, azione, sta] = useActionState(interroga, { righe: [] as Potenziale[], cercato: '' });

  return (
    <>
      <section className="mi-riq">
        <h2>Aggiorna<em>legge Regiondo, Ads, Meta e Analytics</em></h2>
        <div className="mi-str">
          <button
            className="mi-btn"
            disabled={inCorso}
            onClick={() =>
              parti(async () => {
                setEsito('');
                const r = await aggiornaAdesso();
                setEsito(r.messaggio);
              })
            }
          >
            {inCorso ? 'sto leggendo…' : 'Aggiorna adesso'}
          </button>
          <span className="mi-nota">
            {inCorso
              ? 'Regiondo su trenta giorni ci mette un paio di minuti.'
              : esito || 'Il passaggio notturno lo fa da solo ogni giorno.'}
          </span>
        </div>
      </section>

      <section className="mi-riq mi-largo">
        <h2>Pianificatore<em>ricerche vere, dal conto Google Ads</em></h2>
        <form action={azione} className="mi-str mi-form">
          <textarea
            name="parole"
            rows={3}
            placeholder={'una parola per riga, o separate da virgola\nchianti wine tasting\nolive oil tasting florence'}
            defaultValue={stato.cercato}
          />
          <div className="mi-form-sotto">
            <select name="paese" defaultValue="2840">
              {PAESI.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
            <button className="mi-btn" disabled={sta}>
              {sta ? 'chiedo a Google…' : 'Chiedi'}
            </button>
          </div>
        </form>

        {stato.righe.length > 0 && (
          <table className="mi-tab">
            <thead>
              <tr><th>parola</th><th>ricerche</th><th>concorrenza</th><th>CPC</th><th>nostra</th></tr>
            </thead>
            <tbody>
              {stato.righe.map((r) => (
                <tr key={r.parola} className={r.ricerche === 0 ? 'mi-spenta' : ''}>
                  <td>{r.parola}</td>
                  <td className={'mi-n' + (r.ricerche === 0 ? ' mi-male' : '')}>{r.ricerche}</td>
                  <td className="mi-n">
                    {r.concorrenza === 'LOW' ? 'bassa'
                      : r.concorrenza === 'MEDIUM' ? 'media'
                      : r.concorrenza === 'HIGH' ? 'ALTA' : r.concorrenza}
                  </td>
                  <td className="mi-n">&euro;{r.cpc.toFixed(2)}</td>
                  <td className="mi-n">{r.giaComprata ? 'sì' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
