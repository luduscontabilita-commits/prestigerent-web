import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { creaPdfListino } from './listino-pdf';
import type { Servizio } from './listino';

/* La brochure in PDF. Un errore qui e' un file che non si genera (un
 * carattere che Helvetica non conosce ferma tutto) o un listino che
 * finisce in tre pagine quando la fiera ne vuole due. */

const persone = (base: number) => ['1 person', '2 people', '3 people', '4 people', '5 people', '6 people', '7 people', '8 people'].map((nome, i) => ({ id: `${i}`, nome, prezzo: base + i * 50 }));

function catalogo(quanti: number): Servizio[] {
  const sezioni: Servizio['sezione'][] = ['cruise', 'transfers', 'private', 'wine', 'small'];
  return Array.from({ length: quanti }, (_, i) => {
    const sezione = sezioni[i % sezioni.length];
    return {
      slug: `tour-${i}`,
      nome: `Private Tour number ${i} to Siena & San Gimignano ★ from Florence`,
      sku: `T-PR193-${100000 + i}`,
      sezione,
      gruppo: sezione === 'cruise' ? 'Livorno' : null,
      unita: sezione === 'small' ? 'per person' : 'per party',
      varianti:
        sezione === 'small'
          ? [{ id: 'v', titolo: 'Tour + Lunch', opzioni: [{ id: 'a', nome: 'Adult', prezzo: 149 }, { id: 'y', nome: 'Youth', prezzo: 119 }] }]
          : [{ id: 'v', titolo: 'Private', opzioni: persone(600 + i) }],
    };
  });
}

describe('creaPdfListino', () => {
  for (const lingua of ['it', 'en'] as const) {
    it(`${lingua}: 95 servizi stanno in due pagine A4, anche con caratteri che Helvetica non ha`, async () => {
      const file = await creaPdfListino({ servizi: catalogo(95), lingua, azienda: { anno_fondazione: 2000, voto_medio: 4.9 }, logoPng: null, data: '12 ottobre 2026' });
      const pdf = await PDFDocument.load(file);
      expect(pdf.getPageCount()).toBe(2);
      const [l, a] = [pdf.getPage(0).getWidth(), pdf.getPage(0).getHeight()];
      expect([Math.round(l), Math.round(a)]).toEqual([595, 842]);
    });
  }
});
