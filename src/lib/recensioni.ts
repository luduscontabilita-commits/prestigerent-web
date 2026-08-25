import { supabase } from '@/lib/supabase';

export type Fonte = {
  fonte: string;
  etichetta: string;
  voto_medio: number | null;
  quante: number | null;
  url: string | null;
  distintivo: string | null;
  /* vero quando il numero e' di QUESTO tour, non dell'azienda */
  suQuestoTour?: boolean;
};

export type Recensione = {
  id: number;
  fonte: string;
  autore: string;
  paese: string | null;
  voto: number;
  titolo: string | null;
  testo: string;
  data: string | null;
  tour_slug: string | null;
  url_fonte: string | null;
};

/* Le piattaforme con un numero VERIFICATO. Quelle ancora da controllare
 * hanno voto_medio o quante a null e non si mostrano: una fila di loghi con
 * i numeri mancanti fa piu' danno che non averla. */
export async function fonti(): Promise<Fonte[]> {
  const { data } = await supabase
    .from('fonti_recensioni')
    .select('fonte,etichetta,voto_medio,quante,url,distintivo')
    .order('ordine');
  return (data ?? []).filter((f) => f.voto_medio != null && f.quante != null) as Fonte[];
}

/* I punteggi della singola pagina tour.
 *
 * Viator e GetYourGuide non hanno un voto d'azienda: valutano il PRODOTTO.
 * Tripadvisor li ha entrambi. Quindi qui il voto del prodotto VINCE su
 * quello dell'azienda per la stessa piattaforma -- mostrare due riquadri
 * Tripadvisor con numeri diversi (4,9 su 1.794 di questo tour, 4,9 su 7.139
 * dell'azienda) e' solo confusione. Le piattaforme che per questo tour non
 * hanno un voto proprio restano con quello d'azienda, che e' comunque vero.
 */
export async function punteggiDi(slug: string, dAzienda: Fonte[]): Promise<Fonte[]> {
  const { data } = await supabase
    .from('valutazioni_tour')
    .select('fonte,voto,quante,url,distintivo')
    .eq('tour_slug', slug);

  const perTour = (data ?? []).filter((v) => v.voto != null && v.quante != null);
  if (!perTour.length) return dAzienda;

  /* Le etichette si rileggono TUTTE, senza il filtro sui numeri.
   *
   * Qui c'era un errore che non si vedeva: `dAzienda` arriva da `fonti()`,
   * che scarta le piattaforme senza voto e conteggio d'azienda. Viator e'
   * una di quelle -- non ha un voto d'azienda, valuta i prodotti -- quindi
   * la sua etichetta "Viator & Tripadvisor" non arrivava mai, e il codice
   * ripiegava su "Viator". Risultato: il controllo che deve accorgersi che
   * Tripadvisor e' gia' nominato non trovava piu' la parola, e il badge
   * d'azienda da 7.142 tornava accanto a quello del prodotto. */
  const { data: righe } = await supabase
    .from('fonti_recensioni')
    .select('fonte,etichetta');
  const etichette = new Map((righe ?? []).map((f) => [f.fonte, f.etichetta]));
  const NOMI: Record<string, string> = {
    tripadvisor: 'Tripadvisor',
    google: 'Google',
    viator: 'Viator',
    getyourguide: 'GetYourGuide',
  };

  const suQuestoTour: Fonte[] = perTour.map((v) => ({
    fonte: v.fonte,
    etichetta: etichette.get(v.fonte) ?? NOMI[v.fonte] ?? v.fonte,
    voto_medio: v.voto,
    quante: v.quante,
    url: v.url,
    distintivo: v.distintivo,
    /* la dicitura cambia: non e' "recensioni sull'azienda", e' "su questo
       tour". Dirlo e' anche piu' onesto, e converte di piu': un numero
       riferito a QUESTA giornata pesa piu' di uno riferito a tutta la
       ditta. */
    suQuestoTour: true,
  }));

  /* Quali badge d'azienda si tengono accanto a quelli del prodotto.
   *
   * Non basta escludere la stessa `fonte`: l'etichetta di Viator e'
   * "Viator & Tripadvisor", perche' il loro numero comprende gia' quelle
   * di Tripadvisor. Se si tenesse anche il badge Tripadvisor d'azienda,
   * sulla stessa riga comparirebbero "1.810 di questo tour su Viator &
   * Tripadvisor" e "7.142 su Tripadvisor" -- due numeri che in parte sono
   * le stesse recensioni. Si guarda quindi dentro le ETICHETTE, non solo
   * dentro i codici delle piattaforme.
   */
  const nominate = suQuestoTour
    .map((f) => f.etichetta.toLowerCase())
    .join(' | ');
  const coperte = new Set(suQuestoTour.map((f) => f.fonte));

  return [
    ...suQuestoTour,
    ...dAzienda.filter(
      (f) => !coperte.has(f.fonte) && !nominate.includes(f.etichetta.toLowerCase())
    ),
  ];
}

