import type { Fatto, Icona } from '@/lib/fatti';

/* LA BARRA DEI FATTI, COM'ERA SU WORDPRESS.
 *
 * ── PERCHE' IDENTICA E NON "MIGLIORATA" ─────────────────────────────
 * Il primo tentativo era un elenco incolonnato con le etichette in
 * maiuscoletto: stesse informazioni, ma otto righe una sotto l'altra
 * dove il vecchio ne usava DUE. Su una pagina che deve convincere in
 * pochi secondi, sei centimetri di scorrimento in piu' prima ancora di
 * cominciare a leggere sono un costo vero, e in cambio non davano
 * niente.
 *
 * Il vecchio funzionava per tre motivi, tutti e tre copiati qui:
 *   1. tre colonne, quindi due righe soltanto;
 *   2. l'icona colorata fa da segnale: l'occhio trova "quanto dura"
 *      dalla clessidra, senza leggere la parola "Duration";
 *   3. etichetta in grassetto e valore in tono piu' leggero sulla STESSA
 *      riga -- si legge come una frase ("Duration: 5 hours"), non come
 *      una tabella da decifrare.
 *
 * ── LE ICONE ────────────────────────────────────────────────────────
 * Disegnate qui invece che caricate: sono otto tracciati corti, e una
 * libreria di icone per otto simboli sarebbe decine di kilobyte in cima
 * alla pagina piu' importante del sito. `currentColor` le tiene
 * automaticamente in tinta col tema chiaro e con quello scuro.
 */

const ICONE: Record<Icona, React.ReactElement> = {
  /* segnaposto */
  luogo: (
    <>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" />
      <circle cx="12" cy="9" r="2.6" fill="var(--card)" stroke="none" />
    </>
  ),
  /* clessidra */
  durata: (
    <path d="M7 2h10v2.2c0 2.3-1.5 3.6-2.9 4.6-.6.4-1.1.8-1.1 1.2s.5.8 1.1 1.2c1.4 1 2.9 2.3 2.9 4.6V22H7v-6.2c0-2.3 1.5-3.6 2.9-4.6.6-.4 1.1-.8 1.1-1.2s-.5-.8-1.1-1.2C8.5 7.8 7 6.5 7 4.2Z" />
  ),
  /* orologio */
  ora: (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" strokeWidth="2.2" stroke="currentColor" />
      <path d="M12 6.6v5.8l3.8 2.3" fill="none" strokeWidth="2.2" stroke="currentColor" strokeLinecap="round" />
    </>
  ),
  /* bandiera */
  lingua: (
    <>
      <path d="M5 3v18" fill="none" strokeWidth="2.3" stroke="currentColor" strokeLinecap="round" />
      <path d="M6.6 4.1h11.9l-2.4 4.2 2.4 4.2H6.6Z" />
    </>
  ),
  /* etichetta */
  tipo: (
    <>
      <path d="M11.3 2.4H20a1.6 1.6 0 0 1 1.6 1.6v8.7c0 .43-.17.84-.47 1.14l-7.3 7.3a1.6 1.6 0 0 1-2.27 0l-8.7-8.7a1.6 1.6 0 0 1 0-2.27l7.3-7.3c.3-.3.71-.47 1.14-.47Z" />
      <circle cx="16.9" cy="7.1" r="1.7" fill="var(--card)" stroke="none" />
    </>
  ),
  /* due persone */
  gruppo: (
    <>
      <circle cx="9" cy="7.4" r="3.5" />
      <path d="M2.6 20.4c0-3.5 2.9-5.9 6.4-5.9s6.4 2.4 6.4 5.9Z" />
      <circle cx="17.3" cy="8.6" r="2.7" opacity=".55" />
      <path d="M15.1 14.9c3.1-.5 6.3 1.4 6.3 5.5h-4.6c0-2.1-.7-4-1.7-5.5Z" opacity=".55" />
    </>
  ),
  /* mano che riceve la moneta: l'annullamento gratuito */
  annullamento: (
    <>
      <circle cx="12" cy="6.6" r="3.4" />
      <path d="M2.8 15.1c.5-.7 1.5-.9 2.2-.4l3 2.1h4.1c.8 0 1.4.6 1.4 1.4s-.6 1.4-1.4 1.4H8.4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.6 17.9h4.9l5.2-2.6c.8-.4 1.7-.1 2.1.7.4.8.1 1.7-.6 2.1l-6.1 3.5c-.4.2-.8.3-1.2.3H6.4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  /* biglietto */
  biglietto: (
    <path d="M3 6.4h18v3.1a2.5 2.5 0 0 0 0 5v3.1H3v-3.1a2.5 2.5 0 0 0 0-5Zm6.6 1.4v8.4" strokeDasharray="0" />
  ),
  ritrovo: (
    <>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" />
      <circle cx="12" cy="9" r="2.6" fill="var(--card)" stroke="none" />
    </>
  ),
};

export function BarraFatti({ fatti }: { fatti: Fatto[] }) {
  /* Sotto le tre voci non e' una barra, e' una riga sciolta: meglio
     niente, come per le recensioni sotto la soglia. */
  if (fatti.length < 3) return null;

  return (
    <dl className="hero-fatti" aria-label="Tour at a glance">
      {fatti.map((f) => (
        <div className="hf" key={f.etichetta}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {ICONE[f.icona]}
          </svg>
          <div className="hf-t">
            <dt>{f.etichetta}:</dt> <dd>{f.valore}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
