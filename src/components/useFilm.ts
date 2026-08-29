'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTasto, PointerEvent as EventoPuntatore } from 'react';

/* IL CAROSELLO DELLE LANDING, PORTATO QUI.
 *
 * Sulle due landing collaudate (lp/...-lan2.html) la striscia foto scorre
 * da sola verso sinistra, all'infinito, e si ferma quando l'utente ci
 * mette le mani. Quella logica sta in un `initFilm()` di un centinaio di
 * righe in fondo alla pagina; qui e' la stessa cosa, con quattro
 * differenze volute:
 *
 *  1. QUANDO NON DEVE SCORRERE, IL CICLO SI SPEGNE. Sulla landing il
 *     requestAnimationFrame gira sempre, anche a velocita' zero e anche a
 *     scheda nascosta: sessanta risvegli al secondo per non fare niente.
 *     Qui il ciclo parte solo quando serve davvero e viene annullato in
 *     tutti gli altri casi. Su un telefono e' batteria che non si
 *     consuma.
 *
 *  2. CHI TOCCA, COMANDA. La landing riparte da sola dopo 3,2 secondi.
 *     E' la cosa piu' fastidiosa che ci sia: stai guardando una foto e il
 *     carosello te la porta via. Qui la prima interazione ferma lo
 *     scorrimento e basta -- riparte solo se lo si chiede col pulsante.
 *
 *  3. `prefers-reduced-motion` NON e' letto una volta sola all'avvio: si
 *     resta in ascolto, cosi' chi lo attiva mentre la pagina e' aperta
 *     vede fermarsi tutto subito.
 *
 *  4. Al primo rendering si parte da "moto ridotto". Il server non sa
 *     cosa ha impostato chi guarda, e indovinare vorrebbe dire servire un
 *     HTML diverso da quello che React si aspetta all'idratazione.
 *     Pessimisti di proposito: prima si serve la pagina ferma, poi -- se
 *     e solo se il browser dice che va bene -- si accende.
 */

type Opzioni = {
  /** se false la striscia si scorre solo a mano (i video: vedi Videos.tsx) */
  auto?: boolean;
  /** pixel per fotogramma. 0,55 e' il valore delle landing */
  velocita?: number;
  /** quante diapositive sono ORIGINALI (le altre sono i cloni del ciclo).
   *  Serve a sapere dopo quanti pixel si torna al punto di partenza. */
  originali?: number;
};

