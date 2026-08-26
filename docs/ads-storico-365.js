/* PRESTIGE RENT — STORICO 365 GIORNI, CAMPAGNE IN PAUSA E RIMOSSE COMPRESE
 *
 * SOLO LETTURA. Non crea, non modifica, non mette in pausa niente.
 *
 * La domanda a cui risponde: QUALI CHIAVI HANNO DAVVERO PRENOTATO,
 * e a che costo per clic. Non "quali hanno zero conversioni" -- quello
 * lo sappiamo gia' che e' un numero cieco.
 *
 * Dove si incolla: account Prestige Rent (447-009-4152)
 *   Strumenti e impostazioni -> Azioni collettive -> Script -> +
 *   Incolla, Autorizza, ANTEPRIMA, poi scheda "Log".
 */

function main() {
  var acc = AdsApp.currentAccount();
  var tz = acc.getTimeZone();
  var oggi = new Date();
  var da = new Date(oggi.getTime() - 365 * 24 * 3600 * 1000);
  DAL = Utilities.formatDate(da, tz, 'yyyy-MM-dd');
  AL = Utilities.formatDate(oggi, tz, 'yyyy-MM-dd');

  L('================================================================');
  L('ACCOUNT: ' + acc.getName() + '  (' + acc.getCustomerId() + ')');
  L('Periodo: ' + DAL + '  ->  ' + AL + '   (365 giorni)');
  L('Include campagne PAUSED e REMOVED.');
  L('================================================================');

  campagneStoriche();
  chiaviCheHannoConvertito();
  chiaviCareSenzaConversioni();
  terminiCheHannoConvertito();
  perAzioneDiConversione();
  azionePerDispositivo();
  dispositiviPerCampagna();
  andamentoMensile();
  pagineDestinazione();

  L('');
  L('=== FINE ===');
}

var DAL, AL;

function L(s) { Logger.log(s); }
function eur(m) { return (Number(m || 0) / 1000000).toFixed(2); }
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function padS(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }

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

function periodo() {
  return " AND segments.date BETWEEN '" + DAL + "' AND '" + AL + "'";
}

/* ---------------------------------------------------------------- */

function campagneStoriche() {
  blocco('A. TUTTE LE CAMPAGNE DELL\'ANNO (anche in pausa e rimosse)', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, campaign.advertising_channel_type, ' +
      'campaign.bidding_strategy_type, campaign_budget.amount_micros, ' +
      'metrics.cost_micros, metrics.clicks, metrics.impressions, ' +
      'metrics.conversions, metrics.conversions_value, metrics.average_cpc ' +
      'FROM campaign WHERE metrics.cost_micros > 0' + periodo() +
      ' ORDER BY metrics.cost_micros DESC'
    );
    if (!r.length) { L('(niente)'); return; }
    for (var i = 0; i < r.length; i++) {
      var c = r[i].campaign, m = r[i].metrics;
      var conv = Number(m.conversions || 0);
      L('');
      L('[' + c.status + '] ' + c.name);
      L('   ' + c.advertisingChannelType + '  |  offerte: ' + c.biddingStrategyType);
      L('   spesa ' + eur(m.costMicros) + '   clic ' + m.clicks +
        '   CPC medio ' + eur(m.averageCpc));
      L('   conv ' + conv.toFixed(1) + '   valore ' + Number(m.conversionsValue || 0).toFixed(2) +
        (conv > 0 ? '   CPA ' + (Number(m.costMicros) / 1000000 / conv).toFixed(2) : '   --- nessuna'));
    }
  });
}

function chiaviCheHannoConvertito() {
  blocco('B. >>> LE CHIAVI CHE HANNO CONVERTITO <<<  (il blocco che conta)', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, ad_group.name, ' +
      'ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ' +
      'ad_group_criterion.status, metrics.cost_micros, metrics.clicks, ' +
      'metrics.conversions, metrics.conversions_value, metrics.average_cpc ' +
      'FROM keyword_view WHERE metrics.conversions > 0' + periodo() +
      ' ORDER BY metrics.conversions DESC LIMIT 120'
    );
    if (!r.length) { L('(nessuna chiave con conversioni nell\'anno)'); return; }

    L(pad('CONV', 6) + pad('CPA', 10) + pad('CPCmed', 9) + pad('SPESA', 10) +
      pad('CLIC', 6) + pad('MATCH', 8) + pad('CHIAVE', 44) + 'CAMPAGNA');
    L('');
    var totC = 0, totCv = 0;
    for (var i = 0; i < r.length; i++) {
      var k = r[i].adGroupCriterion.keyword, m = r[i].metrics;
      var conv = Number(m.conversions || 0), costo = Number(m.costMicros || 0);
      totC += costo; totCv += conv;
      L(pad(conv.toFixed(1), 6) +
        pad((costo / 1000000 / conv).toFixed(2), 10) +
        pad(eur(m.averageCpc), 9) +
        pad(eur(costo), 10) +
        pad(String(m.clicks), 6) +
        pad(k.matchType, 8) +
        pad('"' + k.text + '"', 44) +
        '[' + r[i].campaign.status + '] ' + r[i].campaign.name);
    }
    L('');
    L('TOTALE su queste chiavi: spesa ' + eur(totC) + '  conv ' + totCv.toFixed(1) +
      '  CPA ' + (totC / 1000000 / totCv).toFixed(2));
    L('');
    L('COME SI LEGGE: la colonna CPCmed dice quanto e\' costato il clic su una');
    L('chiave che PRENOTA. Se una chiave converte con CPC medio 3.20, un tetto');
    L('a 1.80 la sta escludendo dalle aste buone -- non la sta risparmiando.');
  });
}

