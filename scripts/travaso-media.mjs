/* TRAVASO DEI MEDIA: da prestigerent.com a Supabase Storage.
 *
 * IL PROBLEMA. Ogni foto del sito e' scritta per esteso su
 * https://prestigerent.com/wp-content/uploads/... cioe' sul WordPress che
 * questo sito sostituisce. Il giorno del passaggio quel dominio diventa
 * questo sito, che /wp-content/ non ce l'ha. L'inoltro d'emergenza in
 * next.config.ts tiene in piedi le foto, ma tenendo in vita il server che
 * si voleva spegnere: e' una toppa, non la soluzione.
 *
 * MISURATO IL 27/08/2026, non stimato: 197 file distinti, 97,9 MB, tutti
 * e 197 rispondono 200.
 *   - 174 foto sotto /wp-content/ (29,0 MB) -- 173 dentro tour_content,
 *     una sola (la foto grande della home) solo dentro page.tsx
 *   - 5 file sotto /lp/img/ (0,2 MB) -- logo, i due premi, la foto della
 *     squadra, i minibus
 *   - 18 file sotto /lp/video/ (68,7 MB) -- nove testimonianze mp4 piu' i
 *     nove poster jpg
 *
 * COME LANCIARLO
 *   node scripts/travaso-media.mjs --prova              # non scrive niente
 *   node scripts/travaso-media.mjs --prova --extra      # anche logo/premi/video
 *   node scripts/travaso-media.mjs --tour=<slug>        # un tour solo, per davvero
 *   node scripts/travaso-media.mjs --limite=5           # i primi 5 tour
 *   node scripts/travaso-media.mjs                      # tutti i tour
 *   node scripts/travaso-media.mjs --extra              # solo logo/premi/video
 *
 * LE QUATTRO PROPRIETA' CHE DEVE AVERE
 *
 * Ripetibile. Un file gia' su Storage non si riscarica: prima si guarda il
 * registro `media_travaso`, e se il registro fosse vuoto si guarda Storage
 * stesso con una HEAD. Rilanciarlo dieci volte costa dieci letture, non
 * dieci volte 98 MB. La riscrittura di `blocks` e' una sostituzione di
 * testo da URL vecchia a URL nuova: al secondo giro le URL vecchie non ci
 * sono piu' e non succede niente.
 *
 * Reversibile. Prima di toccare `tour_content`, la riga intera finisce in
 * `media_url_storico`, e ci finisce UNA VOLTA SOLA (chiave primaria su
 * tour_id+locale, inserimento che ignora i doppioni): la fotografia che
 * resta e' sempre quella davvero originale. Un secondo scatto salverebbe i
 * blocks gia' riscritti e il ritorno indietro riporterebbe a meta' strada.
 * Per tornare indietro basta la query scritta nel commento della tabella.
 *
 * Verificabile. Alla fine stampa file caricati, byte, righe aggiornate e
 * l'elenco per nome di quelle fallite. E salva un registro riga per riga
 * in scripts/travaso-media.log.jsonl.
 *
 * Prudente. `--prova` non scrive un byte da nessuna parte: scarica solo le
 * intestazioni, mostra la mappa vecchio->nuovo e i conti. `--tour=` e
 * `--limite=` permettono di provare su pochi contenuti prima che su 87.
 *
 * LA CHIAVE. Storage e le due tabelle nuove hanno RLS accesa e nessuna
 * policy di scrittura: si scrive solo con la chiave di servizio, che NON
 * sta in .env.local apposta (finirebbe a fianco di roba che il browser
 * legge). Va messa in SUPABASE_SERVICE_ROLE_KEY prima di lanciare:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/travaso-media.mjs --prova
 *
 * La chiave pubblicabile basta solo per `--prova`, che legge e basta: senza
 * quella di servizio lo script si rifiuta di scrivere, e si rifiuta apposta
 * (il perche' sta nel commento della funzione `ambiente`).
 *
 * COME SI VERIFICA CHE UNA FOTO SIA ARRIVATA
 * Con `curl` e il GET, non con `curl -sI`. Su HEAD Supabase Storage risponde
 * "Cache-Control: no-cache" anche quando l'oggetto e' salvato con un anno di
 * cache: e' una stranezza sua, misurata il 27/08/2026, e fa sembrare rotta
 * una cosa che funziona.
 *
 *   curl -s -o /dev/null -D - "<url pubblica>" | grep -i cache-control
 */

