import { DEFAULT_LOCALE } from '@/lib/locales';
import { ANNO_FONDAZIONE } from '@/lib/anni';
import { testoBreve } from '@/lib/cifre';
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
 * COSA SI AGGIUNGE: la riga di identita' -- Firenze, dall'anno di
 * fondazione (`src/lib/anni.ts`), flotta
 * propria, autisti dipendenti, 4,9 su 7.139 recensioni. E' la definizione
 * canonica dell'entita' (§6.1), cioe' cio' che permette a un'AI di sapere
 * chi e' Prestige Rent invece di indovinarlo.
 */

/* 🔴 PAGINE VERE, NON LA HOME FILTRATA (31/08/2026).
 *
 * Qui c'erano quattro voci che puntavano a `/?kind=small_group` e simili:
 * la home con un filtro addosso. Il footer vecchio invece puntava alle
 * SETTE pagine di categoria, e aveva ragione lui -- quelle pagine adesso
 * esistono tutte sul sito nuovo, hanno un titolo, un testo scritto e un
 * indirizzo proprio. Un link a una pagina vale; un link alla home con un
 * parametro attaccato non dice a Google che quella pagina esiste.
 *
 * Controllate una per una il 31/08/2026: tutte rispondono 200. */
const ESPERIENZE = [
  ['Small group tours', '/small-group-tours/'],
  ['Private tours', '/private-tours/'],
  ['Cruise port tours', '/cruise-port-tours/'],
  ['Wine and food experiences', '/wine-and-food-experiences/'],
  ['Direct transfers', '/transfers/direct-transfers/'],
  ['Transfers with a stop', '/transfers/transfers-with-stop-enroute/'],
  ['Tours of Italy', '/tours-of-italy/'],
];

/* 🔴 LE DESTINAZIONI AL POSTO DI "DEPARTING FROM".
 *
 * Prima c'erano cinque voci `/?from=...`, che sono la stessa home filtrata
 * cinque volte. Il footer vecchio aveva una colonna di destinazioni con
 * pagine proprie -- Firenze, Roma, Venezia, Napoli, i due porti -- e sono
 * pagine che sul sito nuovo ci sono e rispondono. E' anche la colonna che
 * risponde alla domanda con cui la gente arriva davvero: non "che tipo di
 * tour", ma "ci portate a Roma?". */
const DESTINAZIONI = [
  ['Florence & Tuscany', '/destinations/florence-tuscany/'],
  ['Rome', '/destinations/rome-destinations/'],
  ['Venice', '/destinations/venice-destinations/'],
  ['Milan & Lake Como', '/destinations/milan-como-destinations/'],
  ['Naples & Amalfi Coast', '/destinations/naples-amalfi-coast/'],
  ['Livorno port', '/destinations/livorno-port-destinations/'],
  ['Civitavecchia port', '/destinations/civitavecchia-destinations/'],
  ['See all destinations', '/destinations/'],
];

/* Qui ci vanno i quattro prodotti che valgono l'85%, non un campione. */
/* La pagina che sul sito attuale NON esiste: /about-us/ rimanda ai
   mezzi. E' il buco che il baseline aveva trovato -- 87 pagine di
   prodotto e zero di identita'. */
/* ── LE VOCI DEL FOOTER VECCHIO CHE PORTANO ANCORA DA QUALCHE PARTE ──
 *
 * Il footer di WordPress ne aveva dieci: Faq's, Contact Us, Meeting Point,
 * Quick Request, Our Vehicles, Reviews, Security, Affiliate Program,
 * Covid-19, Payment.
 *
 * Sul sito nuovo sette di quelle **finiscono tutte su /about-us/** (sono i
 * redirect che evitano i 404 sulle URL vecchie). Rimetterle tutte darebbe
 * un menu di dieci voci che vanno tutte nello stesso posto -- che per
 * l'indicizzazione vale MENO di quattro voci che vanno in quattro posti
 * diversi: Google conta le destinazioni, non le righe.
 *
 * Restano quelle con una destinazione propria. `Meeting point` sta ancora
 * sul vecchio hosting e ci resta (e' la pagina che il cliente apre il
 * giorno del tour); `Payment` e' il link Stripe, esterno e vivo. */
const AZIENDA = [
  /* Le 145 domande. Sul vecchio sito questa voce c'era nel piede di ogni
     pagina, ed e' li' che la gente la cerca: quando ha una domanda pratica
     e non sa dove chiederla. */
  ['FAQs', '/faqs/'],
  ['Contact us', '/contact-us/'],
  ['Meeting point', '/mp/'],
  ['About us', '/about-us/'],
  /* Il footer vecchio diceva "Our Vehicles" e mandava a una pagina sua;
     sul sito nuovo quella pagina e' diventata la sezione della flotta in
     home. Si punta dritto all'ancora invece che all'indirizzo vecchio: il
     redirect funziona, ma ogni salto in piu' e' tempo perso e un pezzo di
     autorevolezza che resta per strada. */
  ['Our vehicles', '/#fleet'],
];

/* 🔴 TRE VOCI DEL FOOTER VECCHIO CHE NON TORNANO.
 * `Reviews`, `Security` e `Affiliate program` oggi finiscono TUTTE E TRE
 * su /about-us/ (verificato il 31/08/2026: 308). Rimetterle vorrebbe dire
 * tre righe diverse che aprono la stessa pagina -- per chi legge e' un
 * footer che promette tre cose e ne mantiene una. Tornano il giorno che
 * quelle pagine esistono davvero.
 * `Covid-19` non torna e basta: nel 2026 dice "non aggiorniamo il sito da
 * cinque anni". */

