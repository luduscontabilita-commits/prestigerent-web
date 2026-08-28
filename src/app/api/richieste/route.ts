import { NextResponse, type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { ghlConfigurato, contattoDaRichiesta } from '@/lib/ghl';
import { postaConfigurata, avvisaRichiesta } from '@/lib/posta';
import type { CodiceErrore } from '@/lib/testi';

/* LA RICHIESTA DI CONTATTO CHE ARRIVA DAL MODULO.
 *
 * ── PERCHE' LA VALIDAZIONE STA QUI E NON NEL BROWSER ────────────────
 * Nel browser i controlli servono a far correggere un campo senza
 * ricaricare la pagina: sono cortesia. Qui servono a decidere se una
 * riga entra nel database, e sono l'unica cosa che conta -- `required`
 * e `type="email"` si tolgono dagli strumenti dello sviluppatore in
 * cinque secondi, e chiunque puo' chiamare questa rotta con `curl`
 * senza aver mai visto il modulo.
 *
 * ── COSA TORNA ─────────────────────────────────────────────────────
 * Un codice, non una frase: `{ ok:false, campo:'email', codice:'email' }`.
 * Il testo lo sceglie il browser nella lingua della pagina (vedi
 * `src/lib/testi.ts`). Cosi' il server non contiene nessuna traduzione e
 * non c'e' una seconda copia delle stringhe che invecchia da sola.
 *
 * ── L'ANTI-SPAM, E QUANTO VALE DAVVERO ─────────────────────────────
 * Tre difese, nessuna dipendenza esterna, nessun captcha (un captcha su
 * un modulo di contatto costa piu' clienti veri di quanti bot fermi):
 *
 *   1. l'esca -- un campo che un umano non vede e non compila mai;
 *   2. il tempo -- un modulo compilato in meno di tre secondi non e'
 *      stato compilato, e' stato riempito;
 *   3. il tetto per indirizzo IP.
 *
 * Onesta' su cosa fermano: i primi due fermano i bot generici, che sono
 * il 95% del traffico di spam sui moduli. Il tempo lo dichiara il
 * client, quindi chi si scrive lo script apposta lo falsifica; per
 * firmarlo servirebbe un segreto sul server, e oggi in questo progetto
 * un segreto non c'e'. Se un giorno lo spam mirato arriva davvero, il
 * posto dove intervenire e' questo, non il componente.
 */

export const runtime = 'nodejs';
/* Non e' una pagina: non si mette in cache e non si prerenderizza. */
export const dynamic = 'force-dynamic';

/* Tre secondi. Sotto, non e' un essere umano che ha letto le etichette:
   il piu' veloce dei nostri campi obbligatori sono un nome e un'email,
   e nessuno li scrive in due. */
const MINIMO_MS = 3_000;

/* 🔴 IL TETTO IN ALTO NON C'E' PIU', ed e' stato tolto apposta.
   Rifiutava chi lasciava una scheda aperta piu' di ventiquattro ore --
   che e' un essere umano distratto, non uno script -- e lo rifiutava
   col messaggio "e' stato troppo veloce, riprovi", che riprovando dava
   di nuovo lo stesso errore. Una richiesta vera persa in silenzio, e
   in cambio nessuna difesa: nessun bot compila un modulo lentamente. */

/* Cinque richieste all'ora dallo stesso indirizzo. Una famiglia che
   chiede tre preventivi diversi ci sta comodamente dentro; uno script
   no. */
const TETTO = 5;
const FINESTRA_MS = 60 * 60 * 1_000;

/* IL CONTEGGIO STA IN MEMORIA, E VA SAPUTO.
 *
 * Su Vercel ogni istanza ha la sua memoria e le istanze vanno e vengono:
 * questo tetto ferma la raffica -- lo script che manda duecento righe in
 * un minuto, che e' la forma che lo spam prende davvero -- e non ferma
 * chi distribuisce le richieste nel tempo. Un contatore vero vorrebbe
 * una tabella e una scrittura in piu' per ogni invio; si fara' il giorno
 * in cui serve, non adesso. */
const visti = new Map<string, number[]>();

function troppeDa(ip: string): boolean {
  const ora = Date.now();
  const recenti = (visti.get(ip) ?? []).filter((t) => ora - t < FINESTRA_MS);
  recenti.push(ora);
  visti.set(ip, recenti);

  /* La mappa non deve crescere all'infinito su un processo longevo:
     ogni tanto si buttano gli indirizzi che non si vedono piu'. */
  if (visti.size > 5_000) {
    for (const [k, v] of visti) {
      if (v.every((t) => ora - t >= FINESTRA_MS)) visti.delete(k);
    }
  }
  return recenti.length > TETTO;
}

function chiChiama(req: NextRequest): string {
  /* Dietro la CDN l'indirizzo vero e' nell'intestazione, non nella
     connessione. Si prende il primo della catena, che e' il client. */
  const inoltrato = req.headers.get('x-forwarded-for');
  return inoltrato?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'ignoto';
}

type Esito = { ok: false; campo?: string; codice: CodiceErrore; errore: string };

function no(codice: CodiceErrore, errore: string, campo?: string, stato = 400) {
  return NextResponse.json<Esito>({ ok: false, campo, codice, errore }, { status: stato });
}

/* I caratteri di controllo: non si vedono, ma sporcano l'email che poi
   legge un operatore, e un `\r` in mezzo a un nome fa sembrare rotto il
   pannello. Il campo si costruisce con `String.fromCharCode` invece che
   con una classe di caratteri scritta a mano perche' quei byte, messi
   dentro il sorgente, lo trasformano in un file binario per git. */
const CONTROLLI = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']',
  'g',
);