export function useFilm({ auto = false, velocita = 0.55, originali = 0 }: Opzioni = {}) {
  const box = useRef<HTMLDivElement>(null);

  const [motoRidotto, setMotoRidotto] = useState(true);
  /* `fermo` = l'utente ha preso il comando. Non torna false da solo. */
  const [fermo, setFermo] = useState(false);
  const [sopra, setSopra] = useState(false);
  const [nascosta, setNascosta] = useState(false);
  /* 🔴 IL DITO METTE IN PAUSA, NON SPEGNE.
   *
   * Col mouse "chi tocca comanda" e' giusto: trascinare una striscia e'
   * un gesto deliberato, e chi lo fa vuole guardarsi le foto con calma.
   * Col dito no. Su un telefono la striscia occupa mezzo schermo, e per
   * scorrere la PAGINA il dito ci passa sopra per forza: con lo stesso
   * trattamento del mouse, il primo scorrimento verticale spegneva lo
   * scorrimento automatico per sempre, su una pagina che l'utente non
   * aveva ancora nemmeno cominciato a leggere.
   *
   * Quindi il tocco sospende per qualche secondo e poi riparte da solo.
   * Chi vuole fermarla davvero ha il pulsante, che invece resta
   * definitivo. */
  const [toccata, setToccata] = useState(false);
  const orologioTocco = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* la larghezza di un giro completo, cioe' quanto misura il blocco delle
     diapositive originali. Si rimisura da sola quando le immagini
     finiscono di caricare e quando la finestra cambia dimensione. */
  const giro = useRef(0);

  /* ---- prefers-reduced-motion ---- */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const leggi = () => setMotoRidotto(mq.matches);
    leggi();
    mq.addEventListener('change', leggi);
    return () => mq.removeEventListener('change', leggi);
  }, []);

  /* ---- scheda in secondo piano ----
     Il browser rallenta gia' i requestAnimationFrame a scheda nascosta,
     ma non li ferma in ogni caso (finestra affiancata, telefono con lo
     schermo acceso su un'altra app). Qui si spegne e basta. */
  useEffect(() => {
    const guarda = () => setNascosta(document.hidden);
    guarda();
    document.addEventListener('visibilitychange', guarda);
    return () => document.removeEventListener('visibilitychange', guarda);
  }, []);

  /* ---- la striscia e' davvero sullo schermo? ----
     Due motivi, tutti e due concreti:
      - su telefono la striscia desktop sta dentro `.hero-film`, che e'
        `display:none`. Un elemento nascosto non interseca mai niente,
        quindi li' il ciclo di animazione non parte affatto: senza questo
        controllo girerebbe a vuoto per tutta la visita, su batteria.
      - quando si e' scesi alle recensioni, far scorrere delle foto che
        nessuno sta guardando e' lavoro sprecato. */
  const [inVista, setInVista] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (voci) => setInVista(voci[0]?.isIntersecting ?? false),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ---- misura del giro ---- */
  useEffect(() => {
    const el = box.current;
    const track = el?.querySelector<HTMLElement>('.film-track');
    if (!el || !track || originali < 1) return;

    const misura = () => {
      const primo = track.children[0] as HTMLElement | undefined;
      const clone = track.children[originali] as HTMLElement | undefined;
      giro.current = primo && clone ? clone.offsetLeft - primo.offsetLeft : 0;
    };
    misura();
    /* ResizeObserver e non `resize`: le foto arrivano una alla volta e a
       ogni arrivo la striscia si allunga. Con il solo `resize` il giro
       restava misurato sulle prime due immagini e lo scorrimento saltava
       a meta' strada. */
    const ro = new ResizeObserver(misura);
    ro.observe(track);
    return () => ro.disconnect();
  }, [originali]);

  /* ---- lo scorrimento ---- */
  const scorreDaSola =
    auto && originali > 0 && inVista && !motoRidotto && !fermo && !sopra &&
    !toccata && !nascosta;

  useEffect(() => {
    const el = box.current;
    if (!el || !scorreDaSola) return;
    let id = 0;
    const passo = () => {
      el.scrollLeft += velocita;
      /* il ritorno al punto di partenza: si salta indietro di un giro
         esatto, quindi sullo schermo non si vede nessun salto -- al pixel
         dove si arriva c'e' la stessa diapositiva */
      if (giro.current > 0 && el.scrollLeft >= giro.current) el.scrollLeft -= giro.current;
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [scorreDaSola, velocita]);

  /* ---- comandi a mano ---- */
  /* Chi tocca comanda: col mouse, un'interazione ferma lo scorrimento e
     non riparte da sola. */
  const prendiIlComando = useCallback(() => setFermo(true), []);

  /** La pausa del dito: sospende e riparte da sola. Vedi la nota su
   *  `toccata` piu' sopra. */
  const sospendiPerTocco = useCallback(() => {
    setToccata(true);
    if (orologioTocco.current) clearTimeout(orologioTocco.current);
    orologioTocco.current = setTimeout(() => setToccata(false), 3500);
  }, []);

  /* L'orologio va spento con il componente: senza, un cambio di pagina
     durante la pausa lascerebbe un setState su un componente smontato. */
  useEffect(() => () => {
    if (orologioTocco.current) clearTimeout(orologioTocco.current);
  }, []);

  const scorri = useCallback((verso: 1 | -1) => {
    const el = box.current;
    if (!el) return;
    setFermo(true);
    const prima = el.querySelector<HTMLElement>('.film-track > *');
    /* un passo = una diapositiva, non "l'80% della finestra": con
       diapositive larghe 880px l'80% ne mostrava una a meta' */
    const passo = prima ? prima.getBoundingClientRect().width + 14 : el.clientWidth * 0.8;
    el.scrollBy({ left: verso * passo, behavior: motoRidotto ? 'auto' : 'smooth' });
  }, [motoRidotto]);

  const alterna = useCallback(() => setFermo((f) => !f), []);

  /* ---- trascinamento col mouse ---- */
  const trascino = useRef(false);
  const partenzaX = useRef(0);
  const partenzaScroll = useRef(0);

  const onPointerDown = useCallback((e: EventoPuntatore<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') prendiIlComando();
    else sospendiPerTocco();
    /* Un <video controls> deve ricevere il proprio clic. Qui sotto si
       chiama preventDefault e si cattura il puntatore: fatto sopra un
       video, il play non partirebbe mai. */
    const t = e.target as HTMLElement;
    if (t.closest?.('video, .vid-play, button, a')) return;
    if (e.pointerType !== 'mouse') return;
    e.preventDefault();
    trascino.current = true;
    partenzaX.current = e.clientX;
    partenzaScroll.current = e.currentTarget.scrollLeft;
    e.currentTarget.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [prendiIlComando, sospendiPerTocco]);

  const onPointerMove = useCallback((e: EventoPuntatore<HTMLDivElement>) => {
    if (!trascino.current) return;
    e.currentTarget.scrollLeft = partenzaScroll.current - (e.clientX - partenzaX.current);
  }, []);

  const finisciTrascino = useCallback((e: EventoPuntatore<HTMLDivElement>) => {
    trascino.current = false;
    e.currentTarget.classList.remove('dragging');
  }, []);

  const onKeyDown = useCallback((e: EventoTasto<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scorri(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); scorri(-1); }
  }, [scorri]);

  /* Le proprieta' da spalmare sull'elemento che scorre. Stanno qui e non
     scritte a mano nei due componenti perche' altrimenti la prossima
     striscia ne dimenticherebbe una. */
  const proprieta = {
    ref: box,
    tabIndex: 0,
    onPointerEnter: (e: EventoPuntatore<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') setSopra(true);
    },
    onPointerLeave: (e: EventoPuntatore<HTMLDivElement>) => {
      setSopra(false);
      finisciTrascino(e);
    },
    onPointerDown,
    onPointerMove,
    onPointerUp: finisciTrascino,
    onPointerCancel: finisciTrascino,
    onTouchStart: sospendiPerTocco,
    onKeyDown,
  };

  return { proprieta, scorri, fermo, alterna, motoRidotto, prendiIlComando };
}
