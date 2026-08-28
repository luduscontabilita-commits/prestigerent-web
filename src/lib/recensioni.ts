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
  /* 🔴 ENTRA NEL TOTALE D'AZIENDA?
   *
   * Non tutte le piattaforme si possono sommare. Viator dichiara
   * "recensioni e punteggi totali da Viator e Tripadvisor": il suo numero
   * COMPRENDE gia' quelle di Tripadvisor, e sommarlo conterebbe due volte
   * le stesse persone.
   *
   * Prima questa distinzione viveva dentro `riprova()`, e il componente
   * che scriveva la frase non la conosceva: il risultato era "12.563
   * verified reviews on Tripadvisor" venti pixel sopra una scheda
   * Tripadvisor che diceva 7.142. Due numeri diversi per la stessa cosa,
   * nella stessa schermata.
   *
   * Adesso la porta il dato stesso: chi somma e chi scrive la frase
   * leggono lo stesso campo, e non possono piu' discordare. */
  nelTotale?: boolean;
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

/* CHI SI SOMMA E CHI NO.
 *
 * Tre bacini davvero separati: Tripadvisor (tutta l'azienda), GetYourGuide
 * e Regiondo (chi ha prenotato dal sito). Viator resta fuori dal totale
 * perche' il suo numero comprende gia' Tripadvisor -- si mostra, non si
 * somma. Google e' fuori finche' non ha un voto verificato. */
const NEL_TOTALE = new Set(['tripadvisor', 'getyourguide', 'regiondo']);

/* Sotto le tre recensioni una media non vuol dire niente: un tour con due
 * voti a cinque stelle farebbe 5,0 e sballerebbe tutto. */
const MINIME = 3;

/* Le piattaforme con un numero VERIFICATO. Quelle ancora da controllare
 * hanno voto_medio o quante a null e non si mostrano: una fila di loghi con
 * i numeri mancanti fa piu' danno che non averla.
 *
 * ── PERCHE' SI GUARDA ANCHE `valutazioni_tour` ───────────────────────
 * Viator e GetYourGuide **non hanno un voto d'azienda**: valutano il
 * prodotto, non il fornitore. In `fonti_recensioni` le loro righe erano
 * quindi vuote, e restavano nascoste. Il risultato era una fila di badge
 * con dentro una scheda sola, larga novecento pixel, in mezzo a un deserto
 * bianco -- e una frase che diceva "12.563 recensioni su Tripadvisor"
 * mentre la scheda Tripadvisor ne dichiarava 7.142.
 *
 * I numeri veri c'erano gia', sparsi nelle valutazioni dei singoli tour.
 * Qui si aggregano: media PESATA sul numero di recensioni, perche' 4,9 su
 * 8.241 e 4,9 su 486 non contano uguale.
 *
 * Cosi' il dato non invecchia: si aggiunge un tour con le sue valutazioni
 * e il totale d'azienda si aggiorna da solo, senza che nessuno debba
 * ricordarsi di aggiornare una riga a mano. */
