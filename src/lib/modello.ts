/* IL PONTE VERSO IL MODELLO.
 *
 * Una funzione sola, e torna due cose: il testo e QUANTO E' COSTATO.
 *
 * ── 🔴 PERCHE' IL COSTO TORNA INSIEME AL TESTO ────────────────────────
 * Regola della proprieta', nata il giorno in cui una pulizia di parole
 * chiave e' costata due dollari senza che nessuno lo sapesse: «ogni
 * bottone che consuma api a costo ce lo devi scrivere accanto». Un costo
 * stimato non serve -- si stima sempre per difetto. OpenRouter lo
 * restituisce VERO, per chiamata, se si chiede `usage: {include: true}`,
 * e quel numero arriva fino al pulsante.
 *
 * ── PERCHE' OPENROUTER E NON L'API DI GOOGLE DIRETTA ──────────────────
 * Perche' e' la stessa porta che usa gia' il pannello dell'agenzia, con
 * la stessa chiave e lo stesso registro di spesa: una sola cosa da
 * rigenerare quando scade, un solo posto dove si legge quanto si e'
 * speso. E perche' cambiare modello diventa una stringa -- il giorno che
 * un modello costa meta' si prova senza toccare il codice.
 *
 * 🔴 E perche' da quella stessa porta passano ANCHE i modelli Claude
 * (`anthropic/claude-...`): verificato sul listino il 23/10/2026. Quindi
 * scegliere Claude invece di Gemini non vuol dire un altro account, un
 * altro abbonamento o un'altra chiave -- vuol dire un'altra stringa. Il
 * modello si passa dal chiamante, e il nome scelto torna indietro insieme
 * al costo, cosi' la schermata dice con cosa e' stata scritta una
 * risposta e quanto e' costata davvero.
 *
 * ── 🔴 IL TRONCAMENTO E' IL GUASTO CHE NON SI VEDE ────────────────────
 * Con `max_tokens` troppo basso la risposta arriva tagliata a meta': se
 * e' JSON non si apre, e l'errore che si legge e' «niente da fare»
 * invece di «e' finito lo spazio». E' gia' costato mezza giornata nel
 * pannello. Qui il tetto e' largo e `finish_reason` viene guardato: se e'
 * `length`, lo dice.
 */

const PORTA = 'https://openrouter.ai/api/v1/chat/completions';

/* ─────────────────────────────────────────────────────────────────────
   I MODELLI FRA CUI SCEGLIERE, COL PREZZO ACCANTO

   🔴 I PREZZI SONO QUELLI VERI DEL LISTINO, letti il 23/10/2026 da
   `https://openrouter.ai/api/v1/models` (pubblico, non serve la chiave).
   Non sono stimati a memoria: il listino cambia, e un prezzo ricordato
   male e' peggio di nessun prezzo. Per riverificarli basta rileggere
   quell'indirizzo.

   🔴 LA COSA CHE NON SI SAREBBE INDOVINATA: **Claude Haiku 5.5 costa
   MENO di Gemini Flash** (0,10/0,50 contro 0,30/2,50 per milione di
   token) ed e' un modello piu' recente e piu' capace. Per questo il
   predefinito non e' piu' Gemini: non c'era nessuna ragione per tenerlo,
   ne' di prezzo ne' di qualita'.

   🔴 PERCHE' UNA LISTA CHIUSA, E NON UNA STRINGA LIBERA. L'identificativo
   del modello arriva dal browser, cioe' da fuori. Senza questa lista
   chiunque potesse chiamare l'azione potrebbe chiedere il modello piu'
   caro del listino -- che costa 150 volte Haiku -- e la spesa la
   pagherebbe la proprieta'. `modelloValido()` e' il controllo che lo
   impedisce, e sta qui perche' qui ci sono i prezzi.
   ───────────────────────────────────────────────────────────────────── */

