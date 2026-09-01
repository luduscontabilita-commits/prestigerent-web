import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { dalGiorno, raccogli, type Conversione } from '@/lib/conversioni';
import { caricaSuGoogle, googleConfigurato } from '@/lib/conversioni-google';
import { caricaSuMeta, metaConfigurato } from '@/lib/conversioni-meta';
import { caricaSuGa4, ga4Configurato } from '@/lib/conversioni-ga4';
import {
  giaFatte,
  memoriaConfigurata,
  segnaEsiti,
  type Destinatario,
  type Esito,
} from '@/lib/conversioni-memoria';

/* IL LAVORO NOTTURNO: LE PRENOTAZIONI VERE DENTRO GOOGLE ADS E META.
 *
 * ── COSA FA, IN UNA RIGA ────────────────────────────────────────────
 * Legge da Regiondo le prenotazioni degli ultimi giorni, tiene solo le
 * dirette vive, ne rende irriconoscibili gli identificativi, e le manda
 * a Google e a Meta con lo stesso numero d'ordine -- cosi' sono loro a
 * scartare i doppioni rispetto ai tag del browser.
 *
 * ── PERCHE' ESISTE ──────────────────────────────────────────────────
 * Il pagamento si conclude dentro Regiondo, su un dominio non nostro.
 * Safari cancella i cookie di terze parti, chi paga con 3DS esce dal
 * sito. Misurato: Regiondo registra circa 97 prenotazioni dirette al
 * mese, Google Ads ne vede 1. Le campagne stanno ottimizzando su un
 * novantasettesimo della realta', e il CPA che si legge nei rapporti non
 * e' il CPA.
 *
 * ── 🔴 LA PROVA E' IL COMPORTAMENTO PREDEFINITO ─────────────────────
 * Chiamare questa rotta senza dire niente NON carica niente: valida e
 * riferisce. Per caricare davvero ci vuole `?davvero=1`, scritto
 * apposta. Una rotta che carica su Google Ads perche' qualcuno l'ha
 * aperta per curiosita' e' un incidente che aspetta di succedere, e su
 * Meta gli eventi non si cancellano.
 *
 * Quando si da' il via, il `path` del cron in `vercel.json` diventa
 * `/api/conversioni/notturno?davvero=1`. E' l'unica modifica che serve.
 *
 * ── COME SI CHIAMA A MANO ───────────────────────────────────────────
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://prestigerent.com/api/conversioni/notturno?giorni=3" | jq
 *
 * ── LE PROMESSE CHE QUESTA ROTTA MANTIENE ───────────────────────────
 *   1. in prova non si scrive niente: ne' su Google, ne' su Meta, ne'
 *      nella memoria su Supabase;
 *   2. una riga si segna come fatta SOLO se il destinatario l'ha
 *      accettata. Un caricamento fallito non lascia traccia di "fatto":
 *      la notte dopo si riprova da solo;
 *   3. Google e Meta sono indipendenti. Se Meta e' spenta, Google parte
 *      lo stesso, e viceversa. Vengono lanciate insieme e si aspettano
 *      tutte e due gli esiti, qualunque cosa succeda a una delle due;
 *   4. senza memoria non si carica davvero. Se la chiave di servizio di
 *      Supabase manca, il caricamento vero si rifiuta di partire invece
 *      di ricaricare tutto ogni notte per sempre.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Sessanta secondi e' il tetto del piano Hobby di Vercel, e ci si sta
   comodamente: tre giorni di prenotazioni sono una pagina sola di
   Regiondo (circa sei secondi) piu' due chiamate. Alzarlo oltre richiede
   un piano superiore, e con `giorni` grande conviene invece lanciarlo
   piu' volte con finestre corte. */
export const maxDuration = 60;

/** Il valore predefinito e' tre giorni e non uno: se una notte il cron
 *  non parte, quella dopo recupera da sola senza che nessuno se ne
 *  accorga. Oltre i sette Meta non accetta piu' niente. */
const GIORNI = 3;
const GIORNI_MAX = 90;

/** Confronto a tempo costante: su un confronto normale la differenza fra
 *  "sbagliato al primo carattere" e "sbagliato all'ultimo" e' misurabile,
 *  e da li' un segreto si ricostruisce un pezzo alla volta. */
