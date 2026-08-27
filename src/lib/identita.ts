import crypto from 'node:crypto';

/* GLI IDENTIFICATIVI DEL CLIENTE, RESI IRRICONOSCIBILI PRIMA DI USCIRE.
 *
 * ── SOLO LATO SERVER ────────────────────────────────────────────────
 * `node:crypto` di proposito: se qualcuno importasse questo file da un
 * componente client la compilazione fallirebbe, invece di spedire al
 * browser il codice che maneggia indirizzi email veri.
 *
 * ── COSA ESCE DAVVERO DA QUI ────────────────────────────────────────
 * Nessun indirizzo, nessun numero. Solo l'impronta SHA-256, che e' un
 * calcolo a senso unico: da `4f2a...` non si torna a `mario@gmail.com`.
 * Google e Meta confrontano la nostra impronta con quella dei loro
 * utenti; se non trovano niente, buttano la riga. Il filtro lo fanno
 * loro, non noi.
 *
 * ── LA TRAPPOLA: LE DUE PIATTAFORME NORMALIZZANO DIVERSO ────────────
 * Questo e' il punto in cui e' facilissimo sbagliare in silenzio.
 * L'impronta e' un confronto carattere per carattere: se noi
 * normalizziamo in un modo e loro in un altro, l'impronta non combacia,
 * la riga viene scartata e non lo dice nessuno -- il caricamento
 * risponde "accettato" e il tasso di abbinamento crolla senza un errore.
 *
 *   Google (Customer Match / Data Manager)
 *     - minuscolo, via TUTTI gli spazi
 *     - su gmail.com e googlemail.com: via i punti della parte locale e
 *       via il suffisso dopo il `+` (per Google `m.rossi@gmail.com` e
 *       `mrossi+viaggi@gmail.com` sono la stessa casella)
 *     - telefono in E.164 CON il piu' davanti: `+393478329825`
 *
 *   Meta (Conversions API)
 *     - minuscolo, via gli spazi ai bordi
 *     - i punti NON si toccano: Meta non conosce la regola di Gmail e
 *       togliendoli si ottiene un'impronta che non corrispondera' mai
 *     - telefono solo cifre, SENZA il piu': `393478329825`
 *
 * Per questo ogni identificativo ha due funzioni e non una. La
 * tentazione di fonderle in una sola e' esattamente l'errore da non
 * fare.
 */

/** SHA-256 in esadecimale minuscolo: il formato che vogliono tutti e due. */
export function impronta(testo: string): string {
  return crypto.createHash('sha256').update(testo, 'utf8').digest('hex');
}

/* Gli indirizzi di comodo delle OTA. Non sono caselle di persone: sono
   inoltri che il portale gira al cliente vero. Hashati non abbinano
   niente, e usarli per marketing proprio viola gli accordi supplier --
   Viator da solo e' il 62% del fatturato, non e' un rischio da correre.

   Restano qui anche se il filtro sul canale ("Own Ticketshop") gia' li
   escluderebbe quasi tutti: una prenotazione OTA registrata a mano nello
   shop passerebbe il filtro sul canale e non questo. */
const MASCHERE = [
  'expmessaging.tripadvisor',
  'reply.getyourguide',
  'guest.booking',
  'message.airbnb',
  'viator',
  'tiqets',
  'winedering',
  'no-reply',
  'noreply',
] as const;

/** Gli indirizzi interni. Una prenotazione di prova fatta dall'ufficio
 *  caricata come conversione insegna alle campagne a cercare noi. */
const INTERNI = /@(prestigerent|systemialab)\./i;

export function emailDaScartare(grezza: string): 'mascherata' | 'interna' | null {
  const e = grezza.toLowerCase();
  if (MASCHERE.some((m) => e.includes(m))) return 'mascherata';
  if (INTERNI.test(e)) return 'interna';
  return null;
}

/* La stessa forma del CHECK sulla tabella `richieste`, di proposito.
   Non pretende di validare la RFC -- nessuna espressione regolare ci
   riesce -- pretende solo che ci sia una chiocciola e un dominio con un
   punto, che e' quello che distingue un indirizzo da un refuso. */
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

function base(grezza: unknown): string | null {
  if (typeof grezza !== 'string') return null;
  const e = grezza.trim().toLowerCase();
  return EMAIL.test(e) ? e : null;
}

/** Email come la vuole Google: minuscola, senza spazi, e su Gmail senza i
 *  punti e senza il suffisso dopo il `+`. */
export function emailPerGoogle(grezza: unknown): string | null {
  const e = base(grezza);
  if (!e) return null;
  const senzaSpazi = e.replace(/\s+/g, '');
  const taglio = senzaSpazi.lastIndexOf('@');
  let locale = senzaSpazi.slice(0, taglio);
  const dominio = senzaSpazi.slice(taglio + 1);
  if (dominio === 'gmail.com' || dominio === 'googlemail.com') {
    locale = locale.split('+')[0].replace(/\./g, '');
  }
  return locale && dominio ? `${locale}@${dominio}` : null;
}

