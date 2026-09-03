/* LE FOTO DI UN TOUR: SOLO QUELLE CHE C'ENTRANO.
 *
 * ── IL GUASTO, MISURATO ─────────────────────────────────────────────────
 * Su WordPress le gallerie erano state "pareggiate" a quattro foto per
 * tour, e i buchi tappati con le stesse immagini per tutti. Contato il
 * 03/09/2026 su tutti gli 87 tour, dentro `tour_content.blocks.images`:
 *
 *     Mercedes-Benz-Classe-E-black.png ........ su 44 tour
 *     TUSCANY-HILLTOP-WINERY.jpg .............. su 42 tour
 *     Mercedes-Benz-Classe-V-black.png ........ su 40 tour
 *     Mercedes-Benz-Classe-S / sprinter ....... su 14 tour ciascuna
 *     TUSCANY-WINE-CELLAR.jpg ................. su 10 tour
 *
 * 46 tour su 87 avevano esattamente quattro foto: una vera e tre di
 * riempimento. Il risultato sulla pagina del transfer per Roma dal porto
 * di Civitavecchia erano quattro immagini di cui UNA di Roma, piu' una
 * vigna toscana e due automobili su fondo bianco.
 *
 * ── PERCHE' E' UN DANNO E NON UN DETTAGLIO ──────────────────────────────
 * Chiesto due volte dalla proprieta', la seconda cosi': *"ALTRIMENTI VA A
 * FINIRE DI TROVARE UNA VIGNA NELLE FOTO DI UN TOUR DI VENEZIA"*. Ed e'
 * esattamente quello che succedeva. Chi guarda le foto di un tour sta
 * decidendo se comprarlo: una vigna dove dovrebbe esserci Venezia non
 * riempie un buco, dice che chi vende non sa cosa vende.
 *
 * ── PERCHE' QUI E NON NEL DATABASE ──────────────────────────────────────
 * Ripulire le 87 righe a mano sarebbe stato piu' rapido, ed e' la strada
 * sbagliata per due motivi. Il primo: il prossimo tour che si importa
 * dallo stesso WordPress si riporta dietro gli stessi riempitivi, e
 * nessuno si ricorderebbe di ripulirlo. Il secondo: una modifica al
 * database non lascia traccia del perche', quindi fra sei mesi le foto
 * sono semplicemente "meno di prima" e non si sa piu' se e' voluto. Qui la
 * regola si legge, si discute e si corregge.
 *
 * ── LA REGOLA, A DUE LIVELLI ────────────────────────────────────────────
 * Una foto resta se la pagina parla davvero di cio' che mostra. Ma il
 * livello di prova richiesto NON e' lo stesso per tutte, e la differenza
 * e' il punto di tutto:
 *
 *   1. I MEZZI e gli SFONDI escono sempre. Le Mercedes su fondo bianco
 *      sono un catalogo, non un posto: la loro pagina e' `/our-vehicles/`.
 *      `bg-sunshine.jpg` e `hero-bg-toscana.jpg` sono fondali di pagina.
 *
 *   2. Una foto di LUOGO basta che il luogo sia nominato DA QUALCHE PARTE
 *      nella pagina, itinerario compreso. Una tappa in mezzo alla giornata
 *      e' un motivo buono per mostrare quel posto, anche se il titolo non
 *      lo nomina: e' il caso di `outlet-shopping-tour-from-livorno`, che
 *      passa da Firenze e tiene la foto dei tetti fiorentini.
 *
 *   3. Una foto di VIGNA GENERICA deve avere il vino nel TITOLO. Qui il
 *      testo non basta, e si vede su un caso solo:
 *      `florence-venice-with-stop-in-ferrara` dice "the oldest wine bar in
 *      the world", una riga sull'aperitivo -- e con la regola del testo si
 *      teneva una vigna toscana su un trasferimento per Venezia, cioe'
 *      precisamente la cosa che la proprieta' ha chiesto di togliere. Un
 *      tour di vino il vino ce l'ha nel nome.
 *
 * ── COSA FA, IN NUMERI ──────────────────────────────────────────────────
 * Provata su tutti gli 87 tour prima di scriverla: **156 foto tolte**
 * (114 mezzi e sfondi, 38 vigne generiche, 4 luoghi che la pagina non
 * nomina), 285 tenute. **Nessun tour resta senza foto**, ed era la cosa da
 * verificare: una galleria vuota sarebbe stata un guasto peggiore di una
 * vigna di troppo.
 *
 * 🔴 SE UN TOUR PERDE UNA FOTO CHE DOVEVA TENERE, non si tocca il
 * database: si aggiunge il nome del posto qui sotto in `LUOGHI`, oppure --
 * meglio -- si nomina quel posto nella descrizione del tour, che e' dove
 * un cliente lo cerca comunque.
 */

/** Le foto che non mostrano un posto: il catalogo dei mezzi e i fondali. */
const MEZZI_E_SFONDI = /mercedes|sprinter|minivan|hero-bg|bg-sunshine/i;

/* Le vigne, le cantine e i grappoli "generici": belli, e usati come
   tappabuchi su mezzo catalogo. Restano solo dove il vino e' il tour. */
const VIGNA_GENERICA = /tuscany-|tuscan|toscana|wine|vino|winer|grape|tasting/i;
const IL_VINO_E_IL_TOUR = /wine|vino|winer|chianti|brunello|tasting|olive/i;

