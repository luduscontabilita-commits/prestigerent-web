import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  prenotazioniPagina,
  prodotti,
  type PrenotazioneGrezza,
} from '@/lib/regiondo-api';
import {
  daRomaAIso,
  giorniPrima,
  iniziale,
  oggiARoma,
  paeseDaTelefono,
  soloNome,
} from '@/app/admin/numeri/calcoli';

/* LE PRENOTAZIONI DI OGGI, SENZA CHE NESSUNO PREMA UN PULSANTE.
 *
 * ── IL DIFETTO CHE QUESTO FILE CHIUDE ───────────────────────────────
 * Il riquadro della riprova sociale ("Sarah from the United States —
 * Wine Experience — 2 hours ago") legge `prenotazioni_recenti`. Quella
 * tabella si riempiva SOLO premendo un pulsante in /admin/numeri/.
 *
 * Misurato il 29 agosto 2026: l'ultima prenotazione in tabella era del 25
 * agosto alle 15:43. Quattro giorni. Il sito diceva "4 days ago" sotto
 * ogni riga, e "0 booked today" su ogni scheda -- mentre Regiondo
 * registrava diciassette prenotazioni nella sola notte precedente.
 *
 * Non era un numero basso: era un numero fermo. E' la stessa malattia
 * gia' documentata per `prima_libera` in Urgenza.tsx -- un dato che
 * invecchia da solo mentre nessuno se ne accorge, perche' non rompe
 * niente. Un sito che dice "nessuno ha prenotato oggi" lavora contro chi
 * lo ha scritto.
 *
 * ── LA FINESTRA E' DI TRENTA GIORNI, NON DI SETTE ───────────────────
 * Lo era fino al 29/08/2026, quando `ultimi_30` lo scriveva solo il
 * pulsante in /admin/numeri/. Il guaio non era la precisione: un tour
 * che entrava in tabella dopo l'ultimo ricalcolo a mano ci entrava con
 * `ultimi_30` a zero e ci restava, anche vendendo 54 volte in una
 * settimana. Da quando la home mostra il conteggio del mese, quello zero
 * si vedeva.
 *
 * Le otto pagine costano poco davvero, per due motivi che vanno letti
 * insieme: partono in parallelo (due andate e ritorni, non otto) e
 * girano dentro `after()`, cioe' dopo che la risposta e' gia' partita.
 * Chi ha fatto la richiesta non aspetta un millisecondo in piu'.
 *
 * ── PERCHE' NON SERVE UN SECONDO CRON ───────────────────────────────
 * Il piano gratuito di Vercel concede un solo lavoro programmato al
 * giorno, e quello e' gia' occupato dal caricamento delle conversioni.
 * Ma "quante prenotazioni oggi" alle 3:20 di notte non vuol dire niente:
 * a quell'ora la giornata e' appena cominciata.
 *
 * Percio' l'aggiornamento si aggancia al traffico vero: `/api/prenotazioni`
 * -- che ogni pagina aperta interroga -- se trova il dato piu' vecchio di
 * mezz'ora lo rinfresca DOPO aver risposto, senza far aspettare nessuno.
 * Quella rotta e' in cache un minuto sulla rete, quindi per quanti
 * visitatori ci siano parte al massimo una volta al minuto, e la guardia
 * sulla mezz'ora la riduce ancora. Con il piano a pagamento diventerebbe
 * un cron ogni ora e questa parte si potrebbe togliere.
 *
 * ── SOLO GET VERSO REGIONDO ─────────────────────────────────────────
 * Da qui si legge e basta: dall'altra parte c'e' il sistema con cui il
 * cliente incassa davvero.
 */

/** La finestra dei conteggi settimanali. Sette e non uno: `ultimi_7`
 *  e `persone_7` sono finestre mobili, e ogni giorno che passa ne esce
 *  uno vecchio -- senza rileggerli resterebbero gonfi per sempre. */
const GIORNI = 7;

