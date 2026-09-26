import { describe, expect, it } from 'vitest';
import {
  ALTEZZE,
  RAPPORTO_MAX,
  RAPPORTO_MIN,
  bassaRisoluzione,
  chiaviDoppie,
  decidi,
  entranoTutte,
  esclusa,
  giornoRoma,
  larghezzaDesktop,
  ordina,
  pezziTitolo,
  rapporto,
  registro,
  sizesDi,
  spiega,
  titoloDi,
  titoloPiano,
  verraRitagliata,
  type Foto,
  type Impostazioni,
  type Tag,
} from './gallery-tag';

/* Cosa si prova qui: le REGOLE, cioe' le cose che decidono se una gallery
 * si vede, in che ordine, e con quali misure. Sono le sole parti dove un
 * errore non da' un'eccezione -- da' una pagina che sembra funzionare e
 * mostra la cosa sbagliata. */

const IMP: Impostazioni = {
  galleries_enabled: true,
  min_images: 3,
  default_title: 'Moments from the *road*',
  default_subtitle: null,
  default_title_tour: 'On this tour, by our *guests*',
  default_subtitle_tour: null,
  autoplay_speed: 'medium',
  default_sort: 'manual',
};

function tag(p: Partial<Tag> = {}): Tag {
  return {
    id: 't1',
    key: 'cat:private-tours',
    type: 'cat',
    label: 'Categoria · Private tours',
    path: '/private-tours/',
    ref_id: null,
    senza_tour: false,
    is_orphan: false,
    custom_title: null,
    custom_subtitle: null,
    visibility_override: 'inherit',
    min_images_override: null,
    sort_override: null,
    ...p,
  };
}

let n = 0;
function foto(p: Partial<Foto> = {}): Foto {
  n++;
  return {
    image_id: `i${n}`,
    bucket: 'gallery',
    storage_path: `2026/09/${n}.webp`,
    width: 1600,
    height: 1200,
    blur_data_url: null,
    alt: 'A photo',
    caption: null,
    taken_at: null,
    created_at: `2026-09-0${(n % 9) + 1}T10:00:00Z`,
    position: n * 10,
    pinned: false,
    ...p,
  };
}

/* ═══ la regola di visibilita' ═══════════════════════════════════════ */

describe('decidi: quando una gallery si vede', () => {
  it('si vede con interruttore acceso e foto sopra soglia', () => {
    expect(decidi(IMP, tag(), 3).visibile).toBe(true);
    expect(decidi(IMP, tag(), 10).visibile).toBe(true);
  });

  it('non si vede sotto la soglia, e dice quante ne mancano', () => {
    const e = decidi(IMP, tag(), 2);
    expect(e.visibile).toBe(false);
    expect(spiega(e)).toBe('Nascosta — sotto soglia generale 2/3');
  });

  it('con zero foto non si vede', () => {
    expect(decidi(IMP, tag(), 0).visibile).toBe(false);
  });

  it('con l’interruttore generale spento non si vede niente', () => {
    const spento = { ...IMP, galleries_enabled: false };
    const e = decidi(spento, tag(), 50);
    expect(e.visibile).toBe(false);
    expect(spiega(e)).toBe('Nascosta — l’interruttore generale è spento');
  });

  it("l'override 'on' accende la pagina anche a interruttore spento: e' cosi' che si prova in produzione", () => {
    const spento = { ...IMP, galleries_enabled: false };
    expect(decidi(spento, tag({ visibility_override: 'on' }), 3).visibile).toBe(true);
  });

  it("ma 'on' non scavalca la soglia: senza foto non c'e' niente da mostrare", () => {
    const spento = { ...IMP, galleries_enabled: false };
    expect(decidi(spento, tag({ visibility_override: 'on' }), 2).visibile).toBe(false);
  });

  it("'off' vince su tutto, interruttore acceso compreso", () => {
    const e = decidi(IMP, tag({ visibility_override: 'off' }), 99);
    expect(e.visibile).toBe(false);
    expect(spiega(e)).toBe('Nascosta — disattivata su questa pagina');
  });

  it('la soglia della pagina scavalca quella generale, in su e in giu’', () => {
    expect(decidi(IMP, tag({ min_images_override: 8 }), 5).visibile).toBe(false);
    expect(decidi(IMP, tag({ min_images_override: 1 }), 1).visibile).toBe(true);
  });

  it('soglia della pagina vuota = si usa quella generale', () => {
    const e = decidi(IMP, tag({ min_images_override: null }), 2);
    expect(e.soglia).toBe(3);
    expect(e.sogliaPropria).toBe(false);
  });

  it('e il pannello dice QUALE soglia ha applicato', () => {
    const e = decidi(IMP, tag({ min_images_override: 5 }), 4);
    expect(spiega(e)).toBe('Nascosta — sotto soglia di questa pagina 4/5');
  });
});

