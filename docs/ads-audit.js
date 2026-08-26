/* PRESTIGE RENT — RADIOGRAFIA DELL'ACCOUNT GOOGLE ADS
 *
 * SOLO LETTURA. Non crea, non modifica, non spegne niente.
 * Ogni blocco e' dentro un try: se un campo non esiste nella versione
 * dell'API, quel blocco stampa l'errore e gli altri vanno avanti lo stesso.
 *
 * Dove si incolla: account Prestige Rent (447-009-4152)
 *   Strumenti e impostazioni -> Azioni collettive -> Script -> +
 *   Incolla, Autorizza, ANTEPRIMA, poi guarda la scheda "Log".
 */

var GIORNI = 'LAST_30_DAYS';

function main() {
  var acc = AdsApp.currentAccount();
  L('================================================================');
  L('ACCOUNT: ' + acc.getName() + '  (' + acc.getCustomerId() + ')');
  L('Valuta: ' + acc.getCurrencyCode() + '   Fuso: ' + acc.getTimeZone());
  L('Periodo analizzato: ' + GIORNI);
  L('================================================================');

  campagne();
  gruppi();
  paroleChiave();
  termini();
  negativeCampagna();
  listeCondivise();
  azioniConversione();
  dispositivi();
  geografia();
  annunci();
  estensioni();

  L('');
  L('=== FINE ===');
}

/* ---------------------------------------------------------------- */

function L(s) { Logger.log(s); }

function eur(micros) {
  return (Number(micros || 0) / 1000000).toFixed(2);
}

function blocco(titolo, fn) {
  L('');
  L('--------------------------------------------------------------');
  L(titolo);
  L('--------------------------------------------------------------');
  try {
    fn();
  } catch (e) {
    L('!! ERRORE in questo blocco: ' + e);
  }
}

function righe(query) {
  var out = [];
  var it = AdsApp.search(query);
  while (it.hasNext()) out.push(it.next());
  return out;
}

/* ---------------------------------------------------------------- */

function campagne() {
  blocco('1. CAMPAGNE', function () {
    var r = righe(
      'SELECT campaign.id, campaign.name, campaign.status, ' +
      'campaign.advertising_channel_type, campaign.bidding_strategy_type, ' +
      'campaign_budget.amount_micros, campaign_budget.explicitly_shared, ' +
      'metrics.cost_micros, metrics.clicks, metrics.impressions, ' +
      'metrics.conversions, metrics.conversions_value, metrics.average_cpc ' +
      'FROM campaign WHERE segments.date DURING ' + GIORNI +
      ' ORDER BY metrics.cost_micros DESC'
    );
    if (!r.length) { L('(nessuna campagna con dati)'); return; }

    var totC = 0, totCl = 0, totCv = 0, totVal = 0;
    for (var i = 0; i < r.length; i++) {
      var c = r[i].campaign, b = r[i].campaignBudget, m = r[i].metrics;
      totC += Number(m.costMicros || 0);
      totCl += Number(m.clicks || 0);
      totCv += Number(m.conversions || 0);
      totVal += Number(m.conversionsValue || 0);
      L('');
      L('[' + c.status + '] ' + c.name);
      L('   tipo: ' + c.advertisingChannelType + '   offerte: ' + c.biddingStrategyType);
      L('   budget/giorno: ' + eur(b && b.amountMicros) +
        (b && b.explicitlyShared ? ' (CONDIVISO)' : ''));
      L('   spesa: ' + eur(m.costMicros) +
        '   clic: ' + m.clicks +
        '   impr: ' + m.impressions +
        '   CPC medio: ' + eur(m.averageCpc));
      L('   conversioni: ' + Number(m.conversions || 0).toFixed(1) +
        '   valore: ' + Number(m.conversionsValue || 0).toFixed(2));
      if (Number(m.conversions) > 0) {
        L('   >>> CPA: ' + (Number(m.costMicros) / 1000000 / Number(m.conversions)).toFixed(2));
      } else if (Number(m.costMicros) > 0) {
        L('   >>> ZERO CONVERSIONI TRACCIATE');
      }
    }
    L('');
    L('TOTALE  spesa ' + eur(totC) + '   clic ' + totCl +
      '   conv ' + totCv.toFixed(1) + '   valore ' + totVal.toFixed(2));
    if (totCv > 0) L('CPA medio account: ' + (totC / 1000000 / totCv).toFixed(2));
  });
}

