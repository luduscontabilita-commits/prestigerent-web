'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { affiancato, type Cambi } from '@/lib/cambi';
import { foto, fotoSet } from '@/lib/foto';
import { testo } from '@/lib/prosa';
import { classeTitolo } from '@/lib/punti';

export type SchedaTour = {
  slug: string;
  href: string;
  nome: string;
  kind: string;
  foto: string | null;
  /* DUE O TRE RIGHE CORTE SU COSA SI VEDE E SI FA.
   *
   * Non e' piu' `highlights` cosi' come arriva da WordPress: quello
   * cominciava con "Safe for health! All our vehicles are cleaned/
   * sanitized before each service" su 55 schede su 87, cioe' la prima
   * riga che il cliente legge era una policy del 2020. Le righe di qui
   * le costruisce `puntiScheda` (src/lib/punti.ts) dagli stessi dati,
   * tenendo solo cio' che descrive QUELLA giornata. Elenco vuoto sui
   * transfer punto-a-punto: la scheda mostra titolo, durata e prezzo e
   * basta, che e' meglio di tre promesse buone per chiunque. */
  punti: string[];
  /** La riga di prosa sotto la durata: la meta description del tour,
   *  tagliata a due righe dal CSS. */
  descrizione: string | null;
  prezzo: number | null;
  /* Gia' scritta per esteso ("4 hours", "15 minutes"): l'unita' la
     decide Regiondo e la traduce `durataInParole`. Quando qui c'era un
     numero e la scheda ci appiccicava "hours", i quindici minuti del
     transfer dall'aeroporto diventavano quindici ore. */
  ore: string | null;
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
  /* Su quale piattaforma sta quel conteggio, preposizione compresa. Senza,
     il numero e' solo da credere sulla parola: vedi `votiPerTour` in
     src/lib/recensioni.ts, che e' dove prima si sommavano le piattaforme
     e usciva un totale che nessuna di loro conferma. */
  dove: string | null;
  /* Quante prenotazioni ha preso NEGLI ULTIMI TRENTA GIORNI. Si mostra
   * solo sopra una soglia (vedi SOGLIA_MESE): un numero basso detto ad
   * alta voce lavora contro chi lo dice. */
  mese: number | null;
};

const ETICHETTA: Record<string, string> = {
  small_group: 'Small group',
  private: 'Private tour',
  cruise: 'From the port',
  transfer: 'Transfer',
  other: 'Tour',
};

/* 🔴 IL TITOLO DICE COSA SI STA GUARDANDO.
 *
 * Diceva "6 tours", e basta. Il numero non e' un titolo: chi preme
 * "Transfers" si aspetta di leggere "Transfers", e senza quella conferma
 * non e' sicuro che il filtro abbia fatto qualcosa -- soprattutto sul
 * telefono, dove le pastiglie delle categorie sono gia' scorse via in
 * alto e non si vede piu' quale e' accesa.
 *
 * Sono al plurale e per esteso, non le etichette corte delle pastiglie:
 * "From the port" sta bene su un bottone, come titolo di sezione no. */
const TITOLO: Record<string, string> = {
  small_group: 'Small group tours',
  private: 'Private tours',
  cruise: 'Shore excursions from the port',
  transfer: 'Private transfers',
  other: 'Other tours',
};

/* 🔴 LA VETRINA HA UN NOME, NON UNA STATISTICA.
 *
 * Diceva "Our most booked experiences": vero, ma e' un dato di fatto sul
 * passato, e chi legge non e' venuto a sapere cosa hanno comprato gli
 * altri -- e' venuto a capire cosa fare della sua settimana in Toscana.
 *
 * Sono i tre prodotti che fanno l'85% del fatturato piu' i migliori
 * delle altre famiglie: non un elenco tagliato a dodici, una scelta. Il
 * titolo lo dice, e il sottotitolo tiene la prova -- "the ones our
 * guests book most" -- accanto alla promessa, cosi' non e' una vanteria
 * ma una cosa verificabile. */
