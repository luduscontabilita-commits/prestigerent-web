import { CATEGORIE } from '@/lib/categorie';
import '@/styles/home.css';
import '@/styles/404.css';

/* LA PAGINA CHE COMPARE QUANDO UN INDIRIZZO NON ESISTE.
 *
 * Prima non c'era, e non e' un modo di dire: il `<body>` del 404 conteneva
 * un solo `<div hidden>` e zero parole. Verificato con curl sul deploy
 * pubblico -- e' il segnaposto interno di Next, `<html id="__next_error__">`,
 * quello che si vede quando nessuno ha scritto un not-found.tsx.
 *
 * Quel vuoto costa proprio il giorno del passaggio, che e' quando ne
 * arriveranno di piu': ventuno indirizzi vivi di WordPress cambiano casa,
 * ci sono link vecchi in giro per il web, e chi arriva li' oggi vede una
 * pagina bianca e chiude. Un elenco di strade -- le sei voci principali del
 * menu e WhatsApp -- trattiene chi era arrivato con un'intenzione.
 *
 * SI MONTA DENTRO src/app/[locale]/, ed e' qui che serve davvero: src/proxy.ts
 * mette la lingua predefinita davanti a tutto quello che non riconosce, quindi
 * ogni indirizzo sbagliato del sito pubblico finisce sotto /[locale]/ e questo
 * e' il confine piu' vicino. Cosi' la pagina esce con l'intestazione, il
 * menu, il piede e il tema giusto, perche' la disegna il layout della lingua.
 *
 * I LINK SONO SENZA PREFISSO DI LINGUA. Un componente not-found non riceve
 * `params` (e' una regola di Next, non una dimenticanza), quindi qui la lingua
 * non si sa. L'inglese sta alla radice ed e' la lingua della quasi totalita'
 * del traffico: si mandano tutti li'. Chi legge in tedesco o in italiano
 * ritrova la sua lingua dal selettore in alto, che c'e' anche qui.
 */

/* Le sei voci principali: quelle senza un padre. Si leggono da `CATEGORIE`
   e non si ricopiano, cosi' se domani se ne aggiunge una compare anche qui. */
const PRINCIPALI = CATEGORIE.filter((c) => !c.padre);

export default function NonTrovata() {
  return (
    <main className="ct">
      <div className="nf">
        {/* Il marchio tondo, lo stesso dell'intestazione e delle landing:
            e' la prima cosa che dice "sei ancora sul sito giusto, e' solo
            la pagina che non c'e'". */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="nf-logo"
          src="https://prestigerent.com/lp/img/logo-prestige.png"
          alt="Prestige Rent"
          width={72}
          height={72}
        />

        <p className="nf-cod">404</p>
        <h1>This page has moved, or never existed</h1>
        <p className="nf-sub">
          We rebuilt the site and a few old addresses changed. Everything we run
          is still here — pick where you are starting from, or just ask us.
        </p>

        <div className="ct-figlie nf-links">
          <a href="/">Home</a>
          {PRINCIPALI.map((c) => (
            <a key={c.path} href={c.path}>
              {c.titolo}
            </a>
          ))}
          <a href="/about-us/">About us</a>
        </div>

        {/* WhatsApp, come su ogni altra pagina del sito. Chi e' finito su un
            404 ha gia' un'intenzione precisa in testa: qui la puo' scrivere a
            qualcuno invece di rimettersi a cercare. */}
        <div className="hm-cta nf-cta">
          <a className="primo" href="/">
            Back to the home page
          </a>
          <a
            className="secondo nf-wa"
            href="https://wa.me/393338424047"
            target="_blank"
            rel="noopener"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.26-8.25" />
            </svg>
            Ask us on WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
