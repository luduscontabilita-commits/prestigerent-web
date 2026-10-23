/* QUANDO PUBBLICARE UNA RISPOSTA.
 *
 * ── IL PROBLEMA, IN NUMERI ────────────────────────────────────────────
 * Viator manda UN riepilogo al giorno, con dentro da 8 a 18 recensioni
 * (misurato dal 17 al 22/10/2026). Se si risponde a tutte quando arriva
 * l'email, escono diciotto risposte nello stesso minuto: e' una raffica,
 * e una raffica si vede. Dice a chiunque guardi la pagina che dall'altra
 * parte non c'e' nessuno che legge -- che e' l'opposto di quello che una
 * risposta dovrebbe comunicare.
 *
 * ── LE QUATTRO REGOLE, E PERCHE' CIASCUNA ─────────────────────────────
 * 1. RITARDO A CASO fra un minimo e un massimo. Non un ritardo fisso:
 *    venti risposte tutte a 45 minuti esatti sono un'altra firma.
 * 2. MAI DI NOTTE. Una risposta alle 3:40 non la scrive nessuno. Quelle
 *    che cadrebbero di notte aspettano la mattina, e non tutte alla
 *    stessa ora: anche l'ora di ripartenza e' estratta.
 * 3. DISTANZA MINIMA fra due risposte. Senza, il caso puo' metterne tre
 *    nello stesso minuto -- cioe' ricreare la raffica per sbaglio.
 * 4. UN TETTO PER ORA. Diciotto risposte in due ore restano diciotto
 *    risposte in due ore: il tetto le distribuisce sulla giornata.
 *
 * ── PERCHE' IL CASO SI PASSA DA FUORI ─────────────────────────────────
 * `caso` e' un parametro, non `Math.random` chiamato dentro. Cosi' il
 * calcolo si prova: con un caso finto si verifica che la notte sia
 * rispettata, che la distanza tenga e che il tetto funzioni, senza
 * pubblicare niente e senza aspettare. Una regola di pacing che non si
 * puo' provare non si sa se funziona finche' non si vede la raffica.
 *
 * ── 🔴 QUESTO NON SERVE A INGANNARE NESSUNO ───────────────────────────
 * Serve a non sembrare un distributore automatico. Le risposte le
 * approva una persona, una per una: distribuirle nel tempo le rende
 * semplicemente quello che sono -- risposte scritte da qualcuno che ha
 * una giornata.
 */

export type Finestra = {
  /** il ritardo minimo da quando si viene a sapere della recensione */
  minMinuti: number;
  maxMinuti: number;
  /** 🔴 LA NOTTE SI SALTA, E LA MATTINA NON RICOMINCIA SEMPRE ALLA
   *  STESSA ORA. Regola della proprieta', 23/10/2026: «salta gli orari
   *  notturni italiani dalle 24 alle 7-9 RANDOM, mai al minuto esatto».
   *  Un'ora di ripresa fissa e' una firma come un'altra: venti risposte
   *  che negli anni escono sempre alle 8:00 si notano. Quindi la ripresa
   *  si estrae fra queste due ore, ogni volta. */
  oraRipresaMin: number;
  oraRipresaMax: number;
  /** l'ora in cui si smette la sera: 24 = mezzanotte */
  oraFine: number;
  /** 🔴 il minimo ASSOLUTO fra due risposte, in minuti. Non e' la
   *  distanza tipica: quella si estrae ogni volta con `distanzaACaso()`.
   *  Regola della proprieta', 23/10/2026: «anche 7 minuti esatti non e'
   *  normale, a volte un minuto dopo, altre 1,5, altre 10». */
  distanzaMinima: number;
  /** quante al massimo nella stessa ora */
  maxPerOra: number;
};

export const FINESTRA: Finestra = {
  minMinuti: 15,
  maxMinuti: 120,
  oraRipresaMin: 7,
  oraRipresaMax: 9,
  oraFine: 24,
  distanzaMinima: 1,
  maxPerOra: 6,
};

const MINUTO = 60_000;

