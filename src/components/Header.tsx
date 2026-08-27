'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_LOCALE, LOCALES, PIU_LINGUE, getLocale } from '@/lib/locales';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MINI_H, MINI_L, SEZIONI, miniatura } from '@/lib/menu';
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
 * ── LA VETRINA ──────────────────────────────────────────────────────────
 * In cima al pannello torna la fila di riquadri fotografici del mega menu
 * di WordPress: titolo del pannello a sinistra, "All destinations →" a
 * destra, e sotto le foto col nome sovrapposto in basso a sinistra. Le
 * foto sono le copertine vere dei tour, lette da Supabase (vedi `vetrina`
 * in src/lib/menu.ts); i riquadri per le categorie senza tour non esistono
 * proprio.
 *
 * IL PUNTEGGIO NEL MENU quasi nessuno lo fa, e funziona: "4,9 su 8.241
 * recensioni su Viator" convince prima ancora che si clicchi, e lo legge
 * anche chi il menu lo apre solo per curiosita'. Compare solo se il
 * riquadro porta a QUEL tour e le recensioni sono almeno tre: "5,0 su 1
 * recensione" non convince nessuno e fa sembrare finto anche il resto.
 *
 * 🔴 E DICE SEMPRE DOVE STA QUEL NUMERO. Prima il menu stampava la somma
 * delle piattaforme -- "4,9 su 12.900 recensioni" per Wine Experience --
 * cioe' un totale che su Viator, su GetYourGuide e su Tripadvisor non si
 * ritrova da nessuna parte. Adesso e' il conteggio di una piattaforma
 * sola, la piu' forte di quel tour, col suo nome accanto: chi va a
 * controllare trova lo stesso numero. Vedi `votiPerTour` in
 * src/lib/recensioni.ts, che e' dove stava la somma.
 *
 * Il pannello sta SEMPRE nell'HTML e si nasconde col CSS. Montarlo solo
 * all'apertura significherebbe che i suoi link non esistono per chi
 * scansiona la pagina, e i collegamenti interni sono meta' del
 * posizionamento. Verifica: curl -A "OAI-SearchBot" e cerca hd-col-t.
 *
 * ── LE FOTO NON DEVONO GAREGGIARE CON LA PRIMA IMMAGINE DELLA PAGINA ────
 * `loading="lazy"` da solo non basta: il pannello chiuso e' nascosto con
 * `visibility`, quindi ha comunque un'area nello schermo e il browser le
 * scarica subito, in mezzo alla foto grande della home. Per questo l'`img`
 * NON viene disegnata finche' la sezione non e' stata aperta almeno una
 * volta (`viste`). Chi ha un mouse le riceve prima, quando il browser non
 * ha piu' niente da fare: `load` + `requestIdleCallback`, e mai con la
 * modalita' risparmio dati accesa. Su telefono si caricano al tocco.
 *
 * ── APRIRE E CHIUDERE ───────────────────────────────────────────────────
 * Col mouse: `pointerenter` filtrato su `pointerType === 'mouse'`, cosi'
 * il tocco non fa finta di essere un passaggio del mouse. Da tastiera: il
 * pannello si apre col fuoco sulla voce e col tasto accanto (Invio o
 * Spazio), e si chiude quando il fuoco esce dalla sezione. Esc chiude e
 * riporta il fuoco sulla voce. Un clic fuori dall'intestazione chiude.
 *
 * Niente carrello ne' cuore ne' account: incassa Regiondo, e un'icona che
 * non fa niente e' solo rumore. Al loro posto le lingue e WhatsApp sempre
 * visibile, perche' "rispondiamo noi e non un call center" e' l'argomento
 * della casa e va dove l'occhio cade, non in fondo alla pagina.
 */

/** minimo di recensioni per mostrare il punteggio: sotto, imbarazza */
const MIN_RECENSIONI = 3;

