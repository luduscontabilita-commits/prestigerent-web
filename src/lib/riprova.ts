import { supabase } from '@/lib/supabase';
import { fonti, type Fonte } from '@/lib/recensioni';

/* LA RIPROVA SOCIALE, DA UNA FONTE SOLA.
 *
 * Prima "4.9", "7,139", "#2 of 248" e "since 2002" erano scritti a mano in
 * cinque punti del codice. Cambiarne uno voleva dire cercarli tutti, e
 * dimenticarne uno significa mostrare due numeri diversi nella stessa
 * visita: che e' peggio che non mostrarne nessuno, perche' fa dubitare di
 * entrambi.
 *
 * Adesso stanno nella tabella `azienda` e in `fonti_recensioni`. Si cambia
 * la riga e cambia ovunque: footer, testata, riquadri, "chi siamo", pagine
 * dei tour.
 */

export type Azienda = {
  anno_fondazione: number | null;
  classifica_posizione: number | null;
  classifica_su: number | null;
  classifica_categoria: string | null;
  classifica_url: string | null;
  mezzi_minibus: number | null;
  mezzi_auto: string | null;
  citta: string | null;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  whatsapp: string | null;
};

export type Riprova = {
  azienda: Azienda | null;
  fonti: Fonte[];
  /** anni di attivita', calcolati -- non scritti a mano, cosi' non
   *  invecchiano mai (il sito vecchio diceva ancora "covid-19 policy") */
  anni: number | null;
  /** recensioni sommate su tutte le piattaforme con un numero verificato */
  totale: number;
  /** media pesata sul numero di recensioni, non media delle medie:
   *  4,9 su 7.139 e 4,8 su 150 non pesano uguale */
  voto: number | null;
  /** "#2 of 248 transportation companies in Florence" */
  classifica: string | null;
};

export async function riprova(): Promise<Riprova> {
  const [{ data }, elenco, { data: perTour }] = await Promise.all([
    supabase.from('azienda').select('*').eq('id', 1).maybeSingle(),
    fonti(),
    supabase.from('valutazioni_tour').select('fonte,voto,quante'),
  ]);

  const a = (data ?? null) as Azienda | null;

  /* IL TOTALE VERO, senza contare due volte le stesse recensioni.
   *
   * Tripadvisor d'azienda vale 7.142 e da solo dice meno della verita':
   * su tutte le piattaforme le persone sono molte di piu'.
   *
   * Ma non si sommano alla cieca. Viator dichiara "recensioni e punteggi
   * totali da Viator e Tripadvisor": il suo numero COMPRENDE gia' quelle
   * di Tripadvisor, quindi aggiungerlo conterebbe due volte le stesse
   * persone -- ed e' il genere di errore che si nota, perche' i numeri
   * si assomigliano troppo.
   *
   * Restano tre bacini davvero separati: Tripadvisor (tutta l'azienda),
   * GetYourGuide e Regiondo (chi ha prenotato dal sito). Sommati fanno
   * 12.590, quasi il doppio di quello che mostravamo. */
  const INDIPENDENTI = new Set(['getyourguide', 'regiondo']);
  const altre = (perTour ?? []).filter(
    (v) => INDIPENDENTI.has(v.fonte) && v.voto != null && v.quante != null && v.quante >= 3
  );

  const totale =
    elenco.reduce((s, f) => s + (f.quante ?? 0), 0) +
    altre.reduce((s, v) => s + (v.quante as number), 0);
  /* La media e' pesata sul numero: 4,9 su 7.142 e 5,0 su 509 non
     contano uguale. */
  const peso =
    elenco.reduce((s, f) => s + (f.voto_medio ?? 0) * (f.quante ?? 0), 0) +
    altre.reduce((s, v) => s + Number(v.voto) * (v.quante as number), 0);
  const voto = totale > 0 ? peso / totale : null;

  return {
    azienda: a,
    fonti: elenco,
    anni: a?.anno_fondazione ? new Date().getFullYear() - a.anno_fondazione : null,
    totale,
    voto: voto != null ? Math.round(voto * 10) / 10 : null,
    classifica:
      a?.classifica_posizione && a.classifica_su
        ? `#${a.classifica_posizione} of ${a.classifica_su} ${a.classifica_categoria ?? ''}`.trim()
        : null,
  };
}

