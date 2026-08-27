/* I PREMI UFFICIALI, presi pari pari dalla landing collaudata.
 *
 * Sono immagini rilasciate dalle piattaforme stesse: il Viator Experience
 * Award 2025 e 2023 e il Tripadvisor Travellers' Choice. Sono l'unico modo
 * legittimo di mettere in pagina il marchio verde di Viator e il gufo di
 * Tripadvisor -- ce li hanno dati loro, non li abbiamo ridisegnati noi.
 *
 * Risolvono esattamente il dubbio "sembrano finte": il numero scritto da
 * noi si puo' inventare, il badge che Viator ha emesso no.
 *
 * Piu' grandi che sulla landing: li' stavano stretti sotto il titolo,
 * qui hanno una fascia loro. Il medaglione centrale del file Viator porta
 * gia' scritto "based on 1,794 reviews on Viator & Tripadvisor" -- il
 * numero e' cresciuto a 1.810, e per questo il testo accanto lo aggiorna
 * dal database mentre l'immagine resta quella emessa da loro.
 */

const BASE = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/';

export function Premi({ nota }: { nota?: string | null }) {
  return (
    <section className="pw" aria-label="Awards">
      <div className="pw-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pw-viator"
          src={BASE + 'awards-viator.webp'}
          width={1120}
          height={349}
          loading="lazy"
          decoding="async"
          alt="Viator Experience Award Winner 2025 and 2023 — rated 4.9 out of 5 on Viator and Tripadvisor"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pw-ta"
          src={BASE + 'award-tripadvisor.webp'}
          width={300}
          height={300}
          loading="lazy"
          decoding="async"
          alt="Tripadvisor Travellers' Choice Awards 2025"
        />
      </div>
      {nota && <p className="pw-nota">{nota}</p>}
    </section>
  );
}
