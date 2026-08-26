/* PRESTIGE RENT — TRE CORREZIONI SU SIENA E WINERY
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  PROVA = true  ->  non tocca NIENTE, scrive solo cosa farebbe.   │
 * │  Si legge il log, si controlla riga per riga, e SOLO DOPO         │
 * │  si mette PROVA = false e si preme ESEGUI.                        │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * COSA FA
 *
 * 1. WINERY — crea un annuncio nuovo con il prezzo dentro.
 *    La chiave "florence wine tour" ha portato 3 conversioni ed ha
 *    punteggio di qualita' 2: con QS 2 si paga fino al triplo per la
 *    stessa posizione. La causa e' la pertinenza: nell'annuncio quella
 *    frase non c'e', e non c'e' nemmeno il prezzo.
 *    L'annuncio vecchio NON viene spento: girano insieme qualche giorno
 *    e si spegne il perdente. Se il nuovo venisse rifiutato, la campagna
 *    non resta senza annunci.
 *
 * 2. WINERY — toglie la negativa "book".
 *    Blocca "book a wine tour", "book wine tasting florence": cioe'
 *    esattamente chi ha gia' deciso di comprare. Era gia' segnata come
 *    trappola l'11 agosto e non e' mai stata tolta.
 *
 * 3. SIENA — mette in pausa le chiavi da tour privato.
 *    Circa quaranta chiavi esatte su private / chauffeur / driver /
 *    luxury / vip portano all'annuncio del gruppo condiviso, che dice
 *    "Small Group, Max 25" e "149€". Chi cerca uno chauffeur da 550€
 *    trova un tour di gruppo: punteggio di qualita' 1, zero conversioni,
 *    e trascina in basso la qualita' di tutta la campagna.
 *    Si spengono ORA. Il gruppo dedicato, con la sua landing privata che
 *    gia' esiste, si costruisce dopo.
 *    Le chiavi con "small group" dentro sono escluse a mano: "siena san
 *    gimignano small group van tour" contiene "van" ma non e' privata.
 */

var PROVA = true;   // <<< mettere false solo dopo aver letto il log

var CAMP_WINERY = 'Tasting Tour Tuscany P25 Eng World';
var CAMP_SIENA  = 'PR - Search - Siena San Gimignano - World';

var URL_WINERY = 'https://prestigerent.com/lp/tasting-experience-in-tuscany-lan2.html';

/* Dieci titoli tenuti dall'annuncio attuale, che era scritto bene, piu'
   cinque nuovi. Escono quattro varianti di "countryside" che dicevano la
   stessa cosa e una generica. */
var TITOLI = [
  'Florence Wine Tour - 89€',        /* <- la frase esatta della chiave QS 2 */
  'Chianti Wine Tour from 89€',
  'Tasting Experience in Tuscany',
  'Wine tours in Tuscany',
  'Chianti Tour from Florence',
  'Small Group Tuscany Tour',
  'Private Chianti Experience',
  'Best Florence Day Trip',
  'Small Group Florence Tours',
  'Chianti Half Day Experience',
  'Private Tuscany Day Tour',
  'Top Rated Florence Tours',
  'Book Direct, No Booking Fee',
  'Free Cancellation up to 24h',
  'Semi-Private, Max 8 Guests'
];

var DESCRIZIONI = [
  "Small group & private tours from Florence to Chianti's top wineries with tastings.",
  'Wine tour from Florence from 89€. Book direct: no booking fee, free cancellation.',
  'Book small group or private Florence to Chianti tours with exclusive tastings.',
  'Discover scenic Chianti estates from Florence with local tastings included.'
];

var PERCORSO1 = 'wine-tour';
var PERCORSO2 = 'florence';

/* ---------------------------------------------------------------- */

function main() {
  L('================================================================');
  L(PROVA ? '*** MODALITA\' PROVA — non viene toccato niente ***'
          : '!!! MODALITA\' REALE — le modifiche vengono applicate !!!');
  L('================================================================');

  uno_annuncioWinery();
  due_togliBook();
  tre_pausaPrivati();

  L('');
  L('=== FINE ===');
  if (PROVA) {
    L('');
    L('Niente e\' stato modificato. Per applicare: PROVA = false, poi ESEGUI.');
  }
}

function L(s) { Logger.log(s); }

function blocco(t, fn) {
  L('');
  L('--------------------------------------------------------------');
  L(t);
  L('--------------------------------------------------------------');
  try { fn(); } catch (e) { L('!! ERRORE: ' + e); }
}

function campagna(nome) {
  var it = AdsApp.campaigns().withCondition("Name = '" + nome + "'").get();
  return it.hasNext() ? it.next() : null;
}

/* ---------------------------------------------------------------- */