import fs from 'node:fs';
import path from 'node:path';

/* ---------------------------------------------------------------- */
/* impostazioni                                                     */
/* ---------------------------------------------------------------- */

const RADICE = path.resolve(import.meta.dirname, '..');
const SECCHIO = 'media';

/* Quanti file in volo insieme. Tre e' basso di proposito: dall'altra parte
 * c'e' il vecchio hosting condiviso di WordPress, che con dieci richieste
 * insieme comincia a rispondere 503. Meglio metterci qualche minuto in piu'
 * che rileggere il rapporto e ritrovare venti falliti. */
const IN_PARALLELO = 3;

/* Il vecchio hosting ogni tanto perde un colpo: si riprova tre volte con
 * attese crescenti prima di dichiarare fallito un file. */
const TENTATIVI = 3;

/* I media che NON stanno in tour_content: vivono scritti dentro i
 * componenti. Lo script li porta su Storage lo stesso -- cosi' chi
 * modifichera' page.tsx, Header.tsx, Premi.tsx, ContactSection.tsx e
 * VideoTestimonianze.tsx trova gia' i file al loro posto -- ma NON tocca il
 * codice: quei file sono in mano ad altri. Le sostituzioni da fare a mano
 * sono stampate alla fine di --extra. */
const EXTRA = [
  /* la foto grande della home: e' l'unica /wp-content/ che non compare in
   * tour_content, perche' e' del 2025/07 e nessun tour la usa */
  'https://prestigerent.com/wp-content/uploads/2025/07/Tuscany_wine_experience-scaled.jpg',
  /* logo (Header.tsx e le icone di layout.tsx), premi (Premi.tsx),
   * squadra (ContactSection.tsx), minibus (page.tsx) */
  'https://prestigerent.com/lp/img/logo-prestige.png',
  'https://prestigerent.com/lp/img/awards-viator.webp',
  'https://prestigerent.com/lp/img/award-tripadvisor.webp',
  'https://prestigerent.com/lp/img/team-prestige-rent.webp',
  'https://prestigerent.com/lp/img/Piazzale-Montelungo-minibuses-2022.webp',
  /* le nove testimonianze piu' i nove poster (VideoTestimonianze.tsx) */
  ...[
    'testimonial-t1', 'testimonial-t2', 'testimonial-t3', 'testimonial-t4',
    'testimonial-sg1', 'testimonial-sg2', 'testimonial-sg3', 'testimonial-sg4',
    'testimonial-proposal',
  ].flatMap((n) => [
    `https://prestigerent.com/lp/video/${n}.mp4`,
    `https://prestigerent.com/lp/video/${n}.jpg`,
  ]),
];

/* ---------------------------------------------------------------- */
/* argomenti                                                        */
/* ---------------------------------------------------------------- */

const arg = (nome) => {
  const t = process.argv.find((a) => a === `--${nome}` || a.startsWith(`--${nome}=`));
  if (!t) return null;
  return t.includes('=') ? t.split('=').slice(1).join('=') : true;
};

const PROVA = !!arg('prova');
const SOLO_EXTRA = !!arg('extra');
const TOUR = typeof arg('tour') === 'string' ? arg('tour') : null;
const LIMITE = arg('limite') ? Number(arg('limite')) : null;

/* --riscrivi: ricarica i file gia' su Storage, sovrascrivendoli.
 *
 * Serve quando cambia qualcosa nel MODO di caricare e non nei file: e'
 * successo davvero con il cache-control sbagliato del primo giro. Fuori da
 * quel caso non va usato -- rifa' 100 MB di traffico per niente.
 *
 * L'elenco lo prende dal REGISTRO, non dai contenuti: dopo il primo giro
 * dentro tour_content le URL vecchie non ci sono piu', e cercarle li' non
 * troverebbe niente. Non tocca i contenuti, che sono gia' a posto. */
const RISCRIVI = !!arg('riscrivi');

/* ---------------------------------------------------------------- */
/* ambiente                                                         */
/* ---------------------------------------------------------------- */

/* .env.local e' gitignorato; le variabili gia' nell'ambiente vincono, cosi'
 * la chiave di servizio si passa davanti al comando senza scriverla su
 * disco da nessuna parte. */
