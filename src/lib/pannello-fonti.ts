/* LE FONTI DEL PANNELLO: da dove arrivano i numeri.
 *
 * Sta in una libreria e non dentro la rotta perche' lo stesso lavoro lo
 * chiamano in due: il passaggio notturno (`/api/pannello/`) e il pulsante
 * "aggiorna adesso" dentro il pannello. Scriverlo due volte vuol dire
 * vederli divergere alla prima modifica.
 */
import crypto from 'crypto';
import { scrivi } from '@/lib/pannello';
import type { Cassa, Spesa, Imbuto, Prodotto, Campagna, Pubblico, Potenziale } from '@/lib/pannello';

const GIORNI = 30;

/* ── GOOGLE: un gettone solo per tutte le chiamate ─────────────────── */
async function gettoneGoogle(refresh: string): Promise<string | null> {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const segreto = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!id || !segreto || !refresh) return null;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id, client_secret: segreto,
      refresh_token: refresh, grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) return null;
  return ((await r.json()) as { access_token?: string }).access_token ?? null;
}

async function ads<T = unknown>(gettone: string, query: string): Promise<T[]> {
  const cid = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '');
  const mcc = (process.env.GOOGLE_ADS_MCC_ID ?? '').replace(/-/g, '');
  const r = await fetch(
    `https://googleads.googleapis.com/v23/customers/${cid}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + gettone,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
        'login-customer-id': mcc,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!r.ok) return [];
  return (((await r.json()) as { results?: T[] }).results ?? []);
}

/* ── REGIONDO: la firma e' HMAC sul tempo + id + query ─────────────── */
async function regiondo<T = unknown>(azione: string, par: Record<string, string | number>) {
  const id = process.env.REGIONDO_API_KEY;
  const segreto = process.env.REGIONDO_API_SECRET;
  if (!id || !segreto) return null;
  const qs = Object.entries(par)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`)
    .join('&');
  const tempo = Math.floor(Date.now() / 1000).toString();
  const hash = crypto.createHmac('sha256', segreto).update(tempo + id + qs).digest('hex');
  const r = await fetch(`https://api.regiondo.com/v1/${azione}?${qs}`, {
    headers: { 'X-API-ID': id, 'X-API-TIME': tempo, 'X-API-HASH': hash, 'Accept-Language': 'en_US' },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  return (await r.json()) as T;
}

type RigaRegiondo = {
  product_name?: string;
  total_amount?: string | number;
  distribution_channel_partner?: string | null;
  order_number?: string;
};

/* ── 1 e 2. LA CASSA E I PRODOTTI, dalla stessa lettura ────────────── */
async function cassaEProdotti() {
  const dal = new Date(Date.now() - GIORNI * 86400_000).toISOString().slice(0, 10);
  const tutte: RigaRegiondo[] = [];
  for (let giro = 0; giro < 40; giro++) {
    const d = await regiondo<{ data?: RigaRegiondo[] } | RigaRegiondo[]>('supplier/bookings', {
      created_from: dal, limit: 250, offset: giro * 250,
    });
    const lista = Array.isArray(d) ? d : (d?.data ?? []);
    if (!lista.length) break;
    tutte.push(...lista);
    if (lista.length < 250) break;
  }
  if (!tutte.length) return null;

  const canale = (b: RigaRegiondo) => String(b.distribution_channel_partner ?? 'Diretto');
  const val = (b: RigaRegiondo) => Number(b.total_amount ?? 0) || 0;
  const diretto = (b: RigaRegiondo) => canale(b) === 'Own Ticketshop' || canale(b) === 'POS';

  const perCanale = new Map<string, { ordini: number; incasso: number }>();
  const perProdotto = new Map<string, Prodotto>();
  for (const b of tutte) {
    const c = canale(b);
    const rc = perCanale.get(c) ?? { ordini: 0, incasso: 0 };
    rc.ordini += 1; rc.incasso += val(b);
    perCanale.set(c, rc);

    const n = (b.product_name ?? '?').slice(0, 60);
    const rp = perProdotto.get(n) ?? { nome: n, ordini: 0, incasso: 0, diretti: 0, incassoDiretto: 0 };
    rp.ordini += 1; rp.incasso += val(b);
    if (diretto(b)) { rp.diretti += 1; rp.incassoDiretto += val(b); }
    perProdotto.set(n, rp);
  }

  const dir = tutte.filter(diretto);
  const cassa: Cassa = {
    giorni: GIORNI,
    ordini: tutte.length,
    incasso: Math.round(tutte.reduce((s, b) => s + val(b), 0)),
    diretti: { ordini: dir.length, incasso: Math.round(dir.reduce((s, b) => s + val(b), 0)) },
    perCanale: [...perCanale.entries()]
      .map(([canale, v]) => ({ canale, ordini: v.ordini, incasso: Math.round(v.incasso) }))
      .sort((a, b) => b.incasso - a.incasso),
  };
  const prodotti: Prodotto[] = [...perProdotto.values()]
    .map((p) => ({ ...p, incasso: Math.round(p.incasso), incassoDiretto: Math.round(p.incassoDiretto) }))
    .sort((a, b) => b.incasso - a.incasso)
    .slice(0, 12);
  return { cassa, prodotti };
}

/* ── 3. LA SPESA E LE CAMPAGNE ─────────────────────────────────────── */
type RigaCamp = {
  campaign: { name: string; status: string };
  metrics?: { costMicros?: string; clicks?: string; conversions?: number };
};

async function spesaECampagne(gettone: string) {
  const righe = await ads<RigaCamp>(gettone, `
    SELECT campaign.name, campaign.status, metrics.cost_micros,
           metrics.clicks, metrics.conversions
    FROM campaign WHERE segments.date DURING LAST_30_DAYS AND metrics.impressions > 0
    ORDER BY metrics.cost_micros DESC`);
  const campagne: Campagna[] = righe.map((r) => {
    const spesa = Number(r.metrics?.costMicros ?? 0) / 1e6;
    const clic = Number(r.metrics?.clicks ?? 0);
    return {
      nome: r.campaign.name, stato: r.campaign.status,
      spesa: Math.round(spesa), clic,
      cpc: clic ? Number((spesa / clic).toFixed(2)) : 0,
      conversioni: Number(r.metrics?.conversions ?? 0),
    };
  });

  /* Meta: la spesa sta nelle "insights" dell'account, non nelle campagne
     una per una — un giro solo invece di dieci. */
  let meta = 0;
  const tokenMeta = process.env.META_SYSTEM_TOKEN;
  if (tokenMeta) {
    const r = await fetch(
      'https://graph.facebook.com/v21.0/act_150584761383417/insights?' +
        new URLSearchParams({ fields: 'spend', date_preset: 'last_30d', access_token: tokenMeta })
    );
    if (r.ok) {
      const j = (await r.json()) as { data?: { spend?: string }[] };
      meta = Math.round(Number(j.data?.[0]?.spend ?? 0));
    }
  }

  const spesa: Spesa = {
    giorni: GIORNI,
    google: campagne.reduce((s, c) => s + c.spesa, 0),
    meta,
    clic: campagne.reduce((s, c) => s + c.clic, 0),
  };
  return { spesa, campagne: campagne.filter((c) => c.spesa > 0 || c.clic > 0).slice(0, 12) };
}

/* ── 4. L'IMBUTO, da Analytics ─────────────────────────────────────── */
const PASSI = ['view_item', 'view_booking_form', 'add_to_cart', 'begin_checkout', 'purchase'];

async function imbuto(): Promise<Imbuto | null> {
  const gettone = await gettoneGoogle(process.env.GA4_OAUTH_REFRESH_TOKEN ?? '');
  const prop = process.env.GA4_PROPERTY_ID;
  if (!gettone || !prop) return null;
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + gettone, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${GIORNI}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      limit: 80,
    }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
  const conte = new Map<string, number>();
  for (const riga of j.rows ?? []) {
    conte.set(riga.dimensionValues[0].value, Number(riga.metricValues[0].value));
  }
  return { giorni: GIORNI, passi: PASSI.map((nome) => ({ nome, quanti: conte.get(nome) ?? 0 })) };
}

