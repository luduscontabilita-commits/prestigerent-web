/* LA GALLERY CON TAG: LE REGOLE, SENZA DATABASE E SENZA REACT.
 *
 * ── PERCHE' QUESTO FILE NON TOCCA NIENTE ───────────────────────────────
 * Qui dentro non si importa Supabase, non si importa `next/cache`, non si
 * importa React. Sono funzioni che prendono dei valori e tornano dei
 * valori, e per questo si possono PROVARE: un test le chiama e guarda
 * cosa esce, senza finto database e senza finto browser. Le letture stanno
 * in `gallery-dati.ts`, che importa questo.
 *
 * E' anche il motivo per cui pannello e sito non possono dire cose
 * diverse. Il pannello scrive «Nascosta -- sotto soglia 2/3» chiamando
 * `decidi()`, la pagina decide se disegnarsi chiamando `decidi()`: una
 * regola, un posto, una risposta.
 *
 * ── 🔴 IL FILE SI CHIAMA `gallery-tag`, NON `gallery` ──────────────────
 * Esiste gia' `src/lib/galleria.ts`, che e' un'altra cosa: il filtro
 * delle foto dei tour, quello che tiene le vigne toscane fuori dalle
 * pagine dei transfer per Venezia. Due file `gallery.ts` e `galleria.ts`
 * nella stessa cartella sono un incidente che aspetta di capitare -- il
 * primo `import` sbagliato non darebbe errore, darebbe foto sbagliate.
 */

import { CATEGORIE } from './categorie';

/* ═══════════════════════════════════════════════════════════════════
   1. I TIPI
   ═══════════════════════════════════════════════════════════════════ */

/** I tipi di pagina ammessi. Erano sei: `dest` e `transfer` sono usciti il
 *  26/09/2026 insieme alle loro pagine (vedi ESCLUSI qui sotto). */
export type TipoTag = 'home' | 'cat' | 'tour' | 'port';

export type Criterio = 'manual' | 'newest' | 'oldest' | 'daily_random' | 'alternate';

export const CRITERI: readonly Criterio[] = [
  'manual', 'newest', 'oldest', 'daily_random', 'alternate',
];

export type Velocita = 'slow' | 'medium' | 'fast';

/** Una voce del registro come sta nel codice: quello che la
 *  sincronizzazione scrive in `gallery_tags`. */
export type VoceRegistro = {
  key: string;
  type: TipoTag;
  /** il nome leggibile nel pannello, in italiano */
  label: string;
  path: string;
  /** `tours.id` per i tour, altrimenti null */
  ref_id: string | null;
  /** la pagina esiste ma non contiene nemmeno un tour */
  senza_tour: boolean;
};

/** Una riga di `gallery_tags` come torna dal database. */
export type Tag = VoceRegistro & {
  id: string;
  is_orphan: boolean;
  custom_title: string | null;
  custom_subtitle: string | null;
  visibility_override: 'inherit' | 'on' | 'off';
  min_images_override: number | null;
  sort_override: Criterio | null;
};

/** La riga unica di `gallery_settings`. */
export type Impostazioni = {
  galleries_enabled: boolean;
  min_images: number;
  default_title: string;
  default_subtitle: string | null;
  default_title_tour: string;
  default_subtitle_tour: string | null;
  autoplay_speed: Velocita;
  default_sort: Criterio;
};

/** Una foto, come esce dalla vista `gallery_public`. */
export type Foto = {
  image_id: string;
  bucket: string;
  storage_path: string;
  width: number;
  height: number;
  blur_data_url: string | null;
  alt: string;
  caption: string | null;
  taken_at: string | null;
  created_at: string;
  position: number;
  pinned: boolean;
};

