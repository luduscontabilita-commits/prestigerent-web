/* COME SI RISPONDE A UNA RECENSIONE.
 *
 * Questo file e' l'unica fonte dei criteri: li usa il modello (finiscono
 * nel prompt), li mostra la schermata (si leggono accanto al testo) e li
 * controlla il codice (le prove qui sotto non chiedono niente a nessuno).
 * Tre usi, una sola scrittura: se un criterio cambia, cambia in tutti e
 * tre i posti insieme.
 *
 * ── 🔴 PERCHE' I CRITERI SONO GENERICI ────────────────────────────────
 * Regola della proprieta', ripetuta fino a diventare legge: «devono
 * essere CRITERI GENERICI CHE VALGONO SEMPRE». Non «ringrazia per la
 * visita a San Gimignano»: quello e' un caso. «Nomina la cosa concreta
 * che ha scritto lui» e' un criterio -- vale per San Gimignano, per il
 * pranzo, per l'autista e per il tour che non c'entra niente.
 *
 * Un criterio scritto sul caso particolare funziona dieci volte e poi
 * produce una risposta assurda sull'undicesima. Un criterio generico non
 * va mai aggiornato.
 *
 * ── PERCHE' IL CODICE CONTROLLA, INVECE DI FIDARSI ────────────────────
 * Il modello sbaglia in modi prevedibili: allunga, promette rimborsi che
 * non puo' promettere, infila le frasi da ufficio stampa, dimentica il
 * nome. Sono tutte cose che si misurano senza AI, e misurarle costa zero.
 * Quello che si puo' controllare non si spera.
 *
 * ── 🔴 LA COSA CHE NON SI FA MAI ──────────────────────────────────────
 * Una risposta pubblica non smentisce il cliente. Non si dice a qualcuno,
 * davanti a tutti, che si sbaglia -- anche quando si sbaglia. Chi legge
 * non e' chi ha scritto: e' il prossimo che deve prenotare, e quello
 * guarda come reagisci, non chi ha ragione.
 */

/** Una recensione, come serve qui: il minimo per poter rispondere. */
export type Recensione = {
  id: number;
  fonte: string;
  autore: string | null;
  voto: number | null;
  titolo: string | null;
  testo: string;
  lingua: string | null;
  tour_slug: string | null;
  data: string | null;
};

/* ─────────────────────────────────────────────────────────────────────
   I CRITERI, UNA RIGA PER REGOLA.

   Scritti per essere LETTI da una persona in interfaccia, non solo
   infilati in un prompt: per questo sono frasi intere e non sigle, e per
   questo l'ordine conta -- i primi tre sono quelli che distinguono una
   risposta vera da un modulo prestampato.
   ───────────────────────────────────────────────────────────────────── */

export const CRITERI: readonly string[] = [
  'LA LINGUA DI CHI HA SCRITTO. Si risponde nella sua lingua, sempre: chi legge la risposta è lui, non noi.',
  'LA COSA CONCRETA CHE HA NOMINATO LUI. Un posto, una persona, un piatto, un momento: è la prova che la recensione è stata letta davvero. Senza questo, qualunque risposta sembra prestampata — perché lo è.',
  'IL SUO NOME, se c’è. Costa niente e cambia tutto.',
  'CORTA: dalle due alle quattro frasi. Una risposta lunga non la legge nessuno, e su una critica sembra che ci si stia difendendo.',
  'NIENTE FRASI DA UFFICIO STAMPA. «Ci scusiamo per il disagio», «la vostra soddisfazione è la nostra priorità», «grazie per il feedback»: le riconoscono tutti, e dicono che dall’altra parte non c’è nessuno.',
  'NON SI INVENTA NIENTE. Nessun dettaglio che non stia nella recensione o nei fatti noti del servizio. Mai un prezzo, mai un orario, mai il nome di una persona non citata.',
  'NON SI PROMETTE QUELLO CHE NON SI PUÒ DECIDERE. Rimborsi, sconti, omaggi: chi scrive la risposta non li decide, e una promessa pubblica non si ritira.',
  'SULLE CRITICHE: si riconosce il fatto, non si giustifica, e si sposta il seguito in privato una volta sola. Non si smentisce il cliente in pubblico, nemmeno quando ha torto: chi legge è il prossimo cliente, e guarda come reagisci.',
  'L’INVITO A TORNARE SOLO SE LA RECENSIONE È BUONA. Dopo una critica suona falso, e peggiora quello che era solo un problema.',
  'FIRMA COL NOME DELL’AZIENDA, non «il team». Una risposta è di qualcuno.',
  'NIENTE PAROLE CHIAVE INFILATE PER GOOGLE. Le risposte non posizionano, e si vede subito quando una frase è scritta per un motore invece che per una persona.',
];

