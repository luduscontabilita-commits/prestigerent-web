/* I TRE PUNTI CHE STANNO SULLA SCHEDA.
 *
 * ── IL PROBLEMA MISURATO ────────────────────────────────────────────────
 * Le schede mostravano `highlights[0..2]` cosi' come arrivano da WordPress.
 * Su 87 tour pubblicati, il primo punto -- la prima riga che il cliente
 * legge, su ogni griglia e su ogni pagina di categoria -- era questo:
 *
 *     "Safe for health! All our vehicles are deeply cleaned/sanitized
 *      before each service"
 *
 * 55 tour su 87 (32 transfer, 22 crociera, 1 altro; nessun privato e
 * nessun piccolo gruppo), sempre in posizione 1, in dieci varianti
 * ortografiche diverse. Piu' altre 32 occorrenze dentro la scheda
 * IMPORTANT INFO. Su 31 transfer il secondo punto era il suo gemello,
 * "Safe for money! Free cancellation...": la coppia e' deliberata ed e'
 * nata nel 2020.
 *
 * ── PERCHE' NON BASTA SOSTITUIRLO CON UN ARGOMENTO MIGLIORE ─────────────
 * "Mezzi di proprieta', autisti dipendenti, accesso alle ZTL" e' vero ed
 * e' il nostro argomento -- ma resta una POLICY: identica su tutte e 87 le
 * schede, non dice niente di QUEL tour, e chi sceglie la salta esattamente
 * come saltava quella sul Covid. L'argomento aziendale ha gia' il suo
 * posto: l'hero della home, la sezione flotta, il footer.
 *
 * Sulla scheda ci va cosa VEDI E FAI in quella giornata:
 *
 *     Guided Tour of Medieval Siena
 *     Vineyard Lunch & Wine Tasting
 *     Free Time in San Gimignano
 *
 * ── DA DOVE ESCONO, VISTO CHE NON SI INVENTANO ──────────────────────────
 * Sono gia' scritti. Delle 377 voci non-policy dentro `highlights` --
 * "Visit the charming medieval village of Montalcino", "Guided walking
 * tour in Siena, a beautiful medieval city" -- si tiene il nocciolo e si
 * butta la coda subordinata. Dove gli highlights non bastano si guarda il
 * TOUR SCHEDULE, che e' letteralmente l'elenco di cosa si fa e a che ora.
 *
 * ── QUANDO NON SI MOSTRA NIENTE ─────────────────────────────────────────
 * Provato su tutte le schede pubblicate: 68 su 86 escono con due o tre
 * righe buone (59 con tre, 9 con due). Le altre 18 -- 17 transfer
 * punto-a-punto piu' la gita allo spaccio da Livorno -- non hanno una
 * sola voce che descriva un'esperienza, e non e' un difetto dei dati:
 * un trasferimento dall'aeroporto di Pisa a Firenze NON e'
 * un'esperienza, e' un passaggio. Su quelle schede l'elenco non compare
 * affatto.
 *
 * Meglio cosi' che riempirlo: una scheda con titolo, durata, una riga di
 * prosa e il prezzo e' pulita; una che al posto dei punti forti promette
 * "sanifichiamo i veicoli" dice al cliente che non c'e' niente da dire.
 */

import { testo } from './prosa';

/* ── LA RIGA DEL COVID ────────────────────────────────────────────────────
 * Dieci varianti nel database ("Safe for health!", "Safe for health !",
 * "deeply cleaned", "fully cleaned/sanitized", senza prefisso...). Si
 * riconoscono tutte dalla parola che conta. */
export const COVID = /sanitiz|sanitis/i;

/* ── LE PROMESSE AZIENDALI ────────────────────────────────────────────────
 * Vere, ma uguali su ogni scheda: sulla scheda non scelgono niente.
 * Restano sulla pagina del tour, dove chi ha gia' scelto le cerca. */
