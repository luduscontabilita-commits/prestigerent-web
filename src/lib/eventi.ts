/* IL CATALOGO DEI FATTI — questo file E' IL CONTRATTO CON GTM.
 *
 * ── IL PRINCIPIO ────────────────────────────────────────────────────
 * Le pagine dichiarano i fatti. Il centralino (GTM) decide i
 * destinatari. Mai le due cose insieme.
 *
 * Da qui non esce nessun identificativo di conversione, nessun
 * `AW-...`, nessun `fbq`, nessun `gtag('event','conversion')`. Il sito
 * non sa che Google Ads e Meta esistono, e questa e' la ragione per cui
 * il giorno in cui un numero raddoppia si sa dove guardare: c'e' una
 * bocca sola da spegnere, ed e' dentro GTM.
 *
 * Il difetto che questo file elimina e' quello che ha prodotto il
 * disastro del 20 agosto sul sito vecchio: le etichette di conversione
 * scritte a mano dentro la pagina. Quando lo stesso gesto veniva
 * annunciato due volte — una dal codice della pagina, una da un tag di
 * GTM — non c'era modo di sapere quale delle due stesse contando.
 *
 * ── COME SI LEGGE QUESTO ELENCO ─────────────────────────────────────
 * `EVENTI` sono i fatti che EMETTIAMO NOI. `EVENTI_DI_REGIONDO` sono i
 * fatti che il widget di prenotazione scrive nel dataLayer DA SOLO: su
 * quelli il nostro codice non deve mettere becco, pena il doppione.
 *
 * ── NIENTE CONTEGGIO "UNA VOLTA SOLA" QUI DENTRO ────────────────────
 * Prima il codice teneva un `Set` e mandava la conversione WhatsApp una
 * volta per sessione. Quella e' una decisione da destinatario, non da
 * pagina: tre clic su WhatsApp sono tre fatti, e se in Google Ads se ne
 * deve contare uno solo lo si dice li' con "Conteggio: Una". Qui si
 * dichiara quello che succede, quante volte succede.
 *
 * L'unica eccezione e' `view_booking_form`, e non e' una scelta di
 * conteggio: il calendario compare a schermo una volta per vista di
 * pagina, ed e' l'osservatore stesso a staccarsi dopo il primo
 * incrocio.
 *
 * ── IL CONSENSO ─────────────────────────────────────────────────────
 * Nessuno di questi eventi porta un dato identificabile: niente email,
 * niente nomi, niente gclid, niente identificativi di clic. Portano il
 * gesto, la zona della pagina in cui e' stato fatto, e il tour di cui
 * si sta parlando. Sono fatti sulla PAGINA, non sulla PERSONA — quindi
 * possono essere scritti anche prima che il banner risponda, e sara'
 * GTM a decidere se e dove mandarli in base al Consent Mode.
 *
 * Il gclid resta l'unico dato condizionato al consenso, e resta dov'e':
 * in `Tracciamento.tsx`, in `localStorage`, mai nel dataLayer.
 */

/* I FATTI CHE DICHIARIAMO NOI.
 *
 * I nomi sono quelli gia' in uso sulle landing a pagamento
 * (`contact_whatsapp`, `contact_phone`, `contact_email`,
 * `booking_intent`, `view_booking_form`): cambiarli vorrebbe dire
 * spezzare in due lo storico di GA4 il giorno del passaggio, con meta'
 * dei numeri sotto un nome e meta' sotto un altro. */
export const EVENTI = {
  /** clic su un collegamento wa.me / WhatsApp */
  contattoWhatsapp: 'contact_whatsapp',
  /** clic su un collegamento tel: */
  contattoTelefono: 'contact_phone',
  /** clic su un collegamento mailto: */
  contattoEmail: 'contact_email',
  /** ha chiesto di arrivare al calendario (il "BOOK NOW" della barra fissa) */
  intenzioneDiPrenotare: 'booking_intent',
  /** il calendario di Regiondo e' comparso davvero a schermo */
  calendarioVisto: 'view_booking_form',
  /** il modulo di richiesta e' stato inviato con successo.
   *  NON lo emette Tracciamento.tsx: lo emette `ModuloRichiesta.tsx`
   *  dentro `invia()`, perche' e' l'unico punto che sa se il server ha
   *  risposto di si'. Sta in questo elenco perche' l'elenco e' il
   *  contratto, e un fatto che GTM riceve ma che qui non e' scritto e'
   *  esattamente il tipo di sorpresa che si vuole evitare. */
  richiestaInviata: 'richiesta_inviata',
} as const;