function chiaviCareSenzaConversioni() {
  blocco('C. CHIAVI CON SPESA ALTA E ZERO CONVERSIONI (per confronto)', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, ' +
      'ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.average_cpc ' +
      'FROM keyword_view WHERE metrics.conversions = 0 AND metrics.cost_micros > 50000000' +
      periodo() + ' ORDER BY metrics.cost_micros DESC LIMIT 60'
    );
    if (!r.length) { L('(nessuna sopra i 50 euro)'); return; }
    var tot = 0;
    for (var i = 0; i < r.length; i++) {
      var k = r[i].adGroupCriterion.keyword, m = r[i].metrics;
      tot += Number(m.costMicros || 0);
      L(pad(eur(m.costMicros), 10) + pad(String(m.clicks) + ' clic', 11) +
        pad('CPC ' + eur(m.averageCpc), 12) +
        pad(k.matchType, 8) + pad('"' + k.text + '"', 44) +
        '[' + r[i].campaign.status + '] ' + r[i].campaign.name);
    }
    L('');
    L('Totale: ' + eur(tot));
    L('ATTENZIONE: "zero conversioni" qui vuol dire zero TRACCIATE. Con il');
    L('tracciamento che perde il 70-80%, questa lista non e\' una condanna:');
    L('e\' un elenco di chiavi da guardare una per una.');
  });
}

function terminiCheHannoConvertito() {
  blocco('D. TERMINI DI RICERCA CHE HANNO CONVERTITO', function () {
    var r = righe(
      'SELECT search_term_view.search_term, campaign.name, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions, ' +
      'metrics.conversions_value, metrics.average_cpc ' +
      'FROM search_term_view WHERE metrics.conversions > 0' + periodo() +
      ' ORDER BY metrics.conversions DESC LIMIT 100'
    );
    if (!r.length) { L('(nessuno)'); return; }
    for (var i = 0; i < r.length; i++) {
      var m = r[i].metrics;
      L(pad(Number(m.conversions || 0).toFixed(1) + ' cv', 8) +
        pad(eur(m.costMicros), 10) +
        pad('CPC ' + eur(m.averageCpc), 12) +
        pad(String(m.clicks) + ' clic', 10) +
        pad(r[i].searchTermView.searchTerm, 55) + r[i].campaign.name);
    }
  });
}

function perAzioneDiConversione() {
  blocco('E. >>> DA QUALE AZIONE ARRIVANO LE CONVERSIONI <<<', function () {
    var r = righe(
      'SELECT campaign.name, segments.conversion_action_name, ' +
      'metrics.conversions, metrics.conversions_value ' +
      'FROM campaign WHERE metrics.conversions > 0' + periodo()
    );
    if (!r.length) { L('(niente)'); return; }

    var perAzione = {};
    for (var i = 0; i < r.length; i++) {
      var a = r[i].segments.conversionActionName;
      var c = r[i].campaign.name;
      if (!perAzione[a]) perAzione[a] = { tot: 0, val: 0, camp: {} };
      perAzione[a].tot += Number(r[i].metrics.conversions || 0);
      perAzione[a].val += Number(r[i].metrics.conversionsValue || 0);
      perAzione[a].camp[c] = (perAzione[a].camp[c] || 0) + Number(r[i].metrics.conversions || 0);
    }
    for (var az in perAzione) {
      var x = perAzione[az];
      L('');
      L('"' + az + '"   ->  ' + x.tot.toFixed(1) + ' conversioni, valore ' + x.val.toFixed(2));
      for (var cc in x.camp) L('      ' + padS(x.camp[cc].toFixed(1), 8) + '  da  ' + cc);
    }
    L('');
    L('E\' QUI che si vede se le 44 conversioni sono prenotazioni o rumore.');
  });
}