/** 🔴 LA FINESTRA CHE SI LEGGE DAVVERO DA REGIONDO: TRENTA GIORNI.
 *
 *  Prima se ne leggevano sette e `ultimi_30` lo scriveva solo il pulsante
 *  in /admin/numeri/. Risultato: un tour comparso dopo l'ultimo ricalcolo
 *  a mano entrava in tabella con `ultimi_30` a ZERO e ci restava, pur
 *  vendendo. Il 29/08/2026 era il caso di due tour su sei -- fra cui uno
 *  con 54 prenotazioni in sette giorni e 0 nel mese. Un numero fermo, di
 *  nuovo, e stavolta in una cifra mostrata in home.
 *
 *  Costa sei richieste in piu' a ripasso (otto pagine invece di due), ma
 *  girano in parallelo e dentro `after()`: il visitatore non aspetta
 *  niente, e la guardia dei trenta minuti le tiene a due giri l'ora. */
const GIORNI_MESE = 30;

/** Tetto alle pagine chieste in un colpo. Trenta giorni fanno ~1.900
 *  prenotazioni e una pagina ne porta 250: otto bastano. Il tetto e' li'
 *  perche' un `total_pages` sballato non si trasformi in cento richieste. */
const PAGINE_MAX = 12;

/** Sotto questa eta' il dato e' abbastanza fresco e non si tocca.
 *
 *  Quindici e non trenta perche' la home si rigenera ogni quindici
 *  minuti: tenere i due tempi uguali evita il caso peggiore in cui il
 *  numero e' gia' cambiato in banca dati ma la pagina lo ridisegna
 *  vecchio. Non e' un lavoro programmato -- il ripasso si aggancia al
 *  traffico -- quindi il cron giornaliero di Vercel resta libero per le
 *  conversioni. */
export const FRESCO_MINUTI = 15;

/** Quante righe si tengono: il riquadro ne mostra 25. */
const RECENTI_TENUTE = 150;

export type EsitoRipasso = {
  ok: boolean;
  errore?: string;
  /** quante prenotazioni sono state lette da Regiondo */
  lette?: number;
  /** quante righe del riquadro sono state riscritte */
  recenti?: number;
  /** quanti tour hanno visto cambiare i conteggi */
  tour?: number;
  /** true se era gia' fresco e non si e' fatto niente */
  saltato?: boolean;
};

