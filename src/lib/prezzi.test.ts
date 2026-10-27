import { describe, expect, it } from 'vitest';
import { prezzoAdulti } from './prezzi';

/* Il prezzo Adult dei tour a persona (proprieta', 27/10/2026): sulla scheda
 * compariva «from €79», il prezzo dei ragazzi, per un tour che un adulto
 * paga 89. */

const v = (...opzioni: [string, number][]) => ({ opzioni: opzioni.map(([nome, prezzo]) => ({ nome, prezzo })) });

describe('prezzoAdulti', () => {
  it('Wine Experience: l\'Adult piu\' basso, non lo Youth e non il semi privato', () => {
    expect(prezzoAdulti([v(['Adult ', 89], ['Youth', 79]), v(['Adult ', 89], ['Youth', 79]), v(['Adult ', 129])])).toBe(89);
  });

  it('Siena e San Gimignano: Adult e Child', () => {
    expect(prezzoAdulti([v(['Adult ', 149], ['Child', 99])])).toBe(149);
  });

  it('i tour per gruppo non hanno Adult: null, la pagina resta col «from»', () => {
    expect(prezzoAdulti([v(['1 person', 590], ['2 people', 680])])).toBeNull();
    expect(prezzoAdulti(null)).toBeNull();
    expect(prezzoAdulti([])).toBeNull();
  });

  it('non scambia per Adult una parola che ci comincia soltanto', () => {
    expect(prezzoAdulti([v(['Adulthood pass', 10], ['Child', 5])])).toBeNull();
  });
});
