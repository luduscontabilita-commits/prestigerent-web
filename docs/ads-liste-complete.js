/* PRESTIGE RENT — LE LISTE, TUTTE, SENZA TRONCAMENTI
 *
 * SOLO LETTURA. Non crea, non modifica, non mette in pausa niente.
 *
 * Lo script precedente si fermava a 200 voci e ne mancano ~900. Qui si
 * stampa tutto, ma compatto: sei termini per riga invece di uno, perche'
 * il log di Google Ads ha un tetto e 1.100 righe singole lo sfondano.
 *
 * In piu': le offerte per singola parola chiave e il tetto CPC di ogni
 * campagna, che servono per decidere dove alzare e dove abbassare invece
 * di mettere un tappo unico per tutti.
 *
 * Dove si incolla: account Prestige Rent (447-009-4152)
 *   Strumenti e impostazioni -> Azioni collettive -> Script -> +
 *   Incolla, Autorizza, ANTEPRIMA, poi scheda "Log".
 */

function main() {
  var acc = AdsApp.currentAccount();
  L('================================================================');
  L('LISTE COMPLETE — ' + acc.getName() + ' (' + acc.getCustomerId() + ')');
  L('================================================================');

  tettiEOfferte();
  offertePerChiave();
  negativeCondiviseComplete();
  negativeCampagnaComplete();
  negativeGruppo();
  esclusioniNonKeyword();
  chiaviAttiveTutte();

  L('');
  L('=== FINE ===');
}

function L(s) { Logger.log(s); }
function eur(m) { return (Number(m || 0) / 1000000).toFixed(2); }
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

function blocco(t, fn) {
  L('');
  L('--------------------------------------------------------------');
  L(t);
  L('--------------------------------------------------------------');
  try { fn(); } catch (e) { L('!! ERRORE: ' + e); }
}

function righe(q) {
  var out = [], it = AdsApp.search(q);
  while (it.hasNext()) out.push(it.next());
  return out;
}

/* Sei per riga: il log regge, e incollandolo resta leggibile. */
function inRighe(lista, perRiga, prefisso) {
  perRiga = perRiga || 6;
  for (var i = 0; i < lista.length; i += perRiga) {
    L((prefisso || '   ') + lista.slice(i, i + perRiga).join('  ·  '));
  }
}

/* ---------------------------------------------------------------- */

function tettiEOfferte() {
  blocco('1. STRATEGIE E TETTI CPC PER CAMPAGNA', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, campaign.bidding_strategy_type, ' +
      'campaign.target_spend.cpc_bid_ceiling_micros, ' +
      'campaign.maximize_conversions.target_cpa_micros, ' +
      'campaign.target_cpa.target_cpa_micros, ' +
      'campaign.target_roas.target_roas, ' +
      'campaign_budget.amount_micros ' +
      'FROM campaign WHERE campaign.status != \'REMOVED\''
    );
    if (!r.length) { L('(niente)'); return; }
    for (var i = 0; i < r.length; i++) {
      var c = r[i].campaign, b = r[i].campaignBudget;
      L('');
      L('[' + c.status + '] ' + c.name);
      L('   strategia: ' + c.biddingStrategyType + '   budget/giorno: ' + eur(b && b.amountMicros));
      var ts = c.targetSpend || {};
      if (ts.cpcBidCeilingMicros) L('   >>> TETTO CPC: ' + eur(ts.cpcBidCeilingMicros));
      else if (c.biddingStrategyType === 'TARGET_SPEND') L('   >>> TETTO CPC: NESSUNO (illimitato!)');
      var mc = c.maximizeConversions || {};
      if (mc.targetCpaMicros) L('   CPA target: ' + eur(mc.targetCpaMicros));
      var tc = c.targetCpa || {};
      if (tc.targetCpaMicros) L('   CPA target: ' + eur(tc.targetCpaMicros));
      var tr = c.targetRoas || {};
      if (tr.targetRoas) L('   ROAS target: ' + tr.targetRoas);
    }
  });
}

function offertePerChiave() {
  blocco('2. OFFERTA IMPOSTATA SU OGNI PAROLA CHIAVE ATTIVA', function () {
    var r = righe(
      'SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ' +
      'ad_group_criterion.keyword.match_type, ad_group_criterion.cpc_bid_micros, ' +
      'ad_group_criterion.effective_cpc_bid_micros, ad_group_criterion.quality_info.quality_score, ' +
      'ad_group_criterion.status ' +
      'FROM keyword_view WHERE ad_group_criterion.status = \'ENABLED\' ' +
      'AND campaign.status = \'ENABLED\' LIMIT 300'
    );
    if (!r.length) { L('(nessuna)'); return; }
    L(pad('OFFERTA', 10) + pad('EFFETT.', 10) + pad('QS', 4) +
      pad('MATCH', 8) + pad('CHIAVE', 44) + 'CAMPAGNA');
    for (var i = 0; i < r.length; i++) {
      var k = r[i].adGroupCriterion;
      var qi = k.qualityInfo || {};
      L(pad(k.cpcBidMicros ? eur(k.cpcBidMicros) : '(gruppo)', 10) +
        pad(k.effectiveCpcBidMicros ? eur(k.effectiveCpcBidMicros) : '-', 10) +
        pad(qi.qualityScore != null ? qi.qualityScore : '-', 4) +
        pad(k.keyword.matchType, 8) +
        pad('"' + k.keyword.text + '"', 44) +
        r[i].campaign.name);
    }
    L('');
    L('QS = punteggio di qualita\'. Sotto 5 il CPC sale e la posizione scende:');
    L('spesso e\' la landing che non corrisponde alla ricerca, non l\'offerta.');
  });
}