/** Email come la vuole Meta: minuscola e ripulita ai bordi, e basta.
 *  I punti restano: vedi il commento in cima al file. */
export function emailPerMeta(grezza: unknown): string | null {
  return base(grezza);
}

/* ── IL TELEFONO, E PERCHE' NE PERDIAMO PARECCHI ────────────────────
 *
 * Meta' dei numeri che Regiondo consegna sono americani scritti senza
 * prefisso internazionale: `516-695-3177`, `7169833800`. Senza prefisso
 * un numero non identifica nessuno nel mondo, identifica qualcuno dentro
 * un paese -- e il paese non ce l'abbiamo scritto da nessuna parte.
 *
 * Indovinare "+1" perche' sembra americano e' la cosa da non fare: un
 * prefisso sbagliato produce l'impronta di un numero che esiste davvero,
 * intestato a un'altra persona. Nella migliore delle ipotesi non abbina
 * niente; nella peggiore attribuisce la vendita al clic di uno
 * sconosciuto. Un dato in meno costa una conversione non attribuita, un
 * dato inventato sporca il modello e non si sa piu' quale.
 *
 * Quindi: si accettano solo i numeri gia' internazionali, e quanti se ne
 * perdono finisce nel rapporto invece che in un silenzio.
 */

function cifre(grezzo: unknown): string | null {
  if (typeof grezzo !== 'string') return null;
  const t = grezzo.trim();
  if (!t.startsWith('+')) return null;
  const n = t.replace(/\D/g, '');
  /* E.164: da 8 a 15 cifre prefisso compreso. Sotto le otto e' un
     interno o un campo compilato per sbaglio. */
  return n.length >= 8 && n.length <= 15 ? n : null;
}

/** Telefono come lo vuole Google: E.164, con il piu'. */
export function telefonoPerGoogle(grezzo: unknown): string | null {
  const n = cifre(grezzo);
  return n ? '+' + n : null;
}

/** Telefono come lo vuole Meta: solo cifre, prefisso paese compreso,
 *  senza il piu' e senza zeri davanti. */
export function telefonoPerMeta(grezzo: unknown): string | null {
  return cifre(grezzo);
}

/** Nome o cognome come li vuole Meta: minuscolo, senza punteggiatura,
 *  senza cifre, spazi ridotti a uno. Vale solo per Meta: a Google i nomi
 *  non si mandano affatto, perche' li accetta unicamente insieme a
 *  paese e codice postale, che Regiondo non consegna. */
export function nomePerMeta(grezzo: unknown): string | null {
  if (typeof grezzo !== 'string') return null;
  const n = grezzo
    .toLowerCase()
    .normalize('NFD')
    /* via i segni diacritici: "josé" e "jose" devono dare la stessa
       impronta, perche' chi compila il modulo scrive un po' e un po'. */
    .replace(/[\u0300-\u036f]/g, '')
    /* La punteggiatura sparisce, non diventa uno spazio: per Meta
       `O'Brien` e' `obrien`, e trasformarlo in `o brien` produce
       un'impronta che non corrisponde a niente. Gli spazi fra un nome e
       l'altro invece restano. */
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return n.length >= 2 ? n : null;
}

/* ── IL TEMPO ───────────────────────────────────────────────────────
 *
 * Regiondo scrive `2026-08-24 22:20:11` senza fuso e dichiara a parte
 * `Europe/Berlin`. Presa per UTC, quella prenotazione risulta fatta due
 * ore piu' tardi di quando e' stata fatta.
 *
 * Sembra un dettaglio da pignoli e non lo e': su Meta il tetto e' sette
 * giorni esatti, e una prenotazione al limite scivola dentro o fuori per
 * quelle due ore. Il vecchio script incollava "+02:00" a mano, che e'
 * giusto da marzo a ottobre e sbagliato di un'ora il resto dell'anno --
 * un lavoro notturno vive anche a novembre.
 *
 * Qui il fuso lo chiede a `Intl`, che l'ora legale la sa. I due giri
 * servono per le due ore all'anno in cui l'orologio salta: il primo giro
 * stima lo scarto con l'orologio sbagliato, il secondo lo corregge.
 */

function scartoFuso(quando: Date, fuso: string): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(quando)) p[x.type] = x.value;
  const comeUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return comeUtc - quando.getTime();
}

/** `"2026-08-24 22:20:11"` letto nel fuso dichiarato dalla prenotazione.
 *  Restituisce `null` se il testo non ha la forma attesa: meglio saltare
 *  una riga che mandarne una datata 1970. */
export function istanteDa(testo: unknown, fuso = 'Europe/Berlin'): Date | null {
  if (typeof testo !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(testo.trim());
  if (!m) return null;
  const ingenuo = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  const primo = ingenuo - scartoFuso(new Date(ingenuo), fuso);
  const secondo = ingenuo - scartoFuso(new Date(primo), fuso);
  const d = new Date(secondo);
  return Number.isNaN(d.getTime()) ? null : d;
}
