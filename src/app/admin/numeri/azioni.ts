'use server';

import { revalidatePath } from 'next/cache';
import { chiSono, supabaseServer } from '@/lib/auth';
import {
  calendario,
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
  riassumiCalendario,
  soloNome,
} from './calcoli';

/* IL RIAGGIORNAMENTO, SPEZZATO IN PEZZI CORTI.
 *
 * ── PERCHE' SERVER ACTION E NON UNA CHIAMATA DAL BROWSER ────────────
 * Le quattro tabelle hanno la scrittura chiusa da `e_admin()`. La chiave
 * pubblicabile che il browser ha in mano non la supera: un update dal
 * client tornerebbe "riuscito" con zero righe toccate, e il pannello
 * direbbe "fatto" mentre i numeri restano quelli di ieri. Qui il client
 * Supabase nasce dai cookie di sessione, quindi il database vede un admin.
 *
 * ── PERCHE' TANTI PASSI E NON UN PULSANTE SOLO ──────────────────────
 * Misurato il 25/08/2026: le prenotazioni degli ultimi 30 giorni sono
 * 1.930 su 8 pagine e una pagina costa sei secondi. Tutto in una richiesta
 * sola fa cinquanta secondi solo per quelle -- oltre il tempo massimo di
 * una funzione su Vercel, e con un errore che arriva alla fine, quando il
 * lavoro e' gia' stato buttato. Spezzato in passi da pochi secondi ognuno,
 * invece, ogni pezzo che finisce e' scritto: se cade la rete a meta', quello
 * che era gia' passato resta buono.
 *
 * ── SOLO GET VERSO REGIONDO ─────────────────────────────────────────
 * Da qui si legge e basta. Dall'altra parte c'e' il sistema con cui il
 * cliente incassa davvero: una POST sbagliata non e' un bug, e' una
 * prenotazione finta dentro il gestionale di qualcun altro.
 */

const GIORNI_FINESTRA = 30;
/** quante pagine di prenotazioni per richiesta: quattro in parallelo
 *  costano 7,5 secondi invece dei 24 che costerebbero in fila */
const PAGINE_PER_VOLTA = 4;
/** quante righe si tengono in `prenotazioni_recenti`: il riquadro del sito
 *  ne mostra 25, tenerne 1.900 vuol dire solo una tabella che cresce */
const RECENTI_TENUTE = 150;

export type Esito = { ok: boolean; errore?: string };

/** I conteggi di UNA fetta di prenotazioni. Tornano al browser e vengono
 *  rimandati indietro alla fine: sono cinque numeri per tour, non le
 *  prenotazioni, quindi il giro non costa niente e non espone niente. */
export type Parziale = {
  slug: string;
  oggi: number;
  ieri: number;
  u7: number;
  u30: number;
  p7: number;
};

async function guardia() {
  const io = await chiSono();
  return io ? null : 'Sessione scaduta: rientra dal pannello.';
}

/* ─────────────────────────────────────────────────────────────────────
   PASSO 1 — LE RECENSIONI
   ───────────────────────────────────────────────────────────────────── */

/** Ricalcola `valutazioni_tour` per la fonte `regiondo`. Una chiamata
 *  sola, due secondi: e' il passo che si puo' rifare quando si vuole. */
