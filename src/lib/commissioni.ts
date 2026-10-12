/* LE COMMISSIONI DEI PARTNER: dal prezzo Retail al Net.
 *
 * Logica pura, senza direttiva: la usano le pagine (server), le tabelle
 * (client) e il PDF. Provata da `commissioni.test.ts`.
 *
 * ── LE DUE PERCENTUALI (proprieta', 12/10/2026) ──────────────────────
 *  - «privato», 10%: tutto quello che ha il prezzo per gruppo/veicolo --
 *    tour privati, escursioni dai porti, transfer (83 servizi);
 *  - «gruppo», 20%: i tour con il prezzo a persona -- i tre small group,
 *    Wine Experience compresa nelle varianti «semi private» (decisione
 *    della proprieta').
 * Il tipo si ricava dall'unita' del prezzo (`unita`), che a sua volta
 * viene dalla tab PRICES e dal `kind` del tour: un servizio nuovo si
 * classifica da solo. Le percentuali stanno nella tabella `commissioni` e
 * si cambiano da /admin/partners/commissioni/.
 *
 * ── IL CALCOLO ───────────────────────────────────────────────────────
 * Retail = il prezzo al pubblico, quello di Regiondo e del sito.
 * Net = Retail meno la percentuale, ARROTONDATO ALL'EURO (proprieta').
 * Commissione = Retail - Net: cosi' Net + commissione fa sempre il
 * Retail, al centesimo. Esempio: Retail 685 al 10% -> Net 617 (616,50
 * arrotondato), commissione 68. */

import type { Servizio } from './listino';

export type TipoCommissione = 'privato' | 'gruppo';
export type Commissioni = Record<TipoCommissione, number>;

/** Quelle decise dalla proprieta': valgono anche se la tabella non si
 *  legge, perche' un listino senza Net e' peggio di uno coi valori di
 *  partenza. */
export const COMMISSIONI_INIZIALI: Commissioni = { privato: 10, gruppo: 20 };

export function tipoCommissione(s: Pick<Servizio, 'unita'>): TipoCommissione {
  return s.unita === 'per person' ? 'gruppo' : 'privato';
}

export type Scomposto = { retail: number; net: number; commissione: number };

export function scomponi(retail: number, percentuale: number): Scomposto {
  /* in centesimi interi, per non far arrotondare male 616,4999… */
  const centesimi = Math.round(retail * 100);
  const net = Math.round((centesimi * (100 - percentuale)) / 100 / 100);
  return { retail, net, commissione: (centesimi - net * 100) / 100 };
}

/** Una percentuale accettabile: da 0 a 99, al massimo due decimali. */
export function percentualeValida(n: unknown): number | null {
  const v = typeof n === 'string' ? Number(n.replace(',', '.')) : Number(n);
  if (!Number.isFinite(v) || v < 0 || v >= 100) return null;
  return Math.round(v * 100) / 100;
}
