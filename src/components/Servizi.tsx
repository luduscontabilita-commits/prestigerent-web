import { DEFAULT_LOCALE } from '@/lib/locales';

/* I SEI CERCHI DEI SERVIZI, ripresi dalla home di WordPress.
 *
 * Sul sito vecchio erano il primo blocco dopo il titolo e facevano un
 * lavoro che qui mancava del tutto: dicono in un colpo solo CHE COSA
 * vende questa azienda. La ricerca sopra mostra i tour, ma chi arriva
 * cercando "transfer Firenze porto di Livorno" non sa che esistono
 * anche i piccoli gruppi, e viceversa.
 *
 * Le sei destinazioni sono le sei voci principali del menu di WordPress:
 * sono le pagine con piu' storia su Google dopo la home, e questo blocco
 * e' anche il modo piu' semplice di passargliela dalla home.
 *
 * ── PERCHE' IL VINO NON PUNTA A /wine-and-food-experiences/ ──────────
 * Quella URL esiste ancora ed e' indicizzata, ma sul sito nuovo e' un
 * 308 verso /destinations/florence-tuscany/ (next.config.ts spiega il
 * perche': e' l'unica pagina che contiene tutti e 7 i tour di vino).
 * Il redirect serve a chi arriva da fuori; un link interno che ci passa
 * attraverso e' solo un viaggio in piu', quindi qui si punta diritti
 * alla destinazione.
 *
 * Le immagini sono le stesse del sito vecchio, convertite in webp:
 * 286 KB di PNG diventano 108 KB, e sono ritratti di tour veri fatti da
 * loro -- non foto d'archivio.
 */

type Voce = { href: string; img: string; titolo: string; alt: string };

const VOCI: Voce[] = [
  {
    href: '/small-group-tours/',
    img: 'small-group-tour',
    titolo: 'Small group tours',
    alt: 'Guests on a small group tour in the Tuscan countryside',
  },
  {
    href: '/private-tours/',
    img: 'day-trips',
    titolo: 'Private tours',
    alt: 'A private tour group in a Tuscan hill town',
  },
  {
    href: '/cruise-port-tours/',
    img: 'shore-excursions',
    titolo: 'Cruise port tours',
    alt: 'A cruise ship in an Italian port',
  },
  {
    href: '/transfers/direct-transfers/',
    img: 'direct-transfers',
    titolo: 'Direct transfers',
    alt: 'A Mercedes-Benz van used for direct transfers',
  },
  {
    href: '/transfers/transfers-with-stop-enroute/',
    img: 'transfers-with-stops',
    titolo: 'Transfers with stops en route',
    alt: 'A transfer stopping at a viewpoint on the way',
  },
  {
    /* vedi la nota sopra: la URL storica e' un 308 verso questa */
    href: '/destinations/florence-tuscany/',
    img: 'wine-food-experiences',
    titolo: 'Wine & food experiences',
    alt: 'A wine tasting at a family winery in Tuscany',
  },
];

export function Servizi({ locale }: { locale: string }) {
  const via = (p: string) => (locale === DEFAULT_LOCALE ? p : `/${locale}${p}`);

  return (
    <section className="pr-sec" id="services" aria-labelledby="services-t">
      <div className="pr-wrap wide">
        <h2 className="sv-t" id="services-t">Services</h2>
        <p className="sv-sub">
          Wherever you are in Italy &mdash; Florence or Tuscany, Rome or Venice,
          the Amalfi Coast &mdash; we can enrich your experience.
        </p>

        <ul className="sv-grid">
          {VOCI.map((v) => (
            <li key={v.href}>
              <a className="sv-card" href={via(v.href)}>
                <span className="sv-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/servizi/${v.img}.webp`}
                    width={360}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    alt={v.alt}
                  />
                </span>
                <span className="sv-lab">{v.titolo}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