const POLICY = [
  /sanitiz|sanitis/i,
  /safe for (health|money)/i,
  /free cancellation|cancel for free|prior (to )?departure/i,
  /misses port|cruise is canceled|cruise is cancelled/i,
  /private is just for you/i,
  /small[- ]group max/i,
  /^top (privacy|safety)/i,
  /top safety, ?comfort/i,   // "Private tour of Florence! Top safety, comfort..."
  /^stress[- ]free/i,
  /^time[- ]saving/i,
  /door[- ]to[- ]door/i,
  /^comfortable ride with our/i,
  /mercedes fleet/i,
  /english only|no confusion/i,
  /^balance of the day|^customize/i,
  /^read more$|^leggi/i,
  /pick ?up\s*\/\s*drop ?off/i,
  /^safely (store|stored)/i,
];

const isPolicy = (s: string) => POLICY.some((r) => r.test(s.trim()));

/* 🔴 IL FILTRO GIUSTO PER UN TOUR E' SBAGLIATO PER UN TRANSFER.
 *
 * `POLICY` toglie tutto quello che non dice "cosa vedrai": porta a
 * porta, bagagli al sicuro, flotta Mercedes, niente code. Su una gita e'
 * la scelta giusta -- quelle righe le scrive chiunque, e rubano il posto
 * a Siena e San Gimignano.
 *
 * Su un transfer Firenze-Roma pero' NON C'E' niente da vedere: il
 * prodotto e' esattamente "porta a porta, con i tuoi bagagli, su una
 * Mercedes, senza cambiare treno". Togliendo quelle righe restava zero,
 * e la scheda mostrava un buco fra la descrizione e il prezzo -- con le
 * schede alte uguali, quel vuoto e' grande quanto tre righe.
 *
 * Quindi il ripiego: se dopo il filtro severo non resta abbastanza, si
 * riprova togliendo solo cio' che e' davvero ridondante -- la
 * sanificazione (retaggio del Covid), la cancellazione gratuita (c'e'
 * gia' scritta due volte altrove) e il "Read more" dell'importazione.
 * Il resto sono fatti veri, scritti dall'azienda, e su quei prodotti
 * sono l'argomento di vendita. */
const POLICY_MINIMA = [
  /sanitiz|sanitis/i,
  /safe for (health|money)/i,
  /free cancellation|cancel for free|prior (to )?departure/i,
  /misses port|cruise is canceled|cruise is cancelled/i,
  /^read more$|^leggi/i,
];
const isPolicyMinima = (s: string) => POLICY_MINIMA.some((r) => r.test(s.trim()));

/* ── I VERBI DI APERTURA ──────────────────────────────────────────────────
 * Contati sulle 377 voci vere: visit 47, admire 32, see 31, enjoy 30,
 * explore 29... Sono riempitivo -- "Visit the medieval village of
 * Montalcino" e "Medieval Village of Montalcino" dicono la stessa cosa, e
 * il secondo entra in una riga. Si tolgono in testa, mai in mezzo. */
const APERTURE = [
  /^conclude your (day|tour)( by| wondering| visiting| in| at| with)?\s+/i,
  /^upgrade your experience with\s+/i,
  /^fall in love with\s+/i,
  /^let love blossom in\s+/i,
  /^learn more about\s+/i,
  /^get to know\s+/i,
  /^take a (picture|photo) of\s+/i,
  /^have the (chance|opportunity) to\s+/i,
  /^(you )?(will )?(have|get) (the )?(chance|time|opportunity) to\s+/i,
  /^drive (through|by|along)\s+/i,
  /^walk (through|along|in|around)\s+/i,
  /^wander (in|through|around)\s+/i,
  /^stroll (through|along|in|around)\s+/i,
  /^stop (in|at|for)\s+/i,
  /^(visit|admire|see|enjoy|explore|discover|experience|taste|shop|live|find|trace|make|skip|end|relax|meet|savor|savour|sample)\s+/i,
];