/* ═══ il titolo ══════════════════════════════════════════════════════ */

describe('il titolo', () => {
  it('spezza `*parola*` nei pezzi da rendere in corsivo', () => {
    expect(pezziTitolo('Moments from the *road*')).toEqual([
      { testo: 'Moments from the ', accento: false },
      { testo: 'road', accento: true },
    ]);
  });

  it('gestisce la parola accentata in mezzo', () => {
    expect(pezziTitolo('What our *guests* say')).toEqual([
      { testo: 'What our ', accento: false },
      { testo: 'guests', accento: true },
      { testo: ' say', accento: false },
    ]);
  });

  it('un asterisco spaiato resta testo: un titolo a meta’ si corregge, uno sparito no', () => {
    expect(pezziTitolo('Moments *from the road')).toEqual([
      { testo: 'Moments *from the road', accento: false },
    ]);
  });

  it('senza asterischi torna un pezzo solo', () => {
    expect(pezziTitolo('Photos')).toEqual([{ testo: 'Photos', accento: false }]);
  });

  it('titoloPiano toglie gli asterischi, per aria-label e pannello', () => {
    expect(titoloPiano('Moments from the *road*')).toBe('Moments from the road');
  });

  it('le schede tour hanno un titolo predefinito DIVERSO: sopra c’e’ gia’ PhotoStrip', () => {
    expect(titoloDi(IMP, tag({ type: 'cat' })).titolo).toBe('Moments from the *road*');
    expect(titoloDi(IMP, tag({ type: 'tour' })).titolo).toBe('On this tour, by our *guests*');
  });

  it('il titolo scritto sulla pagina vince su tutti e due', () => {
    expect(titoloDi(IMP, tag({ type: 'tour', custom_title: 'A day in *Chianti*' })).titolo).toBe(
      'A day in *Chianti*'
    );
  });

  it('un titolo di soli spazi non conta come scritto', () => {
    expect(titoloDi(IMP, tag({ custom_title: '   ' })).titolo).toBe('Moments from the *road*');
  });
});

/* ═══ l'ordinamento ══════════════════════════════════════════════════ */