export async function fonti(): Promise<Fonte[]> {
  const [{ data }, { data: perTour }] = await Promise.all([
    supabase
      .from('fonti_recensioni')
      .select('fonte,etichetta,voto_medio,quante,url,distintivo')
      .order('ordine'),
    supabase.from('valutazioni_tour').select('fonte,voto,quante'),
  ]);

  /* La somma pesata per piattaforma, dai voti dei singoli tour. */
  const somma = new Map<string, { peso: number; quante: number }>();
  for (const v of perTour ?? []) {
    if (v.voto == null || v.quante == null || v.quante < MINIME) continue;
    const s = somma.get(v.fonte) ?? { peso: 0, quante: 0 };
    s.peso += Number(v.voto) * Number(v.quante);
    s.quante += Number(v.quante);
    somma.set(v.fonte, s);
  }

  return (data ?? [])
    .map((f) => {
      /* Il dato d'azienda vince sempre, quando c'e': e' verificato a mano.
         L'aggregato serve solo a riempire i buchi. */
      if (f.voto_medio != null && f.quante != null) {
        return { ...f, nelTotale: NEL_TOTALE.has(f.fonte) } as Fonte;
      }
      const s = somma.get(f.fonte);
      if (!s || !s.quante) return null;
      return {
        ...f,
        voto_medio: Math.round((s.peso / s.quante) * 10) / 10,
        quante: s.quante,
        nelTotale: NEL_TOTALE.has(f.fonte),
      } as Fonte;
    })
    .filter((f): f is Fonte => f != null);
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

  /* SOTTO LE TRE RECENSIONI NON SI MOSTRA.
     "5,0 su 1 recensione" e' vero e sembra inventato: e' l'effetto
     opposto a quello che serve. Il filtro sta qui e non nel database --
     il dato resta buono, e fra sei mesi quelle righe passeranno la
     soglia da sole. */
  const MINIMO = 3;
  const perTour = (data ?? []).filter(
    (v) => v.voto != null && v.quante != null && v.quante >= MINIMO
  );
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
    /* NON si filtra con `NEL_TOTALE` qui, e va spiegato perche' sembra
       un errore e non lo e'.
       `NEL_TOTALE` serve al totale D'AZIENDA, dove il numero di Viator
       (etichettato "Viator & Tripadvisor") comprende gia' quello di
       Tripadvisor e sommarli sarebbe contare due volte le stesse
       recensioni. Sulle valutazioni del SINGOLO tour quel problema non
       esiste: sono righe distinte per piattaforma -- Viator 8.241,
       GetYourGuide 4.453, Regiondo 206 su `wine-experience-in-tuscany`,
       verificato a database -- e nessuna comprende le altre.
       Applicare `NEL_TOTALE` qui toglierebbe Viator, che su quasi tutte
       le schede e' la fonte con piu' recensioni. */
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

/* CHE COSA SI MOSTRA: da quattro stelle in su, nella lingua della pagina.
 *
 * Quattro e non cinque. Prima si mostravano solo i cinque, e il risultato
 * era un muro perfetto che il lettore non crede: nessuna azienda al mondo
 * ha solo cinque stelle, e chi legge lo sa. Il quattro sincero fa da
 * controprova agli altri e le recensioni a quattro stelle erano gia' in
 * tabella, pubblicate, senza uscire mai da nessuna parte. Il numero
 * complessivo (7.139 recensioni, 4,9 di media) sta li' sopra, cliccabile,
 * e dice gia' la verita' sulla distribuzione.
 *
 * Sotto il quattro no: il sito resta materiale di vendita, non un archivio.
 * Chi vuole l'archivio ha il link alla piattaforma.
 *
 * AVVERTENZA per il giorno in cui si tirera' giu' da Viator via API: le
 * loro condizioni per i partner vietano esplicitamente di mostrare solo le
 * recensioni col voto piu' alto -- o tutte, o nessuna. Questo filtro vale
 * per le recensioni scelte a mano, non per quelle prese dalla loro API.
 */
const VOTO_MINIMO = 4;

/* La lingua e' un parametro, non una costante.
 *
 * Prima era fissa a 'en' dentro il filtro: le recensioni in tedesco,
 * spagnolo e italiano erano in tabella e non uscivano in NESSUNA lingua del
 * sito, nemmeno in quella tedesca. Chi legge la pagina tedesca si fida di
 * piu' di un tedesco che racconta la giornata in tedesco.
 */
const RIPIEGO = 'en';

const SOLO = (q: ReturnType<typeof base>, lingua: string) =>
  q.gte('voto', VOTO_MINIMO).eq('lingua', lingua);

function base() {
  return supabase.from('recensioni').select('*').eq('pubblicata', true);
}

/* Se nella lingua chiesta non ce ne sono abbastanza si completa con
 * l'inglese, che e' la lingua in cui i tour si svolgono davvero: un blocco
 * mezzo vuoto sembra un errore del sito, un blocco misto no. Le due liste si
 * uniscono per `id` perche' la stessa recensione non deve comparire due
 * volte se un domani venisse salvata in piu' lingue. */
async function conRipiego(
  lingua: string,
  quante: number,
  leggi: (lingua: string) => Promise<Recensione[]>
): Promise<Recensione[]> {
  const prime = await leggi(lingua);
  if (lingua === RIPIEGO || prime.length >= quante) return prime;

  const inglesi = await leggi(RIPIEGO);
  const gia = new Set(prime.map((r) => r.id));
  return [...prime, ...inglesi.filter((r) => !gia.has(r.id))].slice(0, quante);
}

/* Le recensioni di un tour, piu' quelle che parlano dell'azienda in generale
 * (tour_slug nullo) per non lasciare vuoto un tour che ancora non ne ha.
 *
 * L'ordine resta in evidenza e poi le piu' recenti. NON si ordina per voto:
 * ordinando per voto i cinque stelle occuperebbero tutti e sei i posti e la
 * soglia a quattro non servirebbe a niente. */
export async function recensioniDi(
  slug: string,
  quante = 6,
  lingua: string = RIPIEGO
): Promise<Recensione[]> {
  const leggi = async (l: string) => {
    const { data } = await SOLO(base(), l)
      .or(`tour_slug.eq.${slug},tour_slug.is.null`)
      .order('in_evidenza', { ascending: false })
      .order('data', { ascending: false })
      .limit(quante);
    return (data ?? []) as Recensione[];
  };
  return conRipiego(lingua, quante, leggi);
}

export async function inEvidenza(quante = 6, lingua: string = RIPIEGO): Promise<Recensione[]> {
  const leggi = async (l: string) => {
    const { data } = await SOLO(base(), l)
      .eq('in_evidenza', true)
      .order('data', { ascending: false })
      .limit(quante);
    return (data ?? []) as Recensione[];
  };
  return conRipiego(lingua, quante, leggi);
}

/* I punteggi di tutti i tour in una volta, per il menu.
 *
 * Il menu e' sulla pagina di tutti: non puo' fare una richiesta per ogni
 * voce. Una sola lettura, poi ogni voce pesca dalla mappa.
 *
 * 🔴 QUI C'ERA UNA SOMMA, ED E' STATO UN ERRORE.
 *
 * Fino a ieri questa funzione sommava le piattaforme indipendenti e ne
 * faceva la media pesata. L'aritmetica era giusta -- Viator dichiara
 * "recensioni e punteggi totali da Viator e Tripadvisor", quindi il suo
 * numero comprende gia' Tripadvisor e non si somma, GetYourGuide invece e'
 * separato e si somma davvero -- e il risultato era comunque un numero che
 * NON ESISTE DA NESSUNA PARTE.
 *
 * Wine Experience in Tuscany: 8.241 su Viator + 4.453 su GetYourGuide + 206
 * su Regiondo, e il menu stampava "4,9 su 12.900 recensioni". Un cliente
 * che apre Viator per controllare trova 8.241. Tripadvisor, come azienda,
 * ne dichiara 7.142. Dodicimilanovecento non lo conferma nessuno.
 *
 * E il danno non finisce sul numero sbagliato: un conteggio che non torna
 * e' il motivo per cui da li' in poi non si crede piu' nemmeno al prezzo.
 * Un badge di prova sociale ha un solo lavoro, farsi verificare.
 *
 * Adesso vince LA PIATTAFORMA PIU' FORTE DI QUEL TOUR, una sola, e si dice
 * quale: "4,9 su 8.241 recensioni su Viator" e' un numero che chi vuole
 * controllare ritrova identico. Si perde qualche migliaio di recensioni
 * dichiarate e si guadagna l'unica cosa che quel riquadro deve fare.
 *
 * Il voto non e' piu' una media di medie ne' una media pesata: e' il voto
 * di quella piattaforma, che e' l'unico coerente con il numero accanto.
 */
export type VotoTour = {
  voto: number;
  quante: number;
  /** dove sta quel numero, preposizione compresa: "on Viator" */
  dove: string;
};

/* SOTTO LE TRE RECENSIONI NON SI MOSTRA NIENTE.
   "5,0 su 1 recensione" e' vero e sembra inventato: e' l'effetto opposto a
   quello che serve. Stessa soglia di `punteggiDi`. */
const MINIMO_RECENSIONI = 3;

/* Le cinque piattaforme sono un insieme chiuso: `valutazioni_tour.fonte` ha
   una chiave esterna su `fonti_recensioni.fonte`, non ne arrivano altre.
   Qui stanno i nomi corti con la preposizione gia' dentro, perche' su
   Regiondo "on guests who booked direct" non si puo' leggere. Se un giorno
   ne comparisse una nuova si ripiega sul nome grezzo, che e' brutto ma non
   e' falso. */
const DOVE: Record<string, string> = {
  viator: 'on Viator',
  getyourguide: 'on GetYourGuide',
  tripadvisor: 'on Tripadvisor',
  google: 'on Google',
  regiondo: 'from direct bookings',
};

export async function votiPerTour(): Promise<Record<string, VotoTour>> {
  /* ordinate qui e non in memoria: cosi' la prima riga di ogni tour e'
     gia' quella che vince, e a parita' di recensioni vince sempre la
     stessa piattaforma invece di dipendere da come tornano le righe */
  const { data } = await supabase
    .from('valutazioni_tour')
    .select('tour_slug,fonte,voto,quante')
    .order('quante', { ascending: false })
    .order('fonte', { ascending: true });

  const out: Record<string, VotoTour> = {};
  for (const r of data ?? []) {
    if (r.voto == null || r.quante == null || r.quante < MINIMO_RECENSIONI) continue;
    if (out[r.tour_slug]) continue;
    out[r.tour_slug] = {
      voto: Math.round(Number(r.voto) * 10) / 10,
      quante: r.quante,
      dove: DOVE[r.fonte] ?? `on ${r.fonte}`,
    };
  }
  return out;
}