export type ModelloScelto = {
  id: string;
  /** come si chiama per chi legge il pannello, non il nome tecnico */
  nome: string;
  /** cos'e', in una riga, per chi non sa cosa sia un modello */
  cose: string;
  /** quando conviene QUESTO e non un altro */
  quando: string;
  dollariPerMilioneIn: number;
  dollariPerMilioneOut: number;
};

/** Quanto pesa una chiamata, misurato sulle dieci risposte vere del
 *  22/10/2026: gli 11 criteri piu' la recensione fanno circa 900 token in
 *  entrata; una risposta corta ne produce circa 250, una lunga e
 *  argomentata -- quelle alle negative -- circa 650. */
const TOKEN_ENTRATA = 900;
const TOKEN_CORTA = 250;
const TOKEN_LUNGA = 650;

export const MODELLI: readonly ModelloScelto[] = [
  {
    id: 'anthropic/claude-haiku-5.5',
    nome: 'Haiku',
    cose: 'Il piu` economico di tutti, e scrive bene le cose semplici.',
    quando:
      'Per le recensioni positive: un grazie di tre righe che nomina quello che ha scritto il cliente. Costa meno di tutti gli altri, Gemini compreso.',
    dollariPerMilioneIn: 0.1,
    dollariPerMilioneOut: 0.5,
  },
  {
    id: 'anthropic/claude-sonnet-5.5',
    nome: 'Sonnet',
    cose: 'La via di mezzo: ragiona meglio di Haiku, costa un ventesimo di Opus.',
    quando:
      'Quando la recensione e` tiepida (3-4 stelle) o dice due cose insieme, una bella e una brutta: serve capire quale delle due conta.',
    dollariPerMilioneIn: 2,
    dollariPerMilioneOut: 10,
  },
  {
    id: 'anthropic/claude-opus-5.5',
    nome: 'Opus',
    cose: 'Il piu` capace. Sa argomentare senza litigare.',
    quando:
      'Per le recensioni NEGATIVE. E` l`unico che regge una risposta lunga che smonta un`accusa punto per punto senza dare torto al cliente davanti a tutti. E` qui che si difende la reputazione, e risparmiare mezzo centesimo non ha senso.',
    dollariPerMilioneIn: 4,
    dollariPerMilioneOut: 20,
  },
  {
    id: 'google/gemini-2.5-flash',
    nome: 'Gemini Flash',
    cose: 'Quello con cui sono state scritte le prime dieci risposte.',
    quando:
      'Resta per confronto: oggi costa QUATTRO VOLTE Haiku e scrive peggio. Serve solo per rifare una prova vecchia e paragonarla.',
    dollariPerMilioneIn: 0.3,
    dollariPerMilioneOut: 2.5,
  },
];

/** Haiku, non Gemini: costa meno e scrive meglio (vedi sopra). */
export const MODELLO_PREDEFINITO = 'anthropic/claude-haiku-5.5';

export function modelloDi(id: string): ModelloScelto | undefined {
  return MODELLI.find((m) => m.id === id);
}

/** 🔴 Il cancello: tutto quello che non e' in lista non si chiama. */
export function modelloValido(id: string): boolean {
  return MODELLI.some((m) => m.id === id);
}

/**
 * Quale modello conviene per una recensione da QUANTE stelle.
 *
 * 🔴 La regola sta qui e non nella schermata, accanto ai prezzi, perche'
 * e' una decisione di SPESA: «quanto vale la pena spendere per questa
 * risposta». Scritta nel componente, il giorno che cambia la si cerca in
 * mezzo al disegno dei pulsanti.
 *
 * Il criterio: su una recensione positiva la risposta e' un grazie di tre
 * righe e il modello piu' economico la scrive bene. Su una critica la
 * risposta e' lunga, argomenta e la leggeranno tutti i prossimi clienti
 * che guardano quel prodotto: li' si prende il migliore. La soglia e' 3
 * stelle -- un 3 non e' un complimento.
 */
