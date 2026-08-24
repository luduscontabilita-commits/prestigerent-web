import type { Fonte, Recensione } from '@/lib/recensioni';

/* Le recensioni vere, da piu' piattaforme.
 *
 * ── PERCHE' PIU' DI UNA FONTE ──────────────────────────────────────────
 * Una sola piattaforma si puo' comprare, e chi prenota lo sa. Quattro loghi
 * diversi che dicono lo stesso numero non si comprano: e' la differenza fra
 * "dicono di essere bravi" e "sono bravi". Ogni riquadro porta il link alla
 * pagina d'origine, perche' chi vuole controllare deve poterlo fare in un
 * clic -- ed e' proprio la possibilita' di controllare che rende il numero
 * credibile a chi non controlla.
 *
 * ── PERCHE' QUI NON C'E' NESSUN DATO STRUTTURATO ───────────────────────
 * Sembra un'occasione persa: mettere `aggregateRating` farebbe comparire le
 * stelline nei risultati di Google. NON si fa, per due motivi.
 *
 * 1. Google vieta esplicitamente di marcare recensioni raccolte altrove
 *    come proprie ("self-serving reviews", e la regola sui contenuti presi
 *    da terzi). Non e' una zona grigia: e' scritto nelle linee guida dei
 *    risultati arricchiti. La sanzione non e' "niente stelline", e' la
 *    perdita dei risultati arricchiti su TUTTO il dominio.
 * 2. Le stelline di Prestige Rent Google le prende gia' -- dalla scheda
 *    Google Business, che e' la fonte che lui stesso considera valida.
 *    Duplicarle qui non aggiunge niente e mette a rischio quelle vere.
 *
 * Il masterplan (§7.1) chiede dati strutturati solo per recensioni "reali e
 * verificabili" raccolte sul proprio sito. Quel giorno arrivera' -- quando
 * le recensioni le chiederemo noi a fine servizio (Modulo 1) -- e allora
 * `aggregateRating` si potra' mettere, perche' saranno nostre.
 *
 * Per le AI, invece, questo blocco conta eccome: e' testo in chiaro nel
 * codice della pagina, con nomi, date e piattaforma. Un modello che deve
 * dire "com'e' Prestige Rent" lo legge senza bisogno di alcun markup.
 */

const STELLE = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

const MESI = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function quando(d: string | null) {
  if (!d) return null;
  const [a, m] = d.split('-');
  return `${MESI[Number(m) - 1]} ${a}`;
}

export function Recensioni({
  fonti,
  recensioni,
  titolo = 'What our guests actually say',
}: {
  fonti: Fonte[];
  recensioni: Recensione[];
  titolo?: string;
}) {
  if (!recensioni.length && !fonti.length) return null;

  return (
    <section id="reviews" className="rv">
      <div className="rv-head">
        <h2 className="rv-title">
          {titolo.split(' ').slice(0, -1).join(' ')}{' '}
          <em className="hl place">{titolo.split(' ').slice(-1)}</em>
        </h2>
        <p className="rv-sub">
          Every review below is public on the platform it came from &mdash; click any
          score to read them all.
        </p>
      </div>

      {/* la fila dei numeri: e' quella che convince prima ancora di leggere */}
      {fonti.length > 0 && (
        <div className="rv-scores">
          {fonti.map((f) => {
            const dentro = (
              <>
                <b>{f.voto_medio?.toFixed(1)}</b>
                <span className="rv-stars" aria-hidden="true">{STELLE(Math.round(f.voto_medio!))}</span>
                <small>
                  {f.quante?.toLocaleString('en-US')} reviews on {f.etichetta}
                  {f.distintivo && <><br />{f.distintivo}</>}
                </small>
              </>
            );
            return f.url ? (
              <a className="rv-score" key={f.fonte} href={f.url} target="_blank" rel="noopener nofollow">
                {dentro}
              </a>
            ) : (
              <div className="rv-score" key={f.fonte}>{dentro}</div>
            );
          })}
        </div>
      )}

      {recensioni.length > 0 && (
        <div className="rv-grid">
          {recensioni.map((r) => (
            <figure className="rv-card" key={r.id}>
              <div className="rv-card-top">
                <span className="rv-stars" aria-label={`${r.voto} out of 5`}>{STELLE(r.voto)}</span>
                <span className={'rv-src rv-src-' + r.fonte}>{r.fonte === 'getyourguide' ? 'GetYourGuide' : r.fonte[0].toUpperCase() + r.fonte.slice(1)}</span>
              </div>
              {r.titolo && <strong className="rv-card-t">{r.titolo}</strong>}
              <blockquote>{r.testo}</blockquote>
              <figcaption>
                {r.autore}
                {r.paese && <span> &middot; {r.paese}</span>}
                {r.data && <span> &middot; {quando(r.data)}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