function gruppi() {
  blocco('2. GRUPPI DI ANNUNCI CON SPESA', function () {
    var r = righe(
      'SELECT campaign.name, ad_group.name, ad_group.status, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions ' +
      'FROM ad_group WHERE segments.date DURING ' + GIORNI +
      ' AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC LIMIT 60'
    );
    if (!r.length) { L('(nessuno)'); return; }
    for (var i = 0; i < r.length; i++) {
      var x = r[i];
      L(pad(eur(x.metrics.costMicros), 9) + ' | ' +
        pad(String(x.metrics.clicks), 5) + 'clic | ' +
        pad(Number(x.metrics.conversions || 0).toFixed(1), 5) + 'conv | ' +
        '[' + x.adGroup.status + '] ' +
        x.campaign.name + ' > ' + x.adGroup.name);
    }
  });
}

function paroleChiave() {
  blocco('3. PAROLE CHIAVE CON SPESA (top 80)', function () {
    var r = righe(
      'SELECT campaign.name, ad_group.name, ' +
      'ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ' +
      'ad_group_criterion.status, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.average_cpc ' +
      'FROM keyword_view WHERE segments.date DURING ' + GIORNI +
      ' AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC LIMIT 80'
    );
    if (!r.length) { L('(nessuna)'); return; }
    var sprecato = 0;
    for (var i = 0; i < r.length; i++) {
      var x = r[i], k = x.adGroupCriterion.keyword, m = x.metrics;
      var conv = Number(m.conversions || 0);
      if (conv === 0) sprecato += Number(m.costMicros || 0);
      L(pad(eur(m.costMicros), 9) + ' | ' +
        pad(String(m.clicks), 4) + 'c | ' +
        pad(conv.toFixed(1), 5) + 'cv | ' +
        pad(k.matchType, 7) + ' | ' +
        pad('"' + k.text + '"', 42) + ' | ' + x.campaign.name);
    }
    L('');
    L('>>> Spesa su parole chiave con ZERO conversioni tracciate: ' + eur(sprecato));
  });
}

function termini() {
  blocco('4. TERMINI DI RICERCA (top 120 per spesa)', function () {
    var r = righe(
      'SELECT search_term_view.search_term, campaign.name, ad_group.name, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions ' +
      'FROM search_term_view WHERE segments.date DURING ' + GIORNI +
      ' AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC LIMIT 120'
    );
    if (!r.length) { L('(nessuno)'); return; }
    var senza = 0;
    for (var i = 0; i < r.length; i++) {
      var x = r[i], m = x.metrics;
      var conv = Number(m.conversions || 0);
      if (conv === 0) senza += Number(m.costMicros || 0);
      L(pad(eur(m.costMicros), 9) + ' | ' +
        pad(String(m.clicks), 4) + 'c | ' +
        pad(conv.toFixed(1), 5) + 'cv | ' +
        pad(x.searchTermView.searchTerm, 55) + ' | ' + x.campaign.name);
    }
    L('');
    L('>>> Spesa su termini con ZERO conversioni tracciate: ' + eur(senza));
  });
}

function negativeCampagna() {
  blocco('5. NEGATIVE A LIVELLO DI CAMPAGNA', function () {
    var r = righe(
      'SELECT campaign.name, campaign_criterion.keyword.text, ' +
      'campaign_criterion.keyword.match_type ' +
      'FROM campaign_criterion ' +
      "WHERE campaign_criterion.type = 'KEYWORD' " +
      'AND campaign_criterion.negative = TRUE'
    );
    if (!r.length) { L('(nessuna negative a livello di campagna)'); return; }

    var perCampagna = {};
    for (var i = 0; i < r.length; i++) {
      var n = r[i].campaign.name;
      if (!perCampagna[n]) perCampagna[n] = [];
      perCampagna[n].push(r[i].campaignCriterion.keyword.matchType.charAt(0) +
        ':' + r[i].campaignCriterion.keyword.text);
    }
    L('TOTALE negative di campagna: ' + r.length);
    L('');
    for (var c in perCampagna) {
      var lista = perCampagna[c];
      L('### ' + c + '  (' + lista.length + ')');
      var max = Math.min(lista.length, 120);
      for (var j = 0; j < max; j++) L('   ' + lista[j]);
      if (lista.length > max) L('   ... altre ' + (lista.length - max) + ' non stampate');
      L('');
    }
  });
}

