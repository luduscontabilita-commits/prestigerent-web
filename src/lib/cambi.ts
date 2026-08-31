/* IL PREZZO IN DOLLARI E IN STERLINE, ACCANTO A QUELLO IN EURO.
 *
 * ── PERCHE' ─────────────────────────────────────────────────────────
 * Tre clienti su quattro sono americani o inglesi. Chi legge "€149" e non
 * sa il cambio deve aprire un'altra scheda per capire se il tour costa
 * poco o tanto, e quella e' una delle scuse per cui non torna. Il numero
 * accanto costa una riga e toglie quel passaggio.
 *
 * ── LA FONTE ────────────────────────────────────────────────────────
 * Frankfurter, che ripubblica i cambi ufficiali della BCE. Gratis, senza
 * chiave, senza registrazione. Se cade, si legge la BCE direttamente: e'
 * la stessa identica fonte, e il 31/08/2026 ho verificato che i due dessero
 * gli stessi numeri fino all'ultimo decimale (1,1643 e 0,8572).
 *
 * ── COME RESTA VELOCE ───────────────────────────────────────────────
 * Nessuna chiamata dal browser, nessun JavaScript nella pagina. La
 * richiesta la fa il server quando ricostruisce la pagina, e la risposta
 * resta in cache 24 ore (`revalidate`): i cambi della BCE si aggiornano
 * una volta al giorno, chiederli piu' spesso e' solo traffico. Le pagine
 * restano statiche come prima.
 *
 * ── SE NON RISPONDE NESSUNO ─────────────────────────────────────────
 * Si restituisce `null` e la pagina mostra solo l'euro. Non si tiene un
 * cambio vecchio "per sicurezza": un numero sbagliato accanto al prezzo e'
 * peggio di nessun numero, e nessuno se ne accorgerebbe.
 */

export type Cambi = {
  usd: number;
  gbp: number;
  /** il giorno a cui si riferiscono i cambi, per poterlo dire in pagina */
  giorno: string;
};

/* Ventiquattro ore. I cambi BCE escono una volta al giorno, verso le 16. */
const DURATA = 86_400;

/* Quattro secondi e si molla. Senza un limite, un'API lenta trattiene la
   ricostruzione della pagina: il prezzo in dollari non vale un secondo di
   attesa in piu' su una pagina che deve caricare in meno di uno.
   Il limite NON si fa con `AbortSignal` passato a `fetch`: quello
   disattiva la cache di Next e trasforma una richiesta in centoventi. */
const ATTESA = 4_000;

/** Numeri plausibili, per non stampare un prezzo assurdo se la fonte
 *  cambia formato senza dirlo. L'euro non e' mai valso meno di 0,8 dollari
 *  ne' piu' di 1,6, e con la sterlina il campo e' anche piu' stretto. */
function sensato(usd: number, gbp: number) {
  return usd > 0.8 && usd < 1.6 && gbp > 0.6 && gbp < 1.1;
}

async function daFrankfurter(): Promise<Cambi | null> {
  const r = await fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP', {
    next: { revalidate: DURATA },
  });
  if (!r.ok) return null;
  const d = (await r.json()) as { date?: string; rates?: { USD?: number; GBP?: number } };
  const usd = Number(d.rates?.USD);
  const gbp = Number(d.rates?.GBP);
  if (!sensato(usd, gbp)) return null;
  return { usd, gbp, giorno: d.date ?? '' };
}

async function dallaBce(): Promise<Cambi | null> {
  const r = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
    next: { revalidate: DURATA },
  });
  if (!r.ok) return null;
  const xml = await r.text();
  const prendi = (c: string) => {
    const m = xml.match(new RegExp(`currency=['"]${c}['"]\\s+rate=['"]([0-9.]+)['"]`));
    return m ? Number(m[1]) : NaN;
  };
  const usd = prendi('USD');
  const gbp = prendi('GBP');
  if (!sensato(usd, gbp)) return null;
  const g = xml.match(/time=['"]([0-9-]+)['"]/);
  return { usd, gbp, giorno: g ? g[1] : '' };
}

/* 🔴 UNA CHIAMATA SOLA PER TUTTO IL PROCESSO, E IL MOTIVO NON E' LA
 * VELOCITA'.
 *
 * Il sito genera 36 pagine di categoria e 86 schede tour: se ognuna
 * chiedesse il cambio per conto suo sarebbero oltre cento richieste alla
 * stessa API nello stesso minuto, e la prima cosa che fa un servizio
 * gratuito e' rifiutarle. E' successo davvero: sulla home e sulle schede
 * il prezzo in dollari c'era, sulle pagine di categoria no -- non per un
 * errore di codice, ma perche' quelle chiamate erano state respinte.
 *
 * `next: { revalidate }` da solo non bastava: passare un `signal` a
 * `fetch` fa saltare la cache di Next, e ogni pagina ripartiva da capo.
 * Il segnale e' stato tolto e il limite di tempo si fa con una corsa fra
 * la richiesta e un timer -- che ottiene la stessa cosa senza toccare le
 * opzioni di `fetch`.
 *
 * La promessa si tiene qui: la prima pagina che chiede fa la richiesta,
 * tutte le altre aspettano quella. */
let inCorso: Promise<Cambi | null> | null = null;

function conLimite<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((res) => setTimeout(() => res(null), ms)),
  ]);
}

async function chiedi(): Promise<Cambi | null> {
  for (const fonte of [daFrankfurter, dallaBce]) {
    try {
      const c = await conLimite(fonte(), ATTESA);
      if (c) return c;
    } catch {
      /* si prova la prossima: qui un errore non deve mai far cadere la
         pagina, il prezzo in euro c'e' comunque */
    }
  }
  return null;
}

export async function cambi(): Promise<Cambi | null> {
  if (!inCorso) {
    inCorso = chiedi().catch(() => null);
    /* se e' andata male non si tiene il fallimento per sempre: al giro
       dopo si riprova. Se e' andata bene la promessa resta, e vale finche'
       il processo vive -- che e' meno delle 24 ore della cache di Next,
       quindi non si rischia di servire un cambio vecchio. */
    inCorso.then((c) => {
      if (!c) inCorso = null;
    });
  }
  return inCorso;
}

/** "≈ $104 · £76" — o stringa vuota se i cambi non ci sono.
 *
 *  Arrotondato all'unita': i centesimi in una valuta di cortesia danno
 *  un'idea di precisione che non c'e', perche' la conversione vera la fa
 *  la carta del cliente col SUO cambio, non con questo. Ed e' anche il
 *  motivo del segno "circa": si incassa in euro, sempre. */
export function affiancato(euro: number, c: Cambi | null): string {
  if (!c || !Number.isFinite(euro) || euro <= 0) return '';
  const usd = Math.round(euro * c.usd);
  const gbp = Math.round(euro * c.gbp);
  return `≈ $${usd.toLocaleString('en-US')} · £${gbp.toLocaleString('en-US')}`;
}