/* ── 5. I PUBBLICI, di qua e di la' ────────────────────────────────── */
type RigaLista = { userList: { name?: string; sizeForSearch?: string; id?: string } };
type RigaCrit = { campaign: { id: string }; campaignCriterion: { userList?: { userList?: string } } };

async function pubblici(gettone: string): Promise<Pubblico[]> {
  const fuori: Pubblico[] = [];

  const liste = await ads<RigaLista>(gettone,
    `SELECT user_list.id, user_list.name, user_list.size_for_search
     FROM user_list WHERE user_list.membership_status = 'OPEN'`);
  const usati = await ads<RigaCrit>(gettone,
    `SELECT campaign.id, campaign_criterion.user_list.user_list
     FROM campaign_criterion WHERE campaign_criterion.type = 'USER_LIST'
     AND campaign.status = 'ENABLED'`);
  const quante = new Map<string, number>();
  for (const u of usati) {
    const res = u.campaignCriterion.userList?.userList ?? '';
    quante.set(res, (quante.get(res) ?? 0) + 1);
  }
  const cid = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '');
  for (const l of liste) {
    const nome = l.userList.name ?? '';
    if (!nome.startsWith('PR - ')) continue;
    fuori.push({
      dove: 'google', nome,
      quanti: Number(l.userList.sizeForSearch ?? 0) || null,
      usatoDa: quante.get(`customers/${cid}/userLists/${l.userList.id}`) ?? 0,
    });
  }

  const tokenMeta = process.env.META_SYSTEM_TOKEN;
  if (tokenMeta) {
    const r = await fetch(
      'https://graph.facebook.com/v21.0/act_150584761383417/customaudiences?' +
        new URLSearchParams({
          fields: 'name,approximate_count_lower_bound', limit: '60', access_token: tokenMeta,
        })
    );
    if (r.ok) {
      const j = (await r.json()) as { data?: { name?: string; approximate_count_lower_bound?: number }[] };
      for (const a of j.data ?? []) {
        if (!(a.name ?? '').startsWith('PR - ')) continue;
        fuori.push({ dove: 'meta', nome: a.name ?? '', quanti: a.approximate_count_lower_bound ?? null, usatoDa: 0 });
      }
    }
  }
  return fuori;
}