/**
 * Quanto aspettare fra una risposta e la successiva: a caso, ogni volta
 * diverso, con una distribuzione che somiglia a una persona che risponde
 * «quando capita». Spesso poco (una, due, tre minuti: e' lecito e
 * normale rispondere a due recensioni di fila), a volte un quarto d'ora,
 * ogni tanto mezz'ora.
 *
 * `seme` serve a chi deve rifare lo stesso calcolo piu' volte e ottenere
 * la stessa risposta: il giro che controlla la coda ogni due minuti non
 * deve ri-estrarre la distanza a ogni controllo, se no «vince» sempre
 * l'estrazione piu' corta.
 */
export function distanzaACaso(caso: () => number = Math.random, seme?: number): number {
  const r = seme === undefined ? caso() : pseudo(seme);
  const r2 = seme === undefined ? caso() : pseudo(seme + 7919);
  if (r < 0.35) return 1 + r2 * 2.5; // 1 - 3,5 minuti
  if (r < 0.8) return 3.5 + r2 * 9; // 3,5 - 12,5 minuti
  return 12.5 + r2 * 18; // 12,5 - 30 minuti
}

/** Un numero fra 0 e 1 che dipende solo dal seme: stesso seme, stesso
 *  numero. Non e' casuale in senso forte e non deve esserlo. */
function pseudo(seme: number): number {
  let x = Math.floor(seme) % 2147483647;
  if (x <= 0) x += 2147483646;
  x = (x * 16807) % 2147483647;
  return (x - 1) / 2147483646;
}

/** L'ora del giorno a Roma, qualunque sia il fuso di chi esegue.
 *
 *  🔴 Non si usa `getHours()`: su Vercel il server sta in UTC, e una
 *  risposta che li' sembra alle 9 del mattino a Roma e' alle 11 -- o
 *  alle 2 di notte, a seconda della stagione. L'ora legale non si
 *  calcola a mano: la sa `Intl`. */
export function oraARoma(d: Date): number {
  const p = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(d);
  return Number(p.find((x) => x.type === 'hour')?.value ?? 12);
}

function dentroLaGiornata(d: Date, f: Finestra): boolean {
  const o = oraARoma(d);
  /* la sera si pubblica fino a mezzanotte: e' la notte fonda che non ha
     senso, non le dieci di sera */
  return o >= f.oraRipresaMin && o < f.oraFine;
}

/* 🔴 I BORDI DELLA NOTTE SONO MORBIDI, DI PROPOSITO. Regola della
   proprieta', 23/10/2026: «deve anche poter pubblicare qualche volta a
   00:30, qualche volta alle 06:30». Un muro netto alle 24:00 e alle 7:00
   e' un orario d'ufficio, e un orario d'ufficio e' una firma. Una
   persona ogni tanto risponde a mezzanotte e mezza, o alle sei e mezza
   prima di uscire. Quindi: una risposta che cade nella prima ora dopo
   mezzanotte, o nell'ora prima della ripresa, OGNI TANTO resta li'. Non
   spesso -- una su otto -- se no la notte non e' piu' saltata. */
const UNA_SU = 8;
function bordoMorbido(d: Date, f: Finestra, caso: () => number): boolean {
  const o = oraARoma(d);
  const primaOraDopoMezzanotte = o === 0;
  const oraPrimaDellaRipresa = o === f.oraRipresaMin - 1;
  return (primaOraDopoMezzanotte || oraPrimaDellaRipresa) && Math.floor(caso() * UNA_SU) === 0;
}

/* 🔴 ANCHE I SECONDI SONO A CASO. «Al minuto esatto» vale anche per i
   secondi: un orario sempre a :00 secondi e' un orologio, e nei registri
   di Viator i secondi ci sono. Si sporca sempre, su ogni orario. */
function secondiACaso(d: Date, caso: () => number): Date {
  const t = new Date(d);
  t.setUTCSeconds(1 + Math.floor(caso() * 58), Math.floor(caso() * 1000));
  return t;
}

/** I minuti dentro l'ora, a Roma. Serve a non far uscire niente allo
 *  scoccare dell'ora: le 9:00 in punto sono un orologio, le 9:17 una
 *  persona. */
function minutiARoma(d: Date): number {
  const p = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    minute: 'numeric',
  }).formatToParts(d);
  return Number(p.find((x) => x.type === 'minute')?.value ?? 0);
}

/** 🔴 MAI AL MINUTO ESATTO. Se il momento calcolato cade a :00 lo si
 *  sposta di qualche minuto: nessuno risponde alle 9:00:00. */