/* ═══════════════════════════════════════════════════════════════════
   2. IL REGISTRO DELLE PAGINE
   ═══════════════════════════════════════════════════════════════════

   Un tag = una pagina dove la gallery PUO' comparire. La sorgente sono
   `CATEGORIE` (src/lib/categorie.ts) e la tabella `tours`: qui non si
   ricopia nessuna etichetta a mano, o diventerebbe una seconda copia che
   invecchia da sola -- lo stesso errore dei prezzi in tre posti sul sito
   vecchio.
   ═══════════════════════════════════════════════════════════════════ */

/** 🔴 LE PAGINE CHE NON POSSONO AVERE UNA GALLERY, per decisione della
 *  proprieta' del 26/09/2026. La regola e' sull'INDIRIZZO: basta che lo
 *  contenga. Sono 21 pagine di categoria su 36.
 *
 *  Conseguenza da sapere: le SCHEDE dei singoli transfer restano dentro,
 *  perche' stanno sotto `/tour/<slug>/` e non sotto `/transfers/`. Sono
 *  32 delle 87 righe di `tours`. Esce la pagina che ELENCA i transfer da
 *  Firenze, non la scheda del transfer Firenze-Roma. */
export const ESCLUSI: readonly string[] = ['/destinations/', '/transfers/'];

export function esclusa(path: string): boolean {
  return ESCLUSI.some((p) => path.includes(p));
}

/** Il tipo di una pagina di categoria, dedotto dall'indirizzo.
 *  Le pagine sotto `/cruise-port-tours/` sono i porti; tutto il resto che
 *  sopravvive a `esclusa()` e' una categoria. */
function tipoDiCategoria(path: string): TipoTag {
  const pezzi = path.split('/').filter(Boolean);
  if (pezzi.length > 1 && pezzi[0] === 'cruise-port-tours') return 'port';
  return 'cat';
}

/** L'ultimo pezzo dell'indirizzo: e' da li' che nasce la chiave. */
function ultimoPezzo(path: string): string {
  const pezzi = path.split('/').filter(Boolean);
  return pezzi[pezzi.length - 1] ?? '';
}

/** Il nome leggibile nel pannello. In italiano il prefisso, in inglese il
 *  titolo della pagina: chi carica ritrova la pagina con le parole che
 *  legge navigando il sito, non con una chiave tecnica. */
function etichetta(tipo: TipoTag, titolo: string): string {
  const prefisso: Record<TipoTag, string> = {
    home: 'Home',
    cat: 'Categoria',
    port: 'Porto',
    tour: 'Tour',
  };
  return tipo === 'home' ? 'Home' : `${prefisso[tipo]} · ${titolo}`;
}

/** Un tour del catalogo, ridotto a quello che serve al registro. */
export type TourPerRegistro = { id: string; slug: string; titolo: string | null };

/**
 * IL REGISTRO INTERO, costruito dal codice e dal catalogo.
 *
 * Tornano 103 voci: 1 home + 5 categorie + 10 porti + 87 tour. E' la
 * funzione che alimenta il pulsante "Sincronizza pagine" del pannello, e
 * la stessa che il menu di chi carica usa per sapere quali pagine
 * esistono.
 *
 * `/tours-of-italy/` NON e' segnata senza tour: in `tour_categorie` conta
 * zero perche' non e' una categoria di WooCommerce, ma e' l'indice
 * generale e ci stanno dentro tutti -- il catch-all la tratta a parte con
 * un `if` esplicito. Segnarla vuota direbbe una bugia al pannello.
 */
export function registro(
  tours: readonly TourPerRegistro[],
  tourPerCategoria: Readonly<Record<string, number>> = {}
): VoceRegistro[] {
  const voci: VoceRegistro[] = [
    { key: 'home', type: 'home', label: 'Home', path: '/', ref_id: null, senza_tour: false },
  ];

  for (const c of CATEGORIE) {
    if (esclusa(c.path)) continue;
    const tipo = tipoDiCategoria(c.path);
    voci.push({
      key: `${tipo}:${ultimoPezzo(c.path)}`,
      type: tipo,
      label: etichetta(tipo, c.titolo),
      path: c.path,
      ref_id: null,
      senza_tour: c.cat !== 'tours-of-italy' && (tourPerCategoria[c.cat] ?? 0) === 0,
    });
  }

  for (const t of tours) {
    voci.push({
      key: `tour:${t.slug}`,
      type: 'tour',
      /* Senza titolo inglese si usa lo slug reso leggibile: una riga senza
         etichetta nel pannello sarebbe una casella da spuntare senza nome. */
      label: etichetta('tour', t.titolo?.trim() || t.slug.replace(/-/g, ' ')),
      path: `/tour/${t.slug}/`,
      ref_id: t.id,
      senza_tour: false,
    });
  }

  return voci;
}