function uguale(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function autorizzata(req: NextRequest): boolean {
  /* `CRON_SECRET` e' il nome che usa Vercel: quando la variabile c'e',
     il cron chiama la rotta con `Authorization: Bearer <valore>` da solo.
     `CONVERSIONI_SEGRETO` e' l'alternativa per chi la chiama a mano.
     Il segreto NON si accetta dalla querystring: le querystring finiscono
     nei registri di accesso, e un segreto nei registri non e' piu' un
     segreto. */
  const atteso = process.env.CRON_SECRET ?? process.env.CONVERSIONI_SEGRETO;
  if (!atteso) return false;

  const intestazione = req.headers.get('authorization') ?? '';
  if (intestazione.startsWith('Bearer ') && uguale(intestazione.slice(7), atteso)) return true;

  const chiave = req.headers.get('x-chiave');
  return chiave !== null && uguale(chiave, atteso);
}

function interoDa(v: string | null, predefinito: number, massimo: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return predefinito;
  return Math.min(Math.floor(n), massimo);
}

/** L'ordinamento per motivo, dal piu' frequente: un rapporto che elenca
 *  gli scarti in ordine casuale si guarda una volta e poi si smette. */
function ordinati(m: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
}

async function esegui(req: NextRequest) {
  const partito = Date.now();

  if (!autorizzata(req)) {
    /* 404 e non 401: a chi bussa senza chiave questa rotta non deve
       nemmeno risultare esistente. Un 401 conferma che c'e' qualcosa da
       forzare. */
    return NextResponse.json({ errore: 'non trovato' }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  const prova = q.get('davvero') !== '1';
  const giorni = interoDa(q.get('giorni'), GIORNI, GIORNI_MAX);
  const ammettiCoupon = q.get('coupon') === 'si';
  const soloGoogle = q.get('solo') === 'google';
  const soloMeta = q.get('solo') === 'meta';
  const soloGa4 = q.get('solo') === 'ga4';

  /* ── 1. REGIONDO ────────────────────────────────────────────────── */
  const raccolto = await raccogli(giorni, ammettiCoupon);
  if (raccolto.errore) {
    console.error('[conversioni] Regiondo:', raccolto.errore);
    return NextResponse.json(
      { ok: false, modo: prova ? 'prova' : 'reale', regiondo: raccolto },
      { status: 502 },
    );
  }

  /* ── 2. LA MEMORIA ─────────────────────────────────────────────── */
  const memoria = memoriaConfigurata();
  if (!prova && !memoria) {
    return NextResponse.json(
      {
        ok: false,
        errore:
          'caricamento vero rifiutato: manca SUPABASE_SECRET_KEY, senza memoria ' +
          'le stesse prenotazioni ripartirebbero ogni notte',
      },
      { status: 412 },
    );
  }

  const ordini = raccolto.righe.map((r) => r.ordine);
  const fatte = memoria
    ? await giaFatte(ordini)
    : { ok: false, insieme: new Set<string>(), errore: 'memoria non configurata' };

  if (!prova && !fatte.ok) {
    /* La memoria c'e' ma non risponde. Andare avanti vorrebbe dire
       ricaricare tutto: meglio non fare niente e riprovare domani. */
    return NextResponse.json(
      { ok: false, errore: `memoria non leggibile: ${fatte.errore}` },
      { status: 503 },
    );
  }

  const daFare = (d: Destinatario): Conversione[] =>
    raccolto.righe.filter((r) => !fatte.insieme.has(`${d}:${r.ordine}`));

  const solo = soloGoogle || soloMeta || soloGa4;
  const perGoogle = solo && !soloGoogle ? [] : daFare('google');
  const perMeta = solo && !soloMeta ? [] : daFare('meta');
  /* 🔴 GA4 NON GUARDA LA MEMORIA, GUARDA ANALYTICS.
     Gli altri due si fidano del registro locale: se una riga risulta
     gia' caricata non riparte. Qui no, e non e' una svista: la
     domanda non e' "l'ho gia' mandata io?" ma "Analytics ce l'ha
     gia', magari perche' gliel'ha portata il browser?". Il
     controllo lo fa `caricaSuGa4` interrogando Analytics, e se
     Analytics non risponde non manda niente. */
  const perGa4 = solo && !soloGa4 ? [] : raccolto.righe;

  /* ── 3. I DUE DESTINATARI, INDIPENDENTI ────────────────────────────
     `allSettled` e non `all`: con `all` un'eccezione su Meta butterebbe
     via anche l'esito di Google, che magari e' andato benissimo -- e
     senza esito non si segna niente, quindi si ricaricherebbe. */
  const [rg, rm, ra] = await Promise.allSettled([
    perGoogle.length ? caricaSuGoogle(perGoogle, prova) : null,
    perMeta.length ? caricaSuMeta(perMeta, prova) : null,
    perGa4.length ? caricaSuGa4(perGa4, prova, giorni) : null,
  ]);

  const google =
    rg.status === 'fulfilled'
      ? rg.value
      : {
          configurato: googleConfigurato(),
          inviate: perGoogle.length,
          accettati: [] as string[],
          rifiutati: perGoogle.map((r) => r.ordine),
          motivi: {} as Record<string, number>,
          richieste: [] as string[],
          errore: String(rg.reason).slice(0, 300),
        };
  const meta =
    rm.status === 'fulfilled'
      ? rm.value
      : {
          configurato: metaConfigurato(),
          inviate: perMeta.length,
          accettati: [] as string[],
          rifiutati: perMeta.map((r) => r.ordine),
          motivi: {} as Record<string, number>,
          richieste: [] as string[],
          troppoVecchie: 0,
          errore: String(rm.reason).slice(0, 300),
        };

  const ga4 =
    ra.status === 'fulfilled'
      ? ra.value
      : {
          configurato: ga4Configurato(),
          inviate: perGa4.length,
          accettati: [] as string[],
          rifiutati: perGa4.map((r) => r.ordine),
          gia: [] as string[],
          troppoVecchie: 0,
          motivi: {} as Record<string, number>,
          errore: String(ra.reason).slice(0, 300),
        };

  /* ── 4. SI SEGNA SOLO QUELLO CHE E' PASSATO ────────────────────── */
  const valori = new Map(raccolto.righe.map((r) => [r.ordine, r]));
  const daSegnare: Esito[] = [];
  if (!prova) {
    const aggiungi = (d: Destinatario, ordini: string[], esito: 'ok' | 'rifiutata') => {
      for (const o of ordini) {
        const r = valori.get(o);
        daSegnare.push({
          ordine: o,
          destinatario: d,
          esito,
          valore: r?.valore,
          creata_il: r?.quando.toISOString(),
          motivo: esito === 'rifiutata' ? 'respinta dal destinatario' : null,
        });
      }
    };
    if (google) {
      aggiungi('google', google.accettati, 'ok');
      aggiungi('google', google.rifiutati, 'rifiutata');
    }
    if (meta) {
      aggiungi('meta', meta.accettati, 'ok');
      aggiungi('meta', meta.rifiutati, 'rifiutata');
    }
    if (ga4) {
      aggiungi('ga4', ga4.accettati, 'ok');
      aggiungi('ga4', ga4.rifiutati, 'rifiutata');
    }
  }

  const segnate = daSegnare.length
    ? await segnaEsiti(daSegnare)
    : { ok: true as const, errore: undefined };

  /* ── 5. IL RAPPORTO ────────────────────────────────────────────── */
  const rapporto = {
    ok: true,
    modo: prova ? ('prova — niente e’ stato registrato' as const) : ('reale' as const),
    quando: new Date().toISOString(),
    finestra: { dal: dalGiorno(giorni), giorni },
    regiondo: {
      lette: raccolto.lette,
      pagine: raccolto.pagine,
      tenute: raccolto.righe.length,
      valore: Math.round(raccolto.righe.reduce((s, r) => s + r.valore, 0) * 100) / 100,
      /* Se e' vero, la lettura si e' fermata prima della fine per non
         farsi uccidere dal tetto di sessanta secondi: mancano le
         prenotazioni piu' recenti, e va rilanciato con una finestra
         piu' corta. Non e' un dettaglio da registro: e' la differenza
         fra un rapporto completo e uno che sembra completo. */
      troncato: raccolto.troncato,
      fuse_stesso_ordine: raccolto.fuse,
      con_telefono: raccolto.conTelefono,
      scarti: ordinati(raccolto.scarti),
      stati_pagamento: ordinati(raccolto.pagamenti),
    },
    memoria: {
      disponibile: memoria,
      leggibile: fatte.ok,
      errore: fatte.errore,
      /* Contate sulla memoria e non come "tenute meno inviate": con
         `?solo=google` le righe di Meta risultano zero perche' non le
         abbiamo chieste, non perche' fossero gia' fatte. */
      gia_su_google: ordini.filter((o) => fatte.insieme.has(`google:${o}`)).length,
      gia_su_meta: ordini.filter((o) => fatte.insieme.has(`meta:${o}`)).length,
      gia_su_ga4: ordini.filter((o) => fatte.insieme.has(`ga4:${o}`)).length,
      segnate: prova ? 0 : daSegnare.filter((x) => x.esito === 'ok').length,
      scrittura: segnate.ok ? 'ok' : `FALLITA: ${segnate.errore}`,
    },
    google: google && {
      configurato: google.configurato,
      inviate: google.inviate,
      /* "accettate" = accettate dall'API. Google cerchera' per ognuna un
         clic sui nostri annunci e buttera' quelle che non ne hanno:
         questo numero e' sempre piu' alto di quello che si leggera' nei
         rapporti di Ads, ed e' giusto cosi'. */
      accettate: google.accettati.length,
      rifiutate: google.rifiutati.length,
      motivi: ordinati(google.motivi),
      richieste: google.richieste.slice(0, 5),
      errore: google.errore,
    },
    meta: meta && {
      configurato: meta.configurato,
      inviate: meta.inviate,
      accettate: meta.accettati.length,
      rifiutate: meta.rifiutati.length,
      /* Se questo numero smette di essere zero, il lavoro notturno e'
         fermo da piu' di una settimana e quelle vendite Meta non le
         vedra' mai: non esiste recupero oltre i sette giorni. */
      troppo_vecchie_per_meta: meta.troppoVecchie,
      prova_solo_formale: meta.provaSoloLocale,
      motivi: ordinati(meta.motivi),
      tracce: meta.richieste.slice(0, 5),
      errore: meta.errore,
    },
    /* 🔴 QUI IL NUMERO DA GUARDARE E' `gia_viste_dal_browser`.
       Se sale verso il totale, vuol dire che il browser sta portando ad
       Analytics quasi tutto e questo pezzo serve poco. Se resta basso --
       ad agosto 2026 era il 52% -- vuol dire che meta' delle vendite ad
       Analytics arriva solo da qui. */
    ga4: ga4 && {
      configurato: ga4.configurato,
      gia_viste_dal_browser: ga4.gia.length,
      inviate: ga4.inviate,
      accettate: ga4.accettati.length,
      rifiutate: ga4.rifiutati.length,
      /* Il Measurement Protocol scarta senza dirlo tutto cio' che e' piu'
         vecchio di 72 ore: se questo numero non e' zero, il lavoro
         notturno ha saltato piu' di tre giorni. */
      troppo_vecchie_per_analytics: ga4.troppoVecchie,
      motivi: ordinati(ga4.motivi),
      errore: ga4.errore,
    },
    durata_ms: Date.now() - partito,
  };

  /* Una riga sola nei registri di Vercel: aprire il JSON intero per
     sapere se e' andata bene e' il modo di non guardarlo mai. */
  console.log(
    `[conversioni] ${prova ? 'PROVA' : 'REALE'} finestra ${giorni}g ` +
      `lette=${raccolto.lette}${raccolto.troncato ? ' TRONCATO' : ''} ` +
      `tenute=${raccolto.righe.length} ` +
      `google=${google ? `${google.accettati.length}/${google.inviate}` : '-'} ` +
      `meta=${meta ? `${meta.accettati.length}/${meta.inviate}` : '-'} ` +
      `${google?.errore ?? ''} ${meta?.errore ?? ''}`.trim(),
  );

  const guai = Boolean(google?.errore || meta?.errore || !segnate.ok || raccolto.troncato);
  return NextResponse.json(rapporto, { status: guai ? 207 : 200 });
}

/* Vercel chiama i cron in GET. Il POST c'e' per chi la lancia a mano e
   preferisce non lasciare la chiamata nella cronologia di un browser. */
export async function GET(req: NextRequest) {
  return esegui(req);
}

export async function POST(req: NextRequest) {
  return esegui(req);
}