export async function passoRecensioni(): Promise<Esito & { quanti?: number }> {
  const ko = await guardia();
  if (ko) return { ok: false, errore: ko };

  const lista = await prodotti();
  if (!lista.length) return { ok: false, errore: 'Regiondo non ha restituito nessun prodotto.' };

  const sb = await supabaseServer();
  const { data: tours } = await sb.from('tours').select('slug,regiondo_sku').not('regiondo_sku', 'is', null);

  /* Uno SKU puo' servire piu' di un tour: in `tours` ci sono piu' righe
     che prodotti distinti, perche' alcune pagine storiche di WordPress
     vendono lo stesso prodotto. Vanno aggiornate tutte, non la prima. */
  const perSku = new Map<string, string[]>();
  for (const t of tours ?? []) {
    const sku = (t as { regiondo_sku: string | null }).regiondo_sku;
    if (!sku) continue;
    const slug = (t as { slug: string }).slug;
    perSku.set(sku, [...(perSku.get(sku) ?? []), slug]);
  }

  const oggi = oggiARoma();
  const righe: Record<string, unknown>[] = [];
  for (const p of lista) {
    const slugs = perSku.get(p.sku);
    if (!slugs) continue;
    const quante = Number(p.reviews_count ?? 0);
    const punteggio = Number(p.rating_summary ?? 0);
    /* Un prodotto senza recensioni non deve produrre una riga "0 su 0":
       il sito la leggerebbe e mostrerebbe una stellina vuota, che pesa
       piu' del non mostrare niente. */
    if (!quante || !punteggio) continue;
    /* `rating_summary` va da 0 a 100. 99 diventa 5,0 e non 4,95: sul sito
       il voto si scrive con un decimale. */
    const voto = Math.round((punteggio / 20) * 10) / 10;
    for (const slug of slugs) {
      righe.push({ tour_slug: slug, fonte: 'regiondo', voto, quante, aggiornato: oggi });
    }
  }

  if (!righe.length) return { ok: true, quanti: 0 };

  const { error } = await sb.from('valutazioni_tour').upsert(righe, { onConflict: 'tour_slug,fonte' });
  if (error) return { ok: false, errore: error.message };
  return { ok: true, quanti: righe.length };
}

/* ─────────────────────────────────────────────────────────────────────
   PASSO 2 — LE PRENOTAZIONI
   ───────────────────────────────────────────────────────────────────── */

/** product_id -> slug dei tour che lo vendono. Le prenotazioni portano il
 *  `product_id`, `tours` porta lo SKU: senza il catalogo in mezzo i due
 *  non si toccano. */
async function mappaProdotti(sb: Awaited<ReturnType<typeof supabaseServer>>) {
  const [lista, { data: tours }] = await Promise.all([
    prodotti(),
    sb.from('tours').select('slug,regiondo_sku').not('regiondo_sku', 'is', null).order('slug'),
  ]);

  const perSku = new Map<string, string[]>();
  for (const t of tours ?? []) {
    const sku = (t as { regiondo_sku: string | null }).regiondo_sku;
    if (!sku) continue;
    perSku.set(sku, [...(perSku.get(sku) ?? []), (t as { slug: string }).slug]);
  }

  const perProdotto = new Map<string, string[]>();
  for (const p of lista) {
    const slugs = perSku.get(p.sku);
    if (slugs?.length) perProdotto.set(String(p.product_id), slugs);
  }
  return perProdotto;
}

