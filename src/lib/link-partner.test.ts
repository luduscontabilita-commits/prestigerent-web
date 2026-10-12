import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creaLinkPartner, leggiLinkPartner } from './link-partner';

/* Il link di accesso diretto dei partner. Un errore qui e' un'agenzia che
 * entra con l'account di un'altra, o un link che non apre niente. */

const prima = process.env.SUPABASE_SECRET_KEY;
beforeAll(() => {
  process.env.SUPABASE_SECRET_KEY = 'chiave-di-prova';
});
afterAll(() => {
  process.env.SUPABASE_SECRET_KEY = prima;
});

const gettone = (link: string) => new URL(link).searchParams.get('t')!;

describe('link di accesso dei partner', () => {
  it('un link appena creato apre, con l’email giusta', () => {
    const link = creaLinkPartner('Anna@Example.com')!;
    expect(link.startsWith('https://prestigerent.com/partners/enter/?t=')).toBe(true);
    expect(leggiLinkPartner(gettone(link))).toEqual({ email: 'anna@example.com' });
  });

  it('nel link non c’è la password, e nemmeno l’email in chiaro', () => {
    const link = creaLinkPartner('anna@example.com')!;
    expect(link).not.toContain('anna@example.com');
    expect(link).not.toContain('password');
  });

  it('cambiare l’email dentro il gettone rompe la firma', () => {
    const [, f] = gettone(creaLinkPartner('anna@example.com')!).split('.');
    const finto = Buffer.from(JSON.stringify({ e: 'mario@example.com', x: 9999999999 })).toString('base64url');
    expect(leggiLinkPartner(`${finto}.${f}`)).toEqual({ errore: 'firma' });
  });

  it('dopo 14 giorni è scaduto, e dice per chi era', () => {
    const t = gettone(creaLinkPartner('anna@example.com', Date.now() - 15 * 86400_000)!);
    expect(leggiLinkPartner(t)).toEqual({ errore: 'scaduto', email: 'anna@example.com' });
  });

  it('un gettone a caso non apre niente', () => {
    expect(leggiLinkPartner('abc')).toEqual({ errore: 'firma' });
    expect(leggiLinkPartner('')).toEqual({ errore: 'firma' });
  });

  it('con un’altra chiave segreta i link vecchi non aprono più', () => {
    const t = gettone(creaLinkPartner('anna@example.com')!);
    process.env.SUPABASE_SECRET_KEY = 'chiave-nuova';
    expect(leggiLinkPartner(t)).toEqual({ errore: 'firma' });
    process.env.SUPABASE_SECRET_KEY = 'chiave-di-prova';
  });
});
