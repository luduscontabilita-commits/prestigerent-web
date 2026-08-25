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
  const [{ data }, elenco] = await Promise.all([
    supabase.from('azienda').select('*').eq('id', 1).maybeSingle(),
    fonti(),
  ]);

  const a = (data ?? null) as Azienda | null;

  const totale = elenco.reduce((s, f) => s + (f.quante ?? 0), 0);
  const voto =
    totale > 0
      ? elenco.reduce((s, f) => s + (f.voto_medio ?? 0) * (f.quante ?? 0), 0) / totale
      : null;

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

export async function ultimePrenotazioni(quante = 25): Promise<AvvisoRiga[]> {
  const { data } = await supabase
    .from('prenotazioni_recenti')
    .select('nome,iniziale,paese,prodotto,persone,quando,tour_slug')
    .order('quando', { ascending: false })
    .limit(quante);
  return (data ?? []) as AvvisoRiga[];
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
