import { describe, expect, it } from 'vitest';
import { percentualeValida, scomponi, tipoCommissione } from './commissioni';

/* Net e commissione dei partner. Un errore qui e' un'agenzia che paga
 * troppo, o troppo poco, su ogni prenotazione. */

describe('scomponi', () => {
  it('l\'esempio della proprieta\': 685 al 10% -> Net 617, commissione 68', () => {
    expect(scomponi(685, 10)).toEqual({ retail: 685, net: 617, commissione: 68 });
  });

  it('Net + commissione fa sempre il Retail', () => {
    for (const r of [89, 149, 250, 685, 950, 1440, 79.5])
      for (const p of [0, 10, 12.5, 20, 33]) {
        const x = scomponi(r, p);
        expect(Math.round((x.net + x.commissione) * 100) / 100).toBe(r);
        expect(Number.isInteger(x.net)).toBe(true);
      }
  });

  it('small group al 20%: 89 -> Net 71, commissione 18', () => {
    expect(scomponi(89, 20)).toEqual({ retail: 89, net: 71, commissione: 18 });
  });

  it('0% e\' tutto Net', () => {
    expect(scomponi(500, 0)).toEqual({ retail: 500, net: 500, commissione: 0 });
  });
});

describe('tipoCommissione', () => {
  it('a persona = gruppo, per gruppo/veicolo = privato', () => {
    expect(tipoCommissione({ unita: 'per person' })).toBe('gruppo');
    expect(tipoCommissione({ unita: 'per party' })).toBe('privato');
  });
});

describe('percentualeValida', () => {
  it('accetta 0-99 con la virgola, rifiuta il resto', () => {
    expect(percentualeValida('12,5')).toBe(12.5);
    expect(percentualeValida(10)).toBe(10);
    expect(percentualeValida('100')).toBeNull();
    expect(percentualeValida(-1)).toBeNull();
    expect(percentualeValida('abc')).toBeNull();
  });
});
