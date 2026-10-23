'use server';

import { revalidatePath } from 'next/cache';
import { chiAgisce, supabaseServer } from '@/lib/auth';
import { chiedi, ErroreModello } from '@/lib/modello';
import { compitoDi, sistemaDi, type Recensione } from '@/lib/risposte';
import { quandoPubblicare } from '@/lib/attesa';
import { daRiepilogoViator } from '@/lib/posta-recensioni';

/* LE AZIONI DELLA CODA DELLE RECENSIONI.
 *
 * ── 🔴 QUI NON SI PUBBLICA NIENTE SU NESSUN PORTALE ───────────────────
 * Non per prudenza: perche' non si puo'. Ne' Viator, ne' Tripadvisor, ne'
 * GetYourGuide hanno un'API per SCRIVERE una risposta (verificato il
 * 22/10/2026; l'unica che ce l'ha e' Google, con
 * `accounts.locations.reviews.updateReply`). La risposta si incolla a
 * mano nel portale, e `segnaPubblicata()` serve a dire alla coda che e'
 * stato fatto -- e' un registro, non un invio.
 *
 * Quindi lo stato `pubblicata` in questa tabella significa «una persona
 * l'ha incollata nel portale», non «il nostro codice l'ha spedita». Se un
 * giorno si confondessero le due cose, la coda direbbe «fatto» su risposte
 * che nessuno ha mai pubblicato.
 *
 * ── PERCHE' SERVER ACTION E NON CHIAMATE DAL BROWSER ──────────────────
 * `coda_recensioni` ha RLS accesa e NESSUNA policy per `anon`: la chiave
 * pubblicabile che sta nel browser non legge e non scrive nemmeno una
 * riga. Qui il client Supabase nasce dai cookie di sessione, quindi il
 * database vede un admin. E la chiave di OpenRouter non esce mai da
 * questo lato: una chiamata al modello dal browser la esporrebbe a
 * chiunque apra gli strumenti di sviluppo.
 *
 * ── IL TESTO DELLA RECENSIONE ARRIVA A MANO, ED E' NORMALE ────────────
 * Le email dei portali contengono prodotto, titolo, voto e il link per
 * rispondere, ma NON il testo della recensione (misurato sulle email vere
 * a usa@prestigerent.com). Senza il testo non si puo' scrivere niente che
 * non sia prestampato, quindi `scriviRisposta()` si rifiuta di partire e
 * lo dice. `salvaTestoRecensione()` e' il modo per metterlo dentro dopo
 * averlo letto nel portale.
 */

export type Esito = { ok: boolean; errore?: string };

/** L'esito dell'importazione: quante righe aveva l'email e quante erano
 *  nuove. Due numeri e non uno, perche' «trovate 11, nuove 0» non e' un
 *  guasto -- e' il riepilogo di Viator che ripete le stesse recensioni
 *  ogni giorno finche' non si risponde, e va detto invece di sembrare
 *  che l'importazione non abbia funzionato. */
export type EsitoImporto = Esito & { trovate?: number; nuove?: number };

/**
 * Legge il riepilogo di Viator incollato a mano e riempie la coda.
 *
 * ── 🔴 PERCHE' SI INCOLLA, INVECE DI LEGGERE LA POSTA DA SOLI ─────────
 * Leggere `usa@prestigerent.com` dal server vorrebbe dire registrare
 * un'applicazione su Microsoft 365, chiedere il permesso `Mail.Read` e
 * farlo approvare da un amministratore: mezza giornata di lavoro e un
 * consenso, per risparmiare un «copia e incolla» al giorno. Si incolla.
 *
 * Funziona sia col testo dell'email sia con l'HTML grezzo: il lettore
 * (src/lib/posta-recensioni.ts) ripulisce stili e caratteri invisibili
 * prima di cercare.
 *
 * ── NON SOVRASCRIVE NIENTE ────────────────────────────────────────────
 * `ignoreDuplicates`: una riga che c'e' gia' si salta. Se ci fosse sopra
 * una bozza approvata, reimportare l'email del giorno dopo la
 * cancellerebbe -- e il riepilogo di Viator ripete le stesse recensioni
 * per giorni.
 *
 * ── IL TESTO DELLA RECENSIONE NON C'E' ───────────────────────────────
 * Nell'email non c'e' (verificato sulle email vere). Le righe nascono
 * come `nuova` col testo vuoto, e il pannello lo chiede.
 */