/** Le chiavi doppie, se ce ne fossero. Oggi non ce ne sono -- provato su
 *  tutte e 103 -- ma uno slug nuovo domani potrebbe scontrarsi con una
 *  categoria, e il pannello deve poterlo dire invece di perdere una
 *  pagina in silenzio dentro un `on conflict do nothing`. */
export function chiaviDoppie(voci: readonly VoceRegistro[]): string[] {
  const visti = new Set<string>();
  const doppie = new Set<string>();
  for (const v of voci) {
    if (visti.has(v.key)) doppie.add(v.key);
    visti.add(v.key);
  }
  return [...doppie];
}

/* ═══════════════════════════════════════════════════════════════════
   3. LA REGOLA CHE DECIDE SE LA GALLERY SI VEDE
   ═══════════════════════════════════════════════════════════════════ */

export type Esito =
  | { visibile: true; soglia: number; sogliaPropria: boolean }
  | { visibile: false; motivo: Motivo; soglia: number; sogliaPropria: boolean; quante: number };

export type Motivo = 'interruttore' | 'disattivata' | 'sotto_soglia';

/**
 * Tre condizioni, tutte e tre necessarie:
 *   1. l'interruttore globale e' acceso -- oppure questa pagina lo
 *      scavalca con `visibility_override = 'on'`, che e' il modo di
 *      provare la gallery in produzione su UNA pagina sola mentre il
 *      resto del sito non mostra niente;
 *   2. la pagina non e' spenta da sola (`'off'`);
 *   3. le foto APPROVATE con questo tag sono almeno la soglia.
 *
 * Se anche una manca, la pagina non rende NIENTE: niente titolo, niente
 * contenitore, niente spazio vuoto. Una sezione vuota con l'intestazione
 * e' peggio di nessuna sezione: sembra un guasto.
 */
export function decidi(imp: Impostazioni, tag: Tag, quante: number): Esito {
  const soglia = tag.min_images_override ?? imp.min_images;
  const sogliaPropria = tag.min_images_override != null;
  const base = { soglia, sogliaPropria };

  if (tag.visibility_override === 'off') {
    return { visibile: false, motivo: 'disattivata', ...base, quante };
  }
  if (!imp.galleries_enabled && tag.visibility_override !== 'on') {
    return { visibile: false, motivo: 'interruttore', ...base, quante };
  }
  if (quante < soglia) {
    return { visibile: false, motivo: 'sotto_soglia', ...base, quante };
  }
  return { visibile: true, ...base };
}

/** Come si racconta l'esito nel pannello, in italiano. Sta qui e non
 *  nella pagina del pannello perche' e' l'altra meta' della regola: se il
 *  testo vivesse altrove potrebbe descrivere una decisione diversa da
 *  quella presa. */