describe('ordina', () => {
  it('manuale: segue position', () => {
    const a = foto({ position: 30 });
    const b = foto({ position: 10 });
    const c = foto({ position: 20 });
    expect(ordina([a, b, c], 'manual', 'k').map((f) => f.position)).toEqual([10, 20, 30]);
  });

  it('piu’ recenti prima, per data di SCATTO', () => {
    const vecchia = foto({ taken_at: '2026-01-01T00:00:00Z', position: 10 });
    const nuova = foto({ taken_at: '2026-09-01T00:00:00Z', position: 20 });
    expect(ordina([vecchia, nuova], 'newest', 'k')[0]).toBe(nuova);
    expect(ordina([vecchia, nuova], 'oldest', 'k')[0]).toBe(vecchia);
  });

  it('senza data di scatto usa la data di caricamento, non finisce in fondo', () => {
    const conScatto = foto({ taken_at: '2026-01-01T00:00:00Z', created_at: '2026-01-02T00:00:00Z' });
    const senzaScatto = foto({ taken_at: null, created_at: '2026-09-09T00:00:00Z' });
    expect(ordina([conScatto, senzaScatto], 'newest', 'k')[0]).toBe(senzaScatto);
  });

  it('le foto fissate vengono prima, qualunque sia il criterio', () => {
    const fissata = foto({ pinned: true, position: 90, taken_at: '2020-01-01T00:00:00Z' });
    const recente = foto({ pinned: false, position: 10, taken_at: '2026-09-01T00:00:00Z' });
    expect(ordina([recente, fissata], 'newest', 'k')[0]).toBe(fissata);
    expect(ordina([recente, fissata], 'daily_random', 'k')[0]).toBe(fissata);
  });

  it('piu’ fissate restano fra loro nell’ordine manuale', () => {
    const p2 = foto({ pinned: true, position: 20 });
    const p1 = foto({ pinned: true, position: 10 });
    expect(ordina([p2, p1], 'newest', 'k').slice(0, 2).map((f) => f.position)).toEqual([10, 20]);
  });

  it('casuale del giorno: UGUALE per tutto il giorno, DIVERSO il giorno dopo', () => {
    const lista = Array.from({ length: 12 }, () => foto());
    const oggi1 = ordina(lista, 'daily_random', 'k', '2026-09-26').map((f) => f.image_id);
    const oggi2 = ordina(lista, 'daily_random', 'k', '2026-09-26').map((f) => f.image_id);
    const domani = ordina(lista, 'daily_random', 'k', '2026-09-27').map((f) => f.image_id);
    expect(oggi1).toEqual(oggi2);
    expect(oggi1).not.toEqual(domani);
  });

  it('casuale del giorno: pagine diverse mescolano in modo diverso lo stesso giorno', () => {
    const lista = Array.from({ length: 12 }, () => foto());
    const a = ordina(lista, 'daily_random', 'home', '2026-09-26').map((f) => f.image_id);
    const b = ordina(lista, 'daily_random', 'tour:x', '2026-09-26').map((f) => f.image_id);
    expect(a).not.toEqual(b);
  });

  it('casuale del giorno non perde e non duplica nessuna foto', () => {
    const lista = Array.from({ length: 9 }, () => foto());
    const out = ordina(lista, 'daily_random', 'k', '2026-09-26');
    expect(out).toHaveLength(9);
    expect(new Set(out.map((f) => f.image_id)).size).toBe(9);
  });

  it('alternata: non lascia due verticali di fila quando si puo’ evitare', () => {
    const v = () => foto({ width: 1200, height: 1600 });
    const o = () => foto({ width: 1600, height: 1200 });
    const out = ordina([v(), v(), v(), o(), o(), o()], 'alternate', 'k');
    const verticali = out.map((f) => f.height > f.width);
    for (let i = 1; i < verticali.length; i++) {
      expect(verticali[i]).not.toBe(verticali[i - 1]);
    }
  });

  it('alternata con un solo formato torna la lista com’era, senza perdere foto', () => {
    const solo = [foto({ width: 1600, height: 1200, position: 10 }), foto({ width: 1600, height: 1200, position: 20 })];
    const out = ordina(solo, 'alternate', 'k');
    expect(out).toHaveLength(2);
    expect(out.map((f) => f.position)).toEqual([10, 20]);
  });

  it('nessun criterio perde foto', () => {
    const lista = Array.from({ length: 7 }, () => foto());
    for (const c of ['manual', 'newest', 'oldest', 'daily_random', 'alternate'] as const) {
      expect(ordina(lista, c, 'k')).toHaveLength(7);
    }
  });
});

/* ═══ misure, proporzioni, sizes ═════════════════════════════════════ */