export async function importaRiepilogo(html: string): Promise<EsitoImporto> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const voci = daRiepilogoViator(html);
  if (!voci.length) {
    return {
      ok: false,
      errore:
        'Nel testo incollato non ho trovato nessuna recensione. Serve il riepilogo di Viator («You have N new reviews»): incolla tutta l’email, anche l’HTML.',
    };
  }

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('coda_recensioni')
    .upsert(
      voci.map((v) => ({
        fonte: v.fonte,
        portale: v.portale,
        /* le tre colonne dell'indice unico sono NOT NULL con predefinito
           vuoto: un null qui farebbe fallire l'inserimento, e l'autore
           nel riepilogo non c'e' affatto */
        prodotto: v.prodotto ?? '',
        titolo: v.titolo,
        autore: '',
        voto: v.voto,
        link_risposta: v.link_risposta,
        id_esterno: v.id_esterno,
        stato: 'nuova',
      })),
      { onConflict: 'portale,prodotto,titolo,autore', ignoreDuplicates: true }
    )
    .select('id');
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true, trovate: voci.length, nuove: (data ?? []).length };
}

/** Le colonne che servono per far scrivere una risposta. */
const CAMPI_RECENSIONE =
  'id,fonte,portale,prodotto,titolo,autore,voto,lingua,testo,stato,risposta,corretto';

/** Il testo che vale davvero: quello corretto a mano se c'e', altrimenti
 *  quello del modello. La colonna `risposta` NON si sovrascrive quando si
 *  corregge -- cosi' si puo' sempre confrontare la correzione con
 *  l'originale, ed e' l'unico modo per accorgersi che un criterio sbaglia
 *  sempre nello stesso punto. */
function testoBuono(r: { risposta: string | null; corretto: string | null }): string {
  return (r.corretto ?? r.risposta ?? '').trim();
}

/**
 * Fa scrivere la bozza al modello e le assegna l'ora di uscita.
 *
 * Rifare la chiamata su una riga che ha gia' una bozza e' lecito e
 * previsto: e' il modo di riprovare dopo aver cambiato i criteri. La
 * correzione a mano, invece, non si perde (resta in `corretto`).
 */
export async function scriviRisposta(id: number): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const sb = await supabaseServer();
  const { data: r, error } = await sb
    .from('coda_recensioni')
    .select(CAMPI_RECENSIONE)
    .eq('id', id)
    .maybeSingle();
  if (error) return { ok: false, errore: error.message };
  if (!r) return { ok: false, errore: 'Recensione non trovata.' };

  /* 🔴 Senza il testo non si scrive. Una risposta costruita su titolo e
     voto puo' solo essere generica, cioe' esattamente la cosa che i
     criteri vietano al punto 2. Meglio un messaggio che una bozza
     inutile da buttare. */
  if (!r.testo || !r.testo.trim()) {
    return {
      ok: false,
      errore: 'Manca il testo della recensione: aprilo nel portale e incollalo qui sopra.',
    };
  }

  /* Gli orari gia' assegnati alle altre, per rispettare distanza minima e
     tetto per ora SUL GRUPPO e non su questa riga da sola. Si guardano
     solo quelle ancora da pubblicare: una risposta uscita ieri non occupa
     un posto oggi. */
  const { data: altre } = await sb
    .from('coda_recensioni')
    .select('pubblicare_il')
    .in('stato', ['bozza', 'approvata'])
    .not('pubblicare_il', 'is', null)
    .neq('id', id);
  const gia = (altre ?? [])
    .map((x) => new Date(x.pubblicare_il as string))
    .filter((d) => !Number.isNaN(d.getTime()));

  const rec: Recensione = {
    id: r.id as number,
    fonte: r.fonte as string,
    autore: r.autore as string | null,
    voto: r.voto as number | null,
    titolo: r.titolo as string | null,
    testo: r.testo as string,
    lingua: r.lingua as string | null,
    tour_slug: r.prodotto as string | null,
    data: null,
  };

  let out;
  try {
    out = await chiedi(sistemaDi('Prestige Rent'), compitoDi(rec));
  } catch (e) {
    /* L'errore del modello si mostra per quello che e'. Il caso piu'
       probabile e' la chiave assente fra le variabili del progetto su
       Vercel: va detto, non nascosto dietro un «riprova». */
    const perche = e instanceof ErroreModello ? e.message : 'Il modello non ha risposto.';
    return { ok: false, errore: perche };
  }

  const quando = quandoPubblicare(new Date(), gia);

  const { error: errScrittura } = await sb
    .from('coda_recensioni')
    .update({
      risposta: out.testo,
      modello: out.modello,
      costo: out.costo,
      stato: 'bozza',
      pubblicare_il: quando.toISOString(),
      chi: chi.io.id,
    })
    .eq('id', id);
  if (errScrittura) return { ok: false, errore: errScrittura.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}

