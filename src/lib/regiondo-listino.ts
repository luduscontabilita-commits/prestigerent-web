import { supabase } from './supabase';
import { testo } from './prosa';
import { unitaDi } from './prezzi';
import { prezzoRegiondo, sezioneDi, type Servizio, type Variante } from './listino';
import { unstable_cache } from 'next/cache';
import { chiama, regiondoConfigurato } from './regiondo-api';

/* I PREZZI DEL LISTINO, LETTI DA REGIONDO OGNI VOLTA.
 *
 * ── LA FONTE ─────────────────────────────────────────────────────────
 * `widgets/booking/product/ticketVariations`: lo stesso indirizzo che il
 * widget di prenotazione chiama quando si apre il menu delle opzioni.
 * Pubblico, senza chiave, ma senza il `Referer` giusto risponde vuoto --
 * come l'endpoint di `fetchProduct` in src/lib/regiondo.ts. Restituisce
 * TUTTE le varianti di un prodotto, ognuna con le sue opzioni e il prezzo:
 * e' l'unica chiamata che dia il listino intero senza una data.
 * Trovato il 12/10/2026 leggendo il bundle del widget
 * (`booking-widget.init.*.chunk.js`, funzione che costruisce
 * `widget_url + "product/ticketVariations"`).
 *
 * Esiste anche una via ufficiale e firmata,
 * `products/availoptions/{variationId}` di api.regiondo.com: da' gli
 * stessi prezzi ma vuole una chiamata per variante e una data. Resta la
 * riserva se il widget un giorno cambiasse.
 *
 * ── QUANTO DURA UNA LETTURA ──────────────────────────────────────────
 * Cinque minuti per il listino: chi cambia un prezzo su Regiondo lo
 * ritrova qui il tempo di un caffe' dopo, e 86 prodotti non vengono
 * richiesti a ogni pagina aperta. Il pannello ha comunque «Rileggi
 * adesso» (`fresco`), che salta la cache.
 *
 * ── SOLO LETTURA ─────────────────────────────────────────────────────
 * Su Regiondo non si scrive niente da qui, mai. E non si potrebbe: l'API
 * ufficiale non ha nessun endpoint per cambiare prodotti o prezzi
 * (verificato sull'elenco completo, api.regiondo.com/api.json).
 */

const SHOP = process.env.NEXT_PUBLIC_REGIONDO_SHOP ?? 'https://prestigerent.regiondo.com';
const PROVIDER = process.env.NEXT_PUBLIC_REGIONDO_PROVIDER ?? 'PR193';
const DURATA = 300;

type OpzioneGrezza = { option_id?: string | number; name?: string; original_price?: number | string };
type VarianteGrezza = { variation_id?: string | number; title?: string; options?: OpzioneGrezza[] };

/* ── 🔴 DAL 27/10/2026 SI LEGGE DALL'API UFFICIALE ─────────────────────
 * Regiondo ha messo il negozio (prestigerent.regiondo.com) dietro la
 * protezione anti-bot di Cloudflare: `ticketVariations` risponde 403
 * «Attention Required!» a qualunque richiesta da un server, Vercel
 * compreso. Il listino mostrava «Regiondo non ha risposto per 86
 * prodotti». Non e' un guasto nostro e non si aggira: la protezione e'
 * voluta.
 *
 * L'API ufficiale firmata (api.regiondo.com, le nostre chiavi) non e'
 * dietro quella protezione e da' gli stessi dati, senza data:
 *  - `products`: lo SKU del sito -> il numero interno del prodotto
 *    (T-PR193-210790 -> 195819; NON e' la cifra dentro lo SKU);
 *  - `products/variations/{prodotto}`: varianti, col nome;
 *  - `products/availoptions/{variante}`: opzioni con `original_price`.
 * Verificato sulla Wine Experience: 89/79 e 129, gli stessi del widget.
 * Il widget resta come riserva, se un giorno Regiondo togliesse il
 * blocco. */

type ProdottoUfficiale = { product_id: string; sku: string };

/** SKU -> numero del prodotto sull'API ufficiale. Cambia solo quando si
 *  aggiunge un prodotto su Regiondo: un'ora di memoria basta. Dentro lo
 *  stesso minuto la lista si chiede una volta sola, anche con «Rileggi
 *  adesso»: senza, gli 86 prodotti la richiederebbero 86 volte. */
let mappaRecente: { quando: number; mappa: Promise<Map<string, string>> } | null = null;

