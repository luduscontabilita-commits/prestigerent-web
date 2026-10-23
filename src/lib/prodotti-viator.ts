/* I CODICI PRODOTTO DI VIATOR, E A COSA SERVONO.
 *
 * ── PERCHE' QUESTO FILE ESISTE ────────────────────────────────────────
 * Una risposta pubblicata sparisce. Il portale, in «Manage reviews»,
 * elenca SOLO le recensioni ancora senza risposta: appena rispondi, la
 * riga non si vede piu' (verificato il 23/10/2026 -- dopo aver risposto
 * a Gail_W il contatore e' passato da 10 a 9 e la sua riga e' uscita
 * dall'elenco). E la pagina pubblica di Viator le risposte del fornitore
 * non le mostra affatto.
 *
 * Risultato: una volta pubblicata, una risposta non si ritrova piu' da
 * nessuna parte. Il pannello e' l'unico posto dove resta -- ma senza un
 * link «dove sta» e' una riga in un elenco, non una cosa che si puo'
 * controllare. Questi codici servono a costruire quel link.
 *
 * ── DA DOVE VENGONO ───────────────────────────────────────────────────
 * Letti il 23/10/2026 dalla tendina dei prodotti del portale fornitore
 * (supplier.viator.com/reviews), che li elenca tutti e 31 col titolo
 * esatto. Non sono stati indovinati.
 *
 * ── COME SI COSTRUISCE L'INDIRIZZO ────────────────────────────────────
 * `viator.com/tours/<citta'>/<qualsiasi-cosa>/d519-<CODICE>`: quello che
 * conta e' la coda `d519-CODICE`, il resto Viator lo riscrive da solo.
 * Provato in produzione: un indirizzo con lo slug sbagliato viene
 * rediretto sulla scheda giusta.
 */

/** titolo del prodotto (come lo scrive il portale) -> codice Viator */
export const CODICI: Record<string, string> = {
  'Cinque Terre Small Group Guided Tour from Florence': '5292P27',
  'Civitavecchia Shore Excursion: Independent Castel Romano Outlets Shopping Trip':
    '5292PRTFCOCASTELROMA',
  'Civitavecchia Shore Excursion: Independent Rome Day Trip': '5292PRTFCOROME',
  'Civitavecchia Shore Excursion: Private Day Trip to Tarquinia and Tuscania':
    '5292PRTFCOTARQUINA',
  'Genoa Shore Excursion: Genoa Independent Sightseeing Experience with Private Driver':
    '5292PRTGOAGENOA',
  'Genoa Shore Excursion: Private Day Trip to Cinque Terre': '5292PRTGOACINQUE',
  'Genoa Shore Excursion: Private Day Trip to Portofino and Santa Margherita Ligure':
    '5292PRTGOAPORTOFINO',
  'La Spezia Shore Excursion: Chianti Wine-Tasting Trip': '5292PRTPSACHIANTI',
  'La Spezia Shore Excursion: Pisa and Lucca Day Trip': '5292PRTPSAPISALUCCA',
  'La Spezia Shore Excursion: Private Day Trip to Florence and Pisa': '5292PRTPSAFLORENCE',
  'Livorno Shore Excursion: Chianti and Tuscany Countryside Private Wine Tour': '5292LIVORNO2',
  'Livorno Shore Excursion: Livorno Cruise Port to Florence Round-trip Private Transfers':
    '5292LIVORNO4',
  'Livorno Shore Excursion: Pisa and Florence Private Day Trip': '5292LIVORNO1',
  'Livorno Shore Excursion: Private Day Trip to Siena and San Gimignano': '5292LIVORNO3',
  'Messina Shore Excursion: Acireale, Catania and Cyclops Riviera Day Trip': '5292PRTREGCATANIA',
  'Messina Shore Excursion: Private Day Trip to Taormina and Mt Etna': '5292PRTREGTAORMINA',
  'Palermo Shore Excursion: Palermo, Monreale and Mondello Private Day Trip': '5292PRTPMOPALERMO',
  'Palermo Shore Excursion: Private Day Trip to Cefalù': '5292PRTPMOCEFALU',
  'Palermo Shore Excursion: Private Day Trip to Segesta, Erice and Marsala': '5292PRTPMOMARSALA',
  'Private Day Trip to Cinque Terre and Pisa from Florence': '5292P32',
  'Private day trip to Siena, San Gimignano, Chianti and Pisa, from Florence': '5292P31',
  'Private daytrip to Siena & Chianti wine country, with wine tasting from Florence': '5292P33',
  'Private half day trip to Pisa, from Florence': '5292P34',
  'Small group Tuscan Wineries, Olive Oil & Gourmet Lunch or Dinner': '5292P28',
  'Small-Group Wine Tasting Experience in the Tuscan Countryside': '5292P25',
  'Sorrento Shore Excursion: Pompeii, Positano and Sorrento Day Trip': '5292PRTRROPOMPEII',
  'Sorrento Shore Excursion: Positano, Sorrento and Amalfi Day Trip': '5292PRTRROSORRENTO',
  'Sorrento Shore Excursion: Private Day Trip to Positano, Amalfi and Ravello': '5292PRTRROAMALFI',
  'Taormina Shore Excursion: Acireale, Catania and Cyclops Riviera Trip': '5292PRTCTACATANIA',
  'Taormina Shore Excursion: Taormina and Mt Etna Day Trip': '5292PRTCTATAORMINA',
  'Tuscany Small Group Tour: Siena & San Gimignano with Winery Lunch': '5292P26',
};

function aSlug(titolo: string): string {
  return (
    titolo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'tour'
  );
}

/** L'indirizzo pubblico della scheda, o null se il prodotto non e' in
 *  elenco (un prodotto nuovo: si aggiunge qui, non si indovina). */
export function linkProdottoViator(titolo: string | null): string | null {
  const t = (titolo ?? '').trim();
  if (!t) return null;
  const codice = CODICI[t];
  if (!codice) return null;
  return `https://www.viator.com/tours/Florence/${aSlug(t)}/d519-${codice}`;
}
