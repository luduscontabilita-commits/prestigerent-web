import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import type { Conversione } from '@/lib/conversioni';
import { caricaSuGoogle } from '@/lib/conversioni-google';
import { caricaSuMeta } from '@/lib/conversioni-meta';
import { caricaSuGa4 } from '@/lib/conversioni-ga4';
import { giaFatte, segnaEsiti, type Esito } from '@/lib/conversioni-memoria';
import {
  emailDaScartare,
  emailPerGoogle,
  emailPerMeta,
  impronta,
  nomePerMeta,
  telefonoPerGoogle,
  telefonoPerMeta,
} from '@/lib/identita';

/* LE VENDITE DI /booking/, RACCONTATE DA WORDPRESS INVECE CHE DAL BROWSER.
 *
 * ── COS'E' /booking/ ────────────────────────────────────────────────
 * E' il canale piu' ricco dell'azienda e il peggio misurato. Il giro:
 * il cliente parla con l'ufficio, si concorda un tour privato e un
 * prezzo, l'ufficio gli manda il link, lui paga con la carta dentro un
 * modulo FluentForms su WordPress. Comprano quasi tutti, e sono privati:
 * centinaia o migliaia di euro l'uno.
 *
 * Quella pagina RESTA su WordPress -- decisione della proprieta' del
 * 01/09/2026, insieme a Fotaflo. Quindi non e' una soluzione
 * provvisoria in attesa di un trasloco: e' come funzionera'.
 *
 * ── PERCHE' NON BASTAVANO I TAG ─────────────────────────────────────
 * Fino a oggi l'unico modo di sapere che qualcuno aveva comprato era
 * origliare il browser: un pezzo di codice dentro GTM che aspetta di
 * vedere comparire il messaggio di conferma. Tre difetti:
 *   - il browser puo' bloccare tutto, e succede a un terzo delle volte;
 *   - i nomi delle classi e degli eventi cambiano con gli aggiornamenti
 *     del plugin, e il giorno che cambiano non se ne accorge nessuno;
 *   - l'importo si legge da un campo in pagina, non dall'incasso vero.
 *
 * Qui invece e' WORDPRESS a chiamare noi, appena la prenotazione e'
 * registrata. Nessun browser di mezzo, nessun nome da inseguire,
 * l'importo e' quello scritto nella riga.
 *
 * ── COSA MANDA, E DOVE ──────────────────────────────────────────────
 * Le stesse tre destinazioni del lavoro notturno di Regiondo, con la
 * stessa forma e lo stesso registro anti-doppione. L'unica differenza
 * e' che li' si legge Regiondo una volta a notte, qui e' WordPress che
 * bussa nel momento esatto.
 *
 * ── LA PORTA E' CHIUSA A CHIAVE ─────────────────────────────────────
 * Chiunque conosca l'indirizzo potrebbe inventarsi delle vendite e
 * sporcare le campagne. Serve `BOOKING_SEGRETO`, confrontato senza
 * scorciatoie sui tempi. Senza chiave giusta si risponde 404: a chi
 * bussa senza, questa rotta non deve nemmeno risultare esistente.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** L'azione di Google Ads "Prenotazione da /booking/". */
const AZIONE_ADS = '7739422319';

