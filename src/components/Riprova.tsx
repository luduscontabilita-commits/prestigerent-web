import type { Riprova as Dati } from '@/lib/riprova';
import { ANNO_FONDAZIONE } from '@/lib/anni';
import { testoBreve } from '@/lib/cifre';

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
/* 🔴 DUE NUMERI, NON CINQUE.
 *
 * Prima ne mostrava cinque: voto, recensioni, anni, posizione in
 * classifica e minibus. Sulla scheda di un tour finivano sotto quattro
 * medaglioni e sopra tre riquadri voto -- la stessa cosa detta tre volte
 * in una schermata e mezza, con due totali diversi che sembravano
 * smentirsi. Oltre una certa soglia i numeri non convincono: si
 * controllano fra loro, e chi legge si ferma al primo che non torna.
 *
 * Restano i due che rispondono alle due domande vere: quanta gente ci e'
 * gia' passata, e come si e' trovata. Gli altri tre non sono spariti dal
 * database -- vivono in "chi siamo", dove c'e' spazio per raccontarli. */
export function FasciaFiducia({ dati, compatta }: { dati: Dati; compatta?: boolean }) {
  const { azienda } = dati;
  const voci: { n: string; t: string }[] = [];

  /* Il "+" non e' modestia: e' quello che tiene vera la cifra mentre
     cresce. Un numero esatto dipinto in pagina comincia a invecchiare il
     giorno che lo si scrive. */
  if (azienda?.clienti_serviti)
    voci.push({
      n: testoBreve(azienda.clienti_serviti),
      t: `guests since ${azienda.anno_fondazione ?? ANNO_FONDAZIONE}`,
    });
  if (azienda?.voto_medio != null)
    voci.push({ n: Number(azienda.voto_medio).toFixed(1), t: 'average guest rating' });

  /* Le tre voci vecchie restano qui sotto, spente: si riaccendono
     cambiando questa riga, senza dover ricostruire niente. */
  const TUTTI = false;
  const { anni, totale, voto, classifica } = dati;
  if (TUTTI && voto != null) voci.push({ n: voto.toFixed(1), t: 'average guest rating' });
  if (TUTTI && totale > 0) voci.push({ n: totale.toLocaleString('en-US'), t: 'verified reviews' });
  if (TUTTI && anni != null) voci.push({ n: `${anni}`, t: `years in Florence, since ${azienda?.anno_fondazione}` });
  if (TUTTI && classifica)
    voci.push({
      n: `#${dati.azienda?.classifica_posizione}`,
      /* Si abbassa SOLO l'iniziale, non tutta la stringa: con
         `toLowerCase()` la fascia scriveva "of 248 transportation
         companies in florence", con Firenze in minuscolo dentro un dato
         che serve proprio a farsi verificare. Il nome della citta' sta
         nel campo del database e va lasciato com'e'. */
      t: `of ${azienda?.classifica_su} ${
        azienda?.classifica_categoria
          ? azienda.classifica_categoria.charAt(0).toLowerCase() +
            azienda.classifica_categoria.slice(1)
          : ''
      }`.trim(),
    });
  if (TUTTI && azienda?.mezzi_minibus)
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
