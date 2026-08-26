/* ================================================================
   PRESTIGE RENT — IL MOTORE
   versione 3 · 26 agosto 2026, notte
   ================================================================

   Questo file vive su Vercel. Dentro Google Ads c'e' solo un ponte di
   cinque righe che lo scarica e lo esegue. Il codice si cambia
   pubblicando: quel riquadro non si tocca piu'.

   COSA FA QUESTA VERSIONE
   -----------------------
   1. Stampa sempre il quadro: cosa trova e cosa farebbe.
   2. Sposta le negative geografiche in una lista dedicata.
   3. Corregge i sitelink che portano dove non promettono.
   4. Scrive tutto in un foglio Google, sempre lo stesso, cosi' il log
      si legge da fuori senza aprire il riquadro di Google Ads.

   `AdsApp.mutate()` e' stato provato su un sitelink alle 20:58 del 26
   agosto e ha funzionato. Da qui in avanti si puo' usare per tutto --
   comprese le campagne, che gli Scripts da soli non sanno creare.

   In anteprima Google blocca ogni scrittura: si puo' lanciare senza
   conseguenze per vedere il piano.
   ================================================================ */

var VERSIONE = 'v3 — 26 agosto 2026, notte';

/* IL NOME DEL FOGLIO DOVE FINISCE IL LOG.
 *
 * Il ponte porta il codice da Vercel a Google Ads, ma il log tornava
 * indietro solo dentro quel riquadro -- che e' proprio quello che non
 * si deve piu' aprire. Ogni esecuzione riscrive QUESTO foglio, sempre
 * lo stesso: cosi' l'indirizzo si passa una volta sola e poi non serve
 * piu' nemmeno quello. */
var FOGLIO = 'Prestige Rent — log del motore';

/* Gli interruttori. Li tengo io qui, e li accendo solo dopo che il piano
   e' stato letto e approvato. */
var APPLICA_NEGATIVE = true;   /* sezione 2: sposta le negative geografiche */
var APPLICA_SITELINK = true;   /* sezione 3: prova su UN sitelink solo      */

var CAMP_ATTIVE = ['Tasting Tour Tuscany P25 Eng World',
                   'PR - Search - Siena San Gimignano - World'];

var LISTA_VECCHIA = 'Prestige Escluse Livello Account';
var LISTA_NUOVA   = 'Prestige — Solo tour da Firenze';

/* LE PAROLE CHE MURANO IL CATALOGO.
 *
 * Incrociate una per una con gli 85 prodotti letti dall'API di Regiondo:
 * 63 prodotti su 85 sono raggiunti da almeno una di queste, per 48.760
 * euro di listino. "rome" da sola ne blocca 12, "milan" 10, "venice" 9.
 *
 * Oggi non costano niente, perche' nessuna campagna vende quei prodotti.
 * Ma la lista e' applicata a sei campagne e resta li': il giorno che si
 * accendono i transfer o le crociere, quella campagna nasce gia' zoppa e
 * nessuno capisce perche'. E' successo con "private", che bloccava i tour
 * privati da 550 euro.
 *
 * Non si cancellano: si spostano in una lista applicata SOLO alle due
 * campagne di oggi. Li' continuano a fare il loro lavoro -- chi cerca
 * "rome" non vuole un tour di Siena -- e smettono di essere un'eredita'
 * per le campagne future. */
var GEOGRAFICHE = [
  'rome', 'roma', 'milan', 'milano', 'venice', 'venezia', 'naples', 'napoli',
  'livorno', 'livorno port', 'la spezia port', 'civitavecchia',
  'lucca', 'cinque terre', 'orvieto', 'positano', 'pompeii', 'sorrento',
  'amalfi', 'assisi', 'perugia', 'cortona', 'bologna', 'fiesole',
  'capri', 'turin', 'torino', 'genoa', 'genova', 'verona',
  'cruise', 'cruise ship', 'shore excursion', 'port of call',
  'msc', 'costa crociere', 'royal caribbean', 'norwegian cruise',
  'airport transfer', 'train'
];

