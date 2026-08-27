/* Le video testimonianze girate dagli ospiti col telefono.
 *
 * Stavano solo sulle landing statiche di prestigerent.com/lp/, mai portate
 * sul sito nuovo. Restano ospitate li': sono nove file fra i 3 e i 12 MB,
 * metterli nel repo Next gonfierebbe il bundle e il deploy senza guadagno.
 * Gli URL sono stati verificati uno per uno prima di scriverli qui -- tutti
 * e nove i .mp4 e tutti e nove i poster .jpg rispondono 200 con un corpo
 * vero (un nome inventato sullo stesso percorso da' 404, quindi non e' un
 * catch-all che risponde sempre 200).
 *
 * E' un server component: non c'e' stato, non c'e' interazione oltre ai
 * controlli nativi del <video>. Tenerlo lato server significa zero
 * JavaScript spedito al browser per questa sezione.
 */

/* Tutti i filmati sono 720x1280, cioe' verticali: sono girati col telefono
 * tenuto in mano, non prodotti. Il CSS li impagina come verticali apposta --
 * ritagliarli in orizzontale taglierebbe la faccia di chi parla, che e'
 * l'unica cosa che conta in una testimonianza. Il formato "storia" e' anche
 * il motivo per cui risultano credibili invece che promozionali.
 */
const BASE = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/video';

type Clip = {
  /* nome del file senza estensione: mp4 e poster jpg condividono lo stesso */
  nome: string;
  /* serve solo a alternare i temi nella griglia, non finisce nel markup */
  tema: 'wine' | 'siena';
  /* true quando il poster .jpg e' stato verificato; se un giorno manca, il
   * video si mostra comunque e l'attributo poster sparisce da solo */
  poster: boolean;
  didascalia: string;
};

/* Le didascalie descrivono cosa si vede e basta. Di queste persone non
 * sappiamo il nome, la citta' o il motivo del viaggio: scriverli sarebbe
 * inventare una recensione, che e' esattamente il contrario di quello che
 * questi filmati dimostrano. Meglio una riga asciutta e vera.
 *
 * L'ordine e' gia' quello di uscita: wine e Siena si alternano, cosi'
 * qualsiasi valore di `quanti` pesca un misto invece di quattro clip tutte
 * uguali. La proposta di matrimonio sta in quinta posizione di proposito:
 * e' il filmato piu' personale del gruppo e non deve fare da specchietto in
 * cima alla griglia.
 */
const CLIP: Clip[] = [
  { nome: 'testimonial-t1', tema: 'wine', poster: true, didascalia: 'A guest talking to camera at the end of a day in Chianti.' },
  { nome: 'testimonial-sg1', tema: 'siena', poster: true, didascalia: 'Filmed on the way back from Siena and San Gimignano.' },
  { nome: 'testimonial-t2', tema: 'wine', poster: true, didascalia: 'A few words recorded in the courtyard of the second winery.' },
  { nome: 'testimonial-sg2', tema: 'siena', poster: true, didascalia: 'A guest describing the afternoon in San Gimignano.' },
  { nome: 'testimonial-proposal', tema: 'wine', poster: true, didascalia: 'A guest who proposed to his partner during a wine tour, filmed shortly afterwards.' },
  { nome: 'testimonial-t3', tema: 'wine', poster: true, didascalia: 'Recorded between two tastings, still at the table.' },
  { nome: 'testimonial-sg3', tema: 'siena', poster: true, didascalia: 'A guest speaking after the walk through the centre of Siena.' },
  { nome: 'testimonial-t4', tema: 'wine', poster: true, didascalia: 'A guest talking about the drive through the vineyards.' },
  { nome: 'testimonial-sg4', tema: 'siena', poster: true, didascalia: 'Filmed in San Gimignano, at the end of the visit.' },
];

export function VideoTestimonianze({
  titolo = 'Guests, filmed on the day',
  sottotitolo = 'These were recorded on our tours, on a phone, by the people who were there. Nothing was scripted and nothing was re-shot.',
  quanti = 4,
}: {
  titolo?: string;
  sottotitolo?: string;
  quanti?: number;
}) {
  /* Math.max evita che un `quanti` a zero o negativo produca una sezione
   * vuota con solo il titolo appeso. */
  const scelte = CLIP.slice(0, Math.max(0, quanti));

  if (!scelte.length) return null;

  return (
    <section className="vt">
      <div className="vt-head">
        <h2>{titolo}</h2>
        <p>{sottotitolo}</p>
      </div>
      <div className="vt-grid">
        {scelte.map((c) => (
          <figure className="vt-item" key={c.nome}>
            {/* preload="none" non e' opzionale: quattro filmati da diversi MB
              * l'uno scaricati in automatico si mangerebbero la banda del
              * telefono prima ancora che qualcuno decida di guardarli, e la
              * home e' proprio dove arriva il traffico a pagamento. Con il
              * poster al posto del primo fotogramma si vede comunque una
              * faccia; il video parte solo se lo si chiede. */}
            <video
              controls
              preload="none"
              playsInline
              poster={c.poster ? `${BASE}/${c.nome}.jpg` : undefined}
            >
              <source src={`${BASE}/${c.nome}.mp4`} type="video/mp4" />
            </video>
            <figcaption className="vt-cap">{c.didascalia}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
