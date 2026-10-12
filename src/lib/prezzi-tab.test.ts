import { describe, expect, it } from 'vitest';
import {
  confronta,
  importiDellaTab,
  leggiNumero,
  riscriviImporti,
  scriviCome,
  type Variante,
} from './prezzi-tab';

/* La sincronizzazione della tab PRICES con Regiondo. Un errore qui non
 * da' un'eccezione: da' una pagina che scrive al cliente un prezzo
 * sbagliato, accanto a un testo che sembra in ordine. I casi sono presi
 * dalle tab vere del 12/10/2026. */

/** La tab vera di /tour/chianti-wineries-from-livorno-port/ (accorciata
 *  alle prime tre righe), con i prezzi rimasti indietro rispetto a
 *  Regiondo. Lo spazio dentro lo <strong> della seconda riga c'e' davvero. */
const CHIANTI =
  '<p><strong>Prices below are per party</strong> (not per person), vary depending on group size.</p>' +
  '<p>&nbsp;</p><ul>' +
  '<li><strong>Euro 690.00</strong> – party of 1 person</li>' +
  '<li><strong>Euro 780.00 </strong>– party of 2 people</li>' +
  '<li><strong>Euro 870.00</strong> – party of 3 people</li>' +
  '</ul><p>For larger parties (9 or more people) please contact us.</p>';

const varianti = (...v: [string, [string, number][]][]): Variante[] =>
  v.map(([titolo, opz], i) => ({
    id: `v${i}`,
    titolo,
    opzioni: opz.map(([nome, prezzo], j) => ({ id: `o${i}-${j}`, nome, prezzo })),
  }));

const CHIANTI_RG = varianti(['Private tour', [['1 person', 680], ['2 people', 760], ['3 people', 840]]]);

describe('leggiNumero', () => {
  it('legge i due formati ereditati da WordPress', () => {
    expect(leggiNumero('750.00')).toBe(750);
    expect(leggiNumero('90,00')).toBe(90);
    expect(leggiNumero('1,200.00')).toBe(1200);
    expect(leggiNumero('1000')).toBe(1000);
  });
});

describe('importiDellaTab', () => {
  it('trova gli importi in ordine, con la riga che li accompagna', () => {
    const imp = importiDellaTab(CHIANTI);
    expect(imp.map((i) => i.valore)).toEqual([690, 780, 870]);
    expect(imp[0].riga).toBe('Euro 690.00 – party of 1 person');
    expect(CHIANTI.slice(imp[1].inizio, imp[1].fine)).toBe('780.00');
  });

  it('si ferma agli extra: il supplemento per il Duomo di Siena non e’ un prezzo del tour', () => {
    const html =
      '<ul><li>Euro 149.00 - Adult</li><li>Euro 99.00 - Youth</li></ul>' +
      '<p><strong>Optional:</strong></p><ul><li>Siena Cathedral, Euro 15,00 per person</li></ul>';
    expect(importiDellaTab(html).map((i) => i.valore)).toEqual([149, 99]);
  });

  it('scarta le note sotto i 10 euro e accetta il simbolo €', () => {
    expect(importiDellaTab('<p>€ 89 adult</p><p>Euro 5.00 booking fee</p>').map((i) => i.valore)).toEqual([89]);
  });

  it('una tab vuota non ha importi', () => {
    expect(importiDellaTab('')).toEqual([]);
    expect(importiDellaTab(undefined)).toEqual([]);
  });
});