/* ── COME SI ACCORCIA SENZA SPEZZARE ──────────────────────────────────────
 * Il primo tentativo tagliava alla trentaquattresima lettera e usciva
 * roba come "Etruscans, a Powerful Fascinating" o "Piazza Maggiore and
 * Then Take": una riga mozzata si legge come un errore, e su una scheda
 * accanto ad altre due intere si vede subito.
 *
 * La regola vera e' un'altra: si taglia SOLO dove la lingua ha gia' un
 * giunto -- una virgola, un trattino, una parentesi, o la parolina che
 * apre il complemento ("of", "in", "with", "and"...). Di tutti i tagli
 * possibili si prende il PIU' LUNGO che entra nella riga. Cosi'
 * "Visit Siena, San Gimignano & the Tuscan countryside" diventa
 * "Siena, San Gimignano" e non "Siena": il taglio sulla virgola esiste,
 * ma quello sulla congiunzione e' piu' lungo e ci sta lo stesso.
 *
 * Se nessun taglio entra, la voce si BUTTA e si passa alla successiva.
 * Ce ne sono 4,3 per tour piu' l'itinerario: si puo' essere schizzinosi.
 */

/* ── LA PRIMA PROPOSIZIONE, E BASTA ───────────────────────────────────────
 * Due punti, punto e virgola, trattino e parentesi aprono SEMPRE una
 * proposizione nuova: "Pisa and Lucca: admire the Leaning Tower" ->
 * "Pisa and Lucca". La virgola no, perche' in queste voci fa due mestieri
 * diversi:
 *
 *   elenco       "Visit Siena, San Gimignano & the Tuscan countryside"
 *   apposizione  "Guided walking tour in Siena, a beautiful medieval city"
 *
 * Si distinguono da come riparte la frase: con la maiuscola e' un altro
 * nome proprio e la si tiene ("Siena, San Gimignano"); con la minuscola e'
 * un commento o un altro verbo e si taglia. Senza questa distinzione
 * uscivano righe come "Shopping District, Admire" e "Tuscan Landscape,
 * Drive": mezzo pensiero, che sulla scheda si legge come un errore. */