describe('proporzioni e misure', () => {
  it('le foto normali da telefono non vengono mai toccate', () => {
    expect(rapporto({ width: 1600, height: 1200 })).toBeCloseTo(4 / 3);
    expect(rapporto({ width: 1200, height: 1600 })).toBeCloseTo(3 / 4);
    expect(verraRitagliata({ width: 1600, height: 1200 })).toBe(false);
    expect(verraRitagliata({ width: 1080, height: 1920 })).toBe(false);
  });

  it('una panoramica viene contenuta a 2:1 e il pannello lo dice', () => {
    expect(rapporto({ width: 4000, height: 1000 })).toBe(RAPPORTO_MAX);
    expect(verraRitagliata({ width: 4000, height: 1000 })).toBe(true);
  });

  it('una schermata lunghissima viene contenuta a 9:16', () => {
    expect(rapporto({ width: 500, height: 4000 })).toBeCloseTo(RAPPORTO_MIN);
    expect(verraRitagliata({ width: 500, height: 4000 })).toBe(true);
  });

  it('misure assurde non fanno esplodere niente', () => {
    expect(rapporto({ width: 0, height: 0 })).toBe(1);
  });

  it('avvisa sotto 1200px sul lato corto', () => {
    expect(bassaRisoluzione({ width: 2400, height: 1100 })).toBe(true);
    expect(bassaRisoluzione({ width: 1600, height: 1200 })).toBe(false);
  });

  it('sizes e’ calcolato per QUESTA foto: una verticale chiede meno di una orizzontale', () => {
    const verticale = sizesDi({ width: 1200, height: 1600 });
    const orizzontale = sizesDi({ width: 1600, height: 1200 });
    expect(verticale).not.toBe(orizzontale);
    /* 420 x 3/4 = 315 su desktop, 420 x 4/3 = 560 */
    expect(verticale).toContain('315px');
    expect(orizzontale).toContain('560px');
  });

  it('la larghezza in pagina segue l’altezza della striscia', () => {
    expect(larghezzaDesktop({ width: 1600, height: 1200 })).toBe(Math.round(ALTEZZE.desktop * (4 / 3)));
  });
});

describe('entranoTutte: si misura, non si conta', () => {
  it('tre verticali strette ci stanno in 1280', () => {
    const v = () => foto({ width: 1200, height: 1600 });
    expect(entranoTutte([v(), v(), v()], 1280)).toBe(true);
  });

  it('tre panoramiche larghe no', () => {
    const p = () => foto({ width: 4000, height: 2000 });
    expect(entranoTutte([p(), p(), p()], 1280)).toBe(false);
  });

  it('lo stesso numero di foto puo’ entrare o no secondo il formato', () => {
    const v = () => foto({ width: 1200, height: 1600 });
    const o = () => foto({ width: 4000, height: 2000 });
    expect(entranoTutte([v(), v(), v()], 1280)).toBe(true);
    expect(entranoTutte([o(), o(), o()], 1280)).toBe(false);
  });

  it('nessuna foto: non c’e’ niente da far scorrere', () => {
    expect(entranoTutte([], 1280)).toBe(true);
  });
});

/* ═══ il registro ════════════════════════════════════════════════════ */

