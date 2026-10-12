import crypto from 'node:crypto';

/* IL LINK DI ACCESSO DIRETTO DEI PARTNER (/partners/enter/?t=...).
 *
 * Richiesto dalla proprieta' il 12/10/2026: nell'email di approvazione un
 * link che porta DENTRO l'area partner senza dover scrivere niente.
 *
 * ── 🔴 PERCHE' NON CI SONO EMAIL E PASSWORD NELL'INDIRIZZO ───────────
 * La richiesta era «un link con user e password gia' precompilate». Una
 * password dentro un URL finisce nella cronologia del browser, nei log
 * dei server di mezzo, negli strumenti di statistica e -- se la persona
 * inoltra l'email o copia il link in una chat -- in mano a chiunque. Il
 * link invece porta un GETTONE FIRMATO dal sito: dice «questa persona,
 * fino a questa data», e la firma (HMAC-SHA256) impedisce di
 * fabbricarne uno o di cambiarne l'email. La password non viaggia mai.
 *
 * ── QUANTO DURA, E PERCHE' NON E' MONOUSO ───────────────────────────
 * 14 giorni. I link monouso di Supabase durano un'ora (impostazione di
 * default, che da qui non si puo' nemmeno leggere): troppo poco per
 * un'email che un'agenzia apre la settimana dopo. E non e' monouso
 * apposta: i filtri antispam di molte caselle «aprono» i link per
 * controllarli, e un link monouso arriverebbe al cliente gia' consumato.
 * Il rischio non cresce: la stessa email contiene gia' la password.
 *
 * Cosa lo spegne prima del tempo: chiudere l'accesso del partner dal
 * pannello (il controllo legge `profili.attivo` a ogni uso).
 *
 * ── LA CHIAVE ────────────────────────────────────────────────────────
 * Derivata da SUPABASE_SECRET_KEY, che sta gia' su Vercel e non lascia
 * mai il server: nessuna variabile nuova da configurare. Se la chiave
 * segreta cambia, i link gia' mandati smettono di funzionare (e la
 * persona entra con email e password, che restano valide). */

export const DURATA_LINK_GIORNI = 14;
const SITO = 'https://prestigerent.com';

function chiave(): string | null {
  const k = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return k ? `${k}:partners-enter-link:v1` : null;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');

function firma(dati: string, k: string): string {
  return crypto.createHmac('sha256', k).update(dati).digest('base64url');
}

/** Il link da mettere nell'email. null se manca la chiave. */
export function creaLinkPartner(email: string, adesso = Date.now()): string | null {
  const k = chiave();
  if (!k) return null;
  const scade = Math.floor(adesso / 1000) + DURATA_LINK_GIORNI * 86400;
  const dati = b64(JSON.stringify({ e: email.trim().toLowerCase(), x: scade }));
  return `${SITO}/partners/enter/?t=${dati}.${firma(dati, k)}`;
}

export type EsitoLink = { email: string } | { errore: 'firma' | 'scaduto' | 'chiave'; email?: string };

/** Controlla un gettone: firma giusta e non scaduto. Non dice niente
 *  sull'utente (esiste? e' attivo?): quello lo controlla chi lo usa. */
export function leggiLinkPartner(t: string, adesso = Date.now()): EsitoLink {
  const k = chiave();
  if (!k) return { errore: 'chiave' };
  const [dati, f] = String(t ?? '').split('.');
  if (!dati || !f) return { errore: 'firma' };
  const atteso = firma(dati, k);
  const a = Buffer.from(f);
  const b = Buffer.from(atteso);
  /* `timingSafeEqual`: il confronto normale si ferma al primo carattere
     diverso, e il tempo che ci mette racconta quanti ne hai indovinati. */
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { errore: 'firma' };
  let p: { e?: string; x?: number };
  try {
    p = JSON.parse(Buffer.from(dati, 'base64url').toString('utf8'));
  } catch {
    return { errore: 'firma' };
  }
  if (!p.e || !p.x) return { errore: 'firma' };
  if (p.x * 1000 < adesso) return { errore: 'scaduto', email: p.e };
  return { email: p.e };
}