function ambiente() {
  const f = path.join(RADICE, '.env.local');
  const testo = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const leggi = (k) =>
    process.env[k] ?? (testo.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();

  const url = leggi('NEXT_PUBLIC_SUPABASE_URL');
  const servizio = leggi('SUPABASE_SERVICE_ROLE_KEY');
  const pubblica = leggi('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (!url) morte('manca NEXT_PUBLIC_SUPABASE_URL');
  const chiave = servizio || pubblica;
  if (!chiave) morte('manca sia SUPABASE_SERVICE_ROLE_KEY sia NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  /* SENZA CHIAVE DI SERVIZIO NON SI SCRIVE, E NON E' UN AVVISO: E' UN NO.
   *
   * Non basta che i caricamenti fallirebbero con 403 -- quello si vedrebbe.
   * Il guaio e' peggio e silenzioso: `media_travaso` ha RLS accesa e nessuna
   * policy di lettura, quindi con la chiave pubblicabile la SELECT sul
   * registro non da' errore, da' ZERO RIGHE. Lo script crederebbe che non
   * sia mai stato travasato niente e riscaricherebbe 100 MB da capo a ogni
   * giro, buttando via la ripetibilita' senza dire una parola.
   *
   * Verificato il 27/08/2026: e' successo davvero durante la prova. */
  if (!servizio && !PROVA) {
    morte(
      'manca SUPABASE_SERVICE_ROLE_KEY.\n\n' +
      '  Con la sola chiave pubblicabile il registro dei file gia\' travasati si\n' +
      '  legge VUOTO invece di dare errore (RLS accesa, nessuna policy di\n' +
      '  lettura): lo script ricaricherebbe tutto da capo credendo di partire\n' +
      '  da zero. Meglio fermarsi.\n\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=sb_secret_... node scripts/travaso-media.mjs ...\n\n' +
      '  Per guardare senza scrivere basta --prova, che legge e basta.'
    );
  }
  return { url: url.replace(/\/+$/, ''), chiave, conServizio: !!servizio };
}

const morte = (m) => { console.error('\nFERMO: ' + m + '\n'); process.exit(1); };

const ENV = ambiente();
const INTESTAZIONI = { apikey: ENV.chiave, Authorization: `Bearer ${ENV.chiave}` };

/* dove finisce un file, una volta su Storage */
const pubblica = (chiave) => `${ENV.url}/storage/v1/object/public/${SECCHIO}/${chiave}`;

/* ---------------------------------------------------------------- */
/* la mappa dei nomi                                                */
/* ---------------------------------------------------------------- */

/* Il percorso di WordPress si conserva tale e quale sotto `wp/`, e quello
 * delle landing sotto `lp/`. Non e' pigrizia: e' l'unica scelta che rende
 * la corrispondenza vecchio<->nuovo calcolabile a mente e reversibile senza
 * consultare una tabella. WordPress garantisce gia' che dentro una cartella
 * anno/mese due file non si chiamino uguale, quindi non ci sono scontri di
 * nome da risolvere. Rinominare in `slug-del-tour/1.jpg` sarebbe piu' bello
 * da leggere ma la stessa foto e' usata da piu' tour: si finirebbe con
 * copie doppie o con una mappa da tenere aggiornata a mano. */
function chiaveStorage(url) {
  let p;
  try { p = new URL(url).pathname; } catch { return null; }
  if (p.startsWith('/wp-content/uploads/')) return 'wp/' + p.slice('/wp-content/uploads/'.length);
  if (p.startsWith('/lp/')) return 'lp/' + p.slice('/lp/'.length);
  return null;
}

/* Le due famiglie di indirizzi da cercare dentro il testo dei contenuti. */
const RX_MEDIA = /https?:\/\/(?:www\.)?prestigerent\.com\/(?:wp-content\/uploads|lp)\/[^"'\\ )>\]]+/g;

const TIPI = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  avif: 'image/avif', gif: 'image/gif', mp4: 'video/mp4',
};
const tipoDa = (u) => TIPI[(u.split('.').pop() || '').toLowerCase()] || null;

/* ---------------------------------------------------------------- */
/* piccoli aiuti di rete                                            */
/* ---------------------------------------------------------------- */

const attesa = (ms) => new Promise((s) => setTimeout(s, ms));

async function conRiprova(cosa, etichetta) {
  let ultimo;
  for (let t = 1; t <= TENTATIVI; t++) {
    try {
      const r = await cosa();
      if (r.ok) return r;
      ultimo = `HTTP ${r.status}`;
      /* 4xx non e' un colpo perso: e' un no. Non si insiste. */
      if (r.status >= 400 && r.status < 500 && r.status !== 429) break;
    } catch (e) { ultimo = e.message; }
    if (t < TENTATIVI) await attesa(600 * t);
  }
  throw new Error(`${etichetta}: ${ultimo}`);
}

/* lavora su una coda con al massimo N in volo insieme */
async function aBranchi(elenco, n, lavoro) {
  const coda = [...elenco];
  const operai = Array.from({ length: Math.min(n, coda.length) }, async () => {
    while (coda.length) await lavoro(coda.shift());
  });
  await Promise.all(operai);
}

/* ---------------------------------------------------------------- */
/* lettura e scrittura su Supabase                                  */
/* ---------------------------------------------------------------- */

async function rest(percorso, opzioni = {}) {
  const r = await fetch(`${ENV.url}/rest/v1/${percorso}`, {
    ...opzioni,
    headers: { ...INTESTAZIONI, 'Content-Type': 'application/json', ...(opzioni.headers || {}) },
  });
  if (!r.ok) {
    const e = new Error(`REST ${percorso.split('?')[0]} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
    e.stato = r.status;
    throw e;
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

/* Inserisce ignorando i doppioni.
 *
 * NON si usa "Prefer: resolution=ignore-duplicates": PostgREST lo pianifica
 * come un upsert e chiede anche il permesso di UPDATE, che qui nessuno ha e
 * nessuno deve avere. Meglio inserire e basta: se la chiave c'e' gia',
 * Postgres risponde 409/23505 e quella e' esattamente la risposta giusta --
 * il file era gia' stato travasato, non c'e' niente da fare. Cosi' la
 * ripetibilita' poggia sul vincolo del database, non su un'intestazione. */
async function inserisciSeNuovo(tabella, riga) {
  try {
    await rest(tabella, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(riga),
    });
    return true;
  } catch (e) {
    if (e.stato === 409) return false;   // c'era gia'
    throw e;
  }
}

async function leggiContenuti() {
  const tours = await rest('tours?select=id,slug&order=slug');
  const perId = new Map(tours.map((t) => [t.id, t.slug]));
  let righe = await rest('tour_content?select=tour_id,locale,blocks');
  righe = righe
    .map((r) => ({ ...r, slug: perId.get(r.tour_id) || '(senza slug)' }))
    .sort((a, b) => (a.slug < b.slug ? -1 : 1));
  if (TOUR) righe = righe.filter((r) => r.slug === TOUR);
  if (LIMITE) righe = righe.slice(0, LIMITE);
  return righe;
}

async function registroEsistente() {
  const righe = await rest('media_travaso?select=url_vecchia,chiave_storage,byte');
  return new Map((righe || []).map((r) => [r.url_vecchia, r]));
}

/* ---------------------------------------------------------------- */
/* il travaso di un file                                            */
/* ---------------------------------------------------------------- */

async function travasaFile(url, giaFatti, esito) {
  const chiave = chiaveStorage(url);
  if (!chiave) { esito.falliti.push({ url, perche: 'percorso non riconosciuto' }); return; }

  const tipo = tipoDa(url);
  if (!tipo) { esito.falliti.push({ url, perche: 'estensione non ammessa dal secchio' }); return; }

  /* 1. gia' nel registro: non si tocca niente */
  if (giaFatti.has(url) && !RISCRIVI) { esito.saltati.push(url); return; }

  /* 2. registro vuoto ma file gia' su Storage (registro ripulito, travaso
   *    interrotto a meta'): si recupera con una HEAD invece di riscaricare */
  if (!PROVA && !RISCRIVI) {
    try {
      const r = await fetch(pubblica(chiave), { method: 'HEAD' });
      if (r.ok) {
        const byte = Number(r.headers.get('content-length') || 0);
        await annota(url, chiave, byte, tipo);
        giaFatti.set(url, { chiave_storage: chiave, byte });
        esito.saltati.push(url);
        return;
      }
    } catch { /* Storage non risponde: si prova comunque a caricare */ }
  }

  /* 3. in prova ci si ferma qui: si guarda solo che l'originale esista */
  if (PROVA) {
    try {
      const r = await conRiprova(() => fetch(url, { method: 'HEAD' }), 'HEAD ' + url);
      const byte = Number(r.headers.get('content-length') || 0);
      esito.daFare.push({ url, chiave, byte, tipo });
      esito.byte += byte;
    } catch (e) { esito.falliti.push({ url, perche: e.message }); }
    return;
  }

  /* 4. scarico dal vecchio server */
  let corpo;
  try {
    const r = await conRiprova(() => fetch(url), 'scarico ' + url);
    corpo = Buffer.from(await r.arrayBuffer());
  } catch (e) { esito.falliti.push({ url, perche: e.message }); return; }

  /* Un hosting che risponde 200 con una pagina di errore e' il modo classico
   * di ritrovarsi 40 file da 1 KB al posto delle foto. Se il peso non e'
   * credibile per un'immagine, il file non si carica. */
  if (corpo.length < 1024) {
    esito.falliti.push({ url, perche: `solo ${corpo.length} byte: non e' un'immagine` });
    return;
  }

  /* 5. carico su Storage. x-upsert: false -- se il file c'e' gia', Storage
   *    dice 409 e non si sovrascrive niente.
   *
   *    IL CACHE-CONTROL VA SCRITTO PER INTERO. Storage prende questa
   *    intestazione tale e quale e la ripete a ogni visitatore per sempre:
   *    scriverci "31536000" invece di "max-age=31536000" non e' un
   *    dettaglio, e' una direttiva che il browser non capisce e che Storage
   *    traduce in "no-cache". Verificato con curl: senza max-age= ogni
   *    singola apertura di pagina riscarica ogni singola foto.
   *
   *    Un anno si puo' chiedere senza paura perche' il nome del file non si
   *    riusa mai: se una foto cambia, cambia il nome. */
  try {
    await conRiprova(() => fetch(`${ENV.url}/storage/v1/object/${SECCHIO}/${chiave}`, {
      method: 'POST',
      headers: {
        ...INTESTAZIONI, 'Content-Type': tipo, 'x-upsert': RISCRIVI ? 'true' : 'false',
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body: corpo,
    }), 'carico ' + chiave);
  } catch (e) {
    /* 409 = c'era gia'. Non e' un fallimento, e' il caso ripetibile. */
    if (!/409/.test(e.message)) { esito.falliti.push({ url, perche: e.message }); return; }
  }

  await annota(url, chiave, corpo.length, tipo);
  giaFatti.set(url, { chiave_storage: chiave, byte: corpo.length });
  esito.caricati.push({ url, chiave, byte: corpo.length });
  esito.byte += corpo.length;
  if (esito.caricati.length % 20 === 0) console.log(`   ...${esito.caricati.length} file`);
}

async function annota(url, chiave, byte, tipo) {
  await inserisciSeNuovo('media_travaso', {
    url_vecchia: url, chiave_storage: chiave, byte, tipo,
    origine: url.includes('/wp-content/') ? 'wp' : 'lp',
  });
}

/* ---------------------------------------------------------------- */
/* la riscrittura dei contenuti                                     */
/* ---------------------------------------------------------------- */

/* Sostituzione di testo esatta, non una regex: le URL non contengono
 * caratteri che JSON tratti in modo speciale, quindi si puo' lavorare
 * sulla forma serializzata e rileggerla.
 *
 * DALLA PIU' LUNGA ALLA PIU' CORTA. Fra le foto ci sono `Orvieto.jpg` e
 * `Orvieto2.jpg`, `WE.jpg` e `WE1.jpg`, `1.jpg` e `10.jpg`. L'estensione
 * finale gia' impedisce che una sia dentro l'altra, ma ordinare per
 * lunghezza toglie il dubbio del tutto e non costa niente. */
function riscrivi(blocks, mappa) {
  let testo = JSON.stringify(blocks);
  let cambi = 0;
  for (const [vecchia, nuova] of [...mappa].sort((a, b) => b[0].length - a[0].length)) {
    if (!testo.includes(vecchia)) continue;
    cambi += testo.split(vecchia).length - 1;
    testo = testo.split(vecchia).join(nuova);
  }
  return { blocks: JSON.parse(testo), cambi };
}

async function aggiornaTour(riga, mappa, esito) {
  const urlSue = [...JSON.stringify(riga.blocks).matchAll(RX_MEDIA)].map((m) => m[0]);
  if (!urlSue.length) return;

  /* Solo le URL il cui file e' davvero su Storage. Se un file e' fallito, la
   * sua URL resta quella vecchia: mezza riscrittura significherebbe una foto
   * che non c'e' ne' di qua ne' di la'. L'inoltro d'emergenza in
   * next.config.ts copre le rimaste finche' non si rilancia il travaso. */
  const sua = new Map();
  for (const u of new Set(urlSue)) if (mappa.has(u)) sua.set(u, mappa.get(u));
  if (!sua.size) { esito.tourSaltati.push(riga.slug); return; }

  const { blocks, cambi } = riscrivi(riga.blocks, sua);
  if (!cambi) { esito.tourSaltati.push(riga.slug); return; }

  if (PROVA) {
    esito.tourDaAggiornare.push({ slug: riga.slug, cambi, file: sua.size });
    esito.occorrenze += cambi;
    return;
  }

  try {
    /* PRIMA la fotografia, poi la scrittura. Se salta la corrente in mezzo,
     * il peggio che resta e' uno storico in piu' e nessuna modifica. */
    await inserisciSeNuovo('media_url_storico', {
      tour_id: riga.tour_id, locale: riga.locale,
      blocks_prima: riga.blocks, occorrenze: cambi,
      nota: 'travaso media su Storage',
    });

    await rest(
      `tour_content?tour_id=eq.${riga.tour_id}&locale=eq.${encodeURIComponent(riga.locale)}`,
      { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ blocks }) }
    );

    esito.tourAggiornati.push({ slug: riga.slug, cambi });
    esito.occorrenze += cambi;
  } catch (e) {
    esito.tourFalliti.push({ slug: riga.slug, perche: e.message });
  }
}

/* ---------------------------------------------------------------- */
/* il giro                                                          */
/* ---------------------------------------------------------------- */

const mb = (b) => (b / 1048576).toFixed(1);

async function main() {
  console.log(`\n=== TRAVASO MEDIA -> Supabase Storage / secchio "${SECCHIO}" ===`);
  console.log(PROVA ? 'MODO PROVA: non viene scritto niente, ne\' su Storage ne\' sul database.'
                    : `SCRITTURA VERA${TOUR ? ` -- solo il tour ${TOUR}` : LIMITE ? ` -- solo i primi ${LIMITE} tour` : ' -- TUTTI i tour'}`);

  const esito = {
    caricati: [], saltati: [], falliti: [], daFare: [], byte: 0,
    tourAggiornati: [], tourDaAggiornare: [], tourSaltati: [], tourFalliti: [], occorrenze: 0,
  };

  /* --- quali file --- */
  let righe = [];
  let urlDistinte;
  if (RISCRIVI) {
    urlDistinte = [...(await registroEsistente()).keys()];
    console.log(`\nRicarico sovrascrivendo quello che e' gia' nel registro: ${urlDistinte.length} file.`);
    console.log("I contenuti non si toccano: le loro URL sono gia' quelle nuove.");
    if (TOUR || LIMITE) console.log('(--tour e --limite non valgono qui: si ricarica tutto il registro.)');
  } else if (SOLO_EXTRA) {
    urlDistinte = [...new Set(EXTRA)];
    console.log(`\nSolo i media scritti dentro i componenti: ${urlDistinte.length} file.`);
  } else {
    righe = await leggiContenuti();
    if (!righe.length) morte(TOUR ? `nessun tour con slug "${TOUR}"` : 'nessun contenuto da leggere');
    const s = new Set();
    for (const r of righe) for (const m of JSON.stringify(r.blocks).matchAll(RX_MEDIA)) s.add(m[0]);
    urlDistinte = [...s];
    console.log(`\nContenuti letti: ${righe.length} righe di tour_content.`);
    console.log(`File distinti da portare: ${urlDistinte.length}.`);
  }
  if (!urlDistinte.length) { console.log('Niente da fare: nessuna URL vecchia.\n'); return; }

  /* --- i file --- */
  const giaFatti = PROVA ? new Map() : await registroEsistente();
  if (!PROVA && giaFatti.size) console.log(`Gia' nel registro da giri precedenti: ${giaFatti.size} file.`);

  console.log('\n--- file ---');
  await aBranchi(urlDistinte, IN_PARALLELO, (u) => travasaFile(u, giaFatti, esito));

  /* --- i contenuti --- */
  if (!SOLO_EXTRA && !RISCRIVI) {
    /* la mappa vale per tutto quello che e' su Storage, non solo per quello
     * caricato adesso: cosi' un giro interrotto si chiude al giro dopo */
    const mappa = new Map();
    for (const [u, r] of giaFatti) mappa.set(u, pubblica(r.chiave_storage));
    for (const c of esito.caricati) mappa.set(c.url, pubblica(c.chiave));
    if (PROVA) for (const d of esito.daFare) mappa.set(d.url, pubblica(d.chiave));

    console.log('\n--- contenuti ---');
    for (const r of righe) await aggiornaTour(r, mappa, esito);
  }

  rapporto(esito, urlDistinte.length);
  registra(esito);
  if (SOLO_EXTRA) manuali(esito);
}

function rapporto(e, quanti) {
  const byte = PROVA ? e.byte : e.caricati.reduce((s, c) => s + c.byte, 0);
  console.log('\n============================ RAPPORTO ============================');
  if (PROVA) {
    console.log(`file che verrebbero portati : ${e.daFare.length} su ${quanti}`);
    console.log(`byte che verrebbero portati : ${byte.toLocaleString('it-IT')}  (${mb(byte)} MB)`);
    console.log(`righe che verrebbero scritte: ${e.tourDaAggiornare.length}`);
    console.log(`URL che verrebbero riscritte: ${e.occorrenze}`);
  } else {
    console.log(`file caricati adesso        : ${e.caricati.length}`);
    console.log(`file gia' presenti, saltati : ${e.saltati.length}`);
    console.log(`byte caricati adesso        : ${byte.toLocaleString('it-IT')}  (${mb(byte)} MB)`);
    console.log(`righe di tour_content scritte: ${e.tourAggiornati.length}`);
    console.log(`URL riscritte               : ${e.occorrenze}`);
  }
  console.log(`file falliti                : ${e.falliti.length}`);
  console.log(`righe fallite               : ${e.tourFalliti.length}`);

  if (e.falliti.length) {
    console.log('\nFILE FALLITI (uno per riga, con il perche\'):');
    for (const f of e.falliti) console.log(`  ${f.url}\n      ${f.perche}`);
  }
  if (e.tourFalliti.length) {
    console.log('\nRIGHE FALLITE:');
    for (const t of e.tourFalliti) console.log(`  ${t.slug} -- ${t.perche}`);
  }
  if (PROVA && e.daFare.length) {
    console.log('\nPRIMI CINQUE, vecchio -> nuovo:');
    for (const d of e.daFare.slice(0, 5)) console.log(`  ${d.url}\n  -> ${pubblica(d.chiave)}   (${(d.byte / 1024).toFixed(0)} KB)`);
  }
  console.log('=================================================================\n');
}

function registra(e) {
  const f = path.join(RADICE, 'scripts', 'travaso-media.log.jsonl');
  const riga = JSON.stringify({
    quando: new Date().toISOString(),
    prova: PROVA,
    ambito: SOLO_EXTRA ? 'extra' : (TOUR || (LIMITE ? `primi ${LIMITE}` : 'tutti')),
    caricati: e.caricati.length, saltati: e.saltati.length, falliti: e.falliti.length,
    byte: e.byte, righe: (PROVA ? e.tourDaAggiornare : e.tourAggiornati).length, occorrenze: e.occorrenze,
    mappa: (PROVA ? e.daFare : e.caricati).map((x) => [x.url, x.chiave]),
    errori: e.falliti,
  });
  fs.appendFileSync(f, riga + '\n');
  console.log(`registro: ${path.relative(RADICE, f)}`);
}

/* I media dentro i componenti non li tocca lo script: quei file sono in
 * mano ad altri. Qui si stampa solo cosa sostituire, riga per riga. */
function manuali(e) {
  const fatti = [...e.caricati, ...e.daFare];
  if (!fatti.length) return;
  console.log('\n--- DA SOSTITUIRE A MANO NEI COMPONENTI ---');
  console.log('(page.tsx, Header.tsx, layout.tsx, Premi.tsx, ContactSection.tsx, VideoTestimonianze.tsx)\n');
  for (const x of fatti) console.log(`  ${x.url}\n  -> ${pubblica(x.chiave)}\n`);
}

main().catch((e) => { console.error('\nCADUTO:', e.message, '\n'); process.exit(1); });
