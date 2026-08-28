/* GoHighLevel — solo lato server.
 *
 * ── A COSA SERVE ────────────────────────────────────────────────────
 * Non a rifare la casella dei messaggi: quella esiste gia' in GHL, ha
 * l'app sul telefono, e chi risponde ai clienti lo fa camminando, non
 * davanti a un pannello.
 *
 * Serve al contrario: portare il CONTESTO dentro le chat. Oggi chi
 * riceve "Hi, what time do we meet?" su WhatsApp deve cercare il nome in
 * Regiondo. Con questo, sul contatto c'e' gia' scritto: Wine Experience,
 * 28 agosto, 4 persone, prenotato via Viator.
 *
 * ── PERCHE' NON RIVELA I NUMERI DEI CLIENTI ─────────────────────────
 * Qui dentro passa il telefono vero e il nome intero, che nel sito non
 * entrano mai. La differenza e' che GHL e' uno strumento interno: quei
 * dati li avete gia' in Regiondo, li state solo spostando dove servono.
 * Il sito pubblico continua a vedere solo nome e iniziale.
 *
 * Il token e' una "private integration" del sotto-account, non una
 * chiave d'agenzia: puo' toccare solo Prestige Rent.
 */

const BASE = 'https://services.leadconnectorhq.com';
const VERSIONE = '2021-07-28';

function conf() {
  const token = process.env.GHL_TOKEN;
  const location = process.env.GHL_LOCATION_ID;
  if (!token || !location) return null;
  return { token, location };
}

export function ghlConfigurato() {
  return conf() !== null;
}