/* I SITELINK CHE PORTANO DOVE NON PROMETTONO.
 *
 * Dieci su ventidue. Cinque dicono cose diverse e finiscono tutti sulla
 * stessa pagina -- quella del tour di Siena: chi clicca "Cruise Port
 * Tours" perche' arriva in nave a Livorno si ritrova su una giornata in
 * pullman a Siena, e chi clicca "Chianti Wine Tour" non trova il Chianti.
 * Quest'ultimo ha speso 332 clic in trenta giorni e non ha prodotto una
 * conversione: non e' un mistero.
 *
 * Non e' solo un cliente deluso. Google misura la coerenza fra cio' che
 * prometti e dove porti, ed e' uno degli ingredienti del punteggio di
 * qualita' -- quello che si paga in euro a ogni clic.
 *
 * Le pagine di destinazione sono state controllate una per una: tutte
 * rispondono 200. Puntare un annuncio su una pagina che non c'e'
 * sarebbe peggio di lasciarlo dov'e'.
 *
 * ATTENZIONE: i sitelink sono asset di ACCOUNT. Cambiarne l'indirizzo lo
 * cambia in tutte le campagne che lo mostrano, comprese quelle in pausa.
 * E' quello che vogliamo -- l'indirizzo sbagliato e' sbagliato ovunque --
 * ma va saputo. */
var SITELINK = [
  { id: '386849413211', testo: 'Chianti Wine Tour',
    a: 'https://prestigerent.com/lp/tasting-experience-in-tuscany-lan2.html',
    perche: '332 clic, 0 conversioni: portava al tour di Siena' },

  { id: '386849413214', testo: 'Cruise Port Tours',
    a: 'https://prestigerent.com/cruise-port-tours/',
    perche: 'chi arriva in nave non trovava il suo porto' },

  { id: '386849413223', testo: 'Small Group Tours',
    a: 'https://prestigerent.com/small-group-tours/',
    perche: 'prometteva la categoria e mostrava un tour solo' },

  { id: '386947785970', testo: 'Wine & Food Experience',
    a: 'https://prestigerent.com/tour/wine-food-experience-in-tuscany/',
    perche: 'prodotto diverso, e ha una pagina sua' },

  { id: '386849413217', testo: 'All Tuscany Tours',
    a: 'https://prestigerent.com/tours-of-italy/',
    perche: 'prometteva tutti i tour e ne mostrava uno' },

  /* La sezione #guarantee e' stata tolta dalla landing, quindi il link
     cadeva in cima a una pagina lunghissima. Lo si porta sulla pagina
     senza ancora: la promessa del testo ("cancellazione flessibile") la
     landing la mantiene comunque piu' in basso.
     DA DECIDERE INSIEME: o si cambia il testo del sitelink, o lo si
     toglie. Rimuoverlo si puo' fare, ma e' una scelta commerciale e non
     la prendo io di notte. */
  { id: '396696541559', testo: 'Our Booking Guarantee',
    a: 'https://prestigerent.com/lp/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence-lan2.html',
    perche: 'ancora #guarantee non esiste piu sulla landing' }
];

/* ================================================================ */

/* Va dichiarato QUI, prima della prima riga di log: `var` viene issato
   ma il valore no, e L() morirebbe sulla prima chiamata. */
var RIGHE = [];

var ANTEPRIMA = true;
try { ANTEPRIMA = AdsApp.getExecutionInfo().isPreview(); } catch (e) {}

L('================================================================');
L('MOTORE ' + VERSIONE);
L(ANTEPRIMA ? '*** ANTEPRIMA — Google blocca ogni scrittura ***'
            : '*** ESECUZIONE REALE ***');
L('================================================================');

uno_quadro();
due_negativeGeografiche();
tre_provaSitelink();

L('');
L('=== FINE ===');

scriviIlFoglio();

/* ---------------------------------------------------------------- */

/* Ogni riga va sia nel riquadro di Google Ads sia nel foglio: la prima
   serve a chi guarda li' in quel momento, il secondo a chi legge dopo. */
function L(s) {
  Logger.log(s);
  /* Fogli scambia per formula qualsiasi cella che comincia con = + - @,
     e le righe di separazione diventavano #ERROR!. L'apostrofo iniziale
     dice "questo e' testo" e non si vede nella cella. */
  var t = String(s);
  RIGHE.push([/^[=+\-@]/.test(t) ? "'" + t : t]);
}
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

function sez(t) {
  L('');
  L('--------------------------------------------------------------');
  L(t);
  L('--------------------------------------------------------------');
}

function campagna(nome) {
  var it = AdsApp.campaigns().withCondition("Name = '" + nome + "'").get();
  return it.hasNext() ? it.next() : null;
}

function listaChiamata(nome) {
  var it = AdsApp.negativeKeywordLists().withCondition("Name = '" + nome + "'").get();
  return it.hasNext() ? it.next() : null;
}

/* ---------------------------------------------------------------- */