describe('il registro delle pagine', () => {
  const tours = [
    { id: 'u1', slug: 'wine-experience-in-tuscany', titolo: 'Wine Experience in Tuscany' },
    { id: 'u2', slug: 'transfer-from-florence-to-venice', titolo: 'Florence to Venice' },
  ];

  it('esclude /destinations/ e /transfers/ dall’indirizzo', () => {
    expect(esclusa('/destinations/')).toBe(true);
    expect(esclusa('/destinations/florence-tuscany/')).toBe(true);
    expect(esclusa('/transfers/')).toBe(true);
    expect(esclusa('/transfers/direct-transfers/florence-direct-transfers/')).toBe(true);
    expect(esclusa('/private-tours/')).toBe(false);
    expect(esclusa('/cruise-port-tours/livorno-port/')).toBe(false);
  });

  it('le SCHEDE dei transfer restano dentro: stanno sotto /tour/', () => {
    expect(esclusa('/tour/transfer-from-florence-to-venice/')).toBe(false);
    const voci = registro(tours);
    expect(voci.some((v) => v.key === 'tour:transfer-from-florence-to-venice')).toBe(true);
  });

  it('nessun tag di tipo dest o transfer viene piu’ prodotto', () => {
    const tipi = new Set(registro(tours).map((v) => v.type));
    expect(tipi.has('home')).toBe(true);
    expect([...tipi]).not.toContain('dest');
    expect([...tipi]).not.toContain('transfer');
  });

  it('i porti diventano `port:`, le altre categorie `cat:`', () => {
    const voci = registro([]);
    expect(voci.find((v) => v.path === '/cruise-port-tours/livorno-port/')?.key).toBe('port:livorno-port');
    expect(voci.find((v) => v.path === '/private-tours/')?.key).toBe('cat:private-tours');
  });

  it('i tour portano `ref_id`, cioe’ l’identita’ che sopravvive a un cambio di slug', () => {
    const v = registro(tours).find((x) => x.key === 'tour:wine-experience-in-tuscany');
    expect(v?.ref_id).toBe('u1');
    expect(v?.path).toBe('/tour/wine-experience-in-tuscany/');
  });

  it('la home c’e’ sempre, una sola volta', () => {
    expect(registro([]).filter((v) => v.type === 'home')).toHaveLength(1);
  });

  it('le entita’ HTML nei titoli non arrivano nel pannello', () => {
    /* In tour_content.title c’e’ davvero `Siena &amp; San Gimignano`: sono
       testi recuperati da WordPress. Il pannello li stampa come testo, non
       come HTML, quindi senza decodifica si leggerebbe l’entita’. */
    const v = registro([{ id: 'z', slug: 's', titolo: 'Siena &amp; San Gimignano' }]);
    expect(v.find((x) => x.key === 'tour:s')?.label).toBe('Tour · Siena & San Gimignano');
  });

  it('senza titolo inglese l’etichetta non resta vuota', () => {
    const v = registro([{ id: 'x', slug: 'un-tour-senza-titolo', titolo: null }]);
    expect(v.find((x) => x.key === 'tour:un-tour-senza-titolo')?.label).toBe('Tour · un tour senza titolo');
  });

  it('segna senza_tour solo le categorie davvero vuote', () => {
    const voci = registro([], { 'private-tours': 4 });
    expect(voci.find((v) => v.key === 'cat:private-tours')?.senza_tour).toBe(false);
    expect(voci.find((v) => v.key === 'port:palermo')?.senza_tour).toBe(true);
  });

  it('tours-of-italy non e’ segnata vuota: e’ l’indice generale, il catch-all la tratta a parte', () => {
    expect(registro([], {}).find((v) => v.key === 'cat:tours-of-italy')?.senza_tour).toBe(false);
  });

  it('non ci sono chiavi doppie sul registro vero', () => {
    expect(chiaviDoppie(registro(tours))).toEqual([]);
  });

  it('ma le chiavi doppie si sanno riconoscere, se un giorno arrivano', () => {
    const doppio = [
      { id: 'a', slug: 'x', titolo: 'X' },
      { id: 'b', slug: 'x', titolo: 'X di nuovo' },
    ];
    expect(chiaviDoppie(registro(doppio))).toEqual(['tour:x']);
  });
});

describe('giornoRoma', () => {
  it('da’ il giorno italiano in forma ordinabile', () => {
    expect(giornoRoma(new Date('2026-09-26T12:00:00Z'))).toBe('2026-09-26');
  });

  it('a mezzanotte e mezza italiana e’ gia’ il giorno nuovo, anche se a Londra no', () => {
    /* 2026-09-25T22:30:00Z = 00:30 del 26 a Roma (ora legale, +2) */
    expect(giornoRoma(new Date('2026-09-25T22:30:00Z'))).toBe('2026-09-26');
  });
});
