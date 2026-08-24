'use client';

import { useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, getLocale } from '@/lib/locales';

/* L'intestazione.
 *
 * Il menu di WordPress ha 84 voci, 43 distinte e 40 ripetute due o tre volte
 * (Elementor lo stampa due volte, desktop e mobile). Non e' un problema
 * estetico: sono 84 link su ogni pagina che diluiscono il peso interno, e
 * chi arriva deve leggere ventidue tour privati per trovarne uno.
 *
 * Qui sono quindici, organizzate come fa Walkabout: PRIMA da dove parti, poi
 * il tipo. Non e' una copia: e' che il catalogo Prestige e' diviso davvero
 * per punto di partenza, e oggi chi sbarca a Livorno non ha modo di trovare
 * i 21 tour che partono dal suo porto.
 *
 * Niente carrello ne' cuore ne' account: incassa Regiondo, e un'icona che
 * non fa niente e' solo rumore. Al loro posto le lingue (sono otto, senza
 * selettore non le trova nessuno) e WhatsApp sempre visibile, perche'
 * "rispondiamo noi e non un call center" e' l'argomento della casa e va
 * dove l'occhio cade, non in fondo alla pagina.
 */

type Voce = { href: string; testo: string; nota?: string };

export function Header({ locale }: { locale: string }) {
  const [aperto, setAperto] = useState(false);
  const [lingue, setLingue] = useState(false);
  const p = (path: string) => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`);
  const info = getLocale(locale);

  const partenze: Voce[] = [
    { href: p('/?from=florence'), testo: 'Florence' },
    { href: p('/?from=livorno'), testo: 'Livorno', nota: 'cruise port' },
    { href: p('/?from=la-spezia'), testo: 'La Spezia', nota: 'cruise port' },
    { href: p('/?from=civitavecchia'), testo: 'Civitavecchia', nota: 'for Rome' },
    { href: p('/?from=naples'), testo: 'Naples', nota: 'cruise port' },
  ];

  const tipi: Voce[] = [
    { href: p('/?kind=small_group'), testo: 'Wine & food day tours' },
    { href: p('/?kind=private'), testo: 'Private tours' },
    { href: p('/?kind=cruise'), testo: 'Cruise port tours' },
    { href: p('/?kind=transfer'), testo: 'Transfers' },
  ];

  /* In evidenza ci va il cuore del business -- il vino, Siena e San
     Gimignano, che valgono l'85% -- non un campione a caso degli 87. */
  const popolari: Voce[] = [
    { href: p('/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/'), testo: 'Siena & San Gimignano', nota: 'with winery lunch · from €149' },
    { href: p('/tour/wine-food-experience-in-tuscany/'), testo: 'Wine & Food Experience', nota: 'a day among the wineries' },
    { href: p('/tour/wine-experience-in-tuscany/'), testo: 'Wine Experience in Tuscany', nota: 'tastings in Chianti' },
    { href: p('/tour/private-tour-to-chianti-wineries/'), testo: 'Private Chianti & wineries', nota: 'your party only' },
  ];

  return (
    <header className="hd">
      <div className="hd-in">
        <a className="hd-logo" href={p('/')}>
          {/* Il marchio tondo e' quello delle landing, il logotipo e' quello
              del sito: si usano insieme come sulla landing, cosi' chi arriva
              dagli annunci riconosce lo stesso segno. */}
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

        <nav className="hd-nav">
          <button
            type="button"
            className={'hd-top' + (aperto ? ' is-on' : '')}
            aria-expanded={aperto}
            onClick={() => { setAperto(!aperto); setLingue(false); }}
          >
            Tours
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </nav>

        <div className="hd-right">
          <div className="hd-lang">
            <button type="button" onClick={() => { setLingue(!lingue); setAperto(false); }} aria-expanded={lingue}>
              🌐 {info.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {lingue && (
              <div className="hd-lang-menu">
                {LOCALES.map((l) => (
                  <a key={l.code} href={l.code === DEFAULT_LOCALE ? '/' : `/${l.code}/`}>{l.label}</a>
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
        </div>
      </div>

      {/* Il menu sta SEMPRE nell'HTML e si nasconde con il CSS: montarlo solo
          all'apertura significava che i suoi link non esistevano per i
          crawler, e i collegamenti interni sono meta' del posizionamento.
          Test: curl -A "OAI-SearchBot" e cerca hd-col-t nel sorgente. */}
      <div className={'hd-mega' + (aperto ? ' is-open' : '')} hidden={!aperto}>
            <div className="hd-mega-in">
              <div>
                <p className="hd-col-t">Departing from</p>
                {partenze.map((v) => (
                  <a key={v.href} href={v.href}>
                    {v.testo}
                    {v.nota && <em>{v.nota}</em>}
                  </a>
                ))}
              </div>
              <div>
                <p className="hd-col-t">By type</p>
                {tipi.map((v) => (
                  <a key={v.href} href={v.href}>{v.testo}</a>
                ))}
              </div>
              <div>
                <p className="hd-col-t">Most booked</p>
                {popolari.map((v) => (
                  <a key={v.href} href={v.href}>
                    {v.testo}
                    {v.nota && <em>{v.nota}</em>}
                  </a>
                ))}
              </div>
        </div>
      </div>
      {aperto && (
        <button className="hd-veil" aria-label="Close menu" onClick={() => setAperto(false)} />
      )}
    </header>
  );
}
