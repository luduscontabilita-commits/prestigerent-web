import { DEFAULT_LOCALE } from '@/lib/locales';

/* Il footer, ricostruito da quello attuale di prestigerent.com con tre
 * scelte diverse e una aggiunta.
 *
 * COSA CAMBIA rispetto all'originale:
 *
 *  - "Popular experiences" aveva i tour SBAGLIATI: Cinque Terre privato e
 *    Siena-Chianti-Pisa privato. Ma l'85% del fatturato sono Siena & San
 *    Gimignano, Wine Experience e Wine & Food. Il footer e' l'ultimo blocco
 *    di link interni della pagina: e' li' che si dice a Google quali pagine
 *    contano davvero.
 *  - Via "Travel safe covid-19 policy". Nel 2026, su ogni pagina, dice
 *    "questa azienda non aggiorna il sito da cinque anni".
 *  - Via il modulo Quick Request da sette campi. Nel footer non lo compila
 *    quasi nessuno, e WhatsApp converte molto meglio (§13 del masterplan
 *    chiede moduli brevi e contatto immediato).
 *
 * COSA SI AGGIUNGE: la riga di identita' -- Firenze, dal 2002, flotta
 * propria, autisti dipendenti, 4,9 su 7.139 recensioni. E' la definizione
 * canonica dell'entita' (§6.1), cioe' cio' che permette a un'AI di sapere
 * chi e' Prestige Rent invece di indovinarlo.
 */

const ESPERIENZE = [
  ['Small group tours', '/?kind=small_group'],
  ['Private tours', '/?kind=private'],
  ['Cruise port tours', '/?kind=cruise'],
  ['Transfers', '/?kind=transfer'],
];

const PARTENZE = [
  ['Florence', '/?from=florence'],
  ['Livorno port', '/?from=livorno'],
  ['La Spezia port', '/?from=la-spezia'],
  ['Civitavecchia (Rome)', '/?from=civitavecchia'],
  ['Naples port', '/?from=naples'],
];

/* Qui ci vanno i quattro prodotti che valgono l'85%, non un campione. */
const PIU_PRENOTATI = [
  ['Siena & San Gimignano with lunch', '/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/'],
  ['Wine Experience in Tuscany', '/tour/wine-experience-in-tuscany/'],
  ['Wine & Food Experience', '/tour/wine-food-experience-in-tuscany/'],
  ['Private Chianti & wineries', '/tour/private-tour-to-chianti-wineries/'],
];

const SOCIAL = [
  ['Tripadvisor', 'https://www.tripadvisor.com/Attraction_Review-g187895-d2157589-Reviews-Prestige_Rent-Florence_Tuscany.html'],
  ['Facebook', 'https://www.facebook.com/prestigerent/'],
  ['GetYourGuide', 'https://www.getyourguide.com/prestige-rent-tours-in-italy-s8058/'],
];

export function Footer({ locale }: { locale: string }) {
  const p = (path: string) => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`);

  return (
    <footer className="ft">
      {/* la fascia delle rassicurazioni, che nell'originale funziona ed e'
          nel posto giusto -- meno la riga sul Covid */}
      <div className="ft-band">
        <span>🛡️ 24-hour free cancellation</span>
        <span>💳 No booking fees</span>
        <span>⚡ Instant confirmation</span>
        <span>⭐ 4.9 on Tripadvisor</span>
        <span>📞 24/7 customer care</span>
      </div>

      <div className="ft-in">
        <div className="ft-col ft-about">
          <strong>Prestige Rent</strong>
          <p>
            Tours and private transfers across Italy, from Florence since 2002. We own
            our fleet &mdash; 11 minibuses and our Mercedes cars &mdash; and our drivers
            are our own staff, not subcontractors.
          </p>
          <p className="ft-nap">
            Via Della Saggina 98, 50145 Florence, Italy<br />
            <a href="tel:+39055286059">+39 055 286059</a> ·{' '}
            <a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>
          </p>
          <a className="ft-wa" href="https://wa.me/393338424047" target="_blank" rel="noopener">
            Message us on WhatsApp
          </a>
        </div>

        <div className="ft-col">
          <p className="ft-t">Experiences</p>
          {ESPERIENZE.map(([t, h]) => (
            <a key={h} href={p(h)}>{t}</a>
          ))}
        </div>

        <div className="ft-col">
          <p className="ft-t">Departing from</p>
          {PARTENZE.map(([t, h]) => (
            <a key={h} href={p(h)}>{t}</a>
          ))}
        </div>

        <div className="ft-col">
          <p className="ft-t">Most booked</p>
          {PIU_PRENOTATI.map(([t, h]) => (
            <a key={h} href={p(h)}>{t}</a>
          ))}
        </div>
      </div>

      {/* IL PROMEMORIA. Sta in fondo, e' rosso e ha un link che porta dritto
          dove si spegne. Deve dare fastidio: e' l'unica difesa contro i due
          errori che non danno nessun sintomo -- andare online col noindex
          acceso, e lasciare pubblico il repo del cliente. Ogni riga sparisce
          da sola quando la sua variabile viene spenta. */}
      {(process.env.SITE_NOINDEX !== 'false' || process.env.REPO_PUBLIC === 'true') && (
        <div className="ft-warn">
          {process.env.SITE_NOINDEX !== 'false' && (
            <a
              href="https://vercel.com/traliccioelettrico-wqs-projects/prestigerent-web/settings/environment-variables"
              target="_blank"
              rel="noopener"
            >
              ⚠️ QUESTO SITO È INVISIBILE A GOOGLE — il giorno del passaggio metti
              SITE_NOINDEX=false su Vercel e ripubblica. Clicca qui per farlo.
            </a>
          )}
          {process.env.REPO_PUBLIC === 'true' && (
            <a
              href="https://github.com/luduscontabilita-commits/prestigerent-web/settings"
              target="_blank"
              rel="noopener"
            >
              ⚠️ IL REPO È PUBBLICO — reso pubblico solo per collegare Vercel.
              Rimettilo privato, poi REPO_PUBLIC=false. Clicca qui.
            </a>
          )}
        </div>
      )}

      <div className="ft-bottom">
        <span>&copy; {new Date().getFullYear()} Prestige Rent S.R.L. &mdash; Florence, Italy</span>
        <span className="ft-social">
          {SOCIAL.map(([t, h]) => (
            <a key={h} href={h} target="_blank" rel="noopener">{t}</a>
          ))}
        </span>
      </div>
    </footer>
  );
}
