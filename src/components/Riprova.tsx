import type { Riprova as Dati } from '@/lib/riprova';

/* LA FASCIA DI FIDUCIA, riutilizzabile su ogni pagina.
 *
 * Tutti i numeri arrivano da `azienda` e `fonti_recensioni`: si cambia la
 * riga nel database e cambiano ovunque nello stesso momento. Nessun numero
 * scritto a mano dentro il markup -- era proprio quello il problema.
 *
 * Le voci che non hanno un dato spariscono da sole invece di mostrare un
 * buco: una fascia con "su recensioni" senza il numero fa piu' danno che
 * non averla.
 */
export function FasciaFiducia({ dati, compatta }: { dati: Dati; compatta?: boolean }) {
  const { anni, totale, voto, classifica, azienda } = dati;
  const voci: { n: string; t: string }[] = [];

  if (voto != null) voci.push({ n: voto.toFixed(1), t: 'average guest rating' });
  if (totale > 0) voci.push({ n: totale.toLocaleString('en-US'), t: 'verified reviews' });
  if (anni != null) voci.push({ n: `${anni}`, t: `years in Florence, since ${azienda?.anno_fondazione}` });
  if (classifica)
    voci.push({
      n: `#${dati.azienda?.classifica_posizione}`,
      t: `of ${azienda?.classifica_su} ${azienda?.classifica_categoria?.toLowerCase()}`,
    });
  if (azienda?.mezzi_minibus)
    voci.push({ n: `${azienda.mezzi_minibus}`, t: 'minibuses we own, plus our Mercedes cars' });

  if (!voci.length) return null;

  return (
    <div className={'rp-band' + (compatta ? ' rp-compatta' : '')}>
      {voci.map((v) => (
        <div className="rp-item" key={v.t}>
          <b>{v.n}</b>
          <span>{v.t}</span>
        </div>
      ))}
    </div>
  );
}

/* La riga breve, quella che sta sotto un titolo o dentro l'hero. */
export function RigaFiducia({ dati }: { dati: Dati }) {
  const { voto, totale, anni } = dati;
  if (voto == null || !totale) return null;
  return (
    <p className="rp-riga">
      <span className="rp-stelle" aria-hidden="true">★★★★★</span>
      <b>{voto.toFixed(1)}</b> from <b>{totale.toLocaleString('en-US')}</b> verified
      reviews{anni != null && <> &middot; run by the same Florence family for <b>{anni} years</b></>}
    </p>
  );
}