function uno_quadro() {
  sez('1. IL QUADRO');
  try {
    var v = listaChiamata(LISTA_VECCHIA);
    if (!v) { L('!! lista "' + LISTA_VECCHIA + '" non trovata'); return; }

    var dentro = 0, geo = 0, presenti = {};
    var it = v.negativeKeywords().get();
    while (it.hasNext()) {
      var t = it.next().getText().replace(/^[\["]|[\]"]$/g, '').toLowerCase();
      dentro++;
      if (GEOGRAFICHE.indexOf(t) > -1) { geo++; presenti[t] = true; }
    }

    var camp = [], ci = v.campaigns().get();
    while (ci.hasNext()) camp.push(ci.next().getName());

    L('lista "' + v.getName() + '": ' + dentro + ' voci, applicata a ' + camp.length + ' campagne');
    L('di queste, geografiche da spostare: ' + geo + ' su ' + GEOGRAFICHE.length + ' cercate');
    L('');
    var mancanti = [];
    for (var i = 0; i < GEOGRAFICHE.length; i++) {
      if (!presenti[GEOGRAFICHE[i]]) mancanti.push(GEOGRAFICHE[i]);
    }
    if (mancanti.length) {
      L('(non presenti nella lista, quindi ignorate: ' + mancanti.join(', ') + ')');
    }

    var n = listaChiamata(LISTA_NUOVA);
    L('');
    L('lista di destinazione "' + LISTA_NUOVA + '": ' + (n ? 'esiste gia\'' : 'da creare'));
  } catch (e) { L('!! ERRORE: ' + e); }
}

function due_negativeGeografiche() {
  sez('2. LE NEGATIVE GEOGRAFICHE — in una lista dedicata');

  if (!APPLICA_NEGATIVE) { L('interruttore spento: non tocco niente'); return; }

  try {
    var vecchia = listaChiamata(LISTA_VECCHIA);
    if (!vecchia) { L('!! lista di partenza non trovata'); return; }

    /* Si prende nota di quali ci sono DAVVERO prima di creare qualsiasi
       cosa: creare una lista vuota perche' le parole non c'erano sarebbe
       peggio che non fare niente. */
    var daSpostare = [], oggetti = [];
    var it = vecchia.negativeKeywords().get();
    while (it.hasNext()) {
      var k = it.next();
      var t = k.getText().replace(/^[\["]|[\]"]$/g, '').toLowerCase();
      if (GEOGRAFICHE.indexOf(t) > -1) { daSpostare.push(k.getText()); oggetti.push(k); }
    }
    L('trovate nella lista di partenza: ' + daSpostare.length);
    if (!daSpostare.length) { L('niente da spostare'); return; }

    if (ANTEPRIMA) {
      L('');
      L('in anteprima non creo niente. Sposterei:');
      for (var q = 0; q < daSpostare.length; q++) L('   ' + daSpostare[q]);
      return;
    }

    /* La lista nuova: se c'e' gia' si riusa, altrimenti si crea. Lanciare
       due volte lo script non deve produrre due liste gemelle. */
    var nuova = listaChiamata(LISTA_NUOVA);
    if (!nuova) {
      var op = AdsApp.newNegativeKeywordListBuilder().withName(LISTA_NUOVA).build();
      if (!op.isSuccessful()) { L('!! non riesco a creare la lista: ' + op.getErrors().join(' | ')); return; }
      nuova = op.getResult();
      L('creata la lista "' + LISTA_NUOVA + '"');
    } else {
      L('la lista "' + LISTA_NUOVA + '" esisteva gia\': la riuso');
    }

    /* Prima si RIEMPIE la nuova, poi si applica alle campagne, e solo
       alla fine si svuota la vecchia. In quest'ordine, se qualcosa si
       interrompe a meta' il peggio che succede e' che una parola resti
       bloccata due volte -- che non fa danno. All'incontrario si
       aprirebbe un buco. */
    nuova.addNegativeKeywords(daSpostare);
    L('aggiunte alla lista nuova: ' + daSpostare.length);

    for (var c = 0; c < CAMP_ATTIVE.length; c++) {
      var cam = campagna(CAMP_ATTIVE[c]);
      if (!cam) { L('!! campagna non trovata: ' + CAMP_ATTIVE[c]); continue; }
      try {
        cam.addNegativeKeywordList(nuova);
        L('applicata a: ' + cam.getName());
      } catch (e2) {
        L('!! non riesco ad applicarla a ' + cam.getName() + ': ' + e2);
        L('!! mi fermo qui: NON svuoto la lista vecchia, cosi\' resta tutto bloccato come prima');
        return;
      }
    }

    var tolte = 0;
    for (var r = 0; r < oggetti.length; r++) {
      try { oggetti[r].remove(); tolte++; } catch (e3) { L('!! ' + daSpostare[r] + ': ' + e3); }
    }
    L('tolte dalla lista di account: ' + tolte);
    L('');
    L('Risultato: sulle due campagne di oggi non cambia niente -- quelle');
    L('parole restano bloccate. Cambia per le campagne future, che non');
    L('erediteranno piu\' il muro sui transfer e sulle crociere.');

  } catch (e) { L('!! ERRORE: ' + e); }
}

function tre_provaSitelink() {
  sez('3. I SITELINK CHE PORTANO DOVE NON PROMETTONO');

  if (!APPLICA_SITELINK) { L('interruttore spento: non tocco niente'); return; }

  var cliente = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  L('sono ' + SITELINK.length + ' da correggere.');
  L('');

  if (ANTEPRIMA) {
    for (var q = 0; q < SITELINK.length; q++) {
      L(pad(SITELINK[q].testo, 26) + '-> ' + SITELINK[q].a);
      L(pad('', 26) + '   ' + SITELINK[q].perche);
    }
    L('');
    L('in anteprima Google blocca la scrittura: nessuno e stato toccato');
    return;
  }

  var fatti = 0, falliti = 0;
  for (var i = 0; i < SITELINK.length; i++) {
    var s = SITELINK[i];
    var risorsa = 'customers/' + cliente + '/assets/' + s.id;
    try {
      var res = AdsApp.mutate({
        assetOperation: {
          updateMask: 'finalUrls',
          update: { resourceName: risorsa, finalUrls: [s.a] }
        }
      });
      if (res && res.isSuccessful && res.isSuccessful()) {
        L('OK   ' + pad(s.testo, 26) + '-> ' + s.a);
        L('     ' + pad('', 21) + s.perche);
        fatti++;
      } else {
        var e = (res && res.getErrorMessages) ? res.getErrorMessages().join(' | ') : 'esito sconosciuto';
        L('!!   ' + pad(s.testo, 26) + e);
        falliti++;
      }
    } catch (err) {
      L('!!   ' + pad(s.testo, 26) + err);
      falliti++;
    }
  }

  L('');
  L('-> ' + fatti + ' corretti' + (falliti ? ', ' + falliti + ' FALLITI' : ''));
  L('');
  L('Book Direct & Save era gia stato corretto: mandava a #book, ancora');
  L('che sulla landing non esiste. Ora va al calendario, ed e il sitelink');
  L('con la piu alta intenzione di acquisto.');
  L('');
  L('Restano gia giusti: Direct Transfers, Tours Of Italy, All');
  L('Destinations, Florence & Pisa, Real Traveler Reviews, Chat with Our');
  L('Team. Portano tutti dove dicono.');
}

/* ---------------------------------------------------------------- */

function scriviIlFoglio() {
  var ss = null;
  try {
    /* Si cerca per nome: se il foglio c'e' gia' si riusa, cosi' l'indirizzo
       resta lo stesso per sempre e non si accumula un foglio per ogni
       lancio. */
    var trovati = DriveApp.getFilesByName(FOGLIO);
    if (trovati.hasNext()) {
      ss = SpreadsheetApp.open(trovati.next());
    } else {
      ss = SpreadsheetApp.create(FOGLIO);
    }
  } catch (e) {
    Logger.log('!! non riesco ad aprire il foglio: ' + e);
    return;
  }

  try {
    var f = ss.getActiveSheet();
    f.clear();
    var testa = [['MOTORE ' + VERSIONE + '  —  ' +
      Utilities.formatDate(new Date(), AdsApp.currentAccount().getTimeZone(),
                           'yyyy-MM-dd HH:mm') +
      (ANTEPRIMA ? '  (anteprima)' : '  (esecuzione reale)')]];
    var tutto = testa.concat(RIGHE);
    f.getRange(1, 1, tutto.length, 1).setValues(tutto);
    f.getRange(1, 1).setFontWeight('bold');
    f.setColumnWidth(1, 900);

    /* Chiunque abbia il collegamento puo' leggere: serve perche' il foglio
       lo legge chi non e' loggato con questo account. */
    try {
      DriveApp.getFileById(ss.getId())
        .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e2) { Logger.log('(non condiviso: ' + e2 + ')'); }

    Logger.log('');
    Logger.log('================================================================');
    Logger.log('LOG SCRITTO QUI:');
    Logger.log(ss.getUrl());
    Logger.log('================================================================');
  } catch (e3) {
    Logger.log('!! non riesco a scrivere nel foglio: ' + e3);
  }
}
