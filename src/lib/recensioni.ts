import { supabase } from '@/lib/supabase';

export type Fonte = {
  fonte: string;
  etichetta: string;
  voto_medio: number | null;
  quante: number | null;
  url: string | null;
  distintivo: string | null;
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

/* Le recensioni di un tour, piu' quelle che parlano dell'azienda in generale
 * (tour_slug nullo) per non lasciare vuoto un tour che ancora non ne ha. */
export async function recensioniDi(slug: string, quante = 6): Promise<Recensione[]> {
  const { data } = await supabase
    .from('recensioni')
    .select('*')
    .or(`tour_slug.eq.${slug},tour_slug.is.null`)
    .eq('pubblicata', true)
    .order('in_evidenza', { ascending: false })
    .order('data', { ascending: false })
    .limit(quante);
  return (data ?? []) as Recensione[];
}

export async function inEvidenza(quante = 6): Promise<Recensione[]> {
  const { data } = await supabase
    .from('recensioni')
    .select('*')
    .eq('pubblicata', true)
    .eq('in_evidenza', true)
    .order('data', { ascending: false })
    .limit(quante);
  return (data ?? []) as Recensione[];
}
