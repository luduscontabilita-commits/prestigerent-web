import type { Metadata } from 'next';
import { SITE } from '@/lib/schema';
import { getLocale, LOCALES } from '@/lib/locales';

/* L'ANTEPRIMA QUANDO SI INCOLLA UN LINK.
 *
 * Il sito spinge WhatsApp da ogni pagina -- intestazione, piede, barra
 * appiccicata in basso, riquadro sotto il calendario, tutti su
 * wa.me/393338424047. E' il canale su cui si chiude: chi ha un dubbio
 * scrive invece di prenotare, e chi ha scritto poi gira il link agli
 * altri della comitiva. Quel secondo passaggio -- il link incollato in
 * chat -- e' esattamente il punto in cui finora si vedeva un rettangolo
 * grigio senza titolo, perche' su tutte e 123 le pagine non c'era un solo
 * tag `og:`. Non e' un difetto estetico: e' la scheda tour che arriva
 * muta a chi deve dire di si'.
 *
 * COME SI RIEMPIE, senza scriverlo su 123 pagine. Next fonde i metadata
 * livello per livello e alla fine, se `openGraph` esiste ma non ha
 * `title`/`description`, li COPIA da quelli della pagina
 * (`postProcessMetadata` -> `inheritFromMetadata` in
 * next/dist/lib/metadata/resolve-metadata.js). Quindi basta dichiarare
 * qui, nel layout, un `openGraph` SENZA titolo e senza descrizione: ogni
 * pagina ci mette dentro i suoi da sola. Se invece ci scrivessimo un
 * titolo, quello vincerebbe su tutte e 123 le pagine e sarebbero tutte
 * uguali -- che e' il difetto che stiamo togliendo, non uno da
 * aggiungere.
 *
 * Twitter/X si compila da solo dallo stesso blocco, sempre in
 * `postProcessMetadata`, e la `card` diventa `summary_large_image` appena
 * c'e' un'immagine. La dichiariamo lo stesso, esplicita, perche' un
 * comportamento implicito di una libreria non e' una scelta di prodotto.
 */

/* L'IMMAGINE DI RIPIEGO: la foto della home, la stessa che il cliente
 * riconosce (`FOTO[0]` di src/app/[locale]/page.tsx).
 *
 * Ma NON la versione `-scaled`, che pesa 756 KB a 2560px: WhatsApp scarta
 * le anteprime troppo pesanti e si tornerebbe al rettangolo grigio
 * proprio sul canale che conta. Si usa il taglio `-1536x757` generato da
 * WordPress: 314 KB, sopra i 1200px che Facebook, LinkedIn e X chiedono
 * per la scheda grande, e con il rapporto 2,03:1 che sta vicino
 * all'1,91:1 richiesto -- quindi non viene ritagliata. */
export const FOTO_RIPIEGO =
  'https://prestigerent.com/wp-content/uploads/2025/07/Tuscany_wine_experience-1536x757.jpg';
export const FOTO_RIPIEGO_W = 1536;
export const FOTO_RIPIEGO_H = 757;

const NOME_SITO = 'Prestige Rent';

/** `en-US` -> `en_US`: Open Graph vuole il trattino basso, non il trattino. */
function ogLocale(code: string): string {
  return getLocale(code).htmlLang.replace('-', '_');
}

/** L'immagine, nella forma che vuole Next. Se non c'e' quella della
 *  pagina si usa la foto della home: un'anteprima con la foto sbagliata
 *  vende comunque piu' di nessuna anteprima. */
export function immagineOg(src?: string | null): NonNullable<Metadata['openGraph']>['images'] {
  if (!src) {
    return [
      {
        url: FOTO_RIPIEGO,
        width: FOTO_RIPIEGO_W,
        height: FOTO_RIPIEGO_H,
        alt: 'Prestige Rent — tours and private transfers in Tuscany',
      },
    ];
  }
  /* Larghezza e altezza non si dichiarano per le foto dei tour: sono 794
     immagini di WordPress con formati diversi, e una dimensione
     DICHIARATA E SBAGLIATA e' peggio di una assente -- Facebook si fida
     di quello che legge e ritaglia di conseguenza. Senza, la scarica e la
     misura da se'. */
  return [{ url: src }];
}

/* Il blocco comune a tutte le pagine. Senza titolo e senza descrizione,
   apposta: vedi la nota in cima. */
export function ogDiBase(locale: string): Metadata['openGraph'] {
  /* Le altre lingue in cui la pagina esiste. Con una lingua sola l'elenco e'
     vuoto: si omette la chiave invece di scrivere `og:locale:alternate` a
     vuoto. Torna da sola quando `LINGUE_ATTIVE` cresce. */
  const altre = LOCALES.filter((l) => l.code !== locale).map((l) => ogLocale(l.code));
  return {
    type: 'website',
    siteName: NOME_SITO,
    locale: ogLocale(locale),
    ...(altre.length ? { alternateLocale: altre } : {}),
    images: immagineOg(),
  };
}

/* Il blocco di una pagina precisa: stessa base, piu' la sua foto e il suo
   indirizzo.
 *
 * 🔴 `url` si passa GIA' COSTRUITO e non lo si lascia dedurre a Next.
 * Dentro l'applicazione l'inglese vive sotto /en/ -- e' src/proxy.ts che
 * riscrive /tour/x/ in /en/tour/x/ -- quindi un indirizzo relativo
 * risolto sul percorso interno uscirebbe come
 * prestigerent.com/en/tour/x/, che e' un indirizzo che sul sito pubblico
 * non esiste. Chi chiama ha gia' la funzione che compone il percorso
 * giusto per la lingua: si usa quella. */
export function ogDiPagina(opts: {
  locale: string;
  /** il percorso pubblico, con la barra iniziale e quella finale */
  path: string;
  foto?: string | null;
}): Metadata['openGraph'] {
  return {
    ...ogDiBase(opts.locale),
    url: SITE + opts.path,
    images: immagineOg(opts.foto),
  };
}

/* La scheda di X. Next la comporrebbe da solo copiando dall'Open Graph,
   ma un comportamento implicito non e' una decisione: qui c'e' scritto
   che vogliamo la scheda grande, e titolo, testo e immagine continuano ad
   arrivare per conto loro dall'Open Graph della pagina. */
export const TWITTER: Metadata['twitter'] = { card: 'summary_large_image' };