export function modelloConsigliato(voto: number | null): string {
  if (voto !== null && voto <= 3) return 'anthropic/claude-opus-5.5';
  return MODELLO_PREDEFINITO;
}

/** Se per questa recensione ci si aspetta una risposta lunga: sono le
 *  critiche, dove si argomenta. Serve a stimare il prezzo giusto sul
 *  pulsante -- una risposta lunga costa piu' di una corta. */
export function rispostaLunga(voto: number | null): boolean {
  return voto !== null && voto <= 3;
}

/** Il costo STIMATO di una risposta, in dollari. Serve a scrivere il
 *  prezzo sul pulsante PRIMA di premerlo; il costo vero torna dopo, da
 *  OpenRouter, e in pannello si mostra quello. */
export function costoStimato(id: string, lunghezza: 'corta' | 'lunga' = 'corta'): number {
  const m = modelloDi(id);
  if (!m) return 0;
  const uscita = lunghezza === 'lunga' ? TOKEN_LUNGA : TOKEN_CORTA;
  return (TOKEN_ENTRATA * m.dollariPerMilioneIn + uscita * m.dollariPerMilioneOut) / 1_000_000;
}

export type Risposta = {
  testo: string;
  /** costo VERO di questa chiamata, in dollari, come lo riporta
   *  OpenRouter. Zero se il campo non arriva (non si inventa una stima). */
  costo: number;
  modello: string;
};

export class ErroreModello extends Error {}

/**
 * Chiede al modello e torna testo + costo.
 *
 * @param sistema  le regole: chi sei, cosa non devi fare mai
 * @param utente   il compito di questa volta
 */
export async function chiedi(
  sistema: string,
  utente: string,
  opzioni: { modello?: string; tetto?: number } = {}
): Promise<Risposta> {
  const chiave = process.env.OPENROUTER_API_KEY;
  if (!chiave) {
    /* Messaggio leggibile: su Vercel questa variabile si dimentica, e
       l'errore grezzo sarebbe «401 Unauthorized» -- che manda a cercare
       nel posto sbagliato. */
    throw new ErroreModello(
      'Manca OPENROUTER_API_KEY. Va messa fra le variabili del progetto su Vercel.'
    );
  }

  const modello = opzioni.modello || MODELLO_PREDEFINITO;

  const r = await fetch(PORTA, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chiave}`,
      'Content-Type': 'application/json',
      /* OpenRouter li usa per le statistiche del proprio pannello: non
         sono obbligatori, ma senza non si distingue da dove arriva la
         spesa, e qui le chiamate di due progetti diversi condividono la
         chiave. */
      'HTTP-Referer': 'https://prestigerent.com',
      'X-Title': 'Prestige Rent - risposte alle recensioni',
    },
    body: JSON.stringify({
      model: modello,
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: utente },
      ],
      /* bassa di proposito: una risposta a una recensione non deve
         essere creativa, deve essere giusta e nel tono. Con la
         temperatura alta inventa dettagli sul tour che non esistono. */
      temperature: 0.4,
      max_tokens: opzioni.tetto ?? 1200,
      /* 🔴 questo e' il campo che fa tornare il costo vero */
      usage: { include: true },
    }),
  });

  if (!r.ok) {
    const corpo = await r.text().catch(() => '');
    throw new ErroreModello(`Il modello ha risposto ${r.status}. ${corpo.slice(0, 300)}`);
  }

  const d = await r.json();
  const scelta = d?.choices?.[0];
  const testo: string = scelta?.message?.content ?? '';

  if (scelta?.finish_reason === 'length') {
    throw new ErroreModello(
      'La risposta e` arrivata tagliata: lo spazio massimo era troppo poco. Rialza `tetto`.'
    );
  }
  if (!testo.trim()) {
    throw new ErroreModello('Il modello ha risposto senza testo.');
  }

  return {
    testo: testo.trim(),
    costo: Number(d?.usage?.cost ?? 0) || 0,
    modello: d?.model || modello,
  };
}