const TITOLO_CONSIGLIATI = 'Our signature Tuscany experiences';
const OCCHIELLO_CONSIGLIATI = 'Chosen by us';
const SOTTO_CONSIGLIATI =
  'The days we would book ourselves — and the ones our guests book most.';

/* 🔴 IL CONTEGGIO E' DEL MESE, NON DEL GIORNO.
 *
 * "3 booked today" ha due difetti che non si vedono guardando la scheda
 * a mezzogiorno. Il primo: dipende dall'ora in cui uno apre il sito --
 * la stessa scheda dice 6 la sera e niente la mattina, perche' la
 * giornata e' appena cominciata. Il secondo: su sei tour solo quattro
 * arrivavano a tre in un giorno, quindi meta' delle schede restava muta.
 *
 * Su trenta giorni il numero e' stabile, non ha orari, ed e' di un altro
 * ordine di grandezza: 1.153 invece di 9. E resta un fatto verificabile,
 * non una finta urgenza -- e' il conto vero delle prenotazioni Regiondo.
 *
 * La soglia sale da 3 a 25 di conseguenza: su un mese, tre prenotazioni
 * sono una stanza vuota esattamente come una sola in un giorno. */
const SOGLIA_MESE = 25;

/* Le stelle piene sono arrotondate al voto: 4,9 fa cinque stelle piene,
   4,4 ne fa quattro. Il numero esatto sta accanto, quindi nessuno viene
   ingannato -- le stelle servono a farsi riconoscere da lontano, la cifra
   a farsi credere da vicino. */
const STELLE = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

