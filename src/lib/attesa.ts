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
  /** la prima e l'ultima ora della giornata in cui si pubblica (Europa/Roma) */
  oraInizio: number;
  oraFine: number;
  /** quanto almeno fra due risposte */
  distanzaMinima: number;
  /** quante al massimo nella stessa ora */
  maxPerOra: number;
};

export const FINESTRA: Finestra = {
  minMinuti: 15,
  maxMinuti: 120,
  oraInizio: 8,
  oraFine: 22,
  distanzaMinima: 7,
  maxPerOra: 6,
};

const MINUTO = 60_000;

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
  return o >= f.oraInizio && o < f.oraFine;
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
  /* ora si e' dentro la finestra, all'inizio di un'ora qualsiasi: si
     aggiunge una dispersione fino a 90 minuti */
  return new Date(t.getTime() + Math.floor(caso() * 90) * MINUTO);
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

  if (!dentroLaGiornata(t, f)) t = allaProssimaMattina(t, f, caso);

  /* ora si cerca un posto libero: troppo vicino a un'altra, oppure in
     un'ora gia' piena, e si prova piu' avanti. Il passo e' a caso
     anch'esso -- un passo fisso rimetterebbe le risposte in griglia. */
  for (let giri = 0; giri < 300; giri++) {
    const vicina = gia.some((x) => Math.abs(x.getTime() - t.getTime()) < f.distanzaMinima * MINUTO);
    const nellOra = gia.filter(
      (x) => Math.floor(x.getTime() / 3_600_000) === Math.floor(t.getTime() / 3_600_000)
    ).length;

    if (!vicina && nellOra < f.maxPerOra) return t;

    t = new Date(t.getTime() + (5 + Math.floor(caso() * 16)) * MINUTO);
    if (!dentroLaGiornata(t, f)) t = allaProssimaMattina(t, f, caso);
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
