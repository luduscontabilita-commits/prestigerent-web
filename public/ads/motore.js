/* ================================================================
   PRESTIGE RENT — IL MOTORE
   Questo file vive su Vercel. Lo script dentro Google Ads e' solo un
   ponte di cinque righe che lo scarica e lo esegue: da qui in avanti
   il codice si cambia pubblicando, non incollando.

   VERSIONE DI PROVA — non tocca niente, scrive solo nel log.
   Serve a verificare che il ponte regga prima di metterci dentro
   operazioni vere.
   ================================================================ */

Logger.log('================================================================');
Logger.log('PONTE OK — questo codice arriva da Vercel');
Logger.log('================================================================');

var a = AdsApp.currentAccount();
Logger.log('account   : ' + a.getName() + '  (' + a.getCustomerId() + ')');
Logger.log('valuta    : ' + a.getCurrencyCode() + '   fuso: ' + a.getTimeZone());

try {
  Logger.log('anteprima : ' + AdsApp.getExecutionInfo().isPreview());
  Logger.log('script    : ' + AdsApp.getExecutionInfo().getScriptName());
} catch (e) {
  Logger.log('(non riesco a leggere le info di esecuzione: ' + e + ')');
}

Logger.log('versione  : PROVA-1  del 26 agosto 2026, ore 20');
Logger.log('');
Logger.log('Se leggi queste righe, il ponte funziona: il codice non e\' piu\'');
Logger.log('dentro Google Ads. Da adesso si cambia da Vercel, e questo');
Logger.log('riquadro non si tocca mai piu\'.');