function azionePerDispositivo() {
  blocco('F. >>> AZIONE x DISPOSITIVO — la prova sul mobile <<<', function () {
    var r = righe(
      'SELECT segments.device, segments.conversion_action_name, metrics.conversions ' +
      'FROM campaign WHERE metrics.conversions > 0' + periodo()
    );
    if (!r.length) { L('(niente)'); return; }
    var m = {};
    for (var i = 0; i < r.length; i++) {
      var d = r[i].segments.device, a = r[i].segments.conversionActionName;
      if (!m[a]) m[a] = {};
      m[a][d] = (m[a][d] || 0) + Number(r[i].metrics.conversions || 0);
    }
    for (var az in m) {
      L('');
      L('"' + az + '"');
      for (var dv in m[az]) L('      ' + pad(dv, 12) + m[az][dv].toFixed(1));
    }
    L('');
    L('SE il mobile sparisce SOLO sulle azioni che dipendono dai cookie');
    L('(Acquisto) ma regge su quelle immediate (WhatsApp, Telefono, che');
    L('scattano sul clic e non aspettano il ritorno), allora il mobile');
    L('converte e il problema e\' Safari -- non la landing.');
  });
}

function dispositiviPerCampagna() {
  blocco('G. DISPOSITIVI PER CAMPAGNA (solo Search)', function () {
    var r = righe(
      'SELECT campaign.name, campaign.status, segments.device, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions ' +
      "FROM campaign WHERE campaign.advertising_channel_type = 'SEARCH' " +
      'AND metrics.cost_micros > 0' + periodo() +
      ' ORDER BY metrics.cost_micros DESC LIMIT 60'
    );
    if (!r.length) { L('(niente)'); return; }
    for (var i = 0; i < r.length; i++) {
      var m = r[i].metrics, cv = Number(m.conversions || 0);
      L(pad(r[i].segments.device, 10) +
        pad(eur(m.costMicros), 10) +
        pad(String(m.clicks) + ' clic', 11) +
        pad(cv.toFixed(1) + ' cv', 9) +
        pad('CR ' + (m.clicks > 0 ? (cv / m.clicks * 100).toFixed(2) + '%' : '---'), 12) +
        '[' + r[i].campaign.status + '] ' + r[i].campaign.name);
    }
  });
}

function andamentoMensile() {
  blocco('H. ANDAMENTO MESE PER MESE', function () {
    var r = righe(
      'SELECT segments.month, metrics.cost_micros, metrics.clicks, ' +
      'metrics.conversions, metrics.conversions_value ' +
      'FROM customer WHERE metrics.cost_micros > 0' + periodo() +
      ' ORDER BY segments.month ASC'
    );
    if (!r.length) { L('(niente)'); return; }
    L(pad('MESE', 10) + pad('SPESA', 11) + pad('CLIC', 8) +
      pad('CONV', 8) + pad('CPA', 10) + 'CPC medio');
    for (var i = 0; i < r.length; i++) {
      var m = r[i].metrics, cv = Number(m.conversions || 0), co = Number(m.costMicros || 0);
      L(pad(r[i].segments.month, 10) +
        pad(eur(co), 11) +
        pad(String(m.clicks), 8) +
        pad(cv.toFixed(1), 8) +
        pad(cv > 0 ? (co / 1000000 / cv).toFixed(2) : '---', 10) +
        (m.clicks > 0 ? (co / 1000000 / m.clicks).toFixed(2) : '---'));
    }
  });
}

function pagineDestinazione() {
  blocco('I. PAGINE DI DESTINAZIONE', function () {
    var r = righe(
      'SELECT landing_page_view.unexpanded_final_url, ' +
      'metrics.cost_micros, metrics.clicks, metrics.conversions ' +
      'FROM landing_page_view WHERE metrics.cost_micros > 0' + periodo() +
      ' ORDER BY metrics.cost_micros DESC LIMIT 25'
    );
    if (!r.length) { L('(niente)'); return; }
    for (var i = 0; i < r.length; i++) {
      var m = r[i].metrics, cv = Number(m.conversions || 0);
      L(pad(eur(m.costMicros), 10) + pad(String(m.clicks) + ' clic', 11) +
        pad(cv.toFixed(1) + ' cv', 9) +
        pad('CR ' + (m.clicks > 0 ? (cv / m.clicks * 100).toFixed(2) + '%' : '---'), 12));
      L('     ' + r[i].landingPageView.unexpandedFinalUrl);
    }
  });
}
