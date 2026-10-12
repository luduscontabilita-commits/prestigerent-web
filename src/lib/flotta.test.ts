import { describe, expect, it } from 'vitest';
import { FLOTTA, testiMezzo, type ModificaTesto } from './flotta';

/* I testi della flotta modificati dall'admin (tabella `flotta_testi`).
 * Un errore qui e' la modifica di un mezzo che finisce su un altro, o
 * quella in italiano che compare al partner che legge in inglese. */

const classeE = FLOTTA.find((m) => m.chiave === 'classe-e')!;
const atego = FLOTTA.find((m) => m.chiave === 'atego')!;

describe('testiMezzo', () => {
  it('senza modifiche restituisce i testi del codice', () => {
    expect(testiMezzo(classeE, 'en').descrizione).toBe(classeE.descrizione);
    expect(testiMezzo(classeE, 'it')).toEqual({ nome: classeE.nome, ...classeE.it });
  });

  it('il nome e\' lo stesso nelle due lingue finche\' non lo si cambia, poi vale per una sola', () => {
    expect(testiMezzo(classeE, 'it').nome).toBe('Mercedes E-Class');
    const mod: ModificaTesto[] = [{ chiave: 'classe-e', lingua: 'it', campo: 'nome', testo: 'Mercedes Classe E' }];
    expect(testiMezzo(classeE, 'it', mod).nome).toBe('Mercedes Classe E');
    expect(testiMezzo(classeE, 'en', mod).nome).toBe('Mercedes E-Class');
  });

  it('la modifica vale solo per il suo mezzo e la sua lingua', () => {
    const mod: ModificaTesto[] = [{ chiave: 'classe-e', lingua: 'it', campo: 'descrizione', testo: '  Nuova descrizione.  ' }];
    expect(testiMezzo(classeE, 'it', mod).descrizione).toBe('Nuova descrizione.');
    expect(testiMezzo(classeE, 'en', mod).descrizione).toBe(classeE.descrizione);
    expect(testiMezzo(atego, 'it', mod).descrizione).toBe(atego.it.descrizione);
  });

  it('non tocca i testi del codice', () => {
    testiMezzo(classeE, 'it', [{ chiave: 'classe-e', lingua: 'it', campo: 'tipo', testo: 'Altro' }]);
    expect(classeE.it.tipo).toBe('Berlina');
  });

  it('un campo facoltativo svuotato sparisce, uno obbligatorio resta', () => {
    const mod: ModificaTesto[] = [
      { chiave: 'atego', lingua: 'en', campo: 'dettagli', testo: '   ' },
      { chiave: 'atego', lingua: 'en', campo: 'descrizione', testo: '' },
    ];
    const t = testiMezzo(atego, 'en', mod);
    expect(t.dettagli).toBeNull();
    expect(t.descrizione).toBe(atego.descrizione);
  });

  it('si puo\' aggiungere un campo che nel codice era vuoto', () => {
    const t = testiMezzo(classeE, 'en', [{ chiave: 'classe-e', lingua: 'en', campo: 'suRichiesta', testo: 'Weddings.' }]);
    expect(t.suRichiesta).toBe('Weddings.');
  });
});
