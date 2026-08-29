/* IL RICONOSCIMENTO CHE VALE PIU' DI TUTTI GLI ALTRI.
 *
 * Sul sito WordPress stava subito sotto la foto grande della home, su una
 * fascia scura: il marchio Travellers' Choice bianco a sinistra, e a
 * destra la frase. E' l'unica affermazione del sito che non parla di
 * quanto sono bravi -- dice cosa hanno detto i clienti di Tripadvisor,
 * e li' non si puo' barare.
 *
 * ── PERCHE' LA FASCIA E' SCURA E NON SI PUO' SCHIARIRE ──────────────
 * Il file emesso da Tripadvisor e' BIANCO su trasparente (verificato:
 * 150x148, tavolozza indicizzata). Su fondo chiaro sparisce. O si tiene
 * la fascia scura, o serve un altro file -- e il logo non si ridisegna,
 * perche' quello e' il punto: e' loro, non nostro.
 *
 * ── L'ANNO RESTA IN VISTA, APPOSTA ─────────────────────────────────
 * Il premio e' del 2020 e il marchio lo dice. Non si toglie e non si
 * aggiorna a mano: un riconoscimento datato e' un fatto verificabile,
 * un riconoscimento senza data e' una frase che invecchia di nascosto.
 * La frase e' quella del sito vecchio, parola per parola.
 */

const BADGE =
  'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/travellers-choice-2020.png';

export function PrimoAlMondo() {
  return (
    <section className="pam" aria-label="Tripadvisor Travellers' Choice">
      <div className="pam-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pam-logo"
          src={BADGE}
          width={150}
          height={148}
          loading="lazy"
          decoding="async"
          alt="Tripadvisor Travellers' Choice 2020"
        />
        <p className="pam-t">
          Tripadvisor customers rated our Wine Experience{' '}
          <b>#1 in the top 10 wine tours in the World</b>
        </p>
      </div>
    </section>
  );
}
