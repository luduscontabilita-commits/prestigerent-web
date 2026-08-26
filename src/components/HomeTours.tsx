'use client';

import { useEffect, useMemo, useState } from 'react';
import { testo } from '@/lib/prosa';

export type SchedaTour = {
  slug: string;
  href: string;
  nome: string;
  kind: string;
  foto: string | null;
  punti: string[];
  prezzo: number | null;
  ore: number | null;
  partenza: string;
  maxOspiti: number | null;
  /* IL VOTO E LE RECENSIONI DEL SINGOLO TOUR.
   *
   * Erano gia' nel database, gia' letti dalla home, gia' mostrati nel menu
   * e su tutte le pagine di categoria -- e queste schede erano le uniche
   * di tutto il sito a non averli. In mezzo alla griglia dei dodici tour
   * ci sono cinquemila pixel di scorrimento su telefono, ed e' esattamente
   * il tratto in cui uno sta scegliendo il prodotto: era l'unico punto
   * della pagina senza un solo segnale di fiducia. */
  voto: number | null;
  quante: number | null;
  /* Quante prenotazioni ha preso OGGI. Si mostra solo sopra una soglia
   * (vedi SOGLIA_OGGI): "1 booked today" fa piu' danno del silenzio. */
  oggi: number | null;
};

const ETICHETTA: Record<string, string> = {
  small_group: 'Small group',
  private: 'Private tour',
  cruise: 'From the port',
  transfer: 'Transfer',
  other: 'Tour',
};

/* SOTTO QUESTA SOGLIA IL NUMERO NON SI SCRIVE.
 *
 * E' la stessa regola gia' usata in Urgenza.tsx sulle pagine tour, e
 * vale la pena tenerle allineate: "3 booked today" e' una fila, "1
 * booked today" e' una stanza vuota. Un numero basso detto ad alta
 * voce lavora contro chi lo dice. */
const SOGLIA_OGGI = 3;

/* Le stelle piene sono arrotondate al voto: 4,9 fa cinque stelle piene,
   4,4 ne fa quattro. Il numero esatto sta accanto, quindi nessuno viene
   ingannato -- le stelle servono a farsi riconoscere da lontano, la cifra
   a farsi credere da vicino. */
const STELLE = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

