import { supabase } from './supabase';
import { testo } from './prosa';
import { unitaDi } from './prezzi';
import { sezioneDi, type Servizio, type Variante } from './listino';

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

/** Le varianti di un prodotto con le opzioni e i prezzi. null se Regiondo
 *  non risponde: un prodotto irraggiungibile non deve far fallire gli
 *  altri 85, come in `calendario()` di src/lib/regiondo-api.ts. */
export async function opzioniDi(sku: string, fresco = false): Promise<Variante[] | null> {
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
        .map((o) => ({ id: String(o.option_id ?? ''), nome: testo(o.name ?? ''), prezzo: Number(o.original_price) }))
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
