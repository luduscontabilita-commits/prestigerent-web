/* ================================================================
   PRESTIGE RENT — IL MOTORE
   versione 1 · 26 agosto 2026, sera
   ================================================================

   Questo file vive su Vercel. Dentro Google Ads c'e' solo un ponte di
   cinque righe che lo scarica e lo esegue. Il codice si cambia
   pubblicando: quel riquadro non si tocca piu'.

   COSA FA QUESTA VERSIONE
   -----------------------
   1. Stampa sempre il quadro: cosa trova e cosa farebbe.
   2. Sposta le negative geografiche in una lista dedicata.
   3. Prova a correggere UN sitelink, per capire se si puo'.

   Le due campagne private NON sono qui dentro. Crearle richiede
   `AdsApp.mutate()`, che su questo account non ho mai visto girare: la
   sezione 3 serve proprio a scoprirlo su un'operazione piccola e utile
   invece che su una campagna intera. Se funziona, nella prossima
   versione ci sono anche quelle.

   In anteprima Google blocca ogni scrittura: si puo' lanciare senza
   conseguenze per vedere il piano.
   ================================================================ */

var VERSIONE = 'v1 — 26 agosto 2026, sera';

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

/* I SITELINK DA CORREGGERE.
 *
 * Dieci su ventidue portano dove non promettono. Cinque dicono cose
 * diverse e finiscono tutti sulla stessa pagina -- quella del tour di
 * Siena: chi clicca "Cruise Port Tours" perche' arriva in nave a Livorno
 * si ritrova su una giornata in pullman a Siena. Due puntano ad ancore
 * che sulla landing non esistono piu'.
 *
 * Qui sotto ne provo UNO solo, e ho scelto quello con l'intenzione
 * d'acquisto piu' alta: "Book Direct & Save" manda a #book, che non
 * esiste -- l'ancora del calendario e' #bookform. Cosi' com'e', chi
 * clicca il link piu' vicino all'acquisto viene scaricato in cima a una
 * pagina lunghissima. */
var SITELINK_PROVA = {
  id: '396696541553',
  testo: 'Book Direct & Save',
  da: 'https://prestigerent.com/lp/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence-lan2.html#book',
  a:  'https://prestigerent.com/lp/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence-lan2.html#bookform'
};

/* ================================================================ */

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

/* ---------------------------------------------------------------- */

function L(s) { Logger.log(s); }
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
  sez('3. PROVA — correggere un sitelink con mutate()');

  L('sitelink:  ' + SITELINK_PROVA.testo);
  L('oggi va a: ...#book        (ancora che sulla landing NON esiste)');
  L('dovrebbe:  ...#bookform    (il calendario)');
  L('');

  if (!APPLICA_SITELINK) { L('interruttore spento: non provo'); return; }
  if (ANTEPRIMA) { L('in anteprima Google blocca la scrittura: la prova non direbbe niente'); return; }

  /* Gli Scripts sanno gestire solo le vecchie estensioni, non i sitelink
     "asset" che ha questo account. L'unica strada documentata e'
     `AdsApp.mutate()`, che accetta le operazioni grezze dell'API.
     Non l'ho mai visto girare qui: si prova su un sitelink solo, e il
     peggio che puo' succedere e' un errore stampato nel log. */
  var risorsa = 'customers/' +
    AdsApp.currentAccount().getCustomerId().replace(/-/g, '') +
    '/assets/' + SITELINK_PROVA.id;

  L('risorsa: ' + risorsa);

  try {
    var res = AdsApp.mutate({
      assetOperation: {
        updateMask: 'finalUrls',
        update: { resourceName: risorsa, finalUrls: [SITELINK_PROVA.a] }
      }
    });

    if (res && res.isSuccessful && res.isSuccessful()) {
      L('');
      L('>>> RIUSCITO. mutate() funziona su questo account.');
      L('>>> Nella prossima versione ci vanno gli altri nove sitelink');
      L('>>> e le due campagne private.');
    } else {
      var err = (res && res.getErrorMessages) ? res.getErrorMessages().join(' | ') : 'esito sconosciuto';
      L('');
      L('>>> NON riuscito: ' + err);
      L('>>> I sitelink allora si correggono a mano nel pannello.');
    }
  } catch (e) {
    L('');
    L('>>> mutate() non utilizzabile qui: ' + e);
    L('>>> I sitelink si correggono a mano, e le campagne private si');
    L('>>> creano dal pannello. Il resto del motore funziona lo stesso.');
  }
}