async function chiamaGhl<T = unknown>(
  percorso: string,
  opzioni: { metodo?: string; corpo?: unknown } = {}
): Promise<{ ok: boolean; stato: number; dati: T | null; errore?: string }> {
  const c = conf();
  if (!c) return { ok: false, stato: 0, dati: null, errore: 'GHL non configurato' };

  const res = await fetch(BASE + percorso, {
    method: opzioni.metodo ?? 'GET',
    headers: {
      Authorization: `Bearer ${c.token}`,
      Version: VERSIONE,
      Accept: 'application/json',
      ...(opzioni.corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opzioni.corpo ? JSON.stringify(opzioni.corpo) : undefined,
    cache: 'no-store',
  });

  const testo = await res.text();
  let dati: T | null = null;
  try {
    dati = testo ? (JSON.parse(testo) as T) : null;
  } catch {
    /* GHL risponde HTML sulle pagine di errore: non deve far cadere
       tutto il ciclo di sincronizzazione per un prodotto solo. */
  }

  if (!res.ok) {
    const msg =
      (dati as { message?: string } | null)?.message ?? testo.slice(0, 160);
    return { ok: false, stato: res.status, dati, errore: msg };
  }
  return { ok: true, stato: res.status, dati };
}

/** Verifica che il token abbia i permessi giusti PRIMA di provare a
 *  scrivere: un 401 a meta' di 1.800 contatti lascia il lavoro a meta'. */
export async function permessiGhl(): Promise<{ contatti: boolean; conversazioni: boolean; errore?: string }> {
  const c = conf();
  if (!c) return { contatti: false, conversazioni: false, errore: 'token assente' };

  const [a, b] = await Promise.all([
    chiamaGhl(`/contacts/?locationId=${c.location}&limit=1`),
    chiamaGhl(`/conversations/search?locationId=${c.location}&limit=1`),
  ]);
  return {
    contatti: a.ok,
    conversazioni: b.ok,
    errore: a.ok && b.ok ? undefined : (a.errore ?? b.errore),
  };
}

export type ContattoDaPrenotazione = {
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  /* cosa ha prenotato: e' questo il motivo per cui esiste tutto il file */
  tour: string;
  quando: string;      // data del tour, ISO
  persone: number;
  canale: string;      // Viator, GetYourGuide, Own Ticketshop
  riferimento: string; // numero d'ordine
};

/* I campi personalizzati vanno creati una volta sola nel pannello GHL
   (Settings → Custom Fields). Qui si citano per chiave: se mancano, GHL
   li ignora invece di rifiutare il contatto -- meglio un contatto senza
   dettagli che nessun contatto. */
const CAMPI = {
  tour: 'prestige_tour',
  data: 'prestige_data_tour',
  persone: 'prestige_persone',
  canale: 'prestige_canale',
  ordine: 'prestige_ordine',
};

/** Crea o aggiorna il contatto. GHL riconosce da solo chi c'e' gia'
 *  tramite email o telefono, quindi non si creano doppioni. */
export async function contattoDaPrenotazione(p: ContattoDaPrenotazione) {
  const c = conf();
  if (!c) return { ok: false, errore: 'GHL non configurato' };

  /* Le email delle OTA sono alias di inoltro (customer-xxx@reply.viator.com):
     valgono come identificativo ma non come indirizzo a cui scrivere.
     Il telefono invece e' vero nel 98% dei casi, ed e' quello che serve. */
  const finta = /reply\.(viator|getyourguide|tripadvisor)\.com$/i.test(p.email ?? '');

  const corpo: Record<string, unknown> = {
    locationId: c.location,
    firstName: p.nome,
    lastName: p.cognome,
    source: `Regiondo · ${p.canale}`,
    tags: ['prenotazione', p.canale.toLowerCase().replace(/\s+/g, '-')],
    customFields: [
      { key: CAMPI.tour, field_value: p.tour },
      { key: CAMPI.data, field_value: p.quando },
      { key: CAMPI.persone, field_value: String(p.persone) },
      { key: CAMPI.canale, field_value: p.canale },
      { key: CAMPI.ordine, field_value: p.riferimento },
    ],
  };
  if (p.telefono) corpo.phone = p.telefono;
  if (p.email && !finta) corpo.email = p.email;

  const r = await chiamaGhl('/contacts/upsert', { metodo: 'POST', corpo });
  return { ok: r.ok, errore: r.errore, dati: r.dati };
}

export type ContattoDaRichiesta = {
  nome: string;
  email: string;
  telefono: string | null;
  tour: string | null;
  /** la data desiderata, ISO, oppure null: nel modulo e' facoltativa */
  quando: string | null;
  persone: number | null;
  /** in che lingua va scritta la risposta */
  lingua: string;
  /** la pagina che ha prodotto la richiesta */
  pagina: string | null;
  /** 🔴 QUELLO CHE IL CLIENTE HA SCRITTO.
   *
   * Mancava, e il modulo funzionava lo stesso: la riga si salvava, il
   * contatto arrivava nel CRM, l'utente leggeva "you will hear from a
   * real person". Solo che chi risponde vedeva comparire un nome senza
   * sapere cosa avesse chiesto -- e la domanda vera ("siamo in sei, una
   * carrozzina, dobbiamo rientrare per le 18") restava in una tabella
   * che nessuno apre.
   *
   * Non va in un campo personalizzato ma in una NOTA sul contatto: e' il
   * posto dove guarda chi sta per rispondere, ed e' lungo quanto serve. */
  messaggio: string | null;
  /** ha spuntato il consenso a ricevere comunicazioni? */
  marketing?: boolean;
};

/* LA RICHIESTA DAL MODULO, PORTATA DOVE SI RISPONDE.
 *
 * Vale lo stesso motivo di `contattoDaPrenotazione` -- il contesto deve
 * stare nella chat, non in una tabella che qualcuno deve ricordarsi di
 * aprire -- ma la differenza e' piu' grossa di quanto sembri: una
 * prenotazione e' gia' incassata, una richiesta e' un cliente che sta
 * ancora decidendo. Se resta ferma sei ore, ha gia' scritto a qualcun
 * altro.
 *
 * Il contatto nasce con l'etichetta `richiesta-sito`, che e' la cosa che
 * permette a GHL di far partire un'automazione o una notifica: senza
 * un'etichetta diversa da quelle delle prenotazioni, le richieste
 * finirebbero nello stesso mucchio e nessuno saprebbe quali hanno
 * ancora bisogno di una risposta.
 *
 * Il cognome non si chiede nel modulo: chiedere due caselle dove ne
 * basta una fa abbandonare, e per rispondere a un'email il cognome non
 * serve. Qui il nome intero va tutto in `firstName`.
 */
export async function contattoDaRichiesta(p: ContattoDaRichiesta) {
  const c = conf();
  if (!c) return { ok: false, errore: 'GHL non configurato' };

  const corpo: Record<string, unknown> = {
    locationId: c.location,
    firstName: p.nome,
    email: p.email,
    source: 'Sito — modulo richiesta',
    /* Il consenso viaggia come etichetta, o resta una spunta registrata e
       poi ignorata proprio dove serve: chi lancia una campagna da GHL non
       aveva modo di distinguere chi aveva detto si' da chi aveva detto no.
       Un consenso raccolto e non rispettato e' peggio di non chiederlo,
       perche' sembra a posto. */
    tags: [
      'richiesta-sito',
      `lingua-${p.lingua}`,
      p.marketing ? 'marketing-si' : 'marketing-no',
    ],
    customFields: [
      /* Le stesse chiavi delle prenotazioni: se un domani la stessa
         persona prenota davvero, GHL la riconosce dall'email e i campi
         si sovrascrivono invece di raddoppiarsi. */
      { key: CAMPI.tour, field_value: p.tour ?? '' },
      { key: CAMPI.data, field_value: p.quando ?? '' },
      { key: CAMPI.persone, field_value: p.persone != null ? String(p.persone) : '' },
      { key: CAMPI.canale, field_value: 'Sito' },
      { key: CAMPI.ordine, field_value: p.pagina ?? '' },
    ],
  };
  /* Qui il telefono e' quello che ha scritto il visitatore e puo' essere
     qualunque cosa: si manda solo se c'e', e GHL lo normalizza da se'.
     Se non gli piace rifiuta il campo, non il contatto. */
  if (p.telefono) corpo.phone = p.telefono;

  const r = await chiamaGhl<{ contact?: { id?: string } }>('/contacts/upsert', {
    metodo: 'POST',
    corpo,
  });

  /* ── LA DOMANDA DEL CLIENTE, DOVE LA SI LEGGE ──────────────────────
   *
   * Il contatto porta tour, data e numero di persone. Ma quello che una
   * persona ha scritto di suo -- la carrozzina, il volo alle sei, la
   * cena di anniversario -- non entra in un campo: e' testo libero, ed e'
   * la ragione per cui ha scritto invece di prenotare da solo.
   *
   * Va come nota sul contatto, perche' e' li' che guarda chi apre la
   * scheda per rispondere. Best effort e dopo l'upsert: se fallisce, il
   * contatto resta comunque creato -- meglio un contatto senza nota che
   * nessun contatto. */
  const id = r.dati?.contact?.id;
  /* 🔴 IL NUMERO SI SCRIVE SEMPRE, ANCHE SENZA MESSAGGIO.
   *
   * GoHighLevel normalizza il telefono sul paese della location, che e'
   * l'Italia, e antepone +39 a qualunque numero non gia' in forma
   * internazionale. Su un pubblico per la maggior parte americano
   * significa storpiarlo: il 28/08/2026 e' arrivata una richiesta vera
   * con `19415868282` -- un +1 941 586 8282 della Florida -- e in GHL e'
   * diventato `+3919415868282`, un numero che non esiste. Chi apre la
   * scheda per rispondere su WhatsApp non raggiunge nessuno.
   *
   * Il campo `phone` si continua a mandare, perche' e' quello che rende
   * il numero cliccabile e a volte GHL indovina. Ma qui sotto finisce
   * SEMPRE il numero esattamente come l'ha scritto il visitatore, in
   * chiaro, dentro la nota: cosi' chi risponde ha il dato vero sotto gli
   * occhi anche quando la normalizzazione ha sbagliato. */
  const haMessaggio = !!(p.messaggio && p.messaggio.trim());
  if (r.ok && id && (haMessaggio || p.telefono)) {
    const righe = [
      haMessaggio ? p.messaggio!.trim() : '(nessun messaggio scritto)',
      '',
      '— dal modulo del sito' + (p.pagina ? ` (${p.pagina})` : ''),
      p.telefono ? `telefono COME SCRITTO DAL CLIENTE: ${p.telefono}` : null,
      p.tour ? `tour: ${p.tour}` : null,
      p.quando ? `data desiderata: ${p.quando}` : null,
      p.persone != null ? `persone: ${p.persone}` : null,
    ].filter(Boolean);
    const n = await chiamaGhl(`/contacts/${id}/notes`, {
      metodo: 'POST',
      corpo: { body: righe.join('\n') },
    });
    if (!n.ok) console.error('[ghl] nota non salvata:', n.errore);
  }

  return { ok: r.ok, errore: r.errore, dati: r.dati };
}