function db(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const segreta = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !segreta) return null;
  return createClient(url, segreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function ripassoConfigurato(): boolean {
  return db() !== null;
}

function interi(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Da quanti minuti non si aggiornano i conteggi. `null` se non si sa. */
export async function etaMinuti(): Promise<number | null> {
  const sb = db();
  if (!sb) return null;
  const { data } = await sb
    .from('prenotazioni_conteggio')
    .select('aggiornato')
    .order('aggiornato', { ascending: false })
    .limit(1)
    .maybeSingle();
  const q = (data as { aggiornato: string | null } | null)?.aggiornato;
  if (!q) return null;
  return Math.round((Date.now() - new Date(q).getTime()) / 60000);
}

/** product_id -> slug dei tour che lo vendono. Le prenotazioni portano il
 *  `product_id`, `tours` porta lo SKU: senza il catalogo in mezzo i due
 *  non si toccano. */
async function mappaProdotti(sb: SupabaseClient) {
  const [lista, { data: tours }] = await Promise.all([
    prodotti(),
    sb.from('tours').select('slug,regiondo_sku').not('regiondo_sku', 'is', null),
  ]);

  const perSku = new Map<string, string[]>();
  for (const t of (tours ?? []) as { slug: string; regiondo_sku: string | null }[]) {
    if (!t.regiondo_sku) continue;
    perSku.set(t.regiondo_sku, [...(perSku.get(t.regiondo_sku) ?? []), t.slug]);
  }

  const perProdotto = new Map<string, string[]>();
  for (const p of lista) {
    const slugs = perSku.get(p.sku);
    if (slugs?.length) perProdotto.set(String(p.product_id), slugs);
  }
  return perProdotto;
}

/**
 * Rilegge da Regiondo gli ultimi trenta giorni e riscrive il riquadro
 * delle ultime prenotazioni e i conteggi di oggi/ieri/settimana/mese.
 *
 * @param forza salta la guardia sulla freschezza. Lo usa la chiamata a
 *              mano e il lavoro notturno; il traffico no.
 */
export async function ripassaNumeri(forza = false): Promise<EsitoRipasso> {
  const sb = db();
  if (!sb) return { ok: false, errore: 'Chiave di servizio Supabase mancante.' };

  if (!forza) {
    const eta = await etaMinuti();
    if (eta !== null && eta < FRESCO_MINUTI) return { ok: true, saltato: true };
  }

  const perProdotto = await mappaProdotti(sb);
  if (!perProdotto.size) {
    return { ok: false, errore: 'Nessun prodotto Regiondo agganciato ai tour.' };
  }

  const oggi = oggiARoma();
  const ieri = giorniPrima(oggi, 1);
  const seiFa = giorniPrima(oggi, GIORNI - 1);
  const meseFa = giorniPrima(oggi, GIORNI_MESE - 1);

  /* La prima pagina dice quante sono in tutto; le altre si chiedono
     insieme, non una dopo l'altra. In fila sarebbero otto andate e
     ritorni fino a Regiondo -- in parallelo sono due. */
  const prima = await prenotazioniPagina(meseFa, 1);
  if (!prima) return { ok: false, errore: 'Regiondo non risponde sulle prenotazioni.' };
  const tutte: PrenotazioneGrezza[] = [...prima.righe];
  const quante = Math.min(prima.pagine, PAGINE_MAX);
  if (quante > 1) {
    const altre = await Promise.all(
      Array.from({ length: quante - 1 }, (_, i) => prenotazioniPagina(meseFa, i + 2)),
    );
    /* Una pagina persa non ferma il ripasso: i conteggi vengono un po'
       bassi per mezz'ora, che e' meglio di non aggiornare niente. */
    for (const p of altre) if (p) tutte.push(...p.righe);
  }

  /* GLI ANNULLAMENTI NON SI CONTANO, e non basta non contarli: se una
     prenotazione era gia' finita nel riquadro e poi e' stata annullata,
     va tolta. Altrimenti il sito continua a vantarsi di una vendita che
     non esiste piu'. */
  const annullate = tutte
    .filter((b) => b.status === 'canceled' || b.status === 'rejected')
    .map((b) => b.order_number);
  const valide = tutte.filter((b) => b.status !== 'canceled' && b.status !== 'rejected');

  if (annullate.length) {
    await sb.from('prenotazioni_recenti').delete().in('riferimento', annullate);
  }

  /* ── i conteggi ─────────────────────────────────────────────────── */
  type Conto = { oggi: number; ieri: number; u7: number; u30: number; p7: number };
  const conti = new Map<string, Conto>();
  const prendi = (slug: string) => {
    let c = conti.get(slug);
    if (!c) {
      c = { oggi: 0, ieri: 0, u7: 0, u30: 0, p7: 0 };
      conti.set(slug, c);
    }
    return c;
  };

  for (const b of valide) {
    const slugs = perProdotto.get(String(b.product_id));
    if (!slugs?.length) continue;
    /* La data e' gia' quella di Roma: il giorno si legge dai primi dieci
       caratteri, senza passare da un fuso e senza rischiare di spostare
       le prenotazioni serali al giorno dopo. */
    const giorno = String(b.created_at ?? '').slice(0, 10);
    if (!giorno) continue;
    /* Anche le cancellazioni parziali non si contano: un gruppo da 6 con
       4 posti annullati e' un gruppo da 2. */
    const persone = Math.max(0, interi(b.qty) - interi(b.qty_cancelled));

    for (const slug of slugs) {
      const c = prendi(slug);
      if (giorno === oggi) c.oggi += 1;
      if (giorno === ieri) c.ieri += 1;
      if (giorno >= seiFa) {
        c.u7 += 1;
        c.p7 += persone;
      }
      if (giorno >= meseFa) c.u30 += 1;
    }
  }

  /* 🔴 SI RISCRIVE ANCHE CHI E' SCESO A ZERO.
     Toccando solo i tour che hanno prenotazioni in questa finestra, un
     tour che ieri ne aveva quattro e oggi nessuna resterebbe a quattro
     per sempre. Si parte dall'elenco completo dei tour gia' in tabella e
     si azzera chi non compare. */
  const { data: esistenti } = await sb.from('prenotazioni_conteggio').select('tour_slug');
  const tuttiSlug = new Set<string>([
    ...((esistenti ?? []) as { tour_slug: string }[]).map((r) => r.tour_slug),
    ...conti.keys(),
  ]);

  const adesso = new Date().toISOString();
  const righe = [...tuttiSlug].map((slug) => {
    const c = conti.get(slug) ?? { oggi: 0, ieri: 0, u7: 0, u30: 0, p7: 0 };
    return {
      tour_slug: slug,
      oggi: c.oggi,
      ieri: c.ieri,
      ultimi_7: c.u7,
      ultimi_30: c.u30,
      persone_7: c.p7,
      aggiornato: adesso,
    };
  });

  if (righe.length) {
    const { error } = await sb
      .from('prenotazioni_conteggio')
      .upsert(righe, { onConflict: 'tour_slug' });
    if (error) return { ok: false, errore: error.message };
  }

  /* ── le righe del riquadro ──────────────────────────────────────── */
  const recenti = await scriviRecenti(sb, valide, perProdotto);
  if (typeof recenti === 'string') return { ok: false, errore: recenti };

  return { ok: true, lette: tutte.length, recenti, tour: righe.length };
}

async function scriviRecenti(
  sb: SupabaseClient,
  valide: PrenotazioneGrezza[],
  perProdotto: Map<string, string[]>
): Promise<number | string> {
  const ordinate = [...valide].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  /* Un ordine puo' avere piu' righe (adulti e bambini sono due voci): le
     persone si sommano, la riga resta una sola. `riferimento` e' unico,
     quindi due righe con lo stesso numero d'ordine si annullerebbero a
     vicenda nell'upsert e il gruppo sembrerebbe la meta'. */
  const perOrdine = new Map<string, Record<string, unknown>>();
  for (const b of ordinate) {
    const nome = soloNome(b.first_name);
    const prodotto = (b.product_name ?? '').trim();
    if (!nome || !prodotto) continue;
    const quando = daRomaAIso(b.created_at);
    if (!quando) continue;

    const persone = Math.max(0, interi(b.qty) - interi(b.qty_cancelled));
    const gia = perOrdine.get(b.order_number);
    if (gia) {
      gia.persone = interi(gia.persone as number) + persone;
      continue;
    }

    perOrdine.set(b.order_number, {
      riferimento: b.order_number,
      tour_slug: perProdotto.get(String(b.product_id))?.[0] ?? null,
      prodotto,
      /* Solo il nome di battesimo e l'iniziale: il cognome intero non
         entra, e il telefono neanche -- di quello resta la nazione. La
         tabella si legge senza autenticazione, quindi quello che c'e'
         dentro va trattato come gia' pubblico. */
      nome,
      iniziale: iniziale(b.last_name),
      paese: paeseDaTelefono(b.phone_number ?? b.contact_data?.telephone),
      persone: persone || null,
      quando,
    });
  }

  const righe = [...perOrdine.values()].slice(0, RECENTI_TENUTE);
  if (!righe.length) return 0;

  const { error } = await sb
    .from('prenotazioni_recenti')
    .upsert(righe, { onConflict: 'riferimento' });
  if (error) return error.message;

  /* La coda vecchia si taglia qui: senza, la tabella cresce di un
     migliaio di righe al mese per mostrarne sempre le stesse
     venticinque. */
  const { data: coda } = await sb
    .from('prenotazioni_recenti')
    .select('id')
    .order('quando', { ascending: false })
    .range(RECENTI_TENUTE, RECENTI_TENUTE + 999);
  const daButtare = ((coda ?? []) as { id: number }[]).map((r) => r.id);
  if (daButtare.length) await sb.from('prenotazioni_recenti').delete().in('id', daButtare);

  return righe.length;
}