/** Testo ripulito e accorciato. Il taglio non e' un dettaglio estetico:
 *  i CHECK della tabella rifiutano tutto quello che sfora, e un rifiuto
 *  del database diventa un errore generico che non dice niente a chi
 *  sta compilando. Meglio tagliare qui, dove si sa quale campo e'. */
function pulisci(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROLLI, '').trim().slice(0, max);
}

/* La stessa forma del CHECK sulla tabella, di proposito: se un giorno
   le due divergono, il database rifiuta e l'utente vede un errore muto.
   Non pretende di validare la RFC -- nessuna espressione regolare ci
   riesce -- pretende solo che ci sia una chiocciola e un dominio con un
   punto, che e' quello che distingue un indirizzo da un refuso. */
const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

export async function POST(req: NextRequest) {
  let corpo: Record<string, unknown>;
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return no('salvataggio', 'corpo non leggibile');
  }

  /* ── 1. L'ESCA ────────────────────────────────────────────────────
     Il campo si chiama `azienda` perche' deve sembrare vero a chi legge
     l'HTML: un bot compila tutto quello che trova, e un campo chiamato
     `honeypot` lo salterebbe. Un umano non lo vede (e' fuori schermo e
     fuori dall'ordine di tabulazione) e i gestori di password non lo
     riempiono, perche' non e' un campo che conoscono.

     Chi ci cade riceve un `ok:true`. Non e' cortesia: dirgli "sei un
     bot" gli fa provare la variante successiva finche' non passa. */
  if (pulisci(corpo.azienda, 200)) {
    /* Si logga, e non e' pedanteria: `autoComplete="off"` NON basta a
       tenere lontano il riempimento automatico di Chrome, che su un
       campo etichettato "Company" ci scrive volentieri il nome
       dell'azienda di chi sta compilando. Se succede, quella persona
       legge "grazie" e la sua richiesta non esiste da nessuna parte.
       Senza questa riga non c'e' modo di accorgersene; con questa,
       basta guardare i log di Vercel per sapere se l'esca sta
       scattando su qualcuno di vero e quanto spesso. */
    console.error('[richieste] esca piena — richiesta scartata');
    return NextResponse.json({ ok: true });
  }

  /* ── 2. IL TEMPO ─────────────────────────────────────────────────── */
  const impiegato = Number(corpo.compilato);

  /* 🔴 UN MODULO APERTO DA TROPPO TEMPO NON E' UN BOT: E' L'OPPOSTO.
   *
   * Prima qui si rifiutava anche chi impiegava PIU' del massimo, con lo
   * stesso codice `troppo_veloce` -- cioe' con il messaggio "e' stato
   * veloce, ricontrolli i campi e riprovi". Ma `apertoIl` si fissa quando
   * il modulo compare e non si azzera mai, e il modulo in fondo alla
   * pagina compare al caricamento: bastava lasciare una scheda aperta
   * tutta la notte perche' l'invio fosse rifiutato per sempre, con un
   * messaggio che suggerisce di riprovare -- e riprovando si riceve
   * identico l'errore, senza nessun modo di capire che bisogna
   * ricaricare la pagina.
   *
   * Si perdeva una richiesta vera, e la si perdeva in silenzio. I bot
   * sono veloci, mai lenti: il tetto massimo non difendeva da niente.
   * Resta la soglia bassa, che e' quella che serve. */
  if (!Number.isFinite(impiegato) || impiegato < MINIMO_MS) {
    return no('troppo_veloce', 'compilato troppo in fretta', undefined, 429);
  }

  /* ── 3. IL TETTO PER INDIRIZZO ───────────────────────────────────── */
  if (troppeDa(chiChiama(req))) {
    return no('troppe', 'troppe richieste dallo stesso indirizzo', undefined, 429);
  }

  /* ── I CAMPI ─────────────────────────────────────────────────────── */
  const nome = pulisci(corpo.nome, 80);
  if (nome.length < 2) return no('nome', 'nome mancante o troppo corto', 'nome');

  const email = pulisci(corpo.email, 160).toLowerCase();
  if (!EMAIL.test(email)) return no('email', 'email non valida', 'email');

  const telefono = pulisci(corpo.telefono, 40);
  /* Vuoto va benissimo: e' facoltativo. Scritto male no -- un numero di
     tre cifre non e' un numero, e' un campo compilato per sbaglio. */
  if (telefono && telefono.replace(/\D/g, '').length < 6) {
    return no('telefono', 'telefono troppo corto', 'telefono');
  }

  const tour = pulisci(corpo.tour, 160) || null;
  const messaggio = pulisci(corpo.messaggio, 2000);
  /* Il taglio a 2000 lo fa gia' `pulisci`, ma se il testo arrivato era
     piu' lungo lo si dice invece di consegnare all'operatore un
     messaggio troncato a meta' frase senza che nessuno lo sappia. */
  if (typeof corpo.messaggio === 'string' && corpo.messaggio.trim().length > 2000) {
    return no('messaggio', 'messaggio oltre i 2000 caratteri', 'messaggio');
  }

  /* La data. Il CHECK sulla tabella tiene solo la finestra larga
     (2020-2100) perche' Postgres nei CHECK non accetta `current_date`:
     "non nel passato" si puo' controllare solo qui. */
  let quando: string | null = null;
  const dataGrezza = pulisci(corpo.quando, 10);
  if (dataGrezza) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataGrezza)) {
      return no('quando', 'data in un formato inatteso', 'quando');
    }
    const d = new Date(dataGrezza + 'T12:00:00Z');
    const oggi = new Date();
    oggi.setUTCHours(0, 0, 0, 0);
    const fra2anni = new Date(oggi);
    fra2anni.setUTCFullYear(fra2anni.getUTCFullYear() + 2);
    /* Un giorno di margine all'indietro: chi scrive dalla California ha
       una data di ieri secondo il nostro fuso mentre da lui e' ancora
       oggi, e rifiutargliela sarebbe incomprensibile. */
    const ieri = new Date(oggi.getTime() - 24 * 60 * 60 * 1000);
    if (Number.isNaN(d.getTime()) || d < ieri || d > fra2anni) {
      return no('quando', 'data fuori dalla finestra utile', 'quando');
    }
    quando = dataGrezza;
  }

  let persone: number | null = null;
  if (corpo.persone !== null && corpo.persone !== undefined && corpo.persone !== '') {
    const n = Number(corpo.persone);
    if (!Number.isInteger(n) || n < 1 || n > 60) {
      return no('persone', 'numero di persone fuori scala', 'persone');
    }
    persone = n;
  }

  const lingua = isLocale(String(corpo.lingua)) ? String(corpo.lingua) : DEFAULT_LOCALE;

  /* La pagina di provenienza. Si accetta solo un percorso interno: se
     arrivasse un indirizzo intero, in tabella finirebbe un collegamento
     su cui poi qualcuno clicca da un pannello. */
  const paginaGrezza = pulisci(corpo.pagina, 300);
  const pagina = /^\/[^\s]*$/.test(paginaGrezza) ? paginaGrezza : null;

  /* ── IL CONSENSO ─────────────────────────────────────────────────
     `=== true` e non `Boolean(...)`: da un corpo JSON arriva quello che
     il chiamante ci mette dentro, e la stringa "false" e' vera per
     `Boolean`. Su un consenso di marketing una conversione permissiva
     non e' un dettaglio -- e' una casella spuntata da nessuno.

     L'ISTANTE lo mette il server, non il browser. L'art. 7(1) GDPR
     chiede di poter DIMOSTRARE il consenso, e una data che arriva dal
     client e' esattamente quello che non si puo' portare a un
     controllo. `consenso_il` vale per entrambi i casi, si e no: serve a
     sapere quando l'informativa e' stata mostrata, non solo quando
     qualcuno ha detto di si. */
  const marketing = corpo.marketing === true;
  const consensoIl = new Date().toISOString();

  /* ── LA SCRITTURA ────────────────────────────────────────────────── */
  const { error } = await supabase.from('richieste').insert({
    nome,
    email,
    telefono: telefono || null,
    tour,
    quando,
    persone,
    messaggio: messaggio || null,
    lingua,
    pagina,
    marketing,
    consenso_il: consensoIl,
    /* Esplicito, anche se e' il default: la policy pubblica accetta solo
       'nuova', e vederlo scritto qui spiega perche'. */
    stato: 'nuova',
  });

  if (error) {
    /* Nel registro il motivo vero, al visitatore una frase che dice cosa
       fare. Il messaggio di Postgres nominerebbe tabelle e vincoli: e'
       una mappa del database regalata a chi sta provando a romperlo. */
    console.error('[richieste] scrittura fallita:', error.message);
    return no('salvataggio', 'scrittura non riuscita', undefined, 500);
  }

  /* ── IL CONTATTO NEL CRM ─────────────────────────────────────────
     Chi risponde ai clienti lo fa dall'app di GHL, non da un pannello:
     se la richiesta resta solo in tabella, qualcuno deve ricordarsi di
     andare a guardarla. Qui il contatto nasce dove si risponde, con
     gia' addosso tour, data e numero di persone.

     Best effort, e di proposito DOPO la scrittura: la richiesta e' gia'
     salvata: se GHL e' spento o risponde male, il visitatore non ne deve
     sapere niente e il dato non si perde.

     Fino al 28 agosto qui mancavano due cose, e il modulo funzionava lo
     stesso -- che e' il modo peggiore in cui una cosa puo' essere rotta.

     Il MESSAGGIO si salvava in tabella e non arrivava al CRM: chi
     risponde vedeva comparire un nome senza sapere cosa avesse chiesto.
     Ora va come nota sul contatto, che e' dove si guarda prima di
     rispondere.

     Il CONSENSO al marketing si registrava e poi veniva ignorato proprio
     dove conta: il contatto entrava nel CRM identico che avesse detto si'
     o no, e chi lanciava una campagna da li' non aveva modo di
     distinguerli. Ora viaggia come etichetta `marketing-si` /
     `marketing-no`. */
  if (ghlConfigurato()) {
    try {
      const esito = await contattoDaRichiesta({
        nome,
        email,
        telefono: telefono || null,
        tour,
        quando,
        persone,
        lingua,
        pagina,
        messaggio: messaggio || null,
        marketing,
      });
      if (!esito.ok) console.error('[richieste] GHL:', esito.errore);
    } catch (e) {
      console.error('[richieste] GHL non raggiungibile:', e);
    }
  }

  /* ── L'AVVISO PER EMAIL ──────────────────────────────────────────
     E' l'unica cosa che fa arrivare la richiesta a una persona senza
     che quella persona debba ricordarsi di andare a guardare da
     qualche parte. Il CRM e la tabella sono archivi; questa e' la
     notizia.

     Dopo la scrittura e dopo GHL, e senza far fallire la risposta: se
     il server di posta e' giu' il visitatore vede comunque "grazie" e
     il dato resta salvato. E' l'avviso che manca, non la richiesta. */
  if (postaConfigurata()) {
    try {
      const esito = await avvisaRichiesta({
        nome,
        email,
        telefono: telefono || null,
        tour,
        quando,
        persone,
        messaggio: messaggio || null,
        pagina,
        lingua,
        marketing,
      });
      if (!esito.ok) console.error('[richieste] email:', esito.errore);
    } catch (e) {
      console.error('[richieste] posta non raggiungibile:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