/* ── 6. IL POTENZIALE: tante ricerche, poca concorrenza, non comprata ─ */
type Idea = {
  text: string;
  keywordIdeaMetrics?: { avgMonthlySearches?: string; competition?: string; highTopOfPageBidMicros?: string };
};

async function potenziale(gettone: string): Promise<Potenziale[]> {
  const cid = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '');
  const mcc = (process.env.GOOGLE_ADS_MCC_ID ?? '').replace(/-/g, '');

  const nostre = new Set(
    (await ads<{ adGroupCriterion: { keyword: { text: string } } }>(gettone,
      `SELECT ad_group_criterion.keyword.text FROM ad_group_criterion
       WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status = 'ENABLED'`)
    ).map((r) => r.adGroupCriterion.keyword.text.toLowerCase())
  );

  const r = await fetch(`https://googleads.googleapis.com/v23/customers/${cid}:generateKeywordIdeas`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + gettone,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
      'login-customer-id': mcc,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language: 'languageConstants/1000',
      geoTargetConstants: ['geoTargetConstants/2840'],
      keywordPlanNetwork: 'GOOGLE_SEARCH',
      keywordSeed: {
        keywords: ['chianti wine tour', 'tuscany wine tasting', 'siena san gimignano day trip',
                   'tuscany olive oil tasting', 'private tour florence from livorno'],
      },
    }),
  });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: Idea[] };
  return (j.results ?? [])
    .map((x) => ({
      parola: x.text,
      ricerche: Number(x.keywordIdeaMetrics?.avgMonthlySearches ?? 0),
      concorrenza: x.keywordIdeaMetrics?.competition ?? '-',
      cpc: Number(x.keywordIdeaMetrics?.highTopOfPageBidMicros ?? 0) / 1e6,
      giaComprata: nostre.has(x.text.toLowerCase()),
    }))
    /* Il "potenziale" e' questo: cercata parecchio, non ancora comprata,
       e senza una guerra di offerte sopra. */
    .filter((x) => x.ricerche >= 30 && !x.giaComprata && x.concorrenza !== 'HIGH')
    .sort((a, b) => b.ricerche - a.ricerche)
    .slice(0, 20);
}


