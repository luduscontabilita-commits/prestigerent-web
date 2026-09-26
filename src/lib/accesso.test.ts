import { describe, expect, it } from 'vitest';
import {
  DOMINIO_GUIDE,
  LUNGHEZZA_PASSWORD,
  ALFABETO_PASSWORD,
  comeSiChiama,
  eIndirizzoInterno,
  emailDiGuida,
  nomeUtenteValido,
  normalizza,
  pareEmail,
} from './accesso';

/* Le regole dell'accesso. Un errore qui non da' un'eccezione: da' una
 * persona che scrive il nome giusto e non entra, e che riprova la stessa
 * cosa tre volte senza capire. */

describe('normalizza', () => {
  it('toglie spazi e maiuscole', () => {
    expect(normalizza('  Mario  ')).toBe('mario');
  });

  it('il correttore del telefono maiuscolizza la prima lettera: Mario e mario sono la stessa persona', () => {
    expect(normalizza('Mario')).toBe(normalizza('mario'));
  });
});

describe('nomeUtenteValido', () => {
  it('accetta i nomi normali', () => {
    for (const v of ['mario', 'mario.rossi', 'anna-maria', 'guida_1', 'abc', 'm2']) {
      expect(nomeUtenteValido(v)).toBe(v !== 'm2'); // m2 e' di 2 caratteri
    }
  });

  it('accetta le maiuscole perche' + "' le normalizza prima", () => {
    expect(nomeUtenteValido('Mario')).toBe(true);
  });

  it('rifiuta sotto i 3 e sopra i 32 caratteri', () => {
    expect(nomeUtenteValido('ab')).toBe(false);
    expect(nomeUtenteValido('a'.repeat(33))).toBe(false);
    expect(nomeUtenteValido('a'.repeat(32))).toBe(true);
  });

  it('rifiuta spazi, accenti e caratteri strani', () => {
    for (const v of ['mario rossi', 'mariò', 'mario!', 'mario/rossi', '']) {
      expect(nomeUtenteValido(v)).toBe(false);
    }
  });

  it('🔴 rifiuta la chiocciola: e’ il carattere che distingue un nome utente da un’email', () => {
    /* Se passasse, la schermata lo prenderebbe per un indirizzo e quella
       persona non entrerebbe MAI, senza nessun messaggio che lo spieghi. */
    expect(nomeUtenteValido('mario@rossi')).toBe(false);
  });

  it('non comincia con punto o trattino', () => {
    expect(nomeUtenteValido('.mario')).toBe(false);
    expect(nomeUtenteValido('-mario')).toBe(false);
  });

  it('lo stesso formato del vincolo nel database', () => {
    /* profili_username_formato: ^[a-z0-9][a-z0-9._-]{2,31}$
       Se i due divergono, il pannello accetta un nome che l’insert poi
       rifiuta, e l’errore parla di un vincolo che nessuno ha mai visto. */
    const vincolo = /^[a-z0-9][a-z0-9._-]{2,31}$/;
    for (const v of ['mario', 'ab', 'mario.rossi', 'Mario', '-x', 'a'.repeat(33)]) {
      expect(nomeUtenteValido(v)).toBe(vincolo.test(normalizza(v)));
    }
  });
});

describe('pareEmail', () => {
  it('distingue email e nome utente sulla chiocciola', () => {
    expect(pareEmail('usa@prestigerent.com')).toBe(true);
    expect(pareEmail('admin')).toBe(false);
    expect(pareEmail('  USA@Prestigerent.com ')).toBe(true);
  });
});

describe("l'indirizzo interno delle guide", () => {
  it('si compone dal nome utente', () => {
    expect(emailDiGuida('Mario')).toBe(`mario@${DOMINIO_GUIDE}`);
  });

  it('🔴 il dominio non esiste e non esistera’ mai (RFC 2606)', () => {
    /* E’ il motivo per cui il recupero password via email su un account
       guida e’ impossibile PER COSTRUZIONE, e non per un’impostazione
       che qualcuno puo’ cambiare domani. */
    expect(DOMINIO_GUIDE.endsWith('.invalid')).toBe(true);
  });

  it('riconosce un indirizzo interno, per non mostrarlo mai a schermo', () => {
    expect(eIndirizzoInterno(`mario@${DOMINIO_GUIDE}`)).toBe(true);
    expect(eIndirizzoInterno('usa@prestigerent.com')).toBe(false);
    expect(eIndirizzoInterno(null)).toBe(false);
    expect(eIndirizzoInterno('')).toBe(false);
  });
});

describe('comeSiChiama', () => {
  it('preferisce il nome', () => {
    expect(comeSiChiama({ nome: 'Mario Rossi', username: 'mario', email: 'x@y.z' })).toBe('Mario Rossi');
  });

  it('senza nome usa il nome utente', () => {
    expect(comeSiChiama({ nome: null, username: 'mario', email: 'x@y.z' })).toBe('mario');
  });

  it('🔴 non mostra MAI l’indirizzo interno di una guida', () => {
    /* Vedere `mario@guide.prestigerent.invalid` scritto accanto al
       proprio nome fa pensare a un guasto. */
    const g = { nome: null, username: null, email: `mario@${DOMINIO_GUIDE}` };
    expect(comeSiChiama(g)).toBe('senza nome');
    expect(comeSiChiama(g)).not.toContain('@');
  });

  it('per un admin senza nome ne’ username ripiega sull’email vera', () => {
    expect(comeSiChiama({ nome: null, username: null, email: 'usa@prestigerent.com' })).toBe('usa@prestigerent.com');
  });

  it('il nome fatto di soli spazi non conta', () => {
    expect(comeSiChiama({ nome: '   ', username: 'mario' })).toBe('mario');
  });
});

describe('le password generate per le guide', () => {
  it('l’alfabeto non contiene i caratteri che si confondono al telefono', () => {
    /* 0/O e 1/l/I: averli dentro non aggiunge sicurezza degna di nota e
       produce telefonate del tipo «ma e’ uno o una elle?». */
    for (const c of ['0', 'O', '1', 'l', 'I']) {
      expect(ALFABETO_PASSWORD).not.toContain(c);
    }
  });

  it('e’ lunga abbastanza da non doversi indovinare', () => {
    /* 12 caratteri su 56 simboli = circa 70 bit: fuori portata per chi
       prova attraverso un endpoint di rete, che e’ l’unico attacco
       possibile qui. Il minimo di Supabase e’ 6. */
    expect(LUNGHEZZA_PASSWORD).toBeGreaterThanOrEqual(12);
    const bit = LUNGHEZZA_PASSWORD * Math.log2(ALFABETO_PASSWORD.length);
    expect(bit).toBeGreaterThan(64);
  });
});