describe('confronta', () => {
  it('il caso vero: Chianti da Livorno e’ da aggiornare, riga per riga', () => {
    const c = confronta(CHIANTI, CHIANTI_RG);
    expect(c.stato).toBe('diverso');
    expect(c.righe.map((r) => [r.importo.valore, r.nuovo, r.opzione])).toEqual([
      [690, 680, '1 person'],
      [780, 760, '2 people'],
      [870, 840, '3 people'],
    ]);
  });

  it('prezzi uguali: niente da fare', () => {
    const rg = varianti(['Private tour', [['1 person', 690], ['2 people', 780], ['3 people', 870]]]);
    expect(confronta(CHIANTI, rg).stato).toBe('uguale');
  });

  it('La Spezia: due varianti con gli stessi prezzi, la tab le scrive tutte e due', () => {
    const tab = '<ul><li>Euro 950.00 – party of 1 person</li></ul>' +
      '<p>OPTION 2: ACCADEMIA</p><ul><li>Euro 1400.00 – party of 1 person</li></ul>' +
      '<p>OPTION 3: UFFIZI</p><ul><li>Euro 1400.00 – party of 1 person</li></ul>';
    const rg = varianti(
      ['Driver only', [['1 person', 950]]],
      ['Accademia', [['1 person', 1450]]],
      ['Uffizi', [['1 person', 1450]]],
    );
    const c = confronta(tab, rg);
    expect(c.stato).toBe('diverso');
    expect(c.righe.map((r) => r.variante)).toEqual(['Driver only', 'Accademia', 'Uffizi']);
  });

  it('wine experience: mattina e pomeriggio identici, la tab li scrive una volta', () => {
    const tab = '<p>SMALL GROUP - Euro 89.00 - Adult - Euro 79.00 - Youth</p><p>SEMIPRIVATE - Euro 129.00 - Adult</p>';
    const rg = varianti(
      ['1 WINE EXPERIENCE AM', [['Adult', 89], ['Youth', 79]]],
      ['2 WINE EXPERIENCE PM', [['Adult', 89], ['Youth', 79]]],
      ['1 WE SEMIPRIVATE AM', [['Adult', 129]]],
      ['2 WE SEMIPRIVATE PM', [['Adult', 129]]],
    );
    const c = confronta(tab, rg);
    expect(c.stato).toBe('uguale');
    expect(c.righe.map((r) => r.importo.valore)).toEqual([89, 79, 129]);
  });

  it('se il numero di importi non torna, la tab non si tocca', () => {
    const rg = varianti(['Private tour', [['1 person', 680], ['2 people', 760]]]);
    const c = confronta(CHIANTI, rg);
    expect(c.stato).toBe('non_abbinabile');
  });

  it('se «party of N» non corrisponde all’opzione, la tab non si tocca', () => {
    const rg = varianti(['Private tour', [['2 people', 680], ['1 person', 760], ['3 people', 840]]]);
    const c = confronta(CHIANTI, rg);
    expect(c.stato).toBe('non_abbinabile');
    if (c.stato === 'non_abbinabile') expect(c.motivo).toContain('party of 1');
  });

  it('senza opzioni su Regiondo non si abbina niente', () => {
    expect(confronta(CHIANTI, []).stato).toBe('non_abbinabile');
  });
});

describe('scriviCome', () => {
  it('scrive il prezzo nuovo nel formato di quello vecchio', () => {
    expect(scriviCome(680, '690.00')).toBe('680.00');
    expect(scriviCome(95, '90,00')).toBe('95,00');
    expect(scriviCome(1150, '1,200.00')).toBe('1,150.00');
    expect(scriviCome(1050, '950')).toBe('1050');
    expect(scriviCome(1050.5, '950.00')).toBe('1050.50');
  });
});

describe('riscriviImporti', () => {
  it('cambia SOLO le cifre: il resto dell’HTML resta identico al carattere', () => {
    const c = confronta(CHIANTI, CHIANTI_RG);
    const nuovo = riscriviImporti(CHIANTI, c.righe);
    expect(nuovo).toBe(CHIANTI.replace('690.00', '680.00').replace('780.00', '760.00').replace('870.00', '840.00'));
    expect(confronta(nuovo, CHIANTI_RG).stato).toBe('uguale');
  });

  it('regge le cifre che cambiano lunghezza (950 → 1050)', () => {
    const tab = '<ul><li>Euro 950.00 – party of 1 person</li><li>Euro 990.00 – party of 2 people</li></ul>';
    const rg = varianti(['T', [['1 person', 1050], ['2 people', 1100]]]);
    const nuovo = riscriviImporti(tab, confronta(tab, rg).righe);
    expect(nuovo).toBe('<ul><li>Euro 1050.00 – party of 1 person</li><li>Euro 1100.00 – party of 2 people</li></ul>');
  });
});