function uguale(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function autorizzata(req: NextRequest): boolean {
  const atteso = process.env.BOOKING_SEGRETO;
  if (!atteso) return false;
  const intestazione = req.headers.get('x-chiave') ?? '';
  return intestazione !== '' && uguale(intestazione, atteso);
}

type Corpo = {
  /** identificativo della riga su WordPress: fa da numero d'ordine */
  ordine?: string | number;
  /** quanto e' stato incassato davvero, in euro. 0 o assente se la carta
   *  resta solo a garanzia e si paga in contanti il giorno del servizio */
  valore?: string | number;
  email?: string;
  telefono?: string;
  nome?: string;
  cognome?: string;
  servizio?: string;
  persone?: string | number;
  /** ISO 8601. Se manca si usa adesso: la chiamata arriva nel momento
   *  stesso della prenotazione, quindi lo scarto e' di secondi. */
  quando?: string;

  /* Con `true` si usano gli indirizzi di convalida delle tre
     piattaforme: rispondono se il pacchetto va bene e NON registrano
     niente. Serve a collaudare senza inventare vendite. */
  prova?: boolean;
};

function numero(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export async function POST(req: NextRequest) {
  if (!autorizzata(req)) {
    return NextResponse.json({ errore: 'non trovato' }, { status: 404 });
  }

  let c: Corpo;
  try {
    c = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ ok: false, errore: 'corpo non leggibile' }, { status: 400 });
  }

  const ordine = String(c.ordine ?? '').trim();
  if (!ordine) {
    return NextResponse.json({ ok: false, errore: 'manca `ordine`' }, { status: 400 });
  }

  /* Le email mascherate delle agenzie e quelle interne non servono a
     nessuno: Google non le abbina e sporcano il rapporto. */
  const scarto = c.email ? emailDaScartare(c.email) : null;
  /* 🔴 QUI CI VANNO LE IMPRONTE, NON GLI INDIRIZZI.
     `emailPerGoogle` e compagne NORMALIZZANO soltanto -- minuscolo,
     niente spazi, i punti tolti su Gmail. La cifratura e' un secondo
     passaggio, `impronta()`, e saltarlo non da' nessun errore
     leggibile: Google risponde "The HEX encoded value is malformed"
     e rifiuta tutto il lotto. Costato mezz'ora il 01/09/2026. */
  const perGoogle = scarto ? null : emailPerGoogle(c.email);
  const perMeta = scarto ? null : emailPerMeta(c.email);
  const telG = telefonoPerGoogle(c.telefono);
  const telM = telefonoPerMeta(c.telefono);
  const nomeM = nomePerMeta(c.nome);
  const cognomeM = nomePerMeta(c.cognome);
  const emailGoogle = perGoogle ? impronta(perGoogle) : null;
  const telefonoGoogle = telG ? impronta(telG) : null;

  const quando = c.quando ? new Date(c.quando) : new Date();
  const riga: Conversione = {
    ordine,
    quando: Number.isNaN(quando.getTime()) ? new Date() : quando,
    valore: numero(c.valore),
    emailGoogle,
    emailMeta: perMeta ? impronta(perMeta) : null,
    telefonoGoogle,
    telefonoMeta: telM ? impronta(telM) : null,
    nomeMeta: nomeM ? impronta(nomeM) : null,
    cognomeMeta: cognomeM ? impronta(cognomeM) : null,
    gclid: null,
    fbclid: null,
    prodotto: (c.servizio ?? 'Prenotazione /booking/').slice(0, 120),
    persone: numero(c.persone) || 1,
    dominio: (c.email ?? '').split('@')[1] ?? '',
  };

  /* 🔴 IL REGISTRO PRIMA DI TUTTO.
     WordPress potrebbe richiamare la stessa prenotazione -- un
     aggiornamento della riga, un tentativo ripetuto dopo un errore di
     rete. Senza questo controllo la stessa vendita partirebbe due
     volte, ed e' esattamente il difetto che abbiamo passato mezza
     giornata a togliere altrove. */
  const fatte = await giaFatte([ordine]);
  const gia = (d: string) => fatte.insieme.has(`${d}:${ordine}`);

  const prova = c.prova === true;

  const [rg, rm, ra] = await Promise.allSettled([
    !gia('google_booking') && (emailGoogle || telefonoGoogle)
      ? caricaSuGoogle([riga], prova, AZIONE_ADS)
      : null,
    !gia('meta_booking') ? caricaSuMeta([riga], prova) : null,
    !gia('ga4_booking') ? caricaSuGa4([riga], prova, 1) : null,
  ]);

  const val = <T,>(r: PromiseSettledResult<T | null>): T | null =>
    r.status === 'fulfilled' ? r.value : null;
  const google = val(rg);
  const meta = val(rm);
  const ga4 = val(ra);

  /* In prova non si segna niente nel registro: altrimenti la riga
     risulterebbe gia' fatta e quella vera non partirebbe piu'. */
  const esiti: Esito[] = [];
  const segna = (d: Esito['destinatario'], ok: string[], no: string[]) => {
    for (const o of ok)
      esiti.push({ ordine: o, destinatario: d, esito: 'ok', valore: riga.valore,
                   creata_il: riga.quando.toISOString(), motivo: null });
    for (const o of no)
      esiti.push({ ordine: o, destinatario: d, esito: 'rifiutata', valore: riga.valore,
                   creata_il: riga.quando.toISOString(), motivo: 'respinta dal destinatario' });
  };
  if (!prova) {
    if (google) segna('google_booking', google.accettati, google.rifiutati);
    if (meta) segna('meta_booking', meta.accettati, meta.rifiutati);
    if (ga4) segna('ga4_booking', ga4.accettati, ga4.rifiutati);
  }
  const segnate = esiti.length ? await segnaEsiti(esiti) : { ok: true as const, errore: undefined };

  return NextResponse.json({
    ok: true,
    modo: prova ? 'prova - niente registrato' : 'reale',
    ordine,
    valore: riga.valore,
    /* Zero non e' un errore: su questa pagina alcune prenotazioni
       tengono solo la carta a garanzia e si pagano in contanti. */
    valore_dichiarato: riga.valore > 0 ? 'incassato' : 'nessun incasso, carta a garanzia',
    /* I `motivi` ci sono apposta: un rifiuto senza il perche' costringe
       a rifare a mano la stessa chiamata per scoprirlo, e succede
       sempre di notte. */
    google: google && { accettate: google.accettati.length, rifiutate: google.rifiutati.length, motivi: google.motivi, errore: google.errore },
    meta: meta && { accettate: meta.accettati.length, rifiutate: meta.rifiutati.length, motivi: meta.motivi, errore: meta.errore },
    analytics: ga4 && { accettate: ga4.accettati.length, rifiutate: ga4.rifiutati.length, motivi: ga4.motivi, errore: ga4.errore },
    identita: {
      email_utilizzabile: !!emailGoogle,
      telefono_utilizzabile: !!telefonoGoogle,
      email_scartata_perche: scarto,
    },
    gia_fatte: {
      google: gia('google_booking'),
      meta: gia('meta_booking'),
      analytics: gia('ga4_booking'),
    },
    registro: segnate.ok ? 'ok' : `FALLITO: ${segnate.errore}`,
  });
}

/** Un GET serve solo a sapere se la rotta e' viva, e non dice niente
 *  a chi non ha la chiave. */
export async function GET(req: NextRequest) {
  if (!autorizzata(req)) {
    return NextResponse.json({ errore: 'non trovato' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, pronta: true });
}
