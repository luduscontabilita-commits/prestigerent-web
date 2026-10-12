import { describe, expect, it } from 'vitest';
import { raggruppa, righeDelServizio, sezioneDi, type Servizio, type Variante } from './listino';
import { FLOTTA, impiegoDi } from './flotta';

/* Come si ordina il listino e quale mezzo fa quale servizio. Un errore qui
 * non rompe niente di visibile subito: mette un tour nella sezione
 * sbagliata, o fa dire alla pagina della flotta che il minibus fa i
 * transfer privati. */

describe('sezioneDi', () => {
  it('un tour dal porto va sotto il suo porto, anche se e’ anche un privato', () => {
    expect(sezioneDi(['private-tours', 'livorno-port', 'cruise-port-tours'])).toEqual({ sezione: 'cruise', gruppo: 'Livorno' });
  });

  it('i transfer con la fermata si distinguono da quelli diretti', () => {
    expect(sezioneDi(['transfers', 'transfers-with-stop-enroute', 'florence-to-venice'])).toEqual({
      sezione: 'transfers',
      gruppo: 'With a stop on the way',
    });
    expect(sezioneDi(['transfers', 'direct-transfers', 'florence-direct-transfers'])).toEqual({
      sezione: 'transfers',
      gruppo: 'Direct transfers',
    });
  });

  it('small group prima di wine & food, wine & food prima dei privati', () => {
    expect(sezioneDi(['small-group-tours', 'wine-and-food-experiences']).sezione).toBe('small');
    expect(sezioneDi(['wine-and-food-experiences', 'private-tours']).sezione).toBe('wine');
    expect(sezioneDi(['private-tours', 'tours-of-italy']).sezione).toBe('private');
  });

  it('un tour senza categorie note non sparisce: va in «altri servizi»', () => {
    expect(sezioneDi([]).sezione).toBe('other');
  });
});

const v = (titolo: string, opz: [string, number][]): Variante => ({
  id: titolo,
  titolo,
  opzioni: opz.map(([nome, prezzo]) => ({ id: nome, nome, prezzo })),
});

describe('righeDelServizio', () => {
  it('le persone per riga, solo il numero', () => {
    const r = righeDelServizio([v('Private', [['1 person', 850], ['2 people', 900]])]);
    expect(r.perPersone).toBe(true);
    expect(r.righe).toEqual([
      { etichetta: '1', prezzi: [850] },
      { etichetta: '2', prezzi: [900] },
    ]);
  });

  it('le varianti in colonna; un’opzione che manca in una variante resta vuota', () => {
    const r = righeDelServizio([v('AM', [['Adult', 89], ['Youth', 79]]), v('Semi', [['Adult', 129]])]);
    expect(r.perPersone).toBe(false);
    expect(r.righe).toEqual([
      { etichetta: 'Adult', prezzi: [89, 129] },
      { etichetta: 'Youth', prezzi: [79, null] },
    ]);
  });
});

const s = (slug: string, sezione: Servizio['sezione'], gruppo: string | null, unita: Servizio['unita'] = 'per party'): Servizio => ({
  slug,
  nome: slug,
  sku: 'T-' + slug,
  sezione,
  gruppo,
  unita,
  varianti: null,
});

describe('raggruppa', () => {
  it('le sezioni nell’ordine del listino, i porti nell’ordine del menu, i tour in ordine alfabetico', () => {
    const g = raggruppa([
      s('b-private', 'private', null),
      s('z-spezia', 'cruise', 'La Spezia'),
      s('a-livorno', 'cruise', 'Livorno'),
      s('c-livorno', 'cruise', 'Livorno'),
    ]);
    expect(g.map((x) => x.chiave)).toEqual(['cruise', 'private']);
    expect(g[0].gruppi.map((x) => x.gruppo)).toEqual(['Livorno', 'La Spezia']);
    expect(g[0].gruppi[0].servizi.map((x) => x.slug)).toEqual(['a-livorno', 'c-livorno']);
  });
});

describe('flotta', () => {
  const servizi = [s('siena-small-group', 'small', null, 'per person'), s('chianti-private', 'private', null)];

  it('il minibus fa i small group, le auto i servizi per gruppo', () => {
    const isuzu = FLOTTA.find((m) => m.chiave === 'isuzu')!;
    const classeV = FLOTTA.find((m) => m.chiave === 'classe-v')!;
    expect(impiegoDi(isuzu, servizi).map((x) => x.slug)).toEqual(['siena-small-group']);
    expect(impiegoDi(classeV, servizi).map((x) => x.slug)).toEqual(['chianti-private']);
  });

  it('le auto coprono i gruppi da 1 a 8 senza buchi', () => {
    const coperti = new Set<number>();
    for (const m of FLOTTA) if (m.persone) for (let n = m.persone[0]; n <= m.persone[1]; n++) coperti.add(n);
    expect([...coperti].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('ogni mezzo porta almeno le persone per cui lo si usa', () => {
    for (const m of FLOTTA) if (m.persone) expect(m.postiMax).toBeGreaterThanOrEqual(m.persone[1]);
  });

  it('ogni foto ha autore, licenza e fonte', () => {
    for (const m of FLOTTA) {
      expect(m.credito.autore).toBeTruthy();
      expect(m.credito.licenzaUrl).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(m.credito.fonte).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
    }
  });
});
