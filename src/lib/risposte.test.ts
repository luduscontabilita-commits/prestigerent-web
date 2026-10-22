import { describe, expect, test } from 'vitest';
import { guaiDi, linguaDi, siPuoPubblicare, type Recensione } from './risposte';

/* I CONTROLLI SULLE RISPOSTE, PROVATI SUI CASI VERI.
 *
 * Ogni caso qui sotto e' uscito da una prova su recensioni vere del
 * 22/10/2026, non inventato: tre erano guasti del modello, due erano
 * guasti dei MIEI controlli. Restano scritti perche' sono esattamente le
 * cose che tornerebbero, e perche' un controllo sbagliato (che segnala
 * un guaio che non c'e') fa piu' danno di un controllo mancante: dopo
 * tre falsi allarmi nessuno guarda piu' gli allarmi.
 */

const base: Recensione = {
  id: 1,
  fonte: 'viator',
  autore: 'Matthew_R',
  voto: 5,
  titolo: null,
  testo: 'We visited Siena and San Gimignano with Lorenzo, the lunch at the vineyard was excellent.',
  lingua: 'en',
  tour_slug: 'siena-san-gimignano',
  data: '2026-04-01',
};

describe('la lingua', () => {
  test('riconosce le lingue che servono', () => {
    expect(linguaDi('Thank you so much, it was a pleasure to have you with us in Tuscany')).toBe('en');
    expect(linguaDi('Merci beaucoup, nous avons vraiment apprécié votre visite avec nous')).toBe('fr');
    expect(linguaDi('Vielen Dank, es freut mich sehr, dass Sie die Tour mit uns genossen haben')).toBe('de');
    expect(linguaDi('Muchas gracias, me alegra mucho que hayas disfrutado de la experiencia con nosotros')).toBe('es');
  });

  test('non inventa una lingua su un testo troppo corto', () => {
    expect(linguaDi('Grazie!')).toBeNull();
  });

  test('🔴 blocca la risposta nella lingua sbagliata', () => {
    /* il caso vero: recensione in spagnolo, risposta che parte in
       spagnolo e scivola in italiano */
    const rec = { ...base, lingua: 'es', autore: 'Sandra B.', testo: 'Muy buena experiencia, el tour por la Toscana fue precioso y la comida excelente.' };
    const guai = guaiDi(
      'Muchas gracias, Sandra, mi fa piacere che tu abbia apprezzato il tour. Sono contento che le mie spiegazioni ti siano piaciute, e che abbiate goduto il pranzo in vigna. Spero di rivedervi presto in Toscana!',
      rec
    );
    expect(guai.some((g) => g.gravita === 'blocca' && /spagnolo/.test(g.perche))).toBe(true);
    expect(siPuoPubblicare(guai)).toBe(false);
  });

  test('lascia passare la risposta nella lingua giusta', () => {
    const rec = { ...base, lingua: 'fr', autore: 'Nancy D.', testo: 'Nous avons visité de très beaux vignobles et goûté de très bons vins!' };
    const guai = guaiDi(
      'Merci beaucoup, Nancy ! Je suis vraiment content que vous ayez apprécié les vignobles que nous avons visités. J’espère que vous garderez un bon souvenir des vins de la Toscane.',
      rec
    );
    expect(siPuoPubblicare(guai)).toBe(true);
  });
});

describe('il nome', () => {
  test('🔴 lo riconosce anche con le lettere accentate', () => {
    /* il controllo diceva «non la chiama per nome» su una risposta che
       cominciava col suo nome: `\b` in JavaScript e' ASCII */
    const rec = { ...base, autore: 'Ildikó V.' };
    const guai = guaiDi(
      'Thank you so much, Ildikó! It was a real pleasure spending the day with you in Siena and San Gimignano, and I am glad you enjoyed the lunch at the vineyard.',
      rec
    );
    expect(guai.map((g) => g.perche).join()).not.toMatch(/per nome/);
  });

  test('se manca, lo dice', () => {
    const guai = guaiDi(
      'Thank you so much! It was a pleasure to show you Siena and San Gimignano, and the lunch at the vineyard is always a good moment.',
      base
    );
    expect(guai.some((g) => /per nome \(Matthew\)/.test(g.perche))).toBe(true);
  });
});

describe('quello che non si pubblica', () => {
  test('una promessa di rimborso blocca', () => {
    const guai = guaiDi('Dear Matthew, we are sorry about Siena and will send you a refund.', base);
    expect(guai.some((g) => g.gravita === 'blocca' && /rimborso/.test(g.perche))).toBe(true);
  });

  test('un numero che il cliente non ha scritto blocca', () => {
    const guai = guaiDi(
      'Thank you Matthew! The lunch at the vineyard lasts 45 minutes and Siena is always worth it.',
      base
    );
    expect(guai.some((g) => g.gravita === 'blocca' && /numero/.test(g.perche))).toBe(true);
  });

  test('un numero che c’era nella recensione non blocca', () => {
    const rec = { ...base, testo: 'We left at 08:00 and the walking tour of Siena lasted 90 minutes, excellent.' };
    const guai = guaiDi(
      'Thank you Matthew! Leaving at 08:00 is what lets us see Siena before the crowds arrive.',
      rec
    );
    expect(siPuoPubblicare(guai)).toBe(true);
  });
});

describe('quello che si segnala senza bloccare', () => {
  test('le formule da ufficio stampa, anche rigirate', () => {
    const g1 = guaiDi('Dear Matthew, thank you for your feedback about Siena and the vineyard lunch.', base);
    expect(g1.some((g) => /generico/.test(g.perche))).toBe(true);

    /* la forma che il modello usa quando gli si vieta quella diretta */
    const g2 = guaiDi(
      'Dear Matthew, your feedback about the vineyard lunch in Siena is very valuable to us.',
      base
    );
    expect(g2.some((g) => /ufficio stampa/.test(g.perche))).toBe(true);
  });

  test('sulle critiche, se non offre una via privata', () => {
    const rec = { ...base, voto: 1, autore: 'Jane W.', testo: 'The private tour of Lucca was a drive, not a tour, and many buildings were closed.' };
    const senza = guaiDi(
      'Dear Jane, I am truly sorry the private tour of Lucca did not meet your expectations, and that so many buildings were closed that morning.',
      rec
    );
    expect(senza.some((g) => /in privato/.test(g.perche))).toBe(true);

    const con = guaiDi(
      'Dear Jane, I am truly sorry the private tour of Lucca did not meet your expectations, and that so many buildings were closed. Please write to me directly so I can make it right.',
      rec
    );
    expect(con.some((g) => /in privato/.test(g.perche))).toBe(false);
  });

  test('la risposta che non riprende niente sembra prestampata', () => {
    const guai = guaiDi('Dear Matthew, thanks a lot! We were very happy to have you.', base);
    expect(guai.some((g) => /prestampata/.test(g.perche))).toBe(true);
  });

  test('una risposta troppo lunga si blocca', () => {
    const lunga = 'Dear Matthew, ' + 'the vineyard lunch in Siena was a pleasure for us too. '.repeat(20);
    const guai = guaiDi(lunga, base);
    expect(guai.some((g) => g.gravita === 'blocca' && /troppo lunga/.test(g.perche))).toBe(true);
  });
});

test('la risposta buona non ha nessun guaio', () => {
  const guai = guaiDi(
    'Hi Matthew, I’m so glad you enjoyed Siena and San Gimignano, and that the lunch at the vineyard was a good memory. It was a pleasure showing you around.\n\nPrestige Rent',
    base
  );
  expect(guai).toEqual([]);
});