/** Il testo della recensione, letto nel portale e incollato qui. Porta la
 *  riga da `nuova` a `letta`: da quel momento si puo' far scrivere. */
export async function salvaTestoRecensione(id: number, testo: string): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };
  const pulito = testo.trim();
  if (!pulito) return { ok: false, errore: 'Il testo e` vuoto.' };

  const sb = await supabaseServer();
  const { data: r } = await sb.from('coda_recensioni').select('stato').eq('id', id).maybeSingle();
  const { error } = await sb
    .from('coda_recensioni')
    .update({
      testo: pulito,
      /* lo stato avanza solo se era indietro: non si riporta a `letta`
         una riga che ha gia' una bozza approvata */
      ...(r?.stato === 'nuova' ? { stato: 'letta' } : {}),
    })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}

/** La correzione a mano della risposta. Non tocca `risposta`: vedi
 *  `testoBuono()`. */
export async function salvaCorrezione(id: number, testo: string): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const sb = await supabaseServer();
  const { error } = await sb
    .from('coda_recensioni')
    .update({ corretto: testo.trim() || null, chi: chi.io.id })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}

/**
 * Approva: da qui la risposta e' pronta da incollare nel portale.
 *
 * 🔴 I controlli di `guaiDi()` NON si rifanno qui, e non e' una
 * dimenticanza: chi approva li ha letti accanto al testo e puo' decidere
 * di pubblicare comunque -- un controllo che pesa e' un avviso, non un
 * divieto. Quello che si controlla qui e' che ci sia un testo: approvare
 * il vuoto non vuol dire niente.
 */
export async function approva(id: number): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const sb = await supabaseServer();
  const { data: r } = await sb
    .from('coda_recensioni')
    .select('risposta,corretto')
    .eq('id', id)
    .maybeSingle();
  if (!r) return { ok: false, errore: 'Recensione non trovata.' };
  if (!testoBuono(r as { risposta: string | null; corretto: string | null })) {
    return { ok: false, errore: 'Non c’e` ancora una risposta da approvare.' };
  }

  const { error } = await sb
    .from('coda_recensioni')
    .update({ stato: 'approvata', chi: chi.io.id })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}

/** Rimette una riga approvata fra le bozze, per cambiarla ancora. */
export async function riapri(id: number): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const sb = await supabaseServer();
  const { error } = await sb
    .from('coda_recensioni')
    .update({ stato: 'bozza', chi: chi.io.id })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}

/** A questa non si risponde. Resta in tabella -- serve a non riproporla
 *  ogni volta che il riepilogo di Viator la ripete. */
export async function scarta(id: number): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const sb = await supabaseServer();
  const { error } = await sb
    .from('coda_recensioni')
    .update({ stato: 'saltata', chi: chi.io.id })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}

/**
 * «L'ho incollata nel portale»: il registro, non un invio.
 *
 * 🔴 Si chiama dopo aver incollato a mano, perche' nessuno dei tre
 * portali ha un'API di scrittura. L'ora segnata e' quella vera del clic,
 * non `pubblicare_il`: cosi' si puo' confrontare quando sarebbe dovuta
 * uscire con quando e' uscita davvero, e vedere se la finestra del
 * ritardo e' tarata bene.
 */
export async function segnaPubblicata(id: number): Promise<Esito> {
  const chi = await chiAgisce();
  if (!chi.io) return { ok: false, errore: chi.errore ?? 'Non autorizzato.' };

  const sb = await supabaseServer();
  const { error } = await sb
    .from('coda_recensioni')
    .update({ stato: 'pubblicata', pubblicata_il: new Date().toISOString(), chi: chi.io.id })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  revalidatePath('/admin/recensioni/');
  return { ok: true };
}