/* ── L'ORCHESTRA: aggiorna tutto quello che risponde ────────────────
   Ogni sezione va per conto suo. Se Meta e' giu', le altre si
   aggiornano lo stesso e di Meta resta la fotografia di ieri con la sua
   data: un pannello meta' vecchio serve, uno vuoto no. */
export async function aggiornaTutto(): Promise<Record<string, string>> {
  const esiti: Record<string, string> = {};
  const gettoneAds = await gettoneGoogle(process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? '');

  const passo = async (nome: string, f: () => Promise<unknown>) => {
    try {
      const d = await f();
      if (d === null || (Array.isArray(d) && !d.length)) {
        esiti[nome] = 'niente da scrivere (resta quella di prima)';
        return;
      }
      const r = await scrivi(nome as never, d);
      esiti[nome] = r.ok ? 'aggiornata' : 'errore: ' + r.errore;
    } catch (e) {
      esiti[nome] = 'saltata: ' + (e instanceof Error ? e.message : String(e));
    }
  };

  const cp = await cassaEProdotti().catch(() => null);
  if (cp) {
    await passo('cassa', async () => cp.cassa);
    await passo('prodotti', async () => cp.prodotti);
  } else {
    esiti.cassa = esiti.prodotti = 'Regiondo non ha risposto';
  }

  if (gettoneAds) {
    const sc = await spesaECampagne(gettoneAds).catch(() => null);
    if (sc) {
      await passo('spesa', async () => sc.spesa);
      await passo('campagne', async () => sc.campagne);
    }
    await passo('pubblici', () => pubblici(gettoneAds));
    await passo('potenziale', () => potenziale(gettoneAds));
  } else {
    esiti.google = 'gettone non ottenuto';
  }

  await passo('imbuto', imbuto);
  return esiti;
}

/* ── IL PIANIFICATORE, A MANO ────────────────────────────────────────
   Le stesse idee che alimentano il riquadro "potenziale", ma su parole
   scelte al momento. Serve quando si sta pensando a una campagna nuova e
   si vuole sapere se quello che si ha in mente lo cerca qualcuno: quasi
   sempre la risposta e' no, ed e' meglio scoprirlo prima di scrivere gli
   annunci. */
export async function cercaParole(semi: string[], paese = '2840'): Promise<Potenziale[]> {
  const puliti = semi.map((s) => s.trim()).filter(Boolean).slice(0, 10);
  if (!puliti.length) return [];
  const gettone = await gettoneGoogle(process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? '');
  if (!gettone) return [];
  const cid = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '');
  const mcc = (process.env.GOOGLE_ADS_MCC_ID ?? '').replace(/-/g, '');

  const nostre = new Set(
    (await ads<{ adGroupCriterion: { keyword: { text: string } } }>(gettone,
      `SELECT ad_group_criterion.keyword.text FROM ad_group_criterion
       WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status = 'ENABLED'`)
    ).map((r) => r.adGroupCriterion.keyword.text.toLowerCase())
  );

  const r = await fetch(`https://googleads.googleapis.com/v23/customers/${cid}:generateKeywordIdeas`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + gettone,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
      'login-customer-id': mcc,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language: 'languageConstants/1000',
      geoTargetConstants: [`geoTargetConstants/${paese}`],
      keywordPlanNetwork: 'GOOGLE_SEARCH',
      keywordSeed: { keywords: puliti },
    }),
  });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: Idea[] };
  return (j.results ?? [])
    .map((x) => ({
      parola: x.text,
      ricerche: Number(x.keywordIdeaMetrics?.avgMonthlySearches ?? 0),
      concorrenza: x.keywordIdeaMetrics?.competition ?? '-',
      cpc: Number(x.keywordIdeaMetrics?.highTopOfPageBidMicros ?? 0) / 1e6,
      giaComprata: nostre.has(x.text.toLowerCase()),
    }))
    /* Qui NON si filtra: chi interroga a mano vuole vedere anche gli zeri
       -- e' proprio quello che gli dice che l'idea non regge. */
    .sort((a, b) => b.ricerche - a.ricerche)
    .slice(0, 40);
}