export function HomeTours({
  tours,
  filtro,
}: {
  tours: SchedaTour[];
  filtro: { da: string; persone: number; tipo?: string } | null;
}) {
  /* Il filtro arriva dal modulo di ricerca, che ora sta nell'hero:
     lo stato vive nella home, comune ai due. */
  const [categoria, setCategoria] = useState<string>('');
  /* La destinazione arriva dal menu (/?place=siena) e si legge una volta
     sola, al montaggio: e' un filtro che si imposta arrivando, non
     cliccando. Leggerla qui e non sul server tiene la pagina statica --
     una sola pagina in cache per tutti invece di una per destinazione. */
  const [luogo, setLuogo] = useState('');
  const [dalMenu, setDalMenu] = useState('');
  /* la partenza letta dall'indirizzo: si somma a quella del modulo */
  const [daUrl, setDaUrl] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const pl = q.get('place');
    const kd = q.get('kind');
    const fr = q.get('from');
    if (pl) { setLuogo(pl); setDalMenu(pl.replace(/-/g, ' ')); }
    if (kd) setCategoria(kd);
    if (fr) setDaUrl(fr);
  }, []);

  /* QUANTI SE NE DISEGNANO.
   *
   * La home stampava tutti e 86 i tour: 212 KB su 231, e 103 immagini.
   * Nessuno scorre 86 schede, e chi arriva da un annuncio meno di tutti
   * -- ha in mente una cosa sola e la vuole subito.
   *
   * Se ne mostrano 12, e sono quelli che valgono l'85% del fatturato piu'
   * un campione delle altre famiglie. Gli 86 restano tutti raggiungibili:
   * dalle pagine di categoria, dal menu, dalla sitemap. Non sparisce
   * niente, si smette solo di stamparli tutti in prima pagina.
   *
   * Quando si cerca, il limite si alza: chi ha filtrato vuole vedere i
   * risultati, non dodici su venti.
   */
  const QUANTI = 12;

  /* QUALI dodici. Non i primi dell'elenco: quelli che vendono.
   * Tre prodotti fanno l'85% del fatturato e 12.694 delle recensioni --
   * vanno in cima, sempre. Poi un campione delle altre famiglie, perche'
   * chi arriva per un transfer o per una crociera deve vedere che
   * esistono senza dover cercare. */
  const PRIMI = [
    'wine-experience-in-tuscany',
    'small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence',
    'wine-food-experience-in-tuscany',
    'private-tour-to-chianti-wineries',
    'private-tour-siena-and-san-gimignano',
    'private-cinque-terre-from-florence',
    'florence-and-pisa-from-livorno-tour',
    'tour-to-cinque-terre-from-la-spezia',
    'private-rome-from-civitavecchia-port',
    'pompeii-vesuvius-from-naples-port',
    'florence-to-rome-with-stop-in-siena',
    'transfer-airport-to-florence',
  ];
  const posto = (slug: string) => {
    const i = PRIMI.indexOf(slug);
    return i < 0 ? 999 : i;
  };

  const visibili = useMemo(() => {
    return tours.filter((t) => {
      const cat = filtro?.tipo || categoria;
      if (cat && t.kind !== cat) return false;
      /* La destinazione si cerca NEL NOME del tour, che e' l'unico posto
         dove i luoghi sono scritti in modo affidabile. "siena" trova
         "Siena & San Gimignano" e "Siena and Chianti"; i trattini del
         parametro diventano spazi perche' negli URL non ci vanno. */
      if (luogo) {
        const nome = t.nome.toLowerCase();
        if (!luogo.split('-').every((parola) => nome.includes(parola))) return false;
      }
      const da = filtro?.da || daUrl;
      if (da && t.partenza !== da) return false;
      /* Un tour privato da 8 posti non serve a chi e' in dodici: nasconderlo
         evita la telefonata "ma allora perche' me lo avete mostrato?". */
      if (filtro?.persone && t.maxOspiti && filtro.persone > t.maxOspiti) return false;
      return true;
    });
  }, [tours, filtro, categoria, luogo, daUrl]);

  const haCercato = Boolean(filtro?.da || filtro?.tipo || filtro?.persone || categoria || luogo || daUrl);
  const mostrati = haCercato
    ? visibili
    : [...visibili].sort((a, b) => posto(a.slug) - posto(b.slug)).slice(0, QUANTI);

  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tours) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  return (
    <>
      <section className="pr-sec" id="tours">
        <div className="pr-wrap wide">
          <div className="hm-cats">
            <button
              type="button"
              className="hm-cat"
              style={categoria === '' ? { borderColor: 'var(--orange)', color: 'var(--orange)' } : undefined}
              onClick={() => setCategoria('')}
            >
              All tours <b>{tours.length}</b>
            </button>
            {conteggi.map(([k, n]) => (
              <button
                key={k}
                type="button"
                className="hm-cat"
                style={categoria === k ? { borderColor: 'var(--orange)', color: 'var(--orange)' } : undefined}
                onClick={() => setCategoria(k)}
              >
                {ETICHETTA[k] ?? k} <b>{n}</b>
              </button>
            ))}
          </div>

          <div className="pr-head" style={{ marginBottom: 18 }}>
            <h2 className="pr-title">
              {visibili.length} {visibili.length === 1 ? 'tour' : 'tours'}
            </h2>
            {dalMenu && (
              <span className="hm-chip">
                In and around {dalMenu}
                <button type="button" onClick={() => { setLuogo(''); setDalMenu(''); }} aria-label="Clear">&times;</button>
              </span>
            )}
            {(filtro?.da || filtro?.tipo || filtro?.persone) && (
              <p className="pr-lead">
                {visibili.length} {visibili.length === 1 ? 'tour' : 'tours'} match your search
                {filtro?.persone ? ` · ${filtro.persone} guests` : ''}
              </p>
            )}
          </div>

          {visibili.length === 0 ? (
            <p className="pr-lead" style={{ textAlign: 'center' }}>
              Nothing matches that combination yet —{' '}
              <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
                message us on WhatsApp
              </a>{' '}
              and we will build the day around you.
            </p>
          ) : (
            <div className="hm-grid">
              {mostrati.map((t) => (
                <a className="hm-card" href={t.href} key={t.slug}>
                  <div className="hm-card-img">
                    <span className="hm-card-tag">{ETICHETTA[t.kind] ?? t.kind}</span>
                    {/* Le prenotazioni di oggi, prese da Regiondo. Non e' una
                        finta urgenza: se il numero non c'e' o e' basso, il
                        chip non compare affatto. */}
                    {t.oggi != null && t.oggi >= SOGLIA_OGGI && (
                      <span className="hm-card-hot">{t.oggi} booked today</span>
                    )}
                    {t.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.foto} alt={t.nome} loading="lazy" decoding="async" />
                    )}
                    <h3 className="hm-card-name">{testo(t.nome)}</h3>
                  </div>
                  <div className="hm-card-body">
                    {/* IL VOTO, SUBITO SOTTO IL NOME.
                        Va prima dei dettagli e prima del prezzo perche' e'
                        la domanda che uno si fa per prima -- "questo e'
                        buono?" -- e perche' un prezzo letto dopo un 4,9
                        sembra piu' basso dello stesso prezzo letto da solo. */}
                    {t.voto != null && t.quante != null && (
                      <div className="hm-card-proof">
                        <span className="hm-stars" aria-hidden="true">
                          {STELLE(Math.round(t.voto))}
                        </span>
                        <b>{t.voto.toFixed(1)}</b>
                        <span className="hm-revs">
                          {t.quante.toLocaleString('en-US')} reviews
                        </span>
                      </div>
                    )}
                    <div className="hm-meta">
                      {t.ore ? <span>{t.ore} hours</span> : null}
                      {t.maxOspiti ? <span>up to {t.maxOspiti} guests</span> : null}
                    </div>
                    {t.punti.length > 0 && (
                      <ul className="hm-hl">
                        {t.punti.slice(0, 3).map((p) => (
                          <li key={p}>{testo(p)}</li>
                        ))}
                      </ul>
                    )}
                    <div className="hm-price">
                      {t.prezzo != null ? (
                        <>
                          <small>from</small>
                          <b>&euro;{t.prezzo.toFixed(0)}</b>
                        </>
                      ) : (
                        <span className="ask">Price on request</span>
                      )}
                    </div>

                  </div>
                </a>
              ))}
            </div>
          )}

          {!haCercato && visibili.length > QUANTI && (
            /* Gli altri non spariscono: si smette solo di stamparli in
               prima pagina. Da qui, dal menu, dalle pagine di categoria e
               dalla sitemap ci si arriva comunque. */
            <p className="hm-tutti">
              <a href="/tours-of-italy/">
                See all {visibili.length} tours and transfers &rarr;
              </a>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