/* Fuori dal sito: non passano da `p()` perche' non hanno una lingua. */
const AZIENDA_FUORI = [
  ['Payment', 'https://buy.stripe.com/3cscPw1LA6Gn1yMbIZ'],
];

const PIU_PRENOTATI = [
  ['Siena & San Gimignano with lunch', '/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/'],
  ['Wine Experience in Tuscany', '/tour/wine-experience-in-tuscany/'],
  ['Wine & Food Experience', '/tour/wine-food-experience-in-tuscany/'],
  ['Private Chianti & wineries', '/tour/private-tour-to-chianti-wineries/'],
];

/* 🔴 IL FOOTER NON MANDA PIU' FUORI (31/08/2026).
   C'erano Tripadvisor, Instagram, Facebook, TikTok e GetYourGuide. Tolti
   tutti su richiesta della proprieta', e la ragione regge: gli ultimi due
   sono i marketplace da cui questo sito serve proprio ad affrancarsi --
   un cliente arrivato qui, mandato su GetYourGuide, torna a comprare da
   loro e la commissione la pagate voi. Anche gli altri tre portano fuori
   dalla pagina nel punto in cui l'unica cosa che deve succedere e'
   prenotare.
   Gli indirizzi restano scritti qui sotto: il giorno che si vogliono
   rimettere -- magari solo i social, non i marketplace -- basta
   riportarli nell'elenco.

   const SOCIAL = [
     ['Tripadvisor',  'https://www.tripadvisor.com/Attraction_Review-g187895-d2157589-Reviews-Prestige_Rent-Florence_Tuscany.html'],
     ['Instagram',    'https://www.instagram.com/prestigerentitaly'],
     ['Facebook',     'https://www.facebook.com/prestigerent/'],
     ['TikTok',       'https://www.tiktok.com/@prestigerentitaly'],
     ['GetYourGuide', 'https://www.getyourguide.com/prestige-rent-tours-in-italy-s8058/'],
   ];
*/
const SOCIAL: [string, string][] = [];

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
        {/* 🔴 UN NUMERO SOLO, E VIENE DALLA TABELLA.
            Qui c'era "4.9 from 14,005 reviews": un terzo conteggio di
            recensioni, diverso dai due che comparivano piu' su nella
            stessa pagina. Tre cifre che parlano della stessa cosa e non
            coincidono non convincono, si smentiscono.
            Adesso si dice quanti clienti sono passati, che e' il numero
            che nessun'altra parte della pagina puo' contraddire. E si
            legge da `azienda.clienti_serviti`: il giorno che quella riga
            cambia, cambia ovunque -- footer, schede tour, home -- senza
            che nessuno debba andare a cercare dov'era scritto. */}
        {a?.clienti_serviti != null && (
          <span>⭐ {testoBreve(a.clienti_serviti)} guests since {a.anno_fondazione ?? ANNO_FONDAZIONE}</span>
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
          <p className="ft-t">Destinations</p>
          {DESTINAZIONI.map(([t, h]) => (
            <a key={h} href={p(h)}>{t}</a>
          ))}
        </div>

        <div className="ft-col">
          <p className="ft-t">Most booked</p>
          {PIU_PRENOTATI.map(([t, h]) => (
            <a key={h} href={p(h)}>{t}</a>
          ))}
        </div>

        {/* 🔴 L'AZIENDA IN UNA COLONNA SUA.
            Prima "About us", "FAQs", "Meeting point" e "Payment" stavano
            in coda ai tour piu' prenotati, separati solo da un margine:
            quattro voci che non c'entrano niente con le altre, sotto un
            titolo che dice "Most booked". Chi cercava le domande
            frequenti doveva leggere una lista di tour per trovarle. */}
        <div className="ft-col">
          <p className="ft-t">Help</p>
          {AZIENDA.map(([t, h]) => (
            <a key={h} href={p(h)}>{t}</a>
          ))}
          {AZIENDA_FUORI.map(([t, h]) => (
            <a key={h} href={h} target="_blank" rel="noopener">
              {t}
            </a>
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

      {/* 🔴 QUI C'ERA IL LINK "Staff" AL PANNELLO, TOLTO IL 01/09/2026.
          Stava nel footer, quindi non su una pagina ma su tutte e 124:
          ogni scheda tour, ogni categoria, ogni landing pubblicava
          l'indirizzo della porta di servizio. Il commento di prima
          diceva "non e' un segreto, l'indirizzo si indovina in un
          secondo" -- vero, ma indovinarlo e trovarlo scritto in fondo a
          ogni pagina sono due cose diverse: la seconda lo mette anche
          nell'indice di Google e nei crawler che raccolgono indirizzi di
          login per provarli.
          La pagina continua a esistere e a funzionare: e' raggiungibile
          scrivendo l'indirizzo, semplicemente non lo dice piu' il sito.
          Chi ci lavora lo tiene nei segnalibri. */}

      <div className="ft-bottom">
        {/* Se l'elenco e' vuoto non resta uno spazio vuoto in mezzo al
            footer: il contenitore proprio non esiste. */}
        {SOCIAL.length > 0 && (
          <span className="ft-social">
            {SOCIAL.map(([t, h]) => (
              <a key={h} href={h} target="_blank" rel="noopener">{t}</a>
            ))}
          </span>
        )}
        {/* I circuiti di pagamento c'erano nel footer di WordPress e qui
            mancavano. Sono scritti, non disegnati: i loghi ufficiali hanno
            regole d'uso proprie e un logo rifatto male fa sembrare finto
            anche un pagamento vero. Il nome basta a fare quello che quella
            riga deve fare -- dire a chi non ci conosce che i soldi non
            passano da noi. */}
        <span className="ft-pay">
          Secure payments with Stripe &middot; Visa &middot; Mastercard &middot;
          PayPal &middot; American Express
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