/* Nome del file -> come si chiama quel posto nella pagina.
 *
 * A sinistra i pezzi di nome file (le foto arrivano da WordPress e i nomi
 * li ha scelti chi caricava: `firenze-cupola.jpg` e
 * `florence-roofs-view-opt.jpg` sono lo stesso posto in due lingue). A
 * destra come lo scrive la scheda. Gli errori di battitura stanno da tutte
 * e due le parti e ci restano: lo slug `...-with-stop-in-bologne` e il
 * file `museo-ferrai-ingresso.jpg` esistono davvero, e correggerli e'
 * un'altra faccenda -- qui vanno solo riconosciuti. */
const LUOGHI: [RegExp, RegExp][] = [
  [/rome|roma|colosseum|colosseo|vatican/i, /rome|roma|vatican/i],
  [/florence|firenze|ponte-vecchio|palazzo-vecchio|cupola|florence-david|smn/i, /florence|firenze/i],
  [/siena|palio/i, /siena/i],
  [/gimignano/i, /gimignano/i],
  [/pisa|battistero/i, /pisa/i],
  [/lucca/i, /lucca/i],
  [/volterra/i, /volterra/i],
  [/montepulciano/i, /montepulciano/i],
  [/montalcino/i, /montalcino/i],
  [/pienza/i, /pienza/i],
  [/cinque|terre/i, /cinque ?terre/i],
  [/spezia/i, /spezia/i],
  [/portofino/i, /portofino/i],
  [/orvieto/i, /orvieto/i],
  [/bologna|bologne|ducati/i, /bologna|bologne|ducati/i],
  [/modena|ferrari|ferrai|vinegar|balsamic/i, /modena|ferrari|ferrai|balsamic/i],
  [/lamborghini/i, /lamborghini/i],
  [/parma/i, /parma/i],
  [/ferrara/i, /ferrara/i],
  [/padova|padua/i, /padova|padua/i],
  [/milan/i, /milan/i],
  [/venice|venezia|ducal/i, /venice|venezia/i],
  [/napoli|naples/i, /napoli|naples/i],
  [/pompei/i, /pompei/i],
  [/sorrento/i, /sorrento/i],
  [/positano/i, /positano/i],
  [/amalfi/i, /amalfi/i],
  [/ravello/i, /ravello/i],
  [/outlet|the-mall|barberino/i, /outlet|the mall|shopping/i],
  /* Le cantine col nome proprio: Luiano, Casa Emma, San Michele a Torri,
     Falorni a Greve. Non sono "vigne generiche" -- sono POSTI, e valgono
     come tali su qualunque tour che passi dal Chianti. */
  [/luiano|casa-emma|torry|falorni|greve|chianti/i, /chianti|greve|wine|winer|vino/i],
];

/** Il testo della scheda su cui si decide. `titolo` e' la prova forte
 *  (indirizzo e nome del tour), `testo` la prova debole: tutto il resto,
 *  cioe' descrizione, punti forti e itinerario. */
export type ProvaTour = { titolo: string; testo: string };

/* Il testo di una scheda, ridotto a una riga di parole minuscole.
   I tag HTML vanno via: `<strong>Siena</strong>` deve valere "siena", e
   senza questo passaggio il nome di una classe CSS o un attributo
   qualunque potrebbe far passare una foto per una parola che in pagina
   non si legge. */
function inParole(...pezzi: (string | null | undefined)[]): string {
  return pezzi
    .filter(Boolean)
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^A-Za-zÀ-ſ]+/g, ' ')
    .toLowerCase();
}

/** La prova di un tour, costruita dai suoi blocchi. Un posto solo che sa
 *  quali campi contano, cosi' i chiamanti non lo ripetono uno per uno. */
export function provaDi(
  slug: string,
  b:
    | {
        name?: string | null;
        description?: string | null;
        highlights?: string[] | null;
        tabs?: Record<string, string> | null;
      }
    | null
    | undefined
): ProvaTour {
  const titolo = inParole(slug, b?.name);
  return {
    titolo,
    testo: inParole(
      titolo,
      b?.description,
      (b?.highlights ?? []).join(' '),
      Object.values(b?.tabs ?? {}).join(' ')
    ),
  };
}

/** Vero se questa foto ha qualcosa a che vedere con questo tour. */
export function fotoAttinente(url: string, prova: ProvaTour): boolean {
  const nome = url.split('/').pop() ?? url;
  if (MEZZI_E_SFONDI.test(nome)) return false;
  for (const [nelFile, nellaPagina] of LUOGHI) {
    if (nelFile.test(nome)) return nellaPagina.test(prova.testo);
  }
  if (VIGNA_GENERICA.test(nome)) return IL_VINO_E_IL_TOUR.test(prova.titolo);
  /* Nome che non dice niente -- `PVT-3.jpg`, `WE1.jpg`, `caption-7.jpg`,
     `1.jpg`. Sono 107 file usati da un tour solo: caricamenti fatti sulla
     pagina di quel tour, quindi suoi. Non c'e' niente contro cui
     verificarli, e nel dubbio si tengono: il riempimento si riconosce dal
     fatto che la stessa foto torna su decine di schede, e questi no. */
  return true;
}

/**
 * Le foto di un tour, tolte quelle che non c'entrano.
 *
 * 🔴 Se il filtro non lascia niente torna la PRIMA foto originale, non un
 * elenco vuoto. Su 87 tour non succede mai -- verificato -- ma il giorno
 * che un tour arrivasse con sole foto di riempimento, una copertina
 * qualunque e' meglio di un riquadro grigio in cima alla scheda: la pagina
 * resta in piedi e il difetto si vede, invece di rompersi.
 */
export function fotoVere(
  immagini: readonly string[] | null | undefined,
  prova: ProvaTour
): string[] {
  const tutte = (immagini ?? []).filter(Boolean);
  const vere = tutte.filter((u) => fotoAttinente(u, prova));
  return vere.length ? vere : tutte.slice(0, 1);
}