function interi(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Legge PAGINE_PER_VOLTA pagine a partire da `daPagina` (numerata da 1),
 *  scrive le righe recenti e restituisce i conteggi parziali. */
export async function passoPrenotazioni(
  daPagina: number
): Promise<Esito & { pagine: number; fatte: number; parziali: Parziale[] }> {
  const vuoto = { pagine: 1, fatte: 0, parziali: [] as Parziale[] };
  const ko = await guardia();
  if (ko) return { ok: false, errore: ko, ...vuoto };

  const sb = await supabaseServer();
  const perProdotto = await mappaProdotti(sb);

  const oggi = oggiARoma();
  const ieri = giorniPrima(oggi, 1);
  const seiFa = giorniPrima(oggi, 6);
  const dal = giorniPrima(oggi, GIORNI_FINESTRA - 1);

  const numeri = Array.from({ length: PAGINE_PER_VOLTA }, (_, i) => daPagina + i);
  const pagine = await Promise.all(numeri.map((n) => prenotazioniPagina(dal, n)));

  const buone = pagine.filter((p) => p !== null);
  if (!buone.length) return { ok: false, errore: 'Regiondo non risponde sulle prenotazioni.', ...vuoto };

  const totalePagine = Math.max(...buone.map((p) => p.pagine), 1);
  const tutte: PrenotazioneGrezza[] = buone.flatMap((p) => p.righe);

  /* GLI ANNULLAMENTI NON SI CONTANO, e non basta non contarli: se una
     prenotazione era gia' finita nel riquadro delle ultime e poi e' stata
     annullata, va tolta. Altrimenti il sito continua a vantarsi di una
     vendita che non esiste piu'. */
  const annullate = tutte.filter((b) => b.status === 'canceled' || b.status === 'rejected').map((b) => b.order_number);
  const valide = tutte.filter((b) => b.status !== 'canceled' && b.status !== 'rejected');

  const conti = new Map<string, Parziale>();
  const prendi = (slug: string) => {
    let c = conti.get(slug);
    if (!c) {
      c = { slug, oggi: 0, ieri: 0, u7: 0, u30: 0, p7: 0 };
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
    /* Anche le cancellazioni parziali non si contano: un gruppo da 6 con 4
       posti annullati e' un gruppo da 2. */
    const persone = Math.max(0, interi(b.qty) - interi(b.qty_cancelled));

    for (const slug of slugs) {
      const c = prendi(slug);
      if (giorno === oggi) c.oggi += 1;
      if (giorno === ieri) c.ieri += 1;
      if (giorno >= seiFa) {
        c.u7 += 1;
        c.p7 += persone;
      }
      if (giorno >= dal) c.u30 += 1;
    }
  }

  if (annullate.length) {
    await sb.from('prenotazioni_recenti').delete().in('riferimento', annullate);
  }

  /* LE RIGHE DEL RIQUADRO SOLO DALLA PRIMA FETTA.
     Regiondo restituisce le prenotazioni dalla piu' recente: le mille piu'
     nuove stanno gia' tutte qui. Le fette successive servono solo a
     contare, e riscriverle sarebbe milleottocento upsert per mostrarne
     venticinque. */
  if (daPagina === 1) {
    const errore = await scriviRecenti(sb, valide, perProdotto);
    if (errore) return { ok: false, errore, pagine: totalePagine, fatte: 0, parziali: [] };
  }

  return {
    ok: true,
    pagine: totalePagine,
    fatte: Math.min(daPagina + PAGINE_PER_VOLTA - 1, totalePagine),
    parziali: [...conti.values()],
  };
}

async function scriviRecenti(
  sb: Awaited<ReturnType<typeof supabaseServer>>,
  valide: PrenotazioneGrezza[],
  perProdotto: Map<string, string[]>
): Promise<string | null> {
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
         entra, e il telefono neanche -- di quello resta la nazione. */
      nome,
      iniziale: iniziale(b.last_name),
      paese: paeseDaTelefono(b.phone_number ?? b.contact_data?.telephone),
      persone: persone || null,
      quando,
    });
  }

  const righe = [...perOrdine.values()].slice(0, RECENTI_TENUTE);
  if (!righe.length) return null;

  const { error } = await sb.from('prenotazioni_recenti').upsert(righe, { onConflict: 'riferimento' });
  if (error) return error.message;

  /* La coda vecchia si taglia qui: senza, la tabella cresce di un migliaio
     di righe al mese per mostrarne sempre le stesse venticinque. */
  const { data: coda } = await sb
    .from('prenotazioni_recenti')
    .select('id')
    .order('quando', { ascending: false })
    .range(RECENTI_TENUTE, RECENTI_TENUTE + 999);
  const daButtare = (coda ?? []).map((r) => (r as { id: number }).id);
  if (daButtare.length) await sb.from('prenotazioni_recenti').delete().in('id', daButtare);

  return null;
}