/* Le prenotazioni vere: il riquadro che compare in basso e il contatore
 * sulla pagina del tour. Nessun numero inventato -- con 418 prenotazioni
 * in sette giorni non serve. */
export type AvvisoRiga = {
  nome: string;
  iniziale: string | null;
  paese: string | null;
  prodotto: string;
  persone: number | null;
  quando: string;
  tour_slug: string | null;
};

/* `riferimento` non si legge e non si espone: e' il codice con cui si apre
 * una prenotazione vera, e questi dati finiscono in chiaro nel browser di
 * chiunque passi. Per riconoscere una riga gia' mostrata basta nome+quando.
 *
 * Le righe senza nome o senza prodotto si scartano qui e non nel
 * componente: senza uno dei due la frase diventa "booked ." -- un buco
 * visibile, che e' peggio di un riquadro in meno. */
/* Ripulisce i nomi come arrivano da Regiondo: "Dr.hartmut" e' quello che
   il cliente ha scritto nel campo, titolo compreso e senza maiuscola.
   Un riquadro scritto male sembra finto, e qui la credibilita' e' tutto. */
export function nomePulito(n: string): string {
  const senzaTitolo = n
    .replace(/^(dr|mr|mrs|ms|miss|prof|sig|sig\.ra)\.?\s*/i, '')
    .trim();
  const buono = senzaTitolo || n.trim();
  return buono.charAt(0).toUpperCase() + buono.slice(1);
}

export async function ultimePrenotazioni(quante = 25): Promise<AvvisoRiga[]> {
  const { data } = await supabase
    .from('prenotazioni_recenti')
    .select('nome,iniziale,paese,prodotto,persone,quando,tour_slug')
    .not('nome', 'is', null)
    .not('prodotto', 'is', null)
    .not('quando', 'is', null)
    .order('quando', { ascending: false })
    .limit(quante);
  return ((data ?? []) as AvvisoRiga[]).map((r) => ({ ...r, nome: nomePulito(r.nome) }));
}

export type Conteggio = {
  oggi: number;
  ieri: number;
  ultimi_7: number;
  ultimi_30: number;
  persone_7: number;
};

export async function prenotazioniDi(slug: string): Promise<Conteggio | null> {
  const { data } = await supabase
    .from('prenotazioni_conteggio')
    .select('oggi,ieri,ultimi_7,ultimi_30,persone_7')
    .eq('tour_slug', slug)
    .maybeSingle();
  return (data as Conteggio) ?? null;
}

export type ConteggioTour = Conteggio & { tour_slug: string };

/* Tutti i conteggi in una lettura sola: la tabella ha una riga per tour
 * (poche decine), quindi filtrare lato database per uno slug costerebbe
 * quanto prenderli tutti ma renderebbe la risposta impossibile da mettere
 * in cache una volta per tutti i visitatori. Serve alla rotta /api. */
export async function tuttiIConteggi(): Promise<ConteggioTour[]> {
  const { data } = await supabase
    .from('prenotazioni_conteggio')
    .select('tour_slug,oggi,ieri,ultimi_7,ultimi_30,persone_7');
  return (data ?? []) as ConteggioTour[];
}

/* La disponibilita' vera, dal calendario Regiondo. E' la scarsita' che
 * si puo' dichiarare senza inventare: quanti posti restano sulla prima
 * partenza, quante date sono gia' piene, e in quanti giorni su trenta il
 * tour parte davvero. */
export type Disponibilita = {
  esaurite_su_3: number;
  prima_libera: string | null;
  posti_prima: number | null;
  esaurite_30gg: number;
  date_totali_30gg: number;
};

export async function disponibilitaDi(slug: string): Promise<Disponibilita | null> {
  const { data } = await supabase
    .from('disponibilita')
    .select('esaurite_su_3,prima_libera,posti_prima,esaurite_30gg,date_totali_30gg')
    .eq('tour_slug', slug)
    .maybeSingle();
  return (data as Disponibilita) ?? null;
}