export function HomeTours({
  tours,
  filtro,
  cambio,
}: {
  tours: SchedaTour[];
  filtro: { da: string; persone: number; tipo?: string } | null;
  cambio: Cambi | null;
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
    /* 🔴 QUI C'ERA `transfer-airport-to-florence`, ED E' STATO TOLTO.
       Un passaggio dall'aeroporto e' un servizio, non un'esperienza: in
       una vetrina intitolata "le esperienze che consigliamo" tirava giu'
       tutte le altre, perche' il visitatore legge la fila come un'unica
       promessa. I transfer restano dove hanno senso -- la pastiglia
       "Transfer", il menu, le pagine di categoria -- e li' li cerca chi
       ne ha bisogno davvero.
       Al suo posto un tour del vino: e' il prodotto della casa. */
    'montalcino-brunello-wine-tour',
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
  /* La veste "nobile" vale SOLO per la dodicina scelta a mano. Appena si
     filtra o si cerca, l'elenco non e' piu' una vetrina ma un risultato,
     e vestirlo da vetrina sarebbe una promessa che non manteniamo. */
  const vetrina = !haCercato;
  const mostrati = haCercato
    ? visibili
    : [...visibili].sort((a, b) => posto(a.slug) - posto(b.slug)).slice(0, QUANTI);

  /* 🔴 LE FRECCE, PERCHE' COL MOUSE NON SI SCORRE DI LATO.
   *
   * La fila dei tour scorre in orizzontale. Su un telefono si trascina
   * col dito e su un portatile col trackpad, ma con un mouse normale --
   * che e' come guarda il sito meta' del traffico da computer -- non
   * c'e' nessun gesto: la rotella scorre la PAGINA, non la fila. Senza
   * frecce, su quegli schermi i tour oltre il quarto non li vede
   * nessuno, e non c'e' nemmeno modo di sapere che esistono.
   *
   * Le frecce si spengono ai due capi invece di sparire: un pulsante che
   * compare e scompare mentre si scorre fa saltare l'occhio, e per
   * giunta sposta il dito nel momento in cui uno sta premendo. */
  const fila = useRef<HTMLDivElement>(null);
  const [aiCapi, setAiCapi] = useState({ inizio: true, fine: false });

  const misuraCapi = useCallback(() => {
    const el = fila.current;
    if (!el) return;
    const massimo = el.scrollWidth - el.clientWidth;
    setAiCapi({
      inizio: el.scrollLeft <= 4,
      /* Non `>= massimo`: con lo zoom del browser le larghezze diventano
         frazionarie e l'ultima freccia non si spegneva mai. */
      fine: massimo <= 4 || el.scrollLeft >= massimo - 4,
    });
  }, []);

  /* 🔴 LA FILA SCORRE DA SOLA, E SI FERMA QUANDO SERVE.
   *
   * Ferma, la fila non dice che continua: l'ultima scheda tagliata sul
   * bordo e' un segnale debole, e su un telefono la maggior parte delle
   * persone non prova nemmeno a trascinare. Muovendosi lentamente dice
   * da sola "ce n'e' dell'altro", che e' l'unico modo per far arrivare
   * qualcuno oltre il secondo tour.
   *
   * Si ferma in quattro casi, e ognuno ha un motivo diverso:
   *   - il mouse sopra: qualcuno sta leggendo quella scheda, e muoverla
   *     mentre la legge e' il modo piu' rapido di farlo desistere;
   *   - il dito: pausa breve e poi riparte -- NON definitiva, perche' su
   *     un telefono il dito passa di li' anche solo per scorrere la
   *     pagina, e uno stop definitivo scatterebbe per sbaglio;
   *   - le frecce: li' la volonta' e' esplicita, quindi non riparte;
   *   - fuori dallo schermo o scheda in secondo piano: muovere pixel che
   *     nessuno guarda e' batteria buttata.
   *
   * Arrivata in fondo torna indietro invece di ricominciare da capo:
   * duplicare le schede per il ciclo infinito vorrebbe dire duplicare
   * anche i link, e Google leggerebbe ogni tour due volte. */
  const [fermo, setFermo] = useState(false);
  const [sopra, setSopra] = useState(false);
  /* 🔴 IL CURSORE FERMO NON E' ATTENZIONE.
     Su un telefono il dito passa e se ne va; su un computer il cursore
     RESTA dove l'hanno lasciato, e la fila e' larga quanto lo schermo:
     bastava averlo posato li' perche' non ripartisse mai piu'. Se non si
     muove per tre secondi non sta leggendo quella scheda, sta leggendo
     altro -- e la fila puo' riprendere. Al primo movimento si ferma di
     nuovo, che e' il comportamento che serve davvero. */
  const orologioFermoMouse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseFermo = useCallback(() => {
    setSopra(true);
    if (orologioFermoMouse.current) clearTimeout(orologioFermoMouse.current);
    orologioFermoMouse.current = setTimeout(() => setSopra(false), 3000);
  }, []);
  const [toccata, setToccata] = useState(false);
  const [inVista, setInVista] = useState(false);
  const [motoRidotto, setMotoRidotto] = useState(true);
  const [nascosta, setNascosta] = useState(false);
  const verso = useRef<1 | -1>(1);
  const orologioTocco = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sospendiPerTocco = useCallback(() => {
    setToccata(true);
    if (orologioTocco.current) clearTimeout(orologioTocco.current);
    orologioTocco.current = setTimeout(() => setToccata(false), 4000);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const leggi = () => setMotoRidotto(mq.matches);
    leggi();
    mq.addEventListener('change', leggi);
    const visibilita = () => setNascosta(document.hidden);
    document.addEventListener('visibilitychange', visibilita);
    return () => {
      mq.removeEventListener('change', leggi);
      document.removeEventListener('visibilitychange', visibilita);
      if (orologioTocco.current) clearTimeout(orologioTocco.current);
    };
  }, []);

  useEffect(() => {
    const el = fila.current;
    if (!el) return;
    const os = new IntersectionObserver(
      ([v]) => setInVista(v.isIntersecting),
      /* 0.15 e non 0.25: le schede sono alte, e su un portatile basso la
         fila non arriva mai a mostrare un quarto di se stessa tutta
         insieme -- restava fuori vista anche mentre la si guardava. */
      { threshold: 0.15 },
    );
    os.observe(el);
    return () => os.disconnect();
    /* Dipende dal numero di schede: la fila viene montata da un portale e
       al primo giro `fila.current` puo' essere ancora vuoto. Con l'elenco
       vuoto delle dipendenze l'osservatore non si agganciava piu' a
       niente, e `inVista` restava falso per sempre. */
  }, [mostrati.length]);

  const scorreDaSola = inVista && !fermo && !sopra && !toccata && !motoRidotto && !nascosta;

  /* 🔴 LA POSIZIONE SI TIENE QUI, NON NEL DOM.
   *
   * Prima ogni fotogramma faceva `el.scrollLeft += 0.3`. Su un telefono
   * funzionava; su Windows con lo schermo al 125% -- che e' l'impostazione
   * predefinita di Windows 11 -- no, e non per un motivo visibile: il
   * browser arrotonda `scrollLeft` al pixel dello schermo, quindi 0,3
   * veniva scritto e riletto come zero, all'infinito. La fila era ferma e
   * il codice girava.
   *
   * Con la posizione tenuta qui in virgola mobile il resto non si perde
   * mai: si accumula finche' non vale un pixel intero, e a quel punto la
   * fila si muove davvero. */
  const posizione = useRef(0);
  const ultimoIstante = useRef(0);

  useEffect(() => {
    const el = fila.current;
    if (!el || !scorreDaSola) return;
    let id = 0;
    posizione.current = el.scrollLeft;
    ultimoIstante.current = 0;

    /* Pixel al SECONDO, non per fotogramma: uno schermo da 144Hz faceva
       correre la fila al doppio della velocita' di uno da 60. Venti px al
       secondo vuol dire una scheda ogni diciassette secondi: deve
       accorgersene chi guarda, non disturbare chi legge. */
    const VELOCITA = 20;

    const passo = (istante: number) => {
      const trascorso = ultimoIstante.current ? istante - ultimoIstante.current : 16;
      ultimoIstante.current = istante;
      const massimo = el.scrollWidth - el.clientWidth;
      if (massimo > 4) {
        /* Se qualcun altro ha mosso la fila -- una freccia, il dito, la
           tastiera -- si riparte da dove sta adesso, altrimenti al primo
           fotogramma la si strapperebbe indietro. */
        if (Math.abs(el.scrollLeft - posizione.current) > 4) posizione.current = el.scrollLeft;
        /* Un fotogramma perso non deve diventare un salto: oltre i 64ms
           (la scheda e' tornata in primo piano, il computer ha arrancato)
           si conta come un fotogramma normale. */
        posizione.current += (VELOCITA * Math.min(trascorso, 64)) / 1000 * verso.current;
        if (posizione.current >= massimo) { posizione.current = massimo; verso.current = -1; }
        else if (posizione.current <= 0) { posizione.current = 0; verso.current = 1; }
        el.scrollLeft = posizione.current;
      }
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [scorreDaSola]);

  const scorri = useCallback((verso: 1 | -1) => {
    const el = fila.current;
    if (!el) return;
    /* Chi preme una freccia ha deciso: da qui in poi comanda lui. */
    setFermo(true);
    const scheda = el.querySelector<HTMLElement>('.hm-card');
    /* Un passo = una scheda intera piu' lo spazio fra due. A "l'80% della
       finestra" si finiva sempre con una scheda tagliata a meta'. */
    const passo = scheda ? scheda.getBoundingClientRect().width + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: verso * passo, behavior: 'smooth' });
  }, []);

  const conteggi = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tours) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  useEffect(() => {
    misuraCapi();
    const el = fila.current;
    if (!el) return;
    el.addEventListener('scroll', misuraCapi, { passive: true });
    window.addEventListener('resize', misuraCapi);
    /* Le schede cambiano larghezza quando arrivano le foto: senza questo
       le frecce restavano spente su una fila che si era allungata. */
    const ro = new ResizeObserver(misuraCapi);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', misuraCapi);
      window.removeEventListener('resize', misuraCapi);
      ro.disconnect();
    };
  }, [misuraCapi]);

  return (
    <>
      <section className={vetrina ? 'pr-sec hm-nobile' : 'pr-sec'} id="tours">
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
            {vetrina && <p className="hm-occhiello">{OCCHIELLO_CONSIGLIATI}</p>}
            <h2 className="pr-title">
              {(() => {
                const cat = filtro?.tipo || categoria;
                if (cat) return TITOLO[cat] ?? ETICHETTA[cat] ?? cat;
                /* Con una ricerca in corso il titolo resta neutro: la riga
                   sotto dice gia' quanti risultati e con quali criteri, e
                   ripeterlo in grande non aggiunge niente. */
                if (luogo || daUrl || filtro?.da || filtro?.persone) return 'Tours';
                return TITOLO_CONSIGLIATI;
              })()}
            </h2>
            {/* Il conteggio scende sotto il titolo: era lui il titolo, e
                un numero grande in cima a una sezione non dice di cosa
                si tratta. Qui fa il suo mestiere, che e' dare la misura. */}
            {vetrina ? (
              <p className="pr-lead hm-sotto-nobile">{SOTTO_CONSIGLIATI}</p>
            ) : (
              <p className="pr-lead">
                {visibili.length} {visibili.length === 1 ? 'tour' : 'tours'}
              </p>
            )}
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
            <div className="hm-fila">
              <button
                type="button"
                className="hm-frec hm-frec-sx"
                onClick={() => scorri(-1)}
                disabled={aiCapi.inizio}
                aria-label="Previous tours"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <div
                className="hm-grid"
                ref={fila}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') mouseFermo(); }}
                onPointerMove={(e) => { if (e.pointerType === 'mouse') mouseFermo(); }}
                onPointerLeave={() => {
                  if (orologioFermoMouse.current) clearTimeout(orologioFermoMouse.current);
                  setSopra(false);
                }}
                onPointerDown={(e) => { if (e.pointerType === 'mouse') setFermo(true); else sospendiPerTocco(); }}
                onTouchStart={sospendiPerTocco}
                onTouchMove={sospendiPerTocco}
                /* Anche la rotella orizzontale del trackpad e' una scelta:
                   se qualcuno sta scorrendo a mano, la fila non deve
                   tirare dall'altra parte. */
                onWheel={sospendiPerTocco}
              >
              {mostrati.map((t) => (
                <a className="hm-card" href={t.href} key={t.slug}>
                  <div className="hm-card-img">
                    <span className="hm-card-tag">{ETICHETTA[t.kind] ?? t.kind}</span>
                    {/* Le prenotazioni dell'ultimo mese, prese da Regiondo.
                        Non e' una finta urgenza: se il numero non c'e' o e'
                        basso, il chip non compare affatto. */}
                    {t.mese != null && t.mese >= SOGLIA_MESE && (
                      <span className="hm-card-hot">
                        {t.mese.toLocaleString('en-US')} booked this month
                      </span>
                    )}
                    {t.foto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        /* Le schede sono larghe al massimo 420px: chiedere
                           l'originale voleva dire scaricare 232 KB per
                           mostrarne 61. `sizes` dice al browser quanto sara'
                           larga davvero, altrimenti prende la piu' grande. */
                        src={foto(t.foto, 640)}
                        srcSet={fotoSet(t.foto, [640, 828, 1200])}
                        sizes="(max-width: 700px) 92vw, (max-width: 1180px) 46vw, 380px"
                        /* 🔴 `testo()` anche qui, non solo nel titolo.
                           I nomi arrivano da WordPress gia' con le
                           entita' dentro ("Siena, San Gimignano &amp;
                           the Tuscan countryside"). Il titolo li' sotto
                           passava per `testo()` e usciva giusto; l'alt
                           prendeva il nome crudo, React lo rimarcava, e
                           in pagina finiva `&amp;amp;`. Chi usa un
                           lettore di schermo si sentiva leggere "amp"
                           in mezzo al nome del tour, e il doppio escape
                           e' comunque HTML sbagliato: l'alt e' testo,
                           non markup. */
                        alt={testo(t.nome)}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <h3 className={classeTitolo('hm-card-name', testo(t.nome))}>{testo(t.nome)}</h3>
                  </div>
                  <div className="hm-card-body">
                    {/* DURATA, VOTO E RECENSIONI SU UNA RIGA SOLA.
                        Erano due blocchi separati, uno sopra l'altro: la
                        durata da una parte e "★★★★★ 5.0 · 3 reviews"
                        dall'altra, scollegati, e sulla foto chiara del
                        transfer per l'aeroporto sembravano due schede
                        diverse. Sono la stessa cosa -- i dati oggettivi
                        del prodotto -- e stanno su una riga, separati da
                        un punto mediano. */}
                    <div className="hm-fatti">
                      {t.ore ? <span className="hm-durata">{t.ore}</span> : null}
                      {t.maxOspiti ? <span>up to {t.maxOspiti} guests</span> : null}
                      {t.voto != null && t.quante != null && (
                        <span className="hm-voto">
                          <i className="hm-stars" aria-hidden="true">
                            {STELLE(Math.round(t.voto))}
                          </i>
                          <b>{t.voto.toFixed(1)}</b>
                          <em>
                            {t.quante.toLocaleString('en-US')} reviews {t.dove}
                          </em>
                        </span>
                      )}
                    </div>

                    {/* LA RIGA DI PROSA. E' la meta description, gia'
                        scritta per stare in piedi da sola. Il taglio a due
                        righe con i puntini lo fa il CSS: tagliarla qui a
                        un numero di caratteri spezzerebbe le parole e
                        soprattutto darebbe una lunghezza diversa da quella
                        che poi si vede, perche' dipende dalla larghezza
                        della colonna. */}
                    {t.descrizione && <p className="hm-sommario">{testo(t.descrizione)}</p>}

                    {t.punti.length > 0 && (
                      <ul className="hm-hl">
                        {t.punti.slice(0, 3).map((p) => (
                          <li key={p}>{testo(p)}</li>
                        ))}
                      </ul>
                    )}

                    {/* IL PREZZO IN FONDO, con l'occhiello sopra la cifra.
                        £ e $ non c'entrano: si incassa in euro, e il punto
                        decimale e' quello inglese -- "€676,00" per un
                        americano e' seicentomila. Qui i decimali non ci
                        sono affatto: sono sempre ,00 e a quella grandezza
                        rubano spazio alla cifra che conta. */}
                    <div className="hm-price">
                      {t.prezzo != null ? (
                        <>
                          <small>from</small>
                          <b>&euro;{t.prezzo.toFixed(0)}</b>
                          {/* 🔴 DOLLARI E STERLINE, MA CON IL SEGNO "CIRCA".
                              Tre clienti su quattro sono americani o
                              inglesi: chi legge "€149" senza sapere il
                              cambio deve aprire un'altra scheda, e spesso
                              non torna. Il "circa" non e' prudenza da
                              avvocati: si incassa in EURO, e la
                              conversione vera la fa la carta del cliente
                              col suo cambio. Chi legge $174 e si vede
                              addebitare $178 scrive una mail; chi legge
                              "≈ $174" no. */}
                          {affiancato(t.prezzo, cambio) && (
                            <em className="hm-price-cambio">
                              {affiancato(t.prezzo, cambio)}
                            </em>
                          )}
                        </>
                      ) : (
                        <span className="ask">Price on request</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
              </div>
              <button
                type="button"
                className="hm-frec hm-frec-dx"
                onClick={() => scorri(1)}
                disabled={aiCapi.fine}
                aria-label="More tours"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
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