/* Le frasi che tradiscono il modulo prestampato. Si controllano in
   italiano e in inglese perche' sono le due lingue in cui il modello
   ricade quando non ha niente da dire. L'elenco e' volutamente corto:
   sono le formule, non le parole comuni. */
const FRASI_VUOTE: readonly { frase: RegExp; perche: string }[] = [
  { frase: /ci scusiamo per (il|ogni) disagi/i, perche: 'formula da ufficio stampa' },
  { frase: /we (sincerely )?apologi[sz]e for (any|the) inconvenience/i, perche: 'formula da ufficio stampa' },
  { frase: /la (vostra|sua) soddisfazione [eè]'? (la nostra|il nostro)/i, perche: 'formula da ufficio stampa' },
  { frase: /your satisfaction is our (top )?priority/i, perche: 'formula da ufficio stampa' },
  { frase: /grazie per (il|la) (tuo |suo )?(feedback|recensione)\b/i, perche: 'ringraziamento generico: non dice niente' },
  { frase: /thank you for your (valuable |kind )?feedback\b/i, perche: 'ringraziamento generico: non dice niente' },
  /* 🔴 Trovata il 22/10/2026 su una recensione da una stella: il modello
     non usa la formula vietata, la RIGIRA -- «your feedback about X is
     very valuable». Dice la stessa cosa, cioe' niente, e suona peggio
     perche' sembra che si stia archiviando una pratica. La regola vale
     per la formula in qualunque ordine, non per la frase esatta. */
  { frase: /(feedback|suggerimento)[^.!?]{0,40}\b(valuable|preziosi|molto utile|very useful|important)/i, perche: 'il feedback «preziosissimo»: formula da ufficio stampa rigirata' },
  { frase: /\b(prendere|terro|terremo|take) .{0,25}(in considerazione|into account)\b/i, perche: 'promessa generica di «tenerne conto»: non dice cosa cambia' },
  { frase: /\bil team di\b|\bthe .{0,20}team\b/i, perche: 'firma impersonale: si firma col nome dell’azienda' },
  { frase: /non vediamo l'ora di (ri)?accoglier/i, perche: 'frase fatta' },
  { frase: /we look forward to welcoming you/i, perche: 'frase fatta' },
];

/* Le promesse che chi scrive la risposta non puo' prendere. Qui non si
   pesa: si blocca. Una di queste, pubblicata, e' un impegno dell'azienda. */
const PROMESSE: readonly { frase: RegExp; perche: string }[] = [
  { frase: /\brimbors/i, perche: 'promette un rimborso' },
  { frase: /\brefund/i, perche: 'promette un rimborso' },
  { frase: /\bsconto\b|\bscontat/i, perche: 'promette uno sconto' },
  { frase: /\bdiscount\b|\bvoucher\b|\bfree of charge\b/i, perche: 'promette uno sconto o un omaggio' },
  { frase: /\bgratis\b|\bgratuit/i, perche: 'promette un omaggio' },
];

export type Guaio = {
  /** `blocca`: non si pubblica. `pesa`: si pubblica, ma si sa. */
  gravita: 'blocca' | 'pesa';
  perche: string;
};

/* ─────────────────────────────────────────────────────────────────────
   IL NOME DI CHI HA SCRITTO -- QUANDO C'E'

   🔴 SUI PORTALI SPESSO NON C'E'. Provato sulle dieci recensioni vere
   del 22/10/2026: cinque autori su dieci sono nomi utente e basta --
   `lisaaX4327EU`, `732lauraleee`, `Picker2014`, `I7324OL_`,
   `peterpV19AV`. Il modello, a cui era stato chiesto di chiamare le
   persone per nome, ha scritto «Dear 732lauraleee» e «Hi Picker2014».
   Si legge malissimo: sembra un modulo compilato da una macchina, che
   e' esattamente l'impressione che una risposta deve evitare.

   E gli stessi nomi utente facevano scattare un altro controllo: quello
   sui numeri inventati vedeva il 4327 di `lisaaX4327EU` e bloccava la
   risposta. Tre su dieci ferme per un numero che nessuno aveva
   inventato.

   La regola che risolve tutti e due i casi, ed e' generale: UN NOME
   UTENTE CON DEI NUMERI DENTRO NON E' UN NOME. Gli altri (`Kristin_D`,
   `Monica_B`, `lori_c`) lo sono, e basta togliere l'iniziale del
   cognome. Quando non c'e' un nome usabile non se ne inventa uno: si
   apre senza.
   ───────────────────────────────────────────────────────────────────── */

/** Il nome di battesimo utilizzabile, o null se quello che c'e' e' un
 *  nome utente e non un nome. */
export function nomeDi(autore: string | null): string | null {
  const primo = (autore ?? '').trim().split(/[_\s.]/)[0];
  if (!primo) return null;
  /* numeri dentro: e' un identificativo, non un nome */
  if (/\d/.test(primo)) return null;
  if (primo.length < 3 || primo.length > 20) return null;
  if (!/^[\p{L}'’-]+$/u.test(primo)) return null;
  /* TUTTO MAIUSCOLO o tuttominuscolo vanno bene (la gente scrive cosi'),
     ma si restituisce con l'iniziale grande: «lori» -> «Lori» */
  return primo[0].toUpperCase() + primo.slice(1).toLowerCase();
}

/* ─────────────────────────────────────────────────────────────────────
   IN CHE LINGUA E' SCRITTA UNA RISPOSTA

   🔴 PERCHE' SERVE: il 22/10/2026, alla prima prova su recensioni vere,
   una recensione francese ha ricevuto una risposta che cominciava in
   francese («Merci beaucoup, Nancy!») e continuava in ITALIANO. Il
   criterio numero uno saltato in pieno, e nessun controllo se n'era
   accorto. Chi legge quella risposta e' una cliente francese: vede che
   le si risponde in una lingua che non ha usato.
   La causa non era il modello distratto: le istruzioni di sistema sono
   tutte in italiano, e trascinano. Si e' corretto il prompt E messo
   questo controllo -- perche' il prompt si puo' sempre riperdere, il
   controllo no.

   PERCHE' NON UNA LIBRERIA: ne servirebbe una da megabyte per
   distinguere sette lingue europee su duecento parole. Le parole
   funzionali (articoli, preposizioni, congiunzioni) bastano: sono le
   piu' frequenti di ogni lingua e non si traducono mai da sole. Si
   contano, e vince chi ne ha piu'.
   ───────────────────────────────────────────────────────────────────── */

const SPIE: Record<string, RegExp> = {
  it: /\b(il|lo|la|gli|che|di|per|con|sono|siamo|della|anche|molto|grazie|nostro|vostra)\b/gi,
  en: /\b(the|and|you|your|was|were|with|that|for|our|very|glad|thank|about|have)\b/gi,
  fr: /\b(le|la|les|des|une|vous|votre|nous|avec|que|pour|tr[eè]s|merci|bient[oô]t|avons)\b/gi,
  de: /\b(der|die|das|und|sie|ihr|wir|mit|sehr|dass|f[uü]r|haben|danke|freut|uns)\b/gi,
  es: /\b(el|la|los|las|una|usted|vuestro|nosotros|con|que|para|muy|gracias|hemos)\b/gi,
  pt: /\b(o|a|os|as|uma|voc[eê]|vosso|n[oó]s|com|que|para|muito|obrigado|temos)\b/gi,
  nl: /\b(de|het|een|en|wij|jullie|uw|met|dat|voor|zeer|dank|hebben)\b/gi,
};

/** La lingua di un testo, o null se non si distingue (testo troppo corto
 *  o troppo poche parole funzionali: in quel caso non si inventa). */
export function linguaDi(testo: string): string | null {
  const punti = Object.entries(SPIE)
    .map(([l, re]) => [l, (testo.match(re) ?? []).length] as const)
    .sort((a, b) => b[1] - a[1]);
  const [primo, secondo] = punti;
  /* serve un minimo di prove e un margine sul secondo: due lingue vicine
     (portoghese e spagnolo) altrimenti si scambiano al primo accento */
  if (!primo || primo[1] < 3) return null;
  if (secondo && primo[1] - secondo[1] < 2) return null;
  return primo[0];
}

const NOME_LINGUA: Record<string, string> = {
  it: 'italiano', en: 'inglese', fr: 'francese', de: 'tedesco',
  es: 'spagnolo', pt: 'portoghese', nl: 'olandese',
};

/** Quanto deve essere lunga: misurata in frasi, non in caratteri, perche'
 *  e' la cosa che conta per chi legge. Il minimo serve contro la risposta
 *  di una riga, che sembra sbrigativa. */
const FRASI_MIN = 2;
const FRASI_MAX = 5;
/** Oltre questo nessuno la legge, in nessuna lingua. */
const CARATTERI_MAX = 700;

function frasi(t: string): number {
  return t.split(/[.!?]+(?:\s|$)/).filter((p) => p.trim().length > 3).length;
}

/** Le parole della recensione che valgono come «cosa concreta»: si
 *  scartano quelle che ci sono in ogni frase. Non e' un vocabolario di
 *  lingua -- e' una soglia di lunghezza, che vale in tutte. */
const COMUNISSIME =
  /^(grazie|thank|thanks|really|wonderful|beautiful|experience|esperienza|molto|tutto|very|were|been|which|would|their|there|about|great|amazing|everything)$/;

function parolePiene(t: string): string[] {
  return (t.toLowerCase().match(/[\p{L}]{5,}/gu) ?? []).filter((p) => !COMUNISSIME.test(p));
}

/**
 * I guai di una risposta, misurati senza chiedere niente a nessuno.
 *
 * Torna un elenco vuoto quando va bene. L'ordine e' quello con cui si
 * mostrano: prima quello che blocca.
 */
export function guaiDi(risposta: string, rec: Recensione): Guaio[] {
  const g: Guaio[] = [];
  const t = risposta.trim();

  if (!t) return [{ gravita: 'blocca', perche: 'non c’è testo' }];

  for (const p of PROMESSE) {
    if (p.frase.test(t)) g.push({ gravita: 'blocca', perche: p.perche });
  }

  /* 🔴 LA LINGUA, E BLOCCA. Non e' una sfumatura di tono: e' una cliente
     francese che legge una risposta in italiano. Si confronta con la
     lingua della recensione solo quando entrambe si riconoscono -- se il
     testo e' troppo corto per dirlo, non si inventa un guaio. */
  const attesa = (rec.lingua ?? '').slice(0, 2).toLowerCase();
  const scritta = linguaDi(t);
  if (attesa && scritta && SPIE[attesa] && scritta !== attesa) {
    g.push({
      gravita: 'blocca',
      perche: `risposta in ${NOME_LINGUA[scritta] ?? scritta} a una recensione in ${NOME_LINGUA[attesa] ?? attesa}`,
    });
  }

  /* Sulle critiche il seguito si sposta in privato, una volta. Senza,
     la risposta resta un dispiacere pubblico senza nessuna via d'uscita
     -- e chi legge non vede nessuno che si prende il problema. */
  if ((rec.voto ?? 5) <= 3 && !/\b(email|e-mail|write|scriv|contact|contatt|chiam|phone|telefon|get in touch|direttamente)\b/i.test(t)) {
    g.push({ gravita: 'pesa', perche: 'non offre nessun modo di continuare in privato' });
  }

  if (t.length > CARATTERI_MAX) {
    g.push({
      gravita: 'blocca',
      perche: `troppo lunga: ${t.length} caratteri, il massimo è ${CARATTERI_MAX}`,
    });
  }

  const n = frasi(t);
  if (n < FRASI_MIN) g.push({ gravita: 'pesa', perche: 'una frase sola: sembra sbrigativa' });
  if (n > FRASI_MAX) g.push({ gravita: 'pesa', perche: `${n} frasi: oltre le quattro non si legge` });

  for (const f of FRASI_VUOTE) {
    if (f.frase.test(t)) g.push({ gravita: 'pesa', perche: f.perche });
  }

  /* Il nome, se la recensione ce l'ha. `Matthew_R` -> `Matthew`: le fonti
     attaccano l'iniziale del cognome, e cercare la stringa intera non la
     troverebbe mai.
     🔴 E NON SI USA `\b`: in JavaScript il confine di parola e' ASCII,
     quindi `\bIldikó\b` NON trova «Ildikó» -- la `ó` non conta come
     lettera e il confine finale non si chiude. Trovato il 22/10/2026:
     il controllo diceva «non la chiama per nome» su una risposta che
     cominciava col suo nome. Qui il confine e' «non una lettera», con la
     bandiera `u`, e vale in tutte le lingue. */
  const nome = nomeDi(rec.autore);
  if (nome && !new RegExp(`(^|[^\\p{L}])${nome}([^\\p{L}]|$)`, 'iu').test(t)) {
    g.push({ gravita: 'pesa', perche: `non lo chiama per nome (${nome})` });
  }

  /* 🔴 E quando il nome NON e' un nome, usarlo e' un guaio a se':
     «Dear 732lauraleee» e' la firma di una macchina, non di una persona.
     Qui blocca, perche' si vede da fuori e non si corregge dopo. */
  const utente = (rec.autore ?? '').trim();
  if (utente.length >= 4 && !nome && t.includes(utente)) {
    g.push({
      gravita: 'blocca',
      perche: `usa il nome utente della piattaforma (${utente}): non è un nome`,
    });
  }

  /* La cosa concreta: almeno una parola piena della recensione deve
     ricomparire nella risposta. E' il criterio numero due, ed e' l'unico
     modo automatico di distinguere una risposta letta da una prestampata. */
  const sue = new Set(parolePiene(rec.testo + ' ' + (rec.titolo ?? '')));
  const mie = new Set(parolePiene(t));
  const comuni = [...mie].filter((p) => sue.has(p));
  if (sue.size >= 3 && comuni.length === 0) {
    g.push({
      gravita: 'pesa',
      perche: 'non riprende niente di quello che ha scritto lui: sembra prestampata',
    });
  }

  /* Una domanda sola. Due domande in una risposta pubblica mettono il
     cliente sotto interrogatorio. */
  const domande = (t.match(/\?/g) ?? []).length;
  if (domande > 1) g.push({ gravita: 'pesa', perche: `${domande} domande: ne basta una` });

  /* Cifre che nella recensione non c'erano: e' il modo in cui il modello
     inventa prezzi e orari. Si guardano solo i numeri di due cifre o piu',
     perche' «2 ore» puo' venire dal testo suo. */
  /* 🔴 I numeri del NOME UTENTE non sono inventati: `lisaaX4327EU`,
     `732lauraleee`, `Picker2014`. Il 22/10/2026 questo controllo ha
     bloccato tre risposte su dieci proprio per quello -- e tre falsi
     allarmi su dieci bastano a far smettere di guardare gli allarmi. */
  const sueCifre = new Set([
    ...(rec.testo.match(/\d{2,}/g) ?? []),
    ...((rec.autore ?? '').match(/\d{2,}/g) ?? []),
  ]);
  for (const c of t.match(/\d{2,}/g) ?? []) {
    if (!sueCifre.has(c)) {
      g.push({
        gravita: 'blocca',
        perche: `c’è un numero che lui non ha scritto (${c}): può essere inventato`,
      });
      break;
    }
  }

  return g.sort((a, b) => (a.gravita === b.gravita ? 0 : a.gravita === 'blocca' ? -1 : 1));
}

/** Se si puo' pubblicare. */
export function siPuoPubblicare(guai: readonly Guaio[]): boolean {
  return !guai.some((g) => g.gravita === 'blocca');
}

/* ─────────────────────────────────────────────────────────────────────
   LE ISTRUZIONI PER IL MODELLO
   ───────────────────────────────────────────────────────────────────── */

const LINGUE: Record<string, string> = {
  en: 'inglese', it: 'italiano', de: 'tedesco', fr: 'francese', es: 'spagnolo',
  pt: 'portoghese', nl: 'olandese', ru: 'russo', ja: 'giapponese', zh: 'cinese',
  pl: 'polacco', sv: 'svedese', da: 'danese', no: 'norvegese', fi: 'finlandese',
};

export function sistemaDi(azienda: string): string {
  return [
    `Scrivi le risposte pubbliche alle recensioni di ${azienda}, operatore di tour ed escursioni in Toscana.`,
    'Scrivi come il titolare che ha accompagnato quelle persone, non come un ufficio.',
    '',
    'I criteri, tutti obbligatori:',
    ...CRITERI.map((c, i) => `${i + 1}. ${c}`),
    '',
    'Rispondi SOLO col testo della risposta: niente virgolette intorno, niente spiegazioni, niente titolo, niente oggetto.',
  ].join('\n');
}

export function compitoDi(rec: Recensione, fatti?: string): string {
  const lingua = LINGUE[(rec.lingua ?? 'en').slice(0, 2)] ?? 'la stessa lingua della recensione';
  const righe: (string | null)[] = [
    /* 🔴 LA LINGUA SI DICE PRIMA E DOPO, E NON E' RIDONDANZA.
       Il 22/10/2026 una recensione francese ha ricevuto meta' risposta in
       italiano: queste istruzioni sono tutte in italiano e il modello si
       lascia trascinare dalla lingua in cui gli si parla. Detta solo in
       fondo, l'indicazione si perde; ripetuta in apertura e in chiusura,
       in maiuscolo e con «ogni parola», ha tenuto. */
    `⚠️ LINGUA DELLA RISPOSTA: ${lingua.toUpperCase()}. Ogni parola in ${lingua}, anche la firma. Non una sillaba in un'altra lingua.`,
    '',
    `Piattaforma: ${rec.fonte}`,
    `Voto: ${rec.voto ?? '?'} su 5`,
    /* 🔴 Il nome si passa solo se e' un nome. Sui portali meta' degli
       autori sono nomi utente, e il modello a cui si chiede «chiamalo per
       nome» scrive «Dear 732lauraleee»: peggio che non salutare. */
    nomeDi(rec.autore)
      ? `Si chiama ${nomeDi(rec.autore)}: chiamalo cosi'.`
      : '⚠️ Di chi ha scritto NON si conosce il nome (sulla piattaforma c\'e\' solo un nome utente). Non usare nessun nome e non inventarne uno: apri senza.',
    rec.tour_slug ? `Servizio: ${rec.tour_slug.replace(/-/g, ' ')}` : null,
    rec.data ? `Data: ${rec.data}` : null,
    '',
    rec.titolo ? `Titolo della recensione: ${rec.titolo}` : null,
    'Testo della recensione:',
    rec.testo,
    '',
    `Scrivi la risposta in ${lingua.toUpperCase()}, dalla prima all'ultima parola.`,
  ];
  if (fatti) {
    righe.push('', 'Fatti noti del servizio, da usare SOLO se servono e senza aggiungerne altri:', fatti);
  }
  return righe.filter((r): r is string => r !== null).join('\n');
}