/** Scrive `prenotazioni_conteggio` sommando i parziali di tutte le fette. */
export async function passoConteggi(parziali: Parziale[]): Promise<Esito & { tour?: number }> {
  const ko = await guardia();
  if (ko) return { ok: false, errore: ko };

  const somma = new Map<string, Parziale>();
  for (const p of parziali) {
    const c = somma.get(p.slug) ?? { slug: p.slug, oggi: 0, ieri: 0, u7: 0, u30: 0, p7: 0 };
    c.oggi += p.oggi;
    c.ieri += p.ieri;
    c.u7 += p.u7;
    c.u30 += p.u30;
    c.p7 += p.p7;
    somma.set(p.slug, c);
  }

  const adesso = new Date().toISOString();
  const righe = [...somma.values()]
    .filter((c) => c.u30 > 0)
    .map((c) => ({
      tour_slug: c.slug,
      oggi: c.oggi,
      ieri: c.ieri,
      ultimi_7: c.u7,
      ultimi_30: c.u30,
      persone_7: c.p7,
      aggiornato: adesso,
    }));

  const sb = await supabaseServer();
  if (righe.length) {
    const { error } = await sb.from('prenotazioni_conteggio').upsert(righe, { onConflict: 'tour_slug' });
    if (error) return { ok: false, errore: error.message };
  }

  /* I tour che in trenta giorni non hanno venduto niente non restano con
     i numeri del mese scorso: una riga vecchia non si distingue da una
     nuova, e il sito continuerebbe a dire "51 prenotati questa settimana"
     su un tour fermo. */
  const vivi = new Set(righe.map((r) => r.tour_slug));
  const { data: esistenti } = await sb.from('prenotazioni_conteggio').select('tour_slug');
  const morti = (esistenti ?? [])
    .map((r) => (r as { tour_slug: string }).tour_slug)
    .filter((s) => !vivi.has(s));
  if (morti.length) await sb.from('prenotazioni_conteggio').delete().in('tour_slug', morti);

  return { ok: true, tour: righe.length };
}

/* ─────────────────────────────────────────────────────────────────────
   PASSO 3 — LA DISPONIBILITA'
   ───────────────────────────────────────────────────────────────────── */

/** quanti calendari per richiesta: 12 in parallelo stanno sotto i due
 *  secondi e lasciano la barra di avanzamento che si muove spesso */
const CALENDARI_PER_VOLTA = 12;

export async function passoDisponibilita(
  da: number
): Promise<Esito & { totale: number; fatti: number }> {
  const ko = await guardia();
  if (ko) return { ok: false, errore: ko, totale: 0, fatti: 0 };

  const sb = await supabaseServer();
  /* Ordinati per slug a ogni chiamata: la finestra `da..da+12` deve cadere
     sugli stessi tour di prima, o a ogni giro se ne salta qualcuno e se ne
     rifa' qualcun altro senza che si veda. */
  const { data: tours } = await sb
    .from('tours')
    .select('slug,regiondo_sku')
    .not('regiondo_sku', 'is', null)
    .order('slug');

  const elenco = (tours ?? []) as { slug: string; regiondo_sku: string }[];
  const fetta = elenco.slice(da, da + CALENDARI_PER_VOLTA);
  const oggi = oggiARoma();

  const calendari = await Promise.all(fetta.map((t) => calendario(t.regiondo_sku)));

  const righe = fetta
    .map((t, i) => ({ t, giorni: calendari[i] }))
    .filter((x) => x.giorni && x.giorni.length)
    .map((x) => ({
      tour_slug: x.t.slug,
      ...riassumiCalendario(x.giorni!, oggi),
      aggiornato: new Date().toISOString(),
    }));

  if (righe.length) {
    const { error } = await sb.from('disponibilita').upsert(righe, { onConflict: 'tour_slug' });
    if (error) return { ok: false, errore: error.message, totale: elenco.length, fatti: da };
  }

  const fatti = Math.min(da + CALENDARI_PER_VOLTA, elenco.length);

  if (fatti >= elenco.length) {
    const vivi = new Set(elenco.map((t) => t.slug));
    const { data: esistenti } = await sb.from('disponibilita').select('tour_slug');
    const morti = (esistenti ?? [])
      .map((r) => (r as { tour_slug: string }).tour_slug)
      .filter((s) => !vivi.has(s));
    if (morti.length) await sb.from('disponibilita').delete().in('tour_slug', morti);

    /* L'ULTIMA RIGA, QUELLA CHE SI DIMENTICA SEMPRE.
       Le pagine pubbliche si rigenerano ogni ora: senza questo, chi ha
       appena premuto il pulsante vede i numeri di prima e conclude che il
       pannello non funziona. Si rifa' tutto l'albero perche' questi numeri
       compaiono ovunque -- home, schede dei tour, riquadro in basso -- e
       in otto lingue. */
    revalidatePath('/', 'layout');
  }

  return { ok: true, totale: elenco.length, fatti };
}
