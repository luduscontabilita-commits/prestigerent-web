import type { Fonte, Recensione } from '@/lib/recensioni';
import { RecensioneCard } from '@/components/RecensioneCard';

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

/* QUALI PUNTEGGI SI POSSONO CLICCARE.
 *
 * Sembra un dettaglio ed e' una decisione commerciale. Su Viator e
 * GetYourGuide la pagina delle recensioni E' la pagina di vendita: un
 * riquadro cliccabile prende un cliente gia' convinto, gia' sul nostro
 * sito, e lo consegna all'intermediario che si trattiene il 25-30%.
 * Sarebbe pagare una commissione per una prenotazione che avevamo in mano.
 *
 * Il numero pero' serve, e serve proprio perche' viene da loro. Quindi si
 * mostra e non si linka: chi vuole controllare cerca il nome del tour su
 * Viator in dieci secondi -- ma lo fa dopo, non con un clic partito da qui.
 *
 * Google e Tripadvisor si linkano: sono pagine di recensioni, non carrelli.
 * (Tripadvisor un pulsante "prenota" ce l'ha, ma la pagina resta una
 * pagina di recensioni e il link e' quello che rende il 4,9 verificabile.)
 */
const SI_LINKA = new Set(['google', 'tripadvisor']);

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

  const totale = fonti.reduce((s, f) => s + (f.quante ?? 0), 0);
  /* "Viator & Tripadvisor and GetYourGuide" suonerebbe male: l'ultimo si
     unisce con "and", gli altri con la virgola. */
  const etichette = fonti.map((f) => f.etichetta);
  const nomi =
    etichette.length > 1
      ? etichette.slice(0, -1).join(', ') + ' and ' + etichette[etichette.length - 1]
      : etichette[0];

  return (
    <section id="reviews" className="rv">
      <div className="rv-head">
        <h2 className="rv-title">
          {titolo.split(' ').slice(0, -1).join(' ')}{' '}
          <em className="hl place">{titolo.split(' ').slice(-1)}</em>
        </h2>
        {/* Il totale sommato, ma solo dove sommare e' LECITO.
            Viator dichiara "recensioni e punteggi totali da Viator e
            Tripadvisor": il suo numero include gia' Tripadvisor, quindi le
            due non si sommano mai. GetYourGuide invece e' una piattaforma
            separata, con un suo pubblico, e li' la somma e' vera.
            La riga si costruisce da sola: se un domani si aggiunge una
            fonte, il totale e l'elenco dei nomi si aggiornano insieme. */}
        <p className="rv-sub">
          {totale > 0 ? (
            <>
              <b>{totale.toLocaleString('en-US')}</b> verified reviews on{' '}
              {nomi} &mdash; every one of them public on the platform it came from.
            </>
          ) : (
            <>Every review below is public on the platform it came from.</>
          )}
        </p>
      </div>

      {/* LA FILA DEI BADGE.
          E' la cosa che convince prima ancora che si legga una riga. Ogni
          piattaforma ha il suo colore, la sua barra in alto e il suo peso
          tipografico: si riconoscono a colpo d'occhio, senza leggere.

          I numeri sono quelli veri, non arrotondati: "1,794" si legge come
          un dato, "1,800+" si legge come pubblicita'. Invecchiano, e va
          bene -- fra sei mesi saranno di piu', non di meno. */}
      {fonti.length > 0 && (
        <div className="rv-badges">
          {fonti.map((f) => {
            const dentro = (
              <>
                <span className="rv-b-top" aria-hidden="true" />
                <span className="rv-b-name">{f.etichetta}</span>
                <span className="rv-b-score">
                  <b>{f.voto_medio?.toFixed(1)}</b>
                  <span className="rv-b-of">/5</span>
                </span>
                <span className="rv-b-stars" aria-hidden="true">
                  {STELLE(Math.round(f.voto_medio!))}
                </span>
                <span className="rv-b-count">
                  {f.quante?.toLocaleString('en-US')}{' '}
                  {f.suQuestoTour ? 'reviews of this tour' : 'reviews'}
                </span>
                {f.distintivo && <span className="rv-b-award">{f.distintivo}</span>}
              </>
            );
            const cl = 'rv-badge rv-b-' + f.fonte;
            return f.url && SI_LINKA.has(f.fonte) ? (
              <a className={cl} key={f.fonte} href={f.url} target="_blank" rel="noopener nofollow">
                {dentro}
                <span className="rv-b-go">Read them on {f.etichetta} &rarr;</span>
              </a>
            ) : (
              <div className={cl} key={f.fonte}>{dentro}</div>
            );
          })}
        </div>
      )}

      {recensioni.length > 0 && (
        <div className="rv-grid">
          {recensioni.map((r) => (
            <RecensioneCard key={r.id} r={r} />
          ))}
        </div>
      )}

    </section>
  );
}
