import { NextResponse } from 'next/server';
import { recensioniDi } from '@/lib/recensioni';

/* LE RECENSIONI PER LE LANDING, DALLA STESSA FONTE DELLA SCHEDA.
 *
 * ── PERCHE' ESISTE QUESTA ROTTA ─────────────────────────────────────
 * Le landing sono HTML statico: le recensioni ce le ho messe COPIANDOLE
 * dalla scheda /tour/, e l'avevo scritto nero su bianco che era una copia
 * e non uno specchio. Il 09/09/2026 il limite si e' visto: sulla landing
 * la piu' recente era di luglio, cioe' due mesi. Una recensione vecchia
 * non dice "il tour e' bello", dice "qui non passa piu' nessuno da un
 * pezzo" -- ed e' l'unico effetto che la prova sociale non deve avere.
 *
 * Copiarle di nuovo a mano avrebbe rimandato lo stesso problema di due
 * mesi. Le landing stanno sullo stesso dominio della scheda: possono
 * leggerle dal vivo, come gia' fanno con /api/prenotazioni/. Una fonte
 * sola, nessuna copia da ricordarsi di rinfrescare.
 *
 * ── LE STATICHE RESTANO, E NON E' RIDONDANZA ────────────────────────
 * In pagina le sei carte scritte a mano ci sono ancora, e questa rotta le
 * SOSTITUISCE quando risponde. Se la rete cade o la rotta sbaglia, chi
 * guarda vede comunque sei recensioni vere invece di un buco: su una
 * pagina che vive di prova, il caso peggiore deve restare leggibile.
 *
 * ── COSA ESCE DI QUI ────────────────────────────────────────────────
 * Nome di battesimo e iniziale, come gia' fa la scheda. Il cognome per
 * intero non entra: le recensioni sono pubbliche sulla piattaforma, ma
 * questa e' una rotta aperta e quello che passa di qui va trattato come
 * gia' pubblico ovunque.
 */

/* Le etichette sono le STESSE della scheda (RecensioneCard.tsx). Se qui
 * scrivessi "Direct booking" e li' "Verified booking", la stessa
 * recensione avrebbe due provenienze diverse sullo stesso sito -- ed e'
 * esattamente il tipo di dettaglio che fa dubitare di tutto il resto. */
const NOMI: Record<string, string> = {
  tripadvisor: 'Tripadvisor',
  google: 'Google',
  viator: 'Viator',
  getyourguide: 'GetYourGuide',
  regiondo: 'Verified booking',
};

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;

  /* 🔴 LO SLUG SI RIPULISCE PRIMA DI USARLO.
     `recensioniDi` lo infila dentro un filtro PostgREST (`.or(...)`), che
     e' una stringa interpretata: uno slug con dentro una virgola o una
     parentesi non darebbe errore, cambierebbe la condizione. Qui passa
     solo quello che uno slug puo' essere davvero. */
  const tour = (p.get('tour') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 120);
  const quante = Math.min(12, Math.max(1, Number(p.get('n')) || 6));

  const vuoto = NextResponse.json({ recensioni: [] });
  if (!tour) return vuoto;

  let righe;
  try {
    righe = await recensioniDi(tour, quante);
  } catch {
    /* Database lento o irraggiungibile: la landing tiene le sue carte
       statiche e non se ne accorge nessuno. */
    return vuoto;
  }

  const recensioni = righe.map((r) => {
    const nome = (r.autore ?? '').trim();
    return {
      /* Il nome arriva gia' accorciato in tabella ("Cristina P."), ma se
         un giorno ci finisse dentro un cognome intero questo lo taglia
         lo stesso: la garanzia non deve dipendere da com'e' scritta la
         riga. */
      autore: nome.split(/\s+/).slice(0, 2).join(' '),
      voto: r.voto,
      titolo: r.titolo ?? '',
      testo: r.testo ?? '',
      data: r.data,
      fonte: NOMI[r.fonte] ?? r.fonte,
    };
  });

  return NextResponse.json(
    { recensioni },
    {
      headers: {
        /* Le recensioni nuove arrivano con i giorni, non con i minuti:
           dieci minuti di cache sono generosi e tolgono comunque ogni
           lettura al database. Le tre intestazioni sono quelle che
           reggono su Vercel -- con il solo `Cache-Control` Next riscrive
           il valore e in rete non arriva niente (vedi la rotta delle
           prenotazioni, dove era gia' successo). */
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    },
  );
}