export function spiega(e: Esito): string {
  if (e.visibile) return 'Visibile';
  const quale = e.sogliaPropria ? 'soglia di questa pagina' : 'soglia generale';
  switch (e.motivo) {
    case 'interruttore':
      return 'Nascosta — l’interruttore generale è spento';
    case 'disattivata':
      return 'Nascosta — disattivata su questa pagina';
    case 'sotto_soglia':
      return `Nascosta — sotto ${quale} ${e.quante}/${e.soglia}`;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   4. IL TITOLO
   ═══════════════════════════════════════════════════════════════════ */

/** Un pezzo di titolo: testo normale oppure la parola accentata. */
export type PezzoTitolo = { testo: string; accento: boolean };

/**
 * `*parola*` -> la parola in corsivo accentato, come in
 * "What our guests actually *say*".
 *
 * Non torna HTML e non torna JSX: torna dei pezzi. Cosi' chi disegna
 * mette le classi che vuole (`<em className="hl place">`, le stesse del
 * resto del sito) e non si passa mai una stringa a `dangerouslySetInnerHTML`
 * -- che con un titolo scritto dal pannello sarebbe un buco per un tag
 * qualunque.
 *
 * Gli asterischi spaiati restano testo: un titolo a meta' si vede subito
 * ed e' correggibile, un titolo che sparisce no.
 */
export function pezziTitolo(titolo: string): PezzoTitolo[] {
  const pezzi: PezzoTitolo[] = [];
  const re = /\*([^*]+)\*/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(titolo))) {
    if (m.index > ultimo) pezzi.push({ testo: titolo.slice(ultimo, m.index), accento: false });
    pezzi.push({ testo: m[1], accento: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < titolo.length) pezzi.push({ testo: titolo.slice(ultimo), accento: false });
  return pezzi.filter((p) => p.testo !== '');
}

/** Il titolo senza asterischi: serve all'`aria-label` della sezione e al
 *  pannello, dove un asterisco a video sarebbe solo rumore. */
export function titoloPiano(titolo: string): string {
  return pezziTitolo(titolo).map((p) => p.testo).join('');
}

/**
 * Quale titolo tocca a questa pagina.
 *
 * Il titolo scritto sulla pagina vince su tutto. Se non c'e', ce ne sono
 * DUE predefiniti: uno per le schede tour e uno per tutto il resto.
 * Sulle schede tour in cima c'e' gia' la striscia delle foto del prodotto
 * (`PhotoStrip`, gestita da /admin/foto): due strisce con lo stesso
 * titolo nella stessa pagina sembrano un errore, e queste sono le foto
 * delle giornate vere. L'alternativa era scrivere un titolo a mano su 87
 * schede.
 */
export function titoloDi(imp: Impostazioni, tag: Tag): { titolo: string; sottotitolo: string | null } {
  const perTour = tag.type === 'tour';
  return {
    titolo: tag.custom_title?.trim() || (perTour ? imp.default_title_tour : imp.default_title),
    sottotitolo:
      tag.custom_subtitle?.trim() ||
      (perTour ? imp.default_subtitle_tour : imp.default_subtitle) ||
      null,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   5. L'ORDINE DELLE FOTO
   ═══════════════════════════════════════════════════════════════════ */

/** La data da cui si ordina: lo scatto se c'e', altrimenti il
 *  caricamento. Le foto arrivate su WhatsApp e le schermate non hanno
 *  EXIF, e non devono finire tutte in fondo per questo. */
export function quando(f: Foto): number {
  return new Date(f.taken_at ?? f.created_at).getTime();
}

/** Un numero stabile da una stringa (FNV-1a, 32 bit). Serve al "casuale
 *  del giorno": non e' crittografia, e' solo un mescolatore che dia lo
 *  stesso risultato sul server e domani un risultato diverso. */
function impronta(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Il giorno a Roma, come `2026-09-26`. L'ora italiana e non UTC: il
 *  cambio del "casuale del giorno" deve capitare a mezzanotte per chi
 *  gestisce il sito, non alle due del mattino. */
export function giornoRoma(adesso: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(adesso);
}

/**
 * ALTERNA VERTICALI E ORIZZONTALI, partendo dall'ordine manuale.
 *
 * Serve contro il caso vero: tre verticali di fila che fanno sembrare la
 * striscia sgangherata. Si separano i due mazzi mantenendo l'ordine e si
 * pescano a turno, cominciando dal mazzo piu' numeroso -- se no la coda
 * finisce tutta dello stesso verso, che e' il problema che si voleva
 * evitare.
 *
 * Con un solo formato presente torna la lista com'era: nessun buco,
 * nessuna foto persa.
 */
function alterna(foto: readonly Foto[]): Foto[] {
  const verticali = foto.filter((f) => f.height > f.width);
  const altre = foto.filter((f) => f.height <= f.width);
  if (!verticali.length || !altre.length) return [...foto];

  const [lungo, corto] = verticali.length >= altre.length ? [verticali, altre] : [altre, verticali];
  const out: Foto[] = [];
  for (let i = 0; i < lungo.length; i++) {
    out.push(lungo[i]);
    if (i < corto.length) out.push(corto[i]);
  }
  /* Se il mazzo corto e' piu' lungo del giro (non capita con questa
     scelta, ma il codice non deve dipendere da quel ragionamento) */
  for (let i = lungo.length; i < corto.length; i++) out.push(corto[i]);
  return out;
}

/**
 * L'ORDINE DEFINITIVO. Una funzione sola, usata dalla pagina e
 * dall'anteprima del pannello: se fossero due, il pannello mostrerebbe un
 * ordine e il sito un altro, e nessuno saprebbe quale dei due e' quello
 * vero.
 *
 * Le foto FISSATE vengono sempre prima, nel loro ordine manuale, e il
 * criterio si applica solo al resto: cosi' la foto migliore resta la prima
 * anche con "casuale del giorno".
 *
 * Perche' il casuale e' del GIORNO e non della visita: l'ordine si calcola
 * sul server da un seme fisso (chiave della pagina + data), quindi la
 * pagina resta in cache (home 900s, tour 3600s), server e browser mostrano
 * la stessa cosa, e la striscia non cambia sotto le mani di chi la sta
 * guardando. Il cambio di mezzanotte arriva con al massimo un'ora di
 * ritardo per via della cache: e' una conseguenza accettata.
 */
export function ordina(
  foto: readonly Foto[],
  criterio: Criterio,
  chiave: string,
  oggi: string = giornoRoma()
): Foto[] {
  const manuale = (a: Foto, b: Foto) =>
    a.position - b.position || a.created_at.localeCompare(b.created_at);

  const fissate = foto.filter((f) => f.pinned).sort(manuale);
  const resto = foto.filter((f) => !f.pinned);

  let ordinato: Foto[];
  switch (criterio) {
    case 'newest':
      ordinato = [...resto].sort((a, b) => quando(b) - quando(a) || manuale(a, b));
      break;
    case 'oldest':
      ordinato = [...resto].sort((a, b) => quando(a) - quando(b) || manuale(a, b));
      break;
    case 'daily_random':
      ordinato = [...resto]
        .map((f) => ({ f, n: impronta(`${chiave}|${oggi}|${f.image_id}`) }))
        .sort((a, b) => a.n - b.n || manuale(a.f, b.f))
        .map((x) => x.f);
      break;
    case 'alternate':
      ordinato = alterna([...resto].sort(manuale));
      break;
    case 'manual':
    default:
      ordinato = [...resto].sort(manuale);
  }

  return [...fissate, ...ordinato];
}

/* ═══════════════════════════════════════════════════════════════════
   6. LE MISURE: PROPORZIONI E `sizes`
   ═══════════════════════════════════════════════════════════════════ */

/** Le proporzioni ammesse. Le foto normali da telefono (3:4, 4:3, 9:16,
 *  16:9) ci stanno tutte dentro e non vengono mai toccate; una panoramica
 *  4:1 o una schermata lunghissima viene contenuta, per non diventare una
 *  striscia larga come lo schermo o un filo verticale. */
export const RAPPORTO_MIN = 9 / 16;
export const RAPPORTO_MAX = 2;

/** Il rapporto da usare in pagina: quello vero, contenuto nei limiti.
 *  Quando e' diverso da quello vero la foto viene ritagliata al centro, e
 *  il pannello lo dice PRIMA di pubblicare. */
export function rapporto(f: { width: number; height: number }): number {
  const vero = f.width / f.height;
  if (!Number.isFinite(vero) || vero <= 0) return 1;
  return Math.min(RAPPORTO_MAX, Math.max(RAPPORTO_MIN, vero));
}

export function verraRitagliata(f: { width: number; height: number }): boolean {
  const vero = f.width / f.height;
  return Number.isFinite(vero) && vero > 0 && (vero < RAPPORTO_MIN || vero > RAPPORTO_MAX);
}

/** Sotto questa misura sul lato corto la foto si vede sgranata, e nel
 *  lightbox si vede molto sgranata. Non si ingrandisce mai di nascosto:
 *  si avvisa chi carica e si chiede conferma. */
export const LATO_CORTO_MINIMO = 1200;

export function bassaRisoluzione(f: { width: number; height: number }): boolean {
  return Math.min(f.width, f.height) < LATO_CORTO_MINIMO;
}

/** L'altezza della striscia, per scaglione di schermo. Le foto sono tutte
 *  alte uguale e larghe secondo le loro proporzioni: cosi' una verticale
 *  esce stretta e INTERA, e non ritagliata a meta' come farebbe un
 *  contenitore a larghezza fissa. */
export const ALTEZZE = { telefono: 300, tablet: 340, desktop: 420 } as const;

/**
 * `sizes` CALCOLATO FOTO PER FOTO, e non uno per tutte.
 *
 * In pagina ogni foto ha una larghezza diversa -- altezza della striscia
 * per le sue proporzioni -- quindi un `sizes` unico sarebbe sbagliato per
 * quasi tutte: il carosello esistente dichiara 460px a ognuna, e una
 * verticale stretta si scarica piu' grande del necessario mentre una
 * orizzontale larga si scarica piu' piccola e si vede sgranata.
 *
 * Con la larghezza vera il browser sceglie da se' la variante giusta fra
 * quelle ammesse (640…1920), densita' dello schermo compresa.
 */
export function sizesDi(f: { width: number; height: number }): string {
  const r = rapporto(f);
  const l = (altezza: number) => Math.round(altezza * r);
  return `(max-width: 480px) ${l(ALTEZZE.telefono)}px, (max-width: 1024px) ${l(ALTEZZE.tablet)}px, ${l(ALTEZZE.desktop)}px`;
}

/** La larghezza in pagina su desktop: serve a chiedere la variante giusta
 *  come `src` di partenza, e a misurare se le foto ci stanno tutte. */
export function larghezzaDesktop(f: { width: number; height: number }): number {
  return Math.round(ALTEZZE.desktop * rapporto(f));
}

/** Lo spazio fra due foto della striscia, in pixel. Lo stesso della
 *  striscia esistente (`useFilm` lo usa nel passo delle frecce). */
export const SPAZIO = 14;

/**
 * CI STANNO TUTTE? Si MISURA, non si conta.
 *
 * Il carosello scorre da solo e duplica le diapositive solo se le foto
 * non ci stanno nella larghezza disponibile. Con foto di larghezze
 * diverse "sono piu' di cinque" non vuol dire niente: cinque verticali
 * strette occupano meno di tre panoramiche.
 *
 * Il conto usa le proporzioni SALVATE, quindi funziona sul server, prima
 * che una sola immagine sia stata scaricata.
 */
export function entranoTutte(foto: readonly Foto[], larghezzaBox: number): boolean {
  if (!foto.length) return true;
  const somma = foto.reduce((t, f) => t + larghezzaDesktop(f), 0) + SPAZIO * (foto.length - 1);
  return somma <= larghezzaBox;
}

/** I pixel per fotogramma delle tre velocita'. 0,55 e' il valore delle
 *  landing collaudate, e resta quello di mezzo. */
export const PASSI: Record<Velocita, number> = { slow: 0.3, medium: 0.55, fast: 0.9 };