function uno_annuncioWinery() {
  blocco('1. WINERY — annuncio nuovo con il prezzo', function () {
    var c = campagna(CAMP_WINERY);
    if (!c) { L('campagna non trovata: ' + CAMP_WINERY); return; }

    var gi = c.adGroups().withCondition('Status = ENABLED').get();
    if (!gi.hasNext()) { L('nessun gruppo attivo'); return; }
    var g = gi.next();
    L('gruppo: ' + g.getName());

    /* quanti annunci ci sono adesso */
    var ai = g.ads().withCondition('Status = ENABLED').get(), n = 0;
    while (ai.hasNext()) { ai.next(); n++; }
    L('annunci attivi ora: ' + n + '   (dopo saranno ' + (n + 1) + ')');

    L('');
    L('TITOLI (' + TITOLI.length + '):');
    for (var i = 0; i < TITOLI.length; i++) {
      L('   ' + (TITOLI[i].length > 30 ? '!! LUNGO ' : '   ') +
        pad(String(TITOLI[i].length), 3) + ' ' + TITOLI[i]);
    }
    L('');
    L('DESCRIZIONI (' + DESCRIZIONI.length + '):');
    for (var j = 0; j < DESCRIZIONI.length; j++) {
      L('   ' + (DESCRIZIONI[j].length > 90 ? '!! LUNGA ' : '   ') +
        pad(String(DESCRIZIONI[j].length), 3) + ' ' + DESCRIZIONI[j]);
    }
    L('');
    L('URL: ' + URL_WINERY);
    L('percorso: /' + PERCORSO1 + '/' + PERCORSO2);

    if (PROVA) { L(''); L('>>> in prova: annuncio NON creato'); return; }

    var b = g.newAd().responsiveSearchAdBuilder()
      .withHeadlines(TITOLI)
      .withDescriptions(DESCRIZIONI)
      .withFinalUrl(URL_WINERY)
      .withPath1(PERCORSO1)
      .withPath2(PERCORSO2);
    var res = b.build();
    L('');
    L(res.isSuccessful() ? '>>> ANNUNCIO CREATO' : '>>> FALLITO: ' + res.getErrors().join(' | '));
  });
}

function due_togliBook() {
  blocco('2. WINERY — via la negativa "book"', function () {
    var c = campagna(CAMP_WINERY);
    if (!c) { L('campagna non trovata'); return; }

    var it = c.negativeKeywords().get(), trovate = [], tot = 0;
    while (it.hasNext()) {
      var k = it.next(); tot++;
      var t = k.getText().replace(/^[\["]|[\]"]$/g, '').toLowerCase();
      if (t === 'book') trovate.push(k);
    }
    L('negative di campagna in totale: ' + tot);

    if (!trovate.length) { L('"book" non c\'e\' piu\': niente da fare'); return; }
    for (var i = 0; i < trovate.length; i++) {
      L('trovata: ' + trovate[i].getText());
      if (PROVA) { L('   >>> in prova: NON rimossa'); }
      else { trovate[i].remove(); L('   >>> RIMOSSA'); }
    }
    L('');
    L('NOTA: "books" resta bloccata. Va bene: chi cerca libri non compra tour.');
  });
}

function tre_pausaPrivati() {
  blocco('3. SIENA — pausa alle chiavi da tour privato', function () {
    var c = campagna(CAMP_SIENA);
    if (!c) { L('campagna non trovata: ' + CAMP_SIENA); return; }

    var privato = /private|chauffeur|driver|luxury|\bvip\b|\bvan\b|minivan/i;
    var gruppo  = /small[\s-]?group/i;

    var it = c.keywords().withCondition('Status = ENABLED').get();
    var da = [], resta = 0, spesa = 0, conv = 0;
    while (it.hasNext()) {
      var k = it.next();
      var t = k.getText();
      if (gruppo.test(t) || !privato.test(t)) { resta++; continue; }
      var s = k.getStatsFor('LAST_30_DAYS');
      da.push({ k: k, t: t, m: k.getMatchType(), c: s.getCost(), v: s.getConversions(), cl: s.getClicks() });
      spesa += s.getCost(); conv += s.getConversions();
    }

    L('chiavi attive che restano accese: ' + resta);
    L('chiavi da mettere in pausa: ' + da.length);
    L('   loro spesa negli ultimi 30 giorni: ' + spesa.toFixed(2));
    L('   loro conversioni negli ultimi 30 giorni: ' + conv.toFixed(1));
    L('');
    if (conv > 0) {
      L('!!! ATTENZIONE: fra queste ce n\'e\' almeno una che ha convertito.');
      L('!!! Leggi l\'elenco prima di eseguire davvero.');
      L('');
    }

    da.sort(function (a, b) { return b.c - a.c; });
    for (var i = 0; i < da.length; i++) {
      var x = da[i];
      L(pad(x.c.toFixed(2), 8) + pad(String(x.cl) + 'c', 6) +
        pad(x.v.toFixed(1) + 'cv', 7) + pad(x.m, 8) + '"' + x.t + '"');
      if (!PROVA) x.k.pause();
    }
    L('');
    L(PROVA ? '>>> in prova: nessuna chiave messa in pausa'
            : '>>> ' + da.length + ' CHIAVI MESSE IN PAUSA');
    L('');
    L('Si riaccendono quando esiste il gruppo dedicato con la landing');
    L('lp/private-siena-san-gimignano-lan.html e il suo annuncio a 550 euro.');
  });
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