function prodottiUfficiali(fresco: boolean): Promise<Map<string, string>> {
  if (mappaRecente && Date.now() - mappaRecente.quando < 60_000) return mappaRecente.mappa;
  const mappa = leggiProdottiUfficiali(fresco).then((m) => {
    if (!m.size) mappaRecente = null; // una lista vuota non si tiene a memoria
    return m;
  });
  mappaRecente = { quando: Date.now(), mappa };
  return mappa;
}

async function leggiProdottiUfficiali(fresco: boolean): Promise<Map<string, string>> {
  return new Map(fresco ? await coppieProdotti() : await coppieInMemoria());
}

async function coppieProdotti(): Promise<[string, string][]> {
  const coppie: [string, string][] = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const d = await chiama<{ data?: ProdottoUfficiale[] }>('products', { active_only: 1, limit: 100, offset }, 0);
    const lista = d?.data ?? [];
    for (const p of lista) if (p.sku && p.product_id) coppie.push([p.sku, String(p.product_id)]);
    if (lista.length < 100) break;
  }
  return coppie;
}

/* 🔴 LA MEMORIA VA TENUTA QUI, NON NELLA `fetch`. Ogni chiamata firmata
   porta l'ora al secondo negli header (X-API-TIME, X-API-HASH), e la
   memoria delle `fetch` di Next distingue le richieste anche per gli
   header: non ne ritrovava mai una uguale, e le pagine del listino
   rifacevano ~200 chiamate a ogni visita (10 secondi, misurato il
   27/10/2026). `unstable_cache` tiene il RISULTATO, per chiave.
   Se la lettura fallisce si lancia un errore: cosi' un fallimento non
   resta in memoria per cinque minuti. */
const coppieInMemoria = unstable_cache(
  async () => {
    const c = await coppieProdotti();
    if (!c.length) throw new Error('Regiondo: elenco prodotti vuoto');
    return c;
  },
  ['regiondo-prodotti-v1'],
  { revalidate: 3600, tags: ['regiondo-listino'] }
);

type OpzioneUfficiale = { option_id?: string; name?: string; original_price?: string; sort_order?: string };

/** Le varianti di un prodotto dall'API ufficiale; null se non risponde. */
async function opzioniUfficiali(sku: string, fresco: boolean): Promise<Variante[] | null> {
  if (!regiondoConfigurato()) return null;
  const memoria = fresco ? 0 : DURATA;
  const prodotto = (await prodottiUfficiali(fresco)).get(sku);
  if (!prodotto) return null;
  const v = await chiama<{ data?: { id: string; name: string }[] }>(`products/variations/${prodotto}`, {}, memoria);
  if (!v?.data?.length) return null;
  const varianti = await Promise.all(
    v.data.map(async (x) => {
      const o = await chiama<{ data?: Record<string, OpzioneUfficiale> }>(`products/availoptions/${x.id}`, {}, memoria);
      const opzioni = Object.values(o?.data ?? {})
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((op) => ({ id: String(op.option_id ?? ''), nome: testo(op.name ?? ''), prezzo: prezzoRegiondo(op.original_price) }))
        .filter((op) => op.nome && Number.isFinite(op.prezzo) && op.prezzo > 0);
      return { id: String(x.id), titolo: testo(x.name ?? ''), opzioni };
    })
  );
  return varianti.some((x) => x.opzioni.length) ? varianti : null;
}

/** Le varianti di un prodotto con le opzioni e i prezzi. null se Regiondo
 *  non risponde: un prodotto irraggiungibile non deve far fallire gli
 *  altri 85, come in `calendario()` di src/lib/regiondo-api.ts.
 *  Prima l'API ufficiale, poi il widget come riserva (vedi sopra). */
export async function opzioniDi(sku: string, fresco = false): Promise<Variante[] | null> {
  try {
    const ufficiali = fresco ? await opzioniUfficiali(sku, true) : await opzioniInMemoria(sku);
    if (ufficiali) return ufficiali;
  } catch {
    /* si prova il widget */
  }
  return opzioniDalWidget(sku, fresco);
}

/** Le opzioni di un prodotto tenute in memoria cinque minuti, per SKU
 *  (vedi `coppieInMemoria` sul perche' non basta la memoria delle fetch). */
const opzioniInMemoria = unstable_cache(
  async (sku: string) => {
    const r = await opzioniUfficiali(sku, false);
    if (!r) throw new Error(`Regiondo: nessuna opzione per ${sku}`);
    return r;
  },
  /* v2: la v1 aveva in memoria i listini senza le opzioni da mille euro
     in su (vedi `prezzoRegiondo`); cambiando chiave si buttano subito */
  ['regiondo-opzioni-v2'],
  { revalidate: DURATA, tags: ['regiondo-listino'] }
);