function maiInPunto(d: Date, caso: () => number): Date {
  if (minutiARoma(d) !== 0) return d;
  return new Date(d.getTime() + (2 + Math.floor(caso() * 27)) * MINUTO);
}

/** Sposta un momento al prossimo orario utile, con la partenza estratta
 *  dentro la prima ora e mezza: se no tutte le risposte della notte
 *  escono alle 8:00 in punto, che e' una raffica con l'orologio. */
function allaProssimaMattina(d: Date, f: Finestra, caso: () => number): Date {
  let t = new Date(d);
  /* avanti di un'ora alla volta finche' non si rientra nella giornata:
     poche iterazioni, e nessun calcolo di fusi fatto a mano */
  let giri = 0;
  while (!dentroLaGiornata(t, f) && giri < 48) {
    t = new Date(t.getTime() + 60 * MINUTO);
    giri++;
  }
  /* 🔴 ORA SI E' ALL'ORA DI RIPRESA MINIMA (le 7). La dispersione copre
     la fascia fino all'ora massima (le 9) piu' una coda: cosi' la
     mattina non ricomincia mai alla stessa ora, che era il punto.
     E una volta su otto si parte un'ora PRIMA: le 6 e mezza, «prima di
     uscire». E' il bordo morbido visto dal lato della mattina. */
  const fascia = Math.max(1, f.oraRipresaMax - f.oraRipresaMin) * 60;
  const anticipo = Math.floor(caso() * UNA_SU) === 0 ? -Math.floor(caso() * 60) : 0;
  return maiInPunto(new Date(t.getTime() + (anticipo + Math.floor(caso() * fascia)) * MINUTO), caso);
}

/**
 * Il momento in cui pubblicare una risposta.
 *
 * @param adesso   quando si e' venuti a sapere della recensione
 * @param gia      i momenti gia' assegnati alle altre risposte in coda
 * @param caso     da 0 a 1; si passa per poter provare il calcolo
 */
export function quandoPubblicare(
  adesso: Date,
  gia: readonly Date[] = [],
  f: Finestra = FINESTRA,
  caso: () => number = Math.random
): Date {
  const ritardo = f.minMinuti + Math.floor(caso() * (f.maxMinuti - f.minMinuti + 1));
  let t = new Date(adesso.getTime() + ritardo * MINUTO);

  if (!dentroLaGiornata(t, f) && !bordoMorbido(t, f, caso)) t = allaProssimaMattina(t, f, caso);
  t = maiInPunto(t, caso);

  /* ora si cerca un posto libero: troppo vicino a un'altra, oppure in
     un'ora gia' piena, e si prova piu' avanti. Il passo e' a caso
     anch'esso -- un passo fisso rimetterebbe le risposte in griglia. */
  for (let giri = 0; giri < 300; giri++) {
    const distanza = Math.max(f.distanzaMinima, distanzaACaso(caso));
    const vicina = gia.some((x) => Math.abs(x.getTime() - t.getTime()) < distanza * MINUTO);
    const nellOra = gia.filter(
      (x) => Math.floor(x.getTime() / 3_600_000) === Math.floor(t.getTime() / 3_600_000)
    ).length;

    if (!vicina && nellOra < f.maxPerOra) return secondiACaso(maiInPunto(t, caso), caso);

    t = new Date(t.getTime() + (5 + Math.floor(caso() * 16)) * MINUTO);
    if (!dentroLaGiornata(t, f) && !bordoMorbido(t, f, caso)) t = allaProssimaMattina(t, f, caso);
  }
  return t;
}

/**
 * I momenti per un gruppo di risposte, tutte insieme: e' il caso vero,
 * perche' il riepilogo di Viator arriva una volta al giorno con dentro
 * tutte le recensioni del giorno.
 *
 * Ognuna si colloca tenendo conto di quelle gia' collocate, quindi la
 * distanza minima e il tetto per ora valgono sul gruppo intero.
 */
export function quandoPubblicarle(
  quante: number,
  adesso: Date,
  giaInCoda: readonly Date[] = [],
  f: Finestra = FINESTRA,
  caso: () => number = Math.random
): Date[] {
  const presi = [...giaInCoda];
  const fuori: Date[] = [];
  for (let i = 0; i < quante; i++) {
    const t = quandoPubblicare(adesso, presi, f, caso);
    presi.push(t);
    fuori.push(t);
  }
  return fuori.sort((a, b) => a.getTime() - b.getTime());
}