function listeCondivise() {
  blocco('6. LISTE DI NEGATIVE CONDIVISE', function () {
    var set = righe(
      'SELECT shared_set.id, shared_set.name, shared_set.type, ' +
      'shared_set.member_count, shared_set.status FROM shared_set'
    );
    if (!set.length) { L('(nessuna lista condivisa)'); }
    for (var i = 0; i < set.length; i++) {
      var s = set[i].sharedSet;
      L('LISTA "' + s.name + '"  tipo=' + s.type +
        '  elementi=' + s.memberCount + '  stato=' + s.status);
    }

    L('');
    L('-- quali campagne le usano --');
    var uso = righe(
      'SELECT campaign.name, shared_set.name FROM campaign_shared_set'
    );
    if (!uso.length) L('(nessun collegamento: le liste NON sono applicate!)');
    for (var j = 0; j < uso.length; j++) {
      L('   ' + uso[j].campaign.name + '  <--  ' + uso[j].sharedSet.name);
    }

    L('');
    L('-- contenuto delle liste (max 200 voci) --');
    var voci = righe(
      'SELECT shared_set.name, shared_criterion.keyword.text, ' +
      'shared_criterion.keyword.match_type FROM shared_criterion LIMIT 200'
    );
    for (var k = 0; k < voci.length; k++) {
      L('   [' + voci[k].sharedSet.name + '] ' +
        voci[k].sharedCriterion.keyword.matchType.charAt(0) + ':' +
        voci[k].sharedCriterion.keyword.text);
    }
    if (voci.length === 200) L('   ... (troncato a 200)');
  });
}

function azioniConversione() {
  blocco('7. AZIONI DI CONVERSIONE', function () {
    var r = righe(
      'SELECT conversion_action.name, conversion_action.type, ' +
      'conversion_action.category, conversion_action.status, ' +
      'conversion_action.primary_for_goal, conversion_action.counting_type, ' +
      'conversion_action.click_through_lookback_window_days, ' +
      'conversion_action.value_settings.default_value ' +
      'FROM conversion_action'
    );
    if (!r.length) { L('(nessuna)'); return; }
    for (var i = 0; i < r.length; i++) {
      var a = r[i].conversionAction;
      L('');
      L('"' + a.name + '"');
      L('   tipo: ' + a.type + '   categoria: ' + a.category);
      L('   stato: ' + a.status +
        '   PRIMARIA: ' + (a.primaryForGoal === false ? 'NO (secondaria)' : 'SI'));
      L('   conteggio: ' + a.countingType +
        '   finestra clic: ' + a.clickThroughLookbackWindowDays + ' giorni');
      if (a.valueSettings) L('   valore predefinito: ' + a.valueSettings.defaultValue);
    }
    L('');
    L('NOTA: solo le PRIMARIE guidano le offerte automatiche.');
  });
}

function dispositivi() {
  blocco('8. DISPOSITIVI', function () {
    var r = righe(
      'SELECT segments.device, metrics.cost_micros, metrics.clicks, ' +
      'metrics.conversions, metrics.conversions_value ' +
      'FROM campaign WHERE segments.date DURING ' + GIORNI
    );
    var agg = {};
    for (var i = 0; i < r.length; i++) {
      var d = r[i].segments.device;
      if (!agg[d]) agg[d] = { c: 0, cl: 0, cv: 0, v: 0 };
      agg[d].c += Number(r[i].metrics.costMicros || 0);
      agg[d].cl += Number(r[i].metrics.clicks || 0);
      agg[d].cv += Number(r[i].metrics.conversions || 0);
      agg[d].v += Number(r[i].metrics.conversionsValue || 0);
    }
    for (var k in agg) {
      var a = agg[k];
      L(pad(k, 10) + ' spesa ' + pad(eur(a.c), 9) +
        '  clic ' + pad(String(a.cl), 5) +
        '  conv ' + pad(a.cv.toFixed(1), 6) +
        '  CPA ' + (a.cv > 0 ? (a.c / 1000000 / a.cv).toFixed(2) : '---') +
        '  CR ' + (a.cl > 0 ? (a.cv / a.cl * 100).toFixed(2) + '%' : '---'));
    }
  });
}

