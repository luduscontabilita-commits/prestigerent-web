import { DEFAULT_LOCALE } from '@/lib/locales';
import { riprova } from '@/lib/riprova';
import { RiapriPreferenze } from '@/components/Consenso';
/* Le regole `.ft-legale*` stanno qui e non in `home.css` accanto alle
   altre `.ft-*`: `home.css` e' in mano ad altri in questo momento, e due
   persone che scrivono in fondo allo stesso file si scontrano a ogni
   pull. Il foglio e' lo stesso delle tre pagine legali, ed e' piccolo. */
import '@/styles/legale.css';

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
/* La pagina che sul sito attuale NON esiste: /about-us/ rimanda ai
   mezzi. E' il buco che il baseline aveva trovato -- 87 pagine di
   prodotto e zero di identita'. */
const AZIENDA = [
  ['About us', '/about-us/'],
];

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

export async function Footer({ locale }: { locale: string }) {
  const p = (path: string) => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`);
  /* Nessun numero scritto qui dentro: arrivano tutti dalla riga
     `azienda` e da `fonti_recensioni`. Si cambiano li' e cambiano
     in tutte le pagine nello stesso momento. */
  const d = await riprova();
  const a = d.azienda;

  return (
    <footer className="ft">
      {/* la fascia delle rassicurazioni, che nell'originale funziona ed e'
          nel posto giusto -- meno la riga sul Covid */}
      <div className="ft-band">
        <span>🛡️ 24-hour free cancellation</span>
        <span>💳 No booking fees</span>
        <span>⚡ Instant confirmation</span>
        {d.voto != null && (
          <span>⭐ {d.voto.toFixed(1)} from {d.totale.toLocaleString('en-US')} reviews</span>
        )}
        <span>📞 24/7 customer care</span>
      </div>

      <div className="ft-in">
        <div className="ft-col ft-about">
          <strong>Prestige Rent</strong>
          <p>
            Tours and private transfers across Italy, from {a?.citta ?? 'Florence'} since{' '}
            {a?.anno_fondazione}. We own our fleet &mdash; {a?.mezzi_minibus} minibuses and
            our {a?.mezzi_auto} &mdash; and our drivers are our own staff, not
            subcontractors.
          </p>
          <p className="ft-nap">
            {a?.indirizzo}<br />
            <a href={`tel:${a?.telefono?.replace(/\s/g, '')}`}>{a?.telefono}</a> ·{' '}
            <a href={`mailto:${a?.email}`}>{a?.email}</a>
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
          {AZIENDA.map(([t, h]) => (
            <a key={h} href={p(h)} style={{ marginTop: 10 }}>{t}</a>
          ))}
        </div>
      </div>

      {/* IL PROMEMORIA. Sta in fondo, e' rosso e ha un link che porta dritto
          dove si spegne. Deve dare fastidio: e' l'unica difesa contro un
          errore che non da' nessun sintomo -- andare online col noindex
          acceso e sparire da Google senza accorgersene.

          🔴 E' SCRITTO IN ITALIANO E LINKA AL PANNELLO PRIVATO, quindi non
          deve MAI essere visibile a un cliente. Per questo tutto il blocco
          -- compresa la riga sul repository pubblico, che prima aveva una
          condizione sua -- vive dentro `SITE_NOINDEX !== 'false'`: il
          giorno del passaggio si spegne quella variabile e sparisce tutto
          insieme, senza che nessuno debba ricordarsi di una seconda riga.
          Prima bastava REPO_PUBLIC=true perche' un avviso in italiano, con
          il link alle impostazioni di GitHub, restasse in fondo a tutte e
          123 le pagine viste da un cliente americano. */}
      {process.env.SITE_NOINDEX !== 'false' && (
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

      {/* L'accesso al pannello. Piccolo e in fondo: serve a chi lavora al


          sito, non ai clienti. Non e' un segreto -- l'indirizzo si


          indovina in un secondo -- ma non deve rubare spazio a niente. */}


      <a className="ft-admin" href="/admin/">Staff</a>


      <div className="ft-bottom">
        <span className="ft-social">
          {SOCIAL.map(([t, h]) => (
            <a key={h} href={h} target="_blank" rel="noopener">{t}</a>
          ))}
        </span>
      </div>

      {/* LA RIGA LEGALE.
       *
       * Prima qui c'era solo il copyright. Il D.Lgs. 70/2003 art. 7
       * chiede che denominazione, sede, partita IVA e iscrizione al
       * registro imprese siano "facilmente e permanentemente
       * accessibili": sul sito nuovo la partita IVA e il REA non
       * comparivano da nessuna parte, ne' qui, ne' in /about-us/, ne'
       * nel JSON-LD Organization.
       *
       * I numeri NON sono inventati: P.IVA 05745220482 e REA FI 571489
       * sono pubblicati oggi su prestigerent.com in due punti diversi --
       * il footer e i termini e condizioni -- e le due fonti concordano.
       *
       * L'indirizzo e' scritto qui e non letto da `azienda` come quello
       * della colonna qui sopra: quello e' il recapito commerciale, che
       * un giorno puo' cambiare senza che cambi la sede legale, e questa
       * riga deve dire la SEDE LEGALE. Se un giorno divergono, il bug e'
       * farle arrivare dalla stessa fonte. */}
      <div className="ft-legale">
        <p className="ft-dati">
          {/* "· share capital" restava li' senza il valore, su tutte e 123 le
              pagine: una frase legale che finisce a meta' fa dubitare di
              tutte le altre. Il capitale sociale non e' obbligatorio in
              questa riga -- lo sono partita IVA, sede e REA, che ci sono --
              quindi si toglie invece di lasciarla monca. Quando il numero
              arriva si rimette, con il numero. */}
          <strong>Prestige Rent S.r.l.</strong> &mdash; Via della Saggina 98, 50145
          Florence, Italy &middot; VAT no. IT05745220482 &middot; Florence Register of
          Companies, REA no. FI 571489
        </p>
        <p className="ft-legali">
          <a href={p('/privacy-policy/')}>Privacy Policy</a>
          <a href={p('/cookie-policy/')}>Cookie Policy</a>
          <a href={p('/terms-and-conditions/')}>Terms &amp; Conditions</a>
          {/* Il consenso dev'essere revocabile con la stessa facilita' con
              cui e' stato dato: senza questo bottone l'unico modo e'
              cancellare i cookie a mano. Arriva da `Consenso.tsx`. */}
          <RiapriPreferenze />
        </p>
        <p className="ft-copy">
          &copy; {new Date().getFullYear()} Prestige Rent S.r.l. &mdash; Florence, Italy
        </p>
      </div>
    </footer>
  );
}