/* SUL RIQUADRO FOTOGRAFICO LA SOGLIA E' MOLTO PIU' ALTA, e non e' una
 * seconda opinione sullo stesso problema: e' un vincolo di spazio.
 *
 * Sopra una foto il posto per scrivere e' la fascia scura in basso, e ce
 * n'e' per un titolo e una riga. Se quella riga la occupa "5,0 su 4
 * recensioni", il titolo -- che e' la cosa su cui si clicca -- va a capo e
 * si stringe per fare posto a un numero che non convince nessuno. Sotto le
 * cento recensioni il badge sul riquadro non paga il suo spazio e sparisce;
 * nell'elenco di link qui sotto, dove una riga in piu' non toglie niente a
 * nessuno, resta la soglia di tre.
 *
 * Oggi passano solo i due tour di punta -- Wine Experience e Siena in
 * piccolo gruppo -- che sono anche gli unici con un numero grosso da
 * mostrare. */
const MIN_VETRINA = 50;

export function Header({
  locale,
  voti = {},
  foto = {},
}: {
  locale: string;
  voti?: Record<string, VotoTour>;
  foto?: Record<string, string>;
}) {
  /* quale sezione e' aperta: il nome, oppure null. Una sola alla volta --
     due pannelli aperti insieme coprirebbero la pagina. */
  const [aperta, setAperta] = useState<string | null>(null);
  const [lingue, setLingue] = useState(false);
  const [mobile, setMobile] = useState(false);
  /* le sezioni gia' aperte almeno una volta: solo per quelle si disegnano
     le `img`. Non e' lo stato dell'apertura, e' una memoria che non torna
     mai indietro. */
  const [viste, setViste] = useState<string[]>([]);

  const barra = useRef<HTMLElement>(null);

  const p = (path: string) => (locale === DEFAULT_LOCALE ? path : `/${locale}${path}`);
  const info = getLocale(locale);

  const apri = useCallback((nome: string | null) => {
    setAperta(nome);
    if (nome) setViste((v) => (v.includes(nome) ? v : [...v, nome]));
  }, []);

  const chiudi = useCallback(() => {
    setAperta(null);
    setLingue(false);
  }, []);

  /* ESC E CLIC FUORI.
     Il velo grigio copre gia' la pagina sotto la barra, ma non la barra
     stessa ne' il resto dell'intestazione: chi clicca sul logo di fianco
     al menu aperto si aspetta comunque che si chiuda. E Esc deve
     funzionare anche quando il fuoco e' dentro il pannello. */
  useEffect(() => {
    if (!aperta && !lingue && !mobile) return;

    const tasto = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      /* il fuoco torna sulla voce che aveva aperto il pannello: chi
         naviga da tastiera altrimenti riparte dall'inizio della pagina */
      const voce = barra.current?.querySelector<HTMLElement>('.hd-top.is-on');
      chiudi();
      setMobile(false);
      voce?.focus();
    };
    const fuori = (e: PointerEvent) => {
      if (barra.current && !barra.current.contains(e.target as Node)) {
        chiudi();
        setMobile(false);
      }
    };

    document.addEventListener('keydown', tasto);
    document.addEventListener('pointerdown', fuori);
    return () => {
      document.removeEventListener('keydown', tasto);
      document.removeEventListener('pointerdown', fuori);
    };
  }, [aperta, lingue, mobile, chiudi]);

  /* LE FOTO, QUANDO NON DANNO FASTIDIO A NESSUNO.
     Solo per chi ha un mouse (li' il menu si apre passandoci sopra, e
     mezzo secondo di riquadri grigi si nota); solo dopo `load`, cioe'
     quando la foto grande della pagina e' gia' arrivata; solo se il
     browser dice di avere tempo libero; mai in risparmio dati. */
  useEffect(() => {
    const rete = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (rete?.saveData) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const tutte = () => setViste(SEZIONI.map((s) => s.testo));
    const quandoPuoi = () => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      };
      if (w.requestIdleCallback) w.requestIdleCallback(tutte, { timeout: 4000 });
      else window.setTimeout(tutte, 1500);
    };

    if (document.readyState === 'complete') {
      quandoPuoi();
      return;
    }
    window.addEventListener('load', quandoPuoi, { once: true });
    return () => window.removeEventListener('load', quandoPuoi);
  }, []);

  const punteggio = (slug?: string) => {
    const q = slug ? voti[slug] : undefined;
    return q && q.quante >= MIN_RECENSIONI ? q : undefined;
  };

  return (
    <header className="hd" ref={barra}>
      <div className="hd-in">
        <a className="hd-logo" href={p('/')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png"
            alt="Prestige Rent"
            width={40}
            height={40}
          />
          <span>
            <strong>Prestige Rent</strong>
            <small>Tours &amp; Transfers in Italy</small>
          </span>
        </a>

        <nav className={'hd-nav' + (mobile ? ' is-mob' : '')} id="hd-nav" aria-label="Main">
          <a className="hd-top hd-plain" href={p('/')}>
            Home
          </a>

          {SEZIONI.map((s) => {
            const id = 'mega-' + s.href.replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
            const on = aperta === s.testo;
            return (
              <div
                className="hd-item"
                key={s.testo}
                /* SOLO IL MOUSE APRE PASSANDOCI SOPRA. Su un telefono il
                   primo tocco genera un finto `mouseenter`: il pannello si
                   apriva e si richiudeva da solo, e il link sotto partiva
                   comunque. `pointerType` toglie l'ambiguita'. */
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') apri(s.testo);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== 'mouse') return;
                  /* se il fuoco e' dentro il pannello lo sta usando la
                     tastiera: il mouse che se ne va non deve chiuderlo */
                  if (e.currentTarget.contains(document.activeElement)) return;
                  setAperta((a) => (a === s.testo ? null : a));
                }}
                onBlur={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setAperta((a) => (a === s.testo ? null : a));
                }}
              >
                {/* LINK, non bottone: si deve poter andare alla categoria
                    intera senza aprire niente. Il fuoco da tastiera apre il
                    pannello, cosi' chi arriva col Tab vede subito cosa c'e'
                    dentro senza doverlo indovinare. */}
                <a
                  className={'hd-top' + (on ? ' is-on' : '')}
                  href={p(s.href)}
                  onFocus={() => apri(s.testo)}
                >
                  {s.testo}
                </a>
                <button
                  type="button"
                  className="hd-freccia"
                  aria-expanded={on}
                  aria-controls={id}
                  aria-label={`${on ? 'Close' : 'Open'} ${s.testo}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (on) setAperta(null);
                    else apri(s.testo);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                <div className={'hd-mega' + (on ? ' is-open' : '')} id={id}>
                  <div className="hd-mega-in">
                    {/* la riga in cima: titolo a sinistra, "tutto" a
                        destra. E' l'impaginato del menu di WordPress, ed
                        e' la parte che si riconosce a colpo d'occhio. */}
                    <div className="hd-mega-top">
                      <p className="hd-mega-tit">{s.pannello}</p>
                      <a className="hd-tutte" href={p(s.href)}>
                        {s.tutti} <span aria-hidden="true">&rarr;</span>
                      </a>
                    </div>

                    <div className="hd-vetrina">
                      {s.vetrina.map((r) => {
                        /* NON chiamarla `p`: in questo componente `p` e' gia'
                           la funzione che mette il prefisso della lingua
                           davanti agli indirizzi, e due righe piu' sotto
                           serve proprio quella. */
                        const voto = punteggio(r.tour);
                        /* 🔴 IL PUNTEGGIO E' DEL TOUR, NON DELLA CATEGORIA.
                           Meta' dei riquadri porta a una pagina di categoria
                           e prende la foto da un tour dentro quella
                           categoria: stampargli accanto il voto di quel tour
                           vorrebbe dire attribuire a "Direct transfers from
                           Florence" le recensioni del transfer dall'aeroporto.
                           E' lo stesso errore delle piattaforme sommate, in
                           piccolo. Il badge compare solo se il riquadro porta
                           esattamente alla pagina di quel tour. */
                        const suoTour = r.href === `/tour/${r.tour}/`;
                        const q =
                          suoTour && voto && voto.quante >= MIN_VETRINA ? voto : undefined;
                        const f = foto[r.tour];
                        return (
                          <a className="hd-card" key={r.href} href={p(r.href)}>
                            <span className="hd-card-f">
                              {viste.includes(s.testo) && f && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={miniatura(f)}
                                  alt={r.alt}
                                  width={MINI_L}
                                  height={MINI_H}
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    /* la trasformazione delle immagini e'
                                       spenta o in errore: si ripiega
                                       sull'originale, una volta sola */
                                    const img = e.currentTarget;
                                    if (img.src !== f) img.src = f;
                                  }}
                                />
                              )}
                            </span>
                            <span className="hd-card-t">
                              <b>{r.testo}</b>
                              {q && (
                                /* "reviews" resta, ma solo per chi ascolta:
                                   sopra una foto quella parola vale due
                                   righe di titolo, e fra la stella e "on
                                   Viator" nessuno che guarda si chiede di
                                   cosa siano 8.241. Chi usa un lettore di
                                   schermo invece sentirebbe "quattro virgola
                                   nove, ottomiladuecentoquarantuno, su
                                   Viator" e resterebbe senza il sostantivo. */
                                <em>
                                  ★ {q.voto.toFixed(1)} &middot;{' '}
                                  {q.quante.toLocaleString('en-US')}
                                  <span className="hd-solo-voce"> reviews</span> {q.dove}
                                </em>
                              )}
                            </span>
                          </a>
                        );
                      })}
                    </div>

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
                                  ★ {q.voto.toFixed(1)} &middot;{' '}
                                  {q.quante.toLocaleString('en-US')} reviews {q.dove}
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
                      {/* Chi apre il menu e non trova quello che cerca
                          altrimenti chiude la scheda. Qui ha un'alternativa
                          che costa un messaggio. */}
                      <a
                        className="hd-aiuto"
                        href="https://wa.me/393338424047"
                        target="_blank"
                        rel="noopener"
                      >
                        Not sure which one? <b>Ask us on WhatsApp</b> &mdash; we answer
                        ourselves, not a call center.
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* visibili solo su telefono: sul desktop stanno gia' a destra */}
          <a className="hd-top hd-plain hd-solo-mob" href={p('/about-us/')}>
            About us
          </a>
          <a className="hd-top hd-plain hd-solo-mob" href={p('/#contact')}>
            Quick Request
          </a>
        </nav>

        <div className="hd-right">
          <a className="hd-quick" href={p('/#contact')}>
            Quick Request
          </a>

          <ThemeToggle />

          {/* 🔴 IL SELETTORE C'E' SOLO SE C'E' QUALCOSA DA SELEZIONARE.
              Con una lingua sola era un menu a tendina che si apriva su una
              voce sola, gia' quella attiva: promette una scelta e non la
              mantiene. Sparisce da solo, e da solo torna il giorno che si
              riaccende una lingua in `LINGUE_ATTIVE` (src/lib/locales.ts). */}
          {PIU_LINGUE && (
            <div className="hd-lang">
              <button
                type="button"
                onClick={() => {
                  setLingue(!lingue);
                  setAperta(null);
                }}
                aria-expanded={lingue}
              >
                🌐 <span className="lg">{info.label}</span>
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
          )}

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
            aria-controls="hd-nav"
            onClick={() => setMobile(!mobile)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d={mobile ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* NIENTE SECONDO MENU PER IL TELEFONO.
          Ne avevo scritto uno separato e il risultato erano 162 link
          nell'intestazione -- il doppio degli 84 di WordPress che avevo
          criticato tre righe piu' su. Su telefono si riusa lo STESSO
          markup: `.hd-nav` diventa un pannello verticale, i pannelli si
          aprono in linea e la vetrina diventa una striscia che si
          trascina col dito. Un solo link per destinazione, sempre. */}
      {(aperta || lingue) && <button className="hd-veil" aria-label="Close menu" onClick={chiudi} />}
    </header>
  );
}
