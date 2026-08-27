import { CATEGORIE } from '@/lib/categorie';
import '@/styles/landing.css';
import '@/styles/home.css';
import '@/styles/theme.css';
import '@/styles/404.css';

/* IL 404 DI RISERVA, FUORI DALLE LINGUE.
 *
 * Quello che vede quasi tutti e' l'altro -- src/app/[locale]/not-found.tsx --
 * perche' src/proxy.ts mette la lingua predefinita davanti a ogni indirizzo
 * del sito pubblico, quindi anche gli sbagliati finiscono sotto /[locale]/.
 *
 * Restano fuori solo i percorsi che il proxy esclude apposta: /admin,
 * /auth, /lp, /myb, /wp-content, /wp-includes e i file statici. Un
 * indirizzo sbagliato dentro una di quelle cartelle arriva qui, e senza
 * questo file tornerebbe a vedere il `<div hidden>` vuoto di Next.
 *
 * 🔴 NON C'E' UN src/app/layout.tsx e non e' una dimenticanza: i due layout
 * radice del progetto sono src/app/[locale]/layout.tsx e
 * src/app/admin/layout.tsx, ciascuno con il suo `<html>`. Per la rotta
 * /_not-found Next se ne accorge e inserisce da se' il suo layout minimo,
 * `<html><body>{children}</body></html>` (la si legge in
 * node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js,
 * `defaultLayoutPath`). Da li' due conseguenze pratiche:
 *
 *   1. i fogli di stile vanno importati QUI, uno per uno, perche' nessun
 *      layout nostro li ha gia' portati;
 *   2. non ci sono intestazione ne' piede, e non e' un peccato: quelli
 *      leggono Supabase e vogliono la lingua, che a questo livello non
 *      esiste. Meglio una pagina che si apre sempre.
 */

const PRINCIPALI = CATEGORIE.filter((c) => !c.padre);

export default function NonTrovata() {
  return (
    <main className="ct">
      {/* Il tema, come nel layout delle lingue: senza, questa pagina sarebbe
          l'unica del sito a restare bianca in piena notte. Qui non puo'
          stare nel `<head>` -- il `<head>` e' quello minimo di Next -- ma
          essendo il primo nodo del corpo gira comunque prima che il browser
          disegni quello che viene dopo. Tutto dentro un try: in navigazione
          privata localStorage puo' lanciare un'eccezione invece di
          rispondere, e in quel caso si resta sul chiaro. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('pr-theme');" +
            "if(!t)t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';" +
            'document.documentElement.dataset.theme=t}catch(e){}',
        }}
      />

      <div className="nf">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="nf-logo"
          src="https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png"
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