const SPEZZA_SEMPRE = /\s*[;:(]\s*|\s+[–—]\s+|\s+-\s+|\s*\.\.+\s*|\s*…\s*/;

/** Le paroline che aprono un complemento: prima di loro si puo' tagliare,
 *  dopo di loro non si puo' finire. */
const APPESE =
  /^(of|the|a|an|and|&|in|at|to|from|with|on|for|by|or|its|their|your|our|one|more|other|through|into|that|which|while|where|about|after|before|during|then|only|as|but|so|per|up|out)$/i;

/* Aggettivi da brochure. Non aggiungono informazione e mangiano meta'
 * riga: "the charming medieval village" -> "the medieval village". Si
 * tolgono SOLO in testa, dove sono decorazione, mai dentro un nome
 * proprio. */
const ENFASI =
  /^(the |a |an )?(charming|beautiful|stunning|amazing|unique|famous|wonderful|lovely|picturesque|breathtaking|spectacular|magnificent|gorgeous|incredible|fascinating|genuine|authentic|excellent|perfect|top|best|great|wide|little|typical|real|true)\s+/i;

/* Voci che passerebbero il filtro delle policy ma non dicono comunque
 * niente di questo tour: "Time allowing...", "Upgrade the experience...",
 * "At your own pace". */
const VUOTE =
  /^(time allowing|at your own|upgrade|your perfect|balance|end your|customize|options?$|to be (defined|customized)|make the most|take advantage|driving time|free time$|relaxing (ride|drive)|comfortable ride|conclude your|approx|get lost|day trip$|private tour$|transfer to |city cent(er|re)$|private tour|beyond wine|easy pick|take a deep breath|immerge|crowds|have a walk|day with a|\d+([.,]\d+)? ?(hrs?|hours?|mins?|minutes?)\b)/i;

/* I verbi che nel testo di partenza aprono la proposizione successiva.
 * Se un taglio finisce con uno di questi, sta finendo a meta' pensiero --
 * "Miracle Square in Pisa, take", "Piazza Maggiore and then take" -- e
 * non va mostrato. Non e' la stessa cosa del participio qui sotto: questi
 * sono verbi all'infinito, che nessuna regola morfologica riconosce. */
const VERBO_FINALE =
  /^(take|have|enjoy|admire|see|visit|drive|walk|taste|explore|discover|shop|enter|get|make|stop|move|relax|learn|meet|ride|try|book|climb|cross|reach|spend|sit|browse|choose|experience|full|rich|near|close|next|back)$/i;

/* Nelle scritte piccole della scheda le maiuscole di servizio sono rumore.
 * Restano maiuscoli i nomi propri, che nel testo di partenza gia' lo sono.
 * Le particelle italiane ci sono perche' i nomi dei luoghi le contengono:
 * "Santuario Di Madonna Di San Luca" si legge male, "di Madonna di San
 * Luca" e' come lo scrivono gli italiani e come lo cerca un americano. */
const MINUSCOLE =
  /^(of|the|a|an|and|in|at|to|from|with|on|for|by|or|into|through|over|its|per|di|del|della|dei|degli|delle|da|il|la|le|lo|e)$/i;

/* Le sigle che WordPress ha scritto in minuscolo o a meta'. Sono nomi
 * propri di istituzioni: scriverli male su una scheda toglie credito
 * proprio alla riga che dovrebbe darne. */
const SIGLE: Record<string, string> = {
  unesco: 'UNESCO',
  'unesco’s': 'UNESCO’s',
  ztl: 'ZTL',
  st: 'St',
  'st.': 'St.',
};

function maiuscoleDiTitolo(s: string): string {
  const parole = s.split(' ');
  return parole
    .map((p, i) => {
      if (!p) return p;
      const sigla = SIGLE[p.toLowerCase()];
      if (sigla) return sigla;
      /* gia' maiuscola dentro (nome proprio, sigla, "Michelangelo's")
         non si tocca: abbassarla romperebbe "San Gimignano" e "UNESCO" */
      if (/[A-Z]/.test(p.slice(1))) return p;
      if (i > 0 && MINUSCOLE.test(p)) return p.toLowerCase();
      /* anche dopo la barra: "train/boat" -> "Train/Boat" */
      return p.replace(/(^|\/)([a-z])/g, (_m, pre, c) => pre + c.toUpperCase());
    })
    .join(' ');
}

/** Le parole che portano informazione: le paroline di servizio non
 *  contano, altrimenti "Free time in San Gimignano" sembrerebbe lunga
 *  quanto "Guided walking tour of the medieval city". */
const piene = (s: string) => s.split(/\s+/).filter((p) => p && !MINUSCOLE.test(p));

/** Un taglio regge se ha almeno DUE parole piene.
 *
 *  Una parola sola era stata ammessa se nome proprio -- "Lamborghini",
 *  "Bagnoregio" -- ma sulla scheda non regge: accanto a "Medieval Village
 *  of Montalcino" e "Vineyards and Rolling Hills" un "Umbria" secco
 *  sembra una riga rimasta a meta'. E non serve rischiare: di voci ce ne
 *  sono 4,3 per tour piu' l'itinerario, la successiva e' quasi sempre
 *  buona. */
function abbastanza(s: string): boolean {
  return piene(s).length >= 2;
}

/* La lunghezza massima. Non si contano le parole ma i caratteri: e' quello
   che decide se la riga entra o va a capo, ed e' tarato sulla colonna piu'
   stretta della griglia (250px su /tours-of-italy/). */
const MAX = 34;

/** Un taglio prodotto accorciando non puo' finire in participio: "Ancient
 *  Roman Society Trapped" e "Tuscan Countryside Driving" sono frasi
 *  interrotte. Ci stanno anche i suffissi degli aggettivi: "Florence's
 *  Top Historical" e "Town of San Gimignano Famous" sono lo stesso
 *  difetto, un aggettivo rimasto senza il nome che qualificava.
 *  Non vale per la voce intera: "Wine Tasting" e' un nome. */
const PARTICIPIO = /(ed|ing|ly|able|ical|ous|ful|ive)$/i;

/** Da una frase intera alla riga corta. Stringa vuota se non ne esce
 *  niente di decente: il chiamante la scarta e passa alla voce dopo. */
export function accorcia(riga: string): string {
  let s = testo(riga)
    /* refuso di WordPress, su una scheda sola ma proprio nel primo punto */
    .replace(/\bfall love with\b/i, 'fall in love with')
    .replace(/\s+([,;:.!?])/g, '$1')   // "Siena , a beautiful" di WordPress
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  for (const r of APERTURE) {
    const dopo = s.replace(r, '');
    if (dopo !== s && abbastanza(dopo)) {
      s = dopo;
      break;
    }
  }

  s = s.replace(/^(the|a|an)\s+/i, '');
  const senzaEnfasi = s.replace(ENFASI, '');
  if (senzaEnfasi !== s && abbastanza(senzaEnfasi)) s = senzaEnfasi;
  if (VUOTE.test(s)) return '';

  /* Via tutto quello che viene dopo il primo due punti / trattino /
     parentesi: e' un'altra proposizione. */
  s = s.split(SPEZZA_SEMPRE)[0].trim();

  /* Le virgole si tengono finche' riprendono con la maiuscola -- e' un
     elenco di nomi propri -- e si tagliano alla prima che riprende in
     minuscolo, che e' un'apposizione o un secondo verbo. */
  const pezzi = s.split(/,\s*/);
  const tenuti = [pezzi[0]];
  for (let i = 1; i < pezzi.length; i++) {
    if (!/^[A-Z]/.test(pezzi[i])) break;
    tenuti.push(pezzi[i]);
  }
  s = tenuti.join(', ').trim();
  if (!s) return '';

  /* Tutti i tagli leciti, dal piu' lungo al piu' corto. Il primo che entra
     nella riga vince: e' il piu' informativo dei tagli possibili. */
  const parole = s.split(' ');
  for (let n = parole.length; n >= 1; n--) {
    const troncato = n < parole.length;
    /* Si taglia solo a un giunto: o la parola dopo apre un complemento,
       o quella prima chiude con una punteggiatura. */
    if (troncato) {
      const dopo = parole[n];
      if (!APPESE.test(dopo.replace(/[^A-Za-z&]/g, ''))) continue;
    }
    let taglio = parole.slice(0, n).join(' ').replace(/[.,;:!–—-]+$/, '').trim();
    /* le paroline appese in fondo se ne vanno con il taglio */
    const p = taglio.split(' ');
    while (p.length && APPESE.test(p[p.length - 1].replace(/[^A-Za-z&]/g, ''))) p.pop();
    taglio = p.join(' ').replace(/[.,;:!–—-]+$/, '').trim();
    /* Le virgolette aperte da WordPress e mai chiuse dentro il taglio:
       "' Dying Village'" comincia con un apostrofo e uno spazio. Le
       virgolette vere -- “Big Three” Wineries -- non hanno lo spazio e
       restano dove sono. */
    taglio = taglio.replace(/^['‘“"]\s+/, '').replace(/\s*['’”"]+$/, '').trim();

    if (!taglio || taglio.length > MAX) continue;
    if (!abbastanza(taglio)) continue;
    if (APPESE.test(taglio.split(' ')[0])) continue;
    if (VUOTE.test(taglio)) continue;
    const ultima = taglio.split(' ').pop() ?? '';
    /* Il maiuscolo salva: "Wine Tasting" e' un nome, "Roman Society
       Trapped" e' una frase interrotta. Nel testo di partenza i nomi
       propri sono gia' maiuscoli, quindi la distinzione e' gratis. */
    const nomeProprio = /[A-Z]/.test(ultima[0] ?? '');
    /* Solo se si e' accorciato: sulla voce intera "experience" e
       "ride" sono nomi ("Italian luxury shopping experience"), ed e'
       la troncatura a renderli verbi sospesi. */
    if (troncato && VERBO_FINALE.test(ultima)) continue;
    /* "Explore the green Umbria region with a tour to Perugia" tagliato
       su "to" finisce con "with a tour": l'articolo annuncia una cosa che
       il taglio ha portato via. */
    if (troncato && /\b(a|an|the)\s+(tour|visit|stop|drive|ride|day|trip)$/i.test(taglio)) continue;
    if (troncato && PARTICIPIO.test(ultima) && !nomeProprio) continue;
    return maiuscoleDiTitolo(taglio);
  }

  return '';
}

/* Due righe che cominciano con la stessa parola piena sono la stessa riga
   per chi guarda: "Winery Visit" e "Winery With Wine Tasting" occupano due
   posti su tre e dicono una cosa sola. */
function chiave(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p && !MINUSCOLE.test(p))
    .slice(0, 2)
    .join(' ');
}

/* ── IL RIPIEGO: IL TOUR SCHEDULE ─────────────────────────────────────────
 * "9:45am to 10:30am – free time to visit Greve in Chianti at your own
 * pace" -> "Free Time in Greve in Chianti". L'orario si toglie, le righe di
 * pura logistica -- partenza e arrivo dall'albergo, incontro con
 * l'autista -- non sono cose che si vedono e si fanno. */
const LOGISTICA =
  /^(depart|departure|arriv|meet|pick|drop|return|back to|transfer|balance of|please note)/i;

function dalloSchedule(html: string | undefined): string[] {
  if (!html) return [];
  return (html.match(/<li[\s\S]*?<\/li>/gi) ?? [])
    .map((v) => testo(v.replace(/<[^>]*>/g, ' ')))
    /* via l'orario in testa: "9:00am – ", "11:00am to 12:30pm – " */
    .map((v) =>
      v.replace(
        /^\s*\d{1,2}[:.]\d{2}\s*(?:am|pm)?\s*(?:to\s*\d{1,2}[:.]\d{2}\s*(?:am|pm)?)?\s*[–—-]?\s*/i,
        ''
      )
    )
    /* e via la durata, che e' la stessa cosa detta in un altro modo:
       "2 hrs free time to visit Padova" -> "free time to visit Padova".
       Senza, la riga diceva quanto dura invece di cosa si fa. */
    .map((v) =>
      v.replace(/^\s*(?:approx\.?\s*)?\d+(?:[.,]\d+)?\s*(?:hrs?|hours?|mins?|minutes?)\s*(?:of\s+)?/i, '')
    )
    .map((v) => v.trim())
    .filter((v) => v && !LOGISTICA.test(v) && !isPolicy(v))
    /* "free time to visit X" -> "free time in X": e' cosi' che si dice, ed
       e' anche piu' corto di una parola. */
    .map((v) => v.replace(/^free time (?:to visit|to explore|to see|at)\s+/i, 'free time in '));
}

export type BlocchiTour = {
  highlights?: string[];
  tabs?: Record<string, string>;
};

/* Sotto due righe non si mostra niente. Una riga sola non e' un elenco:
   e' una riga orfana che sembra un errore, e su una scheda accanto ad
   altre due che ne hanno tre si vede subito. */
const MINIMO = 2;
const QUANTI = 3;

/**
 * I punti da stampare sulla scheda: due o tre righe corte che dicono cosa
 * si vede e si fa in QUESTO tour, oppure l'elenco vuoto.
 */
function scegli(fonti: string[]): string[] {
  const fuori: string[] = [];
  const viste = new Set<string>();
  for (const f of fonti) {
    const corta = accorcia(f.replace(/<[^>]+>/g, ''));
    if (!corta) continue;
    const k = chiave(corta);
    if (!k || viste.has(k)) continue;
    viste.add(k);
    fuori.push(corta);
    if (fuori.length === QUANTI) break;
  }
  return fuori;
}

export function puntiScheda(blocks: BlocchiTour | undefined | null): string[] {
  if (!blocks) return [];

  const tutti = blocks.highlights ?? [];
  const primo = scegli([
    ...tutti.filter((h) => !isPolicy(h)),
    ...dalloSchedule(blocks.tabs?.['TOUR SCHEDULE']),
  ]);
  if (primo.length >= MINIMO) return primo;

  /* Il ripiego: vedi la nota su POLICY_MINIMA. */
  const secondo = scegli(tutti.filter((h) => !isPolicyMinima(h)));
  if (secondo.length >= MINIMO) return secondo;

  /* 🔴 L'ULTIMA RETE: TRE FATTI VERI PER TUTTO IL CATALOGO.
   *
   * Su alcuni transfer non sopravvive niente nemmeno al filtro leggero, e
   * per un motivo che non e' un difetto: `accorcia` taglia alla prima
   * punteggiatura, quindi "Time-saving: door-to-door service" diventa
   * "Time-saving" e viene scartato come troppo vago. Giusto -- ma il
   * risultato era una scheda con un vuoto grande tre righe fra la
   * descrizione e il prezzo, perche' nella fila le schede sono alte
   * uguali.
   *
   * Meglio tre fatti veri che un buco. NON sono riempitivo: valgono su
   * ogni prodotto e sono verificabili uno per uno -- la cancellazione a
   * ventiquattro ore e' la condizione dichiarata su tutte le schede, i
   * mezzi sono di proprieta' e gli autisti dipendenti (e' l'argomento
   * per cui si prenota qui invece che su Viator), e il voucher
   * elettronico lo emette Regiondo per ogni prodotto, transfer compresi.
   *
   * Il giorno che una di queste tre smettesse di essere vera, va tolta
   * DA QUI e da `src/lib/fatti.ts`, che le ripete nella barra della
   * scheda tour. */
  return [
    'Free cancellation up to 24 hours',
    'Our own vehicles, our own drivers',
    'E-ticket on your phone',
  ];
}


/* ── LA PAGINA DEL TOUR, DOVE L'ELENCO LUNGO RESTA ────────────────────────
 * Li' i punti si mostrano tutti e va bene: chi e' arrivato sulla pagina ha
 * gia' scelto e legge anche le condizioni. Due sole correzioni:
 *
 *  - la riga sulla sanificazione se ne va. Nel 2026 non rassicura nessuno,
 *    dice solo che il sito e' fermo al 2020;
 *  - "Safe for health!" e "Safe for money!" erano una coppia: tolta la
 *    prima, la seconda resta sola e suona strana. Si toglie l'occhiello e
 *    resta l'informazione, che e' buona: "Free cancellation up to 24 hrs".
 */
/* 🔴 IL GRASSETTO SOPRAVVIVE, TUTTO IL RESTO NO.
 *
 * I punti forti tornano dal database con `<strong>` dentro: e' il
 * titoletto di ogni riga, ripreso dal sito WordPress il 29/08/2026
 * (l'importazione l'aveva buttato via, e le righe erano diventate un
 * muro di testo tutto uguale).
 *
 * Qui si tiene SOLO quel tag. Non e' pignoleria: questi punti finiscono
 * in pagina con `dangerouslySetInnerHTML`, quindi qualunque altro tag
 * arrivasse dal database verrebbe eseguito dal browser. Il database lo
 * scriviamo noi, ma la regola deve valere anche il giorno che ci scrive
 * qualcun altro.
 */
function soloGrassetto(html: string): string {
  return html
    .replace(/<\s*(strong|b)\s*>/gi, '')
    .replace(/<\s*\/\s*(strong|b)\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(//g, '<strong>')
    .replace(//g, '</strong>');
}

export function ripulisciPunti(punti: string[]): string[] {
  return punti
    .filter((p) => !COVID.test(p))
    .filter((p) => !/^(read more|leggi (tutto|di piu))/i.test(p.trim()))
    /* `testo()` scioglie le entita' ma non tocca i tag, quindi si puo'
       chiamare prima: e' `soloGrassetto` a decidere cosa resta. */
    .map((p) => soloGrassetto(testo(p)).replace(/^safe for (health|money)\s*!\s*/i, ''))
    /* La maiuscola va sulla prima LETTERA, non sul primo carattere: con
       il grassetto in testa il primo carattere e' "<", e la riga restava
       minuscola. */
    .map((p) => p.replace(/^(\s*(?:<strong>)?\s*)([a-z])/, (_, pre, c) => pre + c.toUpperCase()))
    .filter(Boolean);
}

/* ── LA SANIFICAZIONE DENTRO LE SCHEDE INFORMATIVE ────────────────────────
 * Oltre alle 55 volte in `highlights`, la stessa cosa e' scritta altre 32
 * volte dentro la scheda IMPORTANT INFO, in coda alla riga del veicolo:
 *
 *     Vehicle: Mercedes sedan or van, depending on your party size and
 *     amount of luggage. Cleaned and sanitized
 *
 * E' una variante sola, identica su tutte e 32 le pagine -- verificato con
 * una query, non a occhio. Togliendo la frase finale la riga resta una
 * frase compiuta e utile ("Mercedes sedan or van, depending on your party
 * size and amount of luggage"), che e' il motivo per cui si toglie qui e
 * non si riscrive il testo nel database: il testo di WordPress resta la
 * fonte, e domani un nuovo import non riporta indietro la frase.
 */
export function senzaCovid(html: string): string {
  /* Il punto della frase precedente si tiene: senza, la riga finirebbe
     con "amount of luggage" e nessuna punteggiatura, in mezzo a un
     elenco dove tutte le altre righe il punto ce l'hanno. */
  return (html || '').replace(
    /(\.)?\s*(deeply\s+)?cleaned\s+(and|\/)\s*sanitiz(ed|ised)\b\.?/gi,
    (_m, punto: string | undefined) => punto ?? ''
  );
}

/* ── QUANDO IL NOME DEL TOUR E' TROPPO LUNGO PER LA SCHEDA ────────────────
 * Misurati tutti e 86: mediana 46 caratteri, ma un terzo sta sopra i 52 e
 * si arriva a 67 ("Private Tour Etruscans and Tarquinia from Civitavecchia
 * (Rome) Port"). Con due righe piene quei nomi occupano quasi tutta la
 * parte bassa della foto.
 *
 * Il CSS non sa quanto e' lungo un testo -- non esiste una query sul
 * contenuto -- ma il server si': il nome ce l'ha in mano nel momento in cui
 * disegna la scheda. Quindi la decisione si prende qui, una volta, e le due
 * griglie la prendono uguale.
 *
 * La soglia e' 52 e non la mediana: a 46 sarebbe stata meta' del catalogo,
 * e un titolo piu' piccolo su meta' delle schede non e' piu' un'eccezione,
 * e' un secondo stile. A 52 sono 26 schede su 86 -- quelle che il problema
 * ce l'hanno davvero.
 */
const LUNGO = 52;

export function classeTitolo(base: string, nome: string): string {
  return nome.length > LUNGO ? `${base} lungo` : base;
}