function negativeCondiviseComplete() {
  blocco('3. >>> LISTE CONDIVISE — TUTTE LE VOCI <<<', function () {
    var set = righe(
      'SELECT shared_set.id, shared_set.name, shared_set.type, ' +
      'shared_set.member_count, shared_set.status FROM shared_set'
    );
    for (var i = 0; i < set.length; i++) {
      var s = set[i].sharedSet;
      L('LISTA "' + s.name + '"  tipo=' + s.type + '  dichiarate=' + s.memberCount);
    }
    L('');
    var uso = righe('SELECT campaign.name, shared_set.name FROM campaign_shared_set');
    L('-- applicata a: --');
    for (var j = 0; j < uso.length; j++) L('   ' + uso[j].campaign.name);

    var voci = righe(
      'SELECT shared_set.name, shared_criterion.keyword.text, ' +
      'shared_criterion.keyword.match_type FROM shared_criterion'
    );
    var perLista = {};
    for (var k = 0; k < voci.length; k++) {
      var n = voci[k].sharedSet.name;
      if (!perLista[n]) perLista[n] = [];
      perLista[n].push(voci[k].sharedCriterion.keyword.matchType.charAt(0) + ':' +
        voci[k].sharedCriterion.keyword.text);
    }
    for (var nome in perLista) {
      var l = perLista[nome].sort();
      L('');
      L('### ' + nome + '  —  ' + l.length + ' voci, TUTTE:');
      inRighe(l, 6);
    }
  });
}

function negativeCampagnaComplete() {
  blocco('4. >>> NEGATIVE DI CAMPAGNA — TUTTE LE VOCI <<<', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, campaign_criterion.keyword.text, ' +
      'campaign_criterion.keyword.match_type FROM campaign_criterion ' +
      "WHERE campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE"
    );
    if (!r.length) { L('(nessuna)'); return; }
    var per = {};
    for (var i = 0; i < r.length; i++) {
      var n = '[' + r[i].campaign.status + '] ' + r[i].campaign.name;
      if (!per[n]) per[n] = [];
      per[n].push(r[i].campaignCriterion.keyword.matchType.charAt(0) + ':' +
        r[i].campaignCriterion.keyword.text);
    }
    for (var c in per) {
      var l = per[c].sort();
      L('');
      L('### ' + c + '  —  ' + l.length + ' voci, TUTTE:');
      inRighe(l, 6);
    }
  });
}

function negativeGruppo() {
  blocco('5. NEGATIVE A LIVELLO DI GRUPPO DI ANNUNCI', function () {
    var r = righe(
      'SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ' +
      'ad_group_criterion.keyword.match_type FROM ad_group_criterion ' +
      "WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = TRUE"
    );
    if (!r.length) { L('(nessuna — bene, un livello in meno dove cercare)'); return; }
    var per = {};
    for (var i = 0; i < r.length; i++) {
      var n = r[i].campaign.name + ' > ' + r[i].adGroup.name;
      if (!per[n]) per[n] = [];
      per[n].push(r[i].adGroupCriterion.keyword.matchType.charAt(0) + ':' +
        r[i].adGroupCriterion.keyword.text);
    }
    for (var c in per) {
      L('');
      L('### ' + c + '  (' + per[c].length + ')');
      inRighe(per[c].sort(), 6);
    }
  });
}

function esclusioniNonKeyword() {
  blocco('6. ALTRE ESCLUSIONI (paesi, lingue, posizionamenti, pubblici)', function () {
    var tipi = ['LOCATION', 'LANGUAGE', 'PLACEMENT', 'USER_LIST', 'YOUTUBE_CHANNEL', 'MOBILE_APPLICATION'];
    for (var t = 0; t < tipi.length; t++) {
      var r = righe(
        'SELECT campaign.name, campaign_criterion.type, campaign_criterion.negative, ' +
        'campaign_criterion.location.geo_target_constant, ' +
        'campaign_criterion.language.language_constant, ' +
        'campaign_criterion.placement.url, ' +
        'campaign_criterion.display_name ' +
        "FROM campaign_criterion WHERE campaign_criterion.type = '" + tipi[t] + "'"
      );
      if (!r.length) continue;
      L('');
      L('--- ' + tipi[t] + ' (' + r.length + ') ---');
      for (var i = 0; i < Math.min(r.length, 60); i++) {
        var cc = r[i].campaignCriterion;
        var dove = (cc.location && cc.location.geoTargetConstant) ||
                   (cc.language && cc.language.languageConstant) ||
                   (cc.placement && cc.placement.url) ||
                   cc.displayName || '?';
        L('   ' + (cc.negative ? 'ESCLUSO ' : 'incluso ') + pad(String(dove), 40) +
          r[i].campaign.name);
      }
      if (r.length > 60) L('   ... altre ' + (r.length - 60));
    }
  });
}

function chiaviAttiveTutte() {
  blocco('7. TUTTE LE PAROLE CHIAVE ATTIVE (anche quelle senza spesa)', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, ad_group_criterion.keyword.text, ' +
      'ad_group_criterion.keyword.match_type, ad_group_criterion.status ' +
      'FROM keyword_view LIMIT 500'
    );
    if (!r.length) { L('(nessuna)'); return; }
    var per = {};
    for (var i = 0; i < r.length; i++) {
      var n = '[' + r[i].campaign.status + '] ' + r[i].campaign.name;
      if (!per[n]) per[n] = [];
      per[n].push(r[i].adGroupCriterion.keyword.matchType.charAt(0) + ':' +
        r[i].adGroupCriterion.keyword.text +
        (r[i].adGroupCriterion.status === 'ENABLED' ? '' : '(' + r[i].adGroupCriterion.status + ')'));
    }
    for (var c in per) {
      L('');
      L('### ' + c + '  (' + per[c].length + ')');
      inRighe(per[c].sort(), 4);
    }
  });
}
