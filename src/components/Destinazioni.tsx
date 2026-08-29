import { foto as ottimizza, fotoSet } from '@/lib/foto';

/* LE DESTINAZIONI, COME SULLA HOME DI WORDPRESS.
 *
 * Otto riquadri con la foto e sopra il nome del posto: Florence & Tuscany,
 * Rome, Venice, e cosi' via. Sul sito nuovo questa sezione non esisteva --
 * le destinazioni vivevano solo dentro il menu, cioe' le trovava chi
 * sapeva gia' di cercarle.
 *
 * ── PERCHE' CONTA PIU' DI QUANTO SEMBRI ─────────────────────────────
 * Chi arriva sulla home non cerca "un tour": cerca il posto dove sta o
 * dove va. "Sono a Firenze", "sbarco a Livorno", "vado a Roma". Le
 * pastiglie delle categorie rispondono a un'altra domanda -- che TIPO di
 * giro -- e sono inutili a chi non sa ancora dove vuole andare.
 *
 * ── LA FOTO E' SCELTA A MANO, E NON PER VEZZO ───────────────────────
 * Ogni destinazione dichiara il tour da cui prende l'immagine. Presa
 * "dal primo tour della categoria" sarebbe cambiata da sola ogni volta
 * che qualcuno riordina il catalogo dal pannello: la home avrebbe
 * cambiato faccia senza che nessuno l'avesse deciso, e nessuno avrebbe
 * saputo perche'. Se una foto va cambiata, si cambia lo slug qui.
 */

type Tour = { slug: string; foto: string | null };

const POSTI: { titolo: string; href: string; da: string; alt: string }[] = [
  {
    titolo: 'Florence & Tuscany',
    href: '/destinations/florence-tuscany/',
    da: 'wine-experience-in-tuscany',
    alt: 'Vineyards and rolling hills in the Chianti countryside',
  },
  {
    titolo: 'Rome',
    href: '/destinations/rome-destinations/',
    da: 'private-tour-to-rome-from-florence',
    alt: 'Rome seen on a day trip from Florence',
  },
  {
    titolo: 'Venice',
    href: '/destinations/venice-destinations/',
    da: 'private-tour-to-venice-from-florence',
    alt: 'The canals of Venice',
  },
  {
    titolo: 'Milan & Lake Como',
    href: '/destinations/milan-como-destinations/',
    da: 'milan-with-stop-at-lamborghini',
    alt: 'Milan and the lakes, with the motor valley on the way',
  },
  {
    titolo: 'Naples & the Amalfi Coast',
    href: '/destinations/naples-amalfi-coast/',
    da: 'pompeii-vesuvius-from-naples-port',
    alt: 'Pompeii and Vesuvius, from the port of Naples',
  },
  {
    titolo: 'From Livorno port',
    href: '/destinations/livorno-port-destinations/',
    da: 'florence-tuscany-from-livorno-port',
    alt: 'Shore excursions from the Livorno quay',
  },
  {
    titolo: 'From La Spezia port',
    href: '/destinations/la-spezia-destinations/',
    da: 'tour-chianti-wineries-from-la-spezia',
    alt: 'The Cinque Terre and Tuscany from La Spezia',
  },
  {
    titolo: 'From Civitavecchia port',
    href: '/destinations/civitavecchia-destinations/',
    da: 'private-tarquinia-from-civitavecchia',
    alt: 'Rome and Etruria from the port of Civitavecchia',
  },
];

export function Destinazioni({ tours, p }: { tours: Tour[]; p: (path: string) => string }) {
  const perSlug = new Map(tours.map((t) => [t.slug, t.foto]));

  /* Una destinazione senza foto non si disegna: un riquadro grigio col
     nome sopra sembra un errore di caricamento, e su una home fa piu'
     danno di una destinazione in meno. */
  const posti = POSTI.map((d) => ({ ...d, src: perSlug.get(d.da) ?? null })).filter(
    (d): d is typeof d & { src: string } => Boolean(d.src),
  );
  if (posti.length < 4) return null;

  return (
    <section className="pr-sec dst" id="destinations">
      <div className="pr-wrap wide">
        <div className="pr-head dst-head">
          <h2 className="pr-title">
            Where do you <em className="hl place">want to go</em>
          </h2>
          <a className="dst-tutte" href={p('/destinations/')}>
            All destinations &rarr;
          </a>
        </div>

        <div className="dst-grid">
          {posti.map((d) => (
            <a className="dst-card" href={p(d.href)} key={d.href}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ottimizza(d.src, 828)}
                srcSet={fotoSet(d.src, [640, 828, 1200])}
                sizes="(max-width: 760px) 92vw, (max-width: 1100px) 46vw, 24vw"
                alt={d.alt}
                loading="lazy"
                decoding="async"
              />
              <span className="dst-vel" aria-hidden="true" />
              <span className="dst-nome">{d.titolo}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
