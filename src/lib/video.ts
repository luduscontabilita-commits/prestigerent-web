import { supabase } from './supabase';

/* I FILMATI DI UN TOUR.
 *
 * Prima l'elenco stava dentro `tour_content.blocks->videos`: un blocco
 * JSON ricopiato per intero su ogni tour che li mostra. Con quattro copie
 * era gia' andata storta una volta -- sulle due giornate in cantina era
 * finita la lista di Siena, con il check-in della bandiera rossa e le
 * torri di San Gimignano su una degustazione. Nessuno l'aveva scelto: era
 * la riga accanto, copiata.
 *
 * Adesso ci sono due tabelle e una vista (vedi la migrazione
 * `20260827_video_catalogo.sql`):
 *
 *   video_clip       il catalogo. Una riga per filmato, con i suoi temi.
 *   tour_video_tema  quali temi puo' mostrare un tour.
 *   tour_video       la vista: filmato e tour che hanno un tema in comune.
 *
 * Il punto e' che AGGIUNGERE UN FILMATO DOMANI NON TOCCA QUESTO FILE.
 * Si inserisce una riga in `video_clip` con i suoi temi e compare da solo
 * su tutti i tour che li hanno; oppure si aggiunge un tema alla riga di un
 * tour in `tour_video_tema`. Il codice non sa quali filmati esistano e non
 * deve saperlo.
 *
 * Un tour senza riga in `tour_video_tema` non ha filmati e la sezione non
 * si mostra affatto -- vedi `Videos` -- invece di riciclare i filmati di
 * un'altra giornata. E' la scelta piu' importante di tutto il meccanismo:
 * un video di San Gimignano su un trasferimento per Milano non e' un
 * riempitivo, e' una promessa sbagliata.
 */

export type Video = {
  src: string;
  poster: string;
  alt?: string;
  label?: string;
  caption?: string;
};

type Riga = {
  chiave: string;
  src: string;
  poster: string | null;
  etichetta: string | null;
  didascalia: string | null;
  alt: string | null;
  ordine: number;
};

export async function videoDi(slug: string): Promise<Video[]> {
  const { data } = await supabase
    .from('tour_video')
    .select('chiave, src, poster, etichetta, didascalia, alt, ordine')
    .eq('tour_slug', slug)
    /* l'ordinamento si chiede QUI e non si lascia alla vista: un ORDER BY
       dentro una vista Postgres non e' garantito che sopravviva al piano
       di esecuzione. `chiave` come secondo criterio perche' due filmati
       con lo stesso `ordine` devono comunque uscire sempre nello stesso
       ordine, altrimenti la pagina rigenerata ogni ora cambia da sola. */
    .order('ordine', { ascending: true })
    .order('chiave', { ascending: true });

  const righe = (data ?? []) as Riga[];

  return righe
    /* senza poster non si mostra: `preload="none"` piu' nessun poster
       vuol dire un rettangolo nero e nient'altro, e nessuno preme play su
       un rettangolo nero. Meglio un filmato in meno. */
    .filter((r) => r.src && r.poster)
    .map((r) => ({
      src: r.src,
      poster: r.poster as string,
      alt: r.alt ?? undefined,
      label: r.etichetta ?? undefined,
      caption: r.didascalia ?? undefined,
    }));
}