/* CHE COSA SI MOSTRA: solo cinque stelle, solo in inglese.
 *
 * Cinque stelle perche' il sito e' materiale di vendita, non un archivio:
 * il numero complessivo (7.139 recensioni, 4,9 di media) dice gia' la
 * verita' sulla distribuzione, ed e' li' sopra, cliccabile. Le singole
 * servono a far vedere COME sono fatte le nostre giornate.
 *
 * Inglese perche' e' la lingua del sito alla radice e di chi prenota. Le
 * versioni tedesca e italiana filtreranno sulla propria lingua quando ci
 * saranno recensioni in quelle lingue; finche' non ci sono, meglio inglese
 * che vuoto.
 *
 * AVVERTENZA per il giorno in cui si tirera' giu' da Viator via API: le
 * loro condizioni per i partner vietano esplicitamente di mostrare solo le
 * recensioni col voto piu' alto -- o tutte, o nessuna. Questo filtro vale
 * per le recensioni scelte a mano, non per quelle prese dalla loro API.
 */
const SOLO = (q: ReturnType<typeof base>) => q.eq('voto', 5).eq('lingua', 'en');

function base() {
  return supabase.from('recensioni').select('*').eq('pubblicata', true);
}

/* Le recensioni di un tour, piu' quelle che parlano dell'azienda in generale
 * (tour_slug nullo) per non lasciare vuoto un tour che ancora non ne ha. */
export async function recensioniDi(slug: string, quante = 6): Promise<Recensione[]> {
  const { data } = await SOLO(base())
    .or(`tour_slug.eq.${slug},tour_slug.is.null`)
    .order('in_evidenza', { ascending: false })
    .order('data', { ascending: false })
    .limit(quante);
  return (data ?? []) as Recensione[];
}

export async function inEvidenza(quante = 6): Promise<Recensione[]> {
  const { data } = await SOLO(base())
    .eq('in_evidenza', true)
    .order('data', { ascending: false })
    .limit(quante);
  return (data ?? []) as Recensione[];
}

/* I punteggi di tutti i tour in una volta, per il menu.
 *
 * Il menu e' sulla pagina di tutti: non puo' fare una richiesta per ogni
 * voce. Una sola lettura, poi ogni voce pesca dalla mappa.
 *
 * Il conteggio somma le piattaforme INDIPENDENTI. Viator dichiara
 * "recensioni e punteggi totali da Viator e Tripadvisor", quindi il suo
 * numero comprende gia' Tripadvisor e sommarli conterebbe due volte le
 * stesse recensioni; GetYourGuide invece e' separato e si somma davvero.
 * Il voto e' la media pesata sul numero, non la media delle medie.
 */
export type VotoTour = { voto: number; quante: number };

export async function votiPerTour(): Promise<Record<string, VotoTour>> {
  const { data } = await supabase
    .from('valutazioni_tour')
    .select('tour_slug,fonte,voto,quante');

  const somma: Record<string, { peso: number; n: number }> = {};
  for (const r of data ?? []) {
    if (r.voto == null || r.quante == null) continue;
    const s = (somma[r.tour_slug] ??= { peso: 0, n: 0 });
    s.peso += Number(r.voto) * r.quante;
    s.n += r.quante;
  }

  const out: Record<string, VotoTour> = {};
  for (const [slug, s] of Object.entries(somma)) {
    if (s.n > 0) out[slug] = { voto: Math.round((s.peso / s.n) * 10) / 10, quante: s.n };
  }
  return out;
}