async function opzioniDalWidget(sku: string, fresco: boolean): Promise<Variante[] | null> {
  const url =
    `${SHOP}/widgets/booking/product/ticketVariations?locale=en_US` +
    `&provider=${encodeURIComponent(PROVIDER)}&product=${encodeURIComponent(sku)}`;
  try {
    const res = await fetch(url, {
      headers: { Referer: 'https://prestigerent.com/' },
      ...(fresco ? { cache: 'no-store' as const } : { next: { revalidate: DURATA, tags: [`regiondo:${sku}`] } }),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { status?: number; variations?: VarianteGrezza[] };
    if (!Array.isArray(d?.variations)) return null;
    return d.variations.map((v) => ({
      id: String(v.variation_id ?? ''),
      titolo: testo(v.title ?? ''),
      opzioni: (v.options ?? [])
        .map((o) => ({ id: String(o.option_id ?? ''), nome: testo(o.name ?? ''), prezzo: prezzoRegiondo(o.original_price) }))
        .filter((o) => o.nome && Number.isFinite(o.prezzo) && o.prezzo > 0),
    }));
  } catch {
    return null;
  }
}

/** Tante richieste quante ne servono, ma non piu' di `quante` insieme:
 *  86 chiamate tutte nello stesso istante sono il modo piu' rapido per
 *  farsi rallentare dal server dall'altra parte. */
async function aGruppi<T, R>(cose: T[], quante: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const fuori: R[] = new Array(cose.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(quante, cose.length) }, async () => {
      while (i < cose.length) {
        const k = i++;
        fuori[k] = await f(cose[k]);
      }
    })
  );
  return fuori;
}

/** Un tour del sito con quello che serve al listino e alla sincronizzazione. */
export type TourDelListino = {
  id: string;
  slug: string;
  nome: string;
  sku: string;
  kind: string;
  categorie: string[];
  /** l'HTML della tab PRICES come sta nel database (solo per l'admin) */
  prices: string;
};

type RigaTour = {
  id: string;
  slug: string;
  kind: string;
  regiondo_sku: string | null;
  tour_content: { locale: string; title: string | null; blocks: { name?: string; tabs?: Record<string, string> } | null }[];
};

/** I tour pubblicati con un prodotto Regiondo. Legge con la chiave
 *  pubblicabile: sono gli stessi dati che chiunque vede sul sito. */
export async function tourDelListino(): Promise<TourDelListino[]> {
  const [{ data: tours }, { data: cat }] = await Promise.all([
    supabase
      .from('tours')
      .select('id, slug, kind, regiondo_sku, tour_content(locale, title, blocks)')
      .eq('status', 'published')
      .not('regiondo_sku', 'is', null),
    supabase.from('tour_categorie').select('tour_slug, categorie'),
  ]);
  const categorie = new Map(
    ((cat ?? []) as { tour_slug: string; categorie: string[] | null }[]).map((r) => [r.tour_slug, r.categorie ?? []])
  );
  return ((tours ?? []) as unknown as RigaTour[]).map((t) => {
    const en = t.tour_content.find((c) => c.locale === 'en') ?? t.tour_content[0];
    const tabs = en?.blocks?.tabs ?? {};
    return {
      id: t.id,
      slug: t.slug,
      nome: testo((en?.blocks?.name || en?.title || t.slug).replace(/<[^>]*>/g, ' ')),
      sku: t.regiondo_sku as string,
      kind: t.kind,
      categorie: categorie.get(t.slug) ?? [],
      prices: tabs.PRICES ?? tabs.Prices ?? tabs.PREZZI ?? '',
    };
  });
}

/** Il listino intero: ogni tour con le sue varianti e la sua sezione. */
export async function listino(fresco = false): Promise<{ servizi: Servizio[]; tour: TourDelListino[]; letto: string }> {
  const tour = await tourDelListino();
  const varianti = await aGruppi(tour, 8, (t) => opzioniDi(t.sku, fresco));
  const servizi: Servizio[] = tour.map((t, i) => {
    const { sezione, gruppo } = sezioneDi(t.categorie);
    return {
      slug: t.slug,
      nome: t.nome,
      sku: t.sku,
      sezione,
      gruppo,
      unita: unitaDi({ PRICES: t.prices }, t.kind),
      varianti: varianti[i],
    };
  });
  return { servizi, tour, letto: new Date().toISOString() };
}
