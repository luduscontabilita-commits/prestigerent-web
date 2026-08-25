'use client';

import { useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, getLocale } from '@/lib/locales';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEZIONI } from '@/lib/menu';
import type { VotoTour } from '@/lib/recensioni';

/* L'INTESTAZIONE.
 *
 * Le voci di primo livello sono quelle del sito WordPress -- Small Group
 * Tours, Private Tours, Cruise Port Tours, Transfers, Destinations, Quick
 * Request. Non per abitudine: sono le categorie con cui il catalogo e'
 * diviso davvero, e sono quelle che Google ha imparato in anni di scansioni.
 * Cambiarle il giorno del passaggio vorrebbe dire ricominciare da capo.
 *
 * Cambia cosa c'e' sotto. Il menu di WordPress ha 84 link, 43 distinti e 40
 * ripetuti perche' Elementor lo stampa due volte: sono 84 link su ogni
 * pagina che si spartiscono il peso interno, e chi arriva deve leggere
 * ventidue tour privati per trovarne uno. Qui i tour sono raggruppati per
 * come li cerca la gente -- per destinazione i privati, per porto quelli
 * delle crociere, per tratta i transfer -- e i piu' prenotati portano
 * accanto il punteggio vero.
 *
 * IL PUNTEGGIO NEL MENU quasi nessuno lo fa, e funziona: "4,9 su 12.694
 * recensioni" convince prima ancora che si clicchi, e lo legge anche chi
 * il menu lo apre solo per curiosita'.
 *
 * Il pannello sta SEMPRE nell'HTML e si nasconde col CSS. Montarlo solo
 * all'apertura significherebbe che i suoi link non esistono per chi
 * scansiona la pagina, e i collegamenti interni sono meta' del
 * posizionamento. Verifica: curl -A "OAI-SearchBot" e cerca hd-col-t.
 *
 * Niente carrello ne' cuore ne' account: incassa Regiondo, e un'icona che
 * non fa niente e' solo rumore. Al loro posto le lingue e WhatsApp sempre
 * visibile, perche' "rispondiamo noi e non un call center" e' l'argomento
 * della casa e va dove l'occhio cade, non in fondo alla pagina.
 */

export function Header({
  locale,
  voti = {},
}: {
  locale: string;
  voti?: Record<string, VotoTour>;
}) {
  /* quale sezione e' aperta: il nome, oppure null. Una sola alla volta --
     due pannelli aperti insieme coprirebbero la pagina. */
  const [aperta, setAperta] = useState<string | null>(null);
  const [lingue, setLingue] = useState(false);
  const [mobile, setMobile] = useState(false);

  const p = (path: string) => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`);
  const info = getLocale(locale);

  const chiudi = () => {
    setAperta(null);
    setLingue(false);
  };

  const punteggio = (slug?: string) => (slug ? voti[slug] : undefined);

  return (
    <header className="hd">
      <div className="hd-in">
        <a className="hd-logo" href={p('/')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://prestigerent.com/lp/img/logo-prestige.png"
            alt="Prestige Rent"
            width={40}
            height={40}
          />
          <span>
            <strong>Prestige Rent</strong>
            <small>Tours &amp; Transfers in Italy</small>
          </span>
        </a>

        <nav className="hd-nav" aria-label="Main">
          <a className="hd-top hd-plain" href={p('/')}>
            Home
          </a>

          {SEZIONI.map((s) => (
            <div
              className="hd-item"
              key={s.testo}
              onMouseEnter={() => setAperta(s.testo)}
              onMouseLeave={() => setAperta(null)}
            >
              {/* LINK, non bottone: si deve poter andare alla categoria
                  intera senza aprire niente. La freccia apre il pannello
                  anche da tastiera e su schermi che non hanno il mouse. */}
              <a className={'hd-top' + (aperta === s.testo ? ' is-on' : '')} href={p(s.href)}>
                {s.testo}
              </a>
              <button
                type="button"
                className="hd-freccia"
                aria-expanded={aperta === s.testo}
                aria-label={`Open ${s.testo}`}
                onClick={(e) => {
                  e.preventDefault();
                  setAperta(aperta === s.testo ? null : s.testo);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <div className={'hd-mega' + (aperta === s.testo ? ' is-open' : '')}>
                <div className="hd-mega-in">
                  {s.gruppi.map((g) => (
                    <div className="hd-col" key={g.titolo}>
                      <p className="hd-col-t">{g.titolo}</p>
                      {g.voci.map((v) => {
                        const q = punteggio(v.slug);
                        return (
                          <a key={v.href + v.testo} href={p(v.href)}>
                            {v.testo}
                            {v.nota && <em>{v.nota}</em>}
                            {q && (
                              <em className="hd-voto">
                                ★ {q.voto.toFixed(1)} &middot; {q.quante.toLocaleString('en-US')} reviews
                              </em>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  ))}

                  <div className="hd-col hd-tutti">
                    <a className="hd-tutto" href={p(s.href)}>
                      See all {s.testo.toLowerCase()} &rarr;
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="hd-right">
          <a className="hd-quick" href={p('/#contact')}>
            Quick Request
          </a>

          <ThemeToggle />

          <div className="hd-lang">
            <button
              type="button"
              onClick={() => {
                setLingue(!lingue);
                setAperta(null);
              }}
              aria-expanded={lingue}
            >
              🌐 {info.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {lingue && (
              <div className="hd-lang-menu">
                {LOCALES.map((l) => (
                  <a key={l.code} href={l.code === DEFAULT_LOCALE ? '/' : `/${l.code}/`}>
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <a className="hd-wa" href="https://wa.me/393338424047" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.26-8.25" />
            </svg>
            <span>WhatsApp</span>
          </a>

          <button
            type="button"
            className="hd-burger"
            aria-label="Menu"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d={mobile ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* SU TELEFONO le stesse voci diventano un elenco a fisarmonica. Sono
          gli stessi link di sopra, non una seconda copia: il markup e' uno
          solo e a duplicarlo si tornerebbe agli 84 link di WordPress. */}
      <div className={'hd-mob' + (mobile ? ' is-open' : '')}>
        <a href={p('/')} onClick={() => setMobile(false)}>
          Home
        </a>
        {SEZIONI.map((s) => (
          <details key={s.testo}>
            <summary>{s.testo}</summary>
            <a className="hd-mob-tutto" href={p(s.href)}>
              See all {s.testo.toLowerCase()} &rarr;
            </a>
            {s.gruppi.map((g) => (
              <div key={g.titolo}>
                <p className="hd-col-t">{g.titolo}</p>
                {g.voci.map((v) => (
                  <a key={v.href + v.testo} href={p(v.href)}>
                    {v.testo}
                  </a>
                ))}
              </div>
            ))}
          </details>
        ))}
        <a className="hd-mob-quick" href={p('/#contact')} onClick={() => setMobile(false)}>
          Quick Request
        </a>
        <a href={p('/about-us/')} onClick={() => setMobile(false)}>
          About us
        </a>
      </div>

      {(aperta || lingue) && <button className="hd-veil" aria-label="Close menu" onClick={chiudi} />}
    </header>
  );
}