function geografia() {
  blocco('9. GEOGRAFIA (top 20 per spesa)', function () {
    var r = righe(
      'SELECT campaign.name, geographic_view.country_criterion_id, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions ' +
      'FROM geographic_view WHERE segments.date DURING ' + GIORNI +
      ' AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC LIMIT 20'
    );
    if (!r.length) { L('(nessun dato)'); return; }
    for (var i = 0; i < r.length; i++) {
      L(pad(eur(r[i].metrics.costMicros), 9) + ' | paese id ' +
        pad(String(r[i].geographicView.countryCriterionId), 8) + ' | ' +
        pad(String(r[i].metrics.clicks), 5) + 'clic | ' +
        Number(r[i].metrics.conversions || 0).toFixed(1) + 'conv | ' +
        r[i].campaign.name);
    }
    L('(id paese: 2380=Italia, 2840=USA, 2826=UK, 2036=Australia, 2124=Canada)');
  });
}

function annunci() {
  blocco('10. ANNUNCI ATTIVI CON SPESA', function () {
    var r = righe(
      'SELECT campaign.name, ad_group.name, ad_group_ad.ad.type, ' +
      'ad_group_ad.status, ad_group_ad.ad.final_urls, ' +
      'ad_group_ad.ad.responsive_search_ad.headlines, ' +
      'ad_group_ad.ad.responsive_search_ad.descriptions, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions ' +
      'FROM ad_group_ad WHERE segments.date DURING ' + GIORNI +
      ' AND metrics.cost_micros > 0 ORDER BY metrics.cost_micros DESC LIMIT 20'
    );
    if (!r.length) { L('(nessuno)'); return; }
    for (var i = 0; i < r.length; i++) {
      var a = r[i].adGroupAd, m = r[i].metrics;
      L('');
      L('[' + a.status + '] ' + a.ad.type + '  spesa ' + eur(m.costMicros) +
        '  clic ' + m.clicks + '  conv ' + Number(m.conversions || 0).toFixed(1));
      L('   ' + r[i].campaign.name + ' > ' + r[i].adGroup.name);
      if (a.ad.finalUrls) L('   URL: ' + a.ad.finalUrls.join(' , '));
      var rsa = a.ad.responsiveSearchAd;
      if (rsa && rsa.headlines) {
        var h = [];
        for (var j = 0; j < rsa.headlines.length; j++) h.push(rsa.headlines[j].text);
        L('   TITOLI: ' + h.join(' | '));
      }
      if (rsa && rsa.descriptions) {
        var d = [];
        for (var q = 0; q < rsa.descriptions.length; q++) d.push(rsa.descriptions[q].text);
        L('   DESCR: ' + d.join(' | '));
      }
    }
  });
}

function estensioni() {
  blocco('11. ASSET / ESTENSIONI COLLEGATE', function () {
    var r = righe(
      'SELECT campaign.name, asset.type, asset.name, ' +
      'campaign_asset.field_type, campaign_asset.status ' +
      'FROM campaign_asset LIMIT 80'
    );
    if (!r.length) { L('(nessun asset a livello di campagna)'); return; }
    for (var i = 0; i < r.length; i++) {
      L(pad(r[i].campaignAsset.fieldType, 18) + ' | ' +
        pad(r[i].asset.type, 14) + ' | ' +
        (r[i].asset.name || '(senza nome)') + ' | ' + r[i].campaign.name);
    }
  });
}

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += ' ';
  return s;
}
