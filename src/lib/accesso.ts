/* NOME UTENTE E INDIRIZZO DI ACCESSO: le regole, senza segreti dentro.
 *
 * Questo file non importa niente e non contiene nessun indirizzo: e' solo
 * la forma. Gli alias dei tre admin stanno nella server action, che gira
 * sul server e basta -- se stessero qui e qualcuno importasse questo
 * modulo da un componente client, le email personali di due persone
 * finirebbero nel bundle JavaScript che scarica chiunque apra il sito.
 *
 * ── PERCHE' UN DOMINIO CHE NON ESISTE ─────────────────────────────────
 * Una guida entra con `mario` e il server compone
 * `mario@guide.prestigerent.invalid`. Supabase Auth non conosce i nomi
 * utente: conosce le email. Serviva quindi un indirizzo, e la scelta di
 * quale non e' un dettaglio.
 *
 * `.invalid` e' riservato dallo standard (RFC 2606) e non esistera' mai.
 * Quell'indirizzo non puo' ricevere niente, quindi il recupero password
 * via email su un account guida e' impossibile PER COSTRUZIONE -- non per
 * un'impostazione che qualcuno puo' cambiare domani. Con un dominio vero
 * come `@prestigerent.com` basterebbe che quella casella esistesse, o che
 * ci fosse un catch-all, perche' chi la legge possa prendersi un account
 * guida senza saperne la password.
 *
 * Il contatto VERO della persona sta in `autorizzati.contatto`, separato,
 * e serve per scriverle -- non per farla entrare.
 */

export const DOMINIO_GUIDE = 'guide.prestigerent.invalid';

/** Il formato del nome utente, lo stesso del vincolo nel database
 *  (`profili_username_formato`). Se i due divergono, il pannello accetta
 *  un nome che poi l'insert rifiuta, e l'errore parla di un vincolo che
 *  chi guarda non ha mai visto. */
export const FORMA_NOME_UTENTE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** Minuscole e spazi via. Chi scrive dal telefono si ritrova spesso la
 *  prima lettera maiuscola per via del correttore, e `Mario` non deve
 *  essere una persona diversa da `mario`. */
export function normalizza(v: string): string {
  return v.trim().toLowerCase();
}

export function nomeUtenteValido(v: string): boolean {
  return FORMA_NOME_UTENTE.test(normalizza(v));
}

/** Il campo contiene un'email o un nome utente? Il discrimine e' la
 *  chiocciola, ed e' per questo che il vincolo nel database la vieta nei
 *  nomi utente: un nome che la contenesse verrebbe preso per un indirizzo
 *  e non entrerebbe mai. */
export function pareEmail(v: string): boolean {
  return normalizza(v).includes('@');
}

/** L'indirizzo di accesso di una guida. */
export function emailDiGuida(nomeUtente: string): string {
  return `${normalizza(nomeUtente)}@${DOMINIO_GUIDE}`;
}

/** Vero se quell'indirizzo e' di un account guida, cioe' interno. Serve al
 *  pannello per non mostrarlo mai a schermo: e' un indirizzo finto, e
 *  vederlo scritto accanto a una foto farebbe pensare a un guasto. */
export function eIndirizzoInterno(email: string | null | undefined): boolean {
  return !!email && normalizza(email).endsWith(`@${DOMINIO_GUIDE}`);
}

/** Come si chiama una persona nel pannello. Mai l'email: per una guida
 *  sarebbe l'indirizzo finto, per un admin l'indirizzo personale. */
export function comeSiChiama(p: {
  nome?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  return (
    p.nome?.trim() ||
    p.username?.trim() ||
    (eIndirizzoInterno(p.email) ? '' : p.email?.trim()) ||
    'senza nome'
  );
}

/* ── LE PASSWORD CHE IL PANNELLO GENERA PER LE GUIDE ──────────────────
 *
 * Non sono destinate a essere ricordate: l'admin le consegna e la persona
 * le salva nel telefono. Quindi contano due cose sole -- che si riescano a
 * dettare al telefono senza sbagliare, e che non si indovinino.
 *
 * L'alfabeto esclude i caratteri che si confondono quando qualcuno li
 * legge ad alta voce o li copia a mano da un foglio: 0 e O, 1 e l e I.
 * Averli dentro non aggiunge sicurezza degna di nota e produce telefonate
 * del tipo "ma e' uno o una elle?".
 */
export const ALFABETO_PASSWORD = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Quanto e' lunga una password generata. Dodici caratteri da questo
 *  alfabeto sono circa 70 bit: fuori portata per chi prova a indovinare
 *  attraverso un endpoint di rete, che e' l'unico attacco possibile qui.
 *  Il minimo di Supabase e' sei. */
export const LUNGHEZZA_PASSWORD = 12;
