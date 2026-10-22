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
 * Sotto c'e' comunque Gemini: `google/gemini-2.5-flash` e' il
 * predefinito. Il modello si passa dal chiamante solo quando serve
 * altro, e il nome scelto torna indietro insieme al costo, cosi' la
 * schermata puo' dire con cosa e' stata scritta una risposta.
 *
 * ── 🔴 IL TRONCAMENTO E' IL GUASTO CHE NON SI VEDE ────────────────────
 * Con `max_tokens` troppo basso la risposta arriva tagliata a meta': se
 * e' JSON non si apre, e l'errore che si legge e' «niente da fare»
 * invece di «e' finito lo spazio». E' gia' costato mezza giornata nel
 * pannello. Qui il tetto e' largo e `finish_reason` viene guardato: se e'
 * `length`, lo dice.
 */

const PORTA = 'https://openrouter.ai/api/v1/chat/completions';

/** Il modello di tutti i giorni: veloce e costa frazioni di centesimo.
 *  Per rispondere a una recensione di ottanta parole non serve altro. */
export const MODELLO_PREDEFINITO = 'google/gemini-2.5-flash';

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