/* I FATTI CHE DICHIARA REGIONDO, DA SOLO.
 *
 * Verificato leggendo il codice del widget (`booking-widget.i18n.*.chunk.js`,
 * l'adattatore `ot()`): quando in pagina c'e' un contenitore GTM, il
 * widget fa `dataLayer.push` per conto proprio con questi nomi e con la
 * struttura `ecommerce` di GA4. Il `purchase` porta
 * `ecommerce.transaction_id` = NUMERO D'ORDINE REGIONDO — lo stesso
 * identificativo che il vecchio tag Ads usava come `transaction_id`, e
 * l'unico che permette a Google e Meta di scartare i doppioni.
 *
 * Su questi non si tocca niente: se il nostro codice riannunciasse
 * l'acquisto, l'acquisto risulterebbe due volte. */
export const EVENTI_DI_REGIONDO = [
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'purchase',
  'virtualPageview',
] as const;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

type Dati = Record<string, unknown>;

/* IL CONTESTO DELLA PAGINA, LETTO DAL DOM E NON PASSATO A MANO.
 *
 * `Tracciamento` sta nel layout e attraversa tutte le pagine di tutte e
 * otto le lingue: non sa, e non deve sapere, quale tour si sta
 * guardando. Lo legge dalla pagina, dagli stessi due posti che la
 * pagina espone gia' per altri motivi:
 *
 *   - il contenitore del widget Regiondo porta `data-product` (lo SKU,
 *     es. T-PR193-210790) e `data-title` (il nome del tour). E' il
 *     modo piu' onesto di sapere DI QUALE prodotto si sta parlando:
 *     e' lo stesso identificativo che poi comparira' nel `purchase`;
 *
 *   - il JSON-LD porta prezzo e valuta. Si legge da li' e non da una
 *     costante perche' la regola del progetto e' che i prezzi vengono
 *     da Regiondo e da nessun altro posto: il JSON-LD e' gia' costruito
 *     con quel prezzo, e leggerlo non ne crea una seconda copia.
 *
 * Il prezzo e' quello "a partire da" della scheda, non un incasso: e'
 * un ordine di grandezza per pesare le intenzioni fra loro, non un
 * ricavo. Il ricavo vero lo dichiara Regiondo con `purchase`.
 *
 * Il risultato si tiene da parte per percorso: su una pagina tour si
 * clicca piu' volte, e non ha senso rifare il parsing del JSON-LD a
 * ogni clic. Cambiando pagina il percorso cambia e la memoria si
 * butta. */
let memoria: { percorso: string; dati: Dati } | null = null;

export function contestoDellaPagina(): Dati {
  if (typeof document === 'undefined') return {};
  const percorso = location.pathname;
  if (memoria && memoria.percorso === percorso) return memoria.dati;

  const dati: Dati = {};

  /* La lingua che si sta leggendo. Sta sull'<html> perche' il layout ce
     la mette per ragioni sue (dir=rtl sull'arabo): qui si riusa. */
  const lingua = document.documentElement.getAttribute('lang');
  if (lingua) dati.lingua = lingua;

  const widget = document.querySelector('.regiondo-booking-widget');
  if (widget) {
    const sku = widget.getAttribute('data-product');
    const nome = widget.getAttribute('data-title');
    if (sku) dati.tour_id = sku;
    if (nome) dati.tour_nome = nome;
  }

  /* Prezzo e valuta dal JSON-LD. Dentro un try perche' una pagina senza
     offerta, o con un blocco che per qualunque motivo non e' JSON
     valido, non deve far saltare un evento: meglio un evento senza
     valore che nessun evento. */
  try {
    for (const s of Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    )) {
      const grafo = JSON.parse(s.textContent || '{}') as {
        '@graph'?: { offers?: { price?: string; priceCurrency?: string } }[];
      };
      const nodo = (grafo['@graph'] ?? []).find((n) => n?.offers?.price);
      if (!nodo?.offers) continue;
      const valore = Number(nodo.offers.price);
      if (Number.isFinite(valore)) dati.valore = valore;
      if (nodo.offers.priceCurrency) dati.valuta = nodo.offers.priceCurrency;
      break;
    }
  } catch {
    /* niente prezzo: l'evento parte lo stesso */
  }

  memoria = { percorso, dati };
  return dati;
}

/* L'UNICA PORTA DA CUI ESCE QUALCOSA.
 *
 * Un solo `dataLayer.push`, in un posto solo. Se domani si vuole
 * aggiungere un dato a tutti gli eventi, o smettere di mandarne uno, si
 * cambia qui e non in sette punti sparsi.
 *
 * Se GTM non c'e' — fuori da prestigerent.com non c'e' — questo riempie
 * un array e non fa nient'altro: nessun effetto, nessun errore, nessuna
 * richiesta di rete. E' voluto: la pagina dichiara i fatti sempre, e' il
 * centralino che a volte non ascolta. */
export function dichiara(evento: string, dati: Dati = {}): void {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: evento, ...contestoDellaPagina(), ...dati });
  } catch {
    /* se il tracciamento non c'e', non e' un problema della pagina */
  }
}
