import type { TipoTag } from '@/lib/gallery-tag';

/* I GRUPPI IN CUI SI MOSTRANO LE PAGINE, in un posto solo.
 *
 * Li usano il menu del caricamento (fisarmonica) e la barra "una pagina su
 * piu' foto" (menu a tendina a gruppi). Stanno in un modulo SENZA
 * `'use client'` di proposito: e' solo dati, e un dato esportato da un
 * modulo client diventa un riferimento, non il valore -- e' la prima delle
 * tre rotture del pannello raccontate nel CLAUDE.md.
 *
 * L'album per primo: e' il tag che una guida usa piu' spesso, e non e' una
 * pagina di prodotto da cercare nell'albero. */
export const GRUPPI: readonly { tipo: TipoTag; titolo: string }[] = [
  { tipo: 'album', titolo: 'Album del sito' },
  { tipo: 'home', titolo: 'Home' },
  { tipo: 'cat', titolo: 'Categorie' },
  { tipo: 'port', titolo: 'Porti' },
  { tipo: 'tour', titolo: 'Tour' },
];
