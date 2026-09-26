import Link from 'next/link';
import { redirect } from 'next/navigation';
import { chiSono, haRuolo, RUOLI_GESTIONE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/* L'INDICE DEL PANNELLO, E PERCHE' QUI LA GUARDIA E' DIVERSA.
 *
 * Tutte le altre pagine chiamano `soloGestione()`, che rimanda qui chi
 * non gestisce. Questa non puo' fare lo stesso: si rimanderebbe a se
 * stessa, e una guida girerebbe in tondo senza vedere niente. Quindi qui
 * si chiede solo di aver fatto l'accesso, e cambia COSA si vede.
 *
 * Una guida oggi non ha ancora niente da aprire: il caricamento delle
 * foto arriva in Fase 2a. Meglio dirglielo in una riga che mandarla su
 * una pagina che non esiste -- un 404 sembra un guasto, e chi lo vede
 * scrive per chiedere se e' rotto.
 */
export default async function Pannello() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');

  const gestisce = haRuolo(io, RUOLI_GESTIONE);

  const voci = [
    { href: '/admin/seo/', titolo: 'Title e description', testo: 'I testi che compaiono su Google, pagina per pagina. 123 pagine.' },
    { href: '/admin/foto/', titolo: 'Foto dei tour', testo: 'L’ordine delle foto DEL PRODOTTO: la striscia in cima alle schede. La prima e’ la copertina, usata nell’elenco della home e nelle anteprime social.' },
    /* Due voci che parlano di foto, e la differenza va detta in entrambe:
       chi cerca "le foto" non sa quale delle due gli serve. Sopra le foto
       del prodotto, qui le foto delle giornate caricate dalle guide. */
    { href: '/admin/gallery/', titolo: 'Foto della gallery', testo: 'Le foto delle giornate, caricate da chi accompagna gli ospiti. Compaiono in fondo alle pagine, dopo approvazione.' },
    { href: '/admin/numeri/', titolo: 'Numeri da Regiondo', testo: 'Recensioni, prenotazioni e disponibilita’. Si riaggiornano con un pulsante e dicono quanti anni hanno.' },
  ];

  return (
    <main className="ad-main">
      <header className="ad-head">
        <div>
          <h1>Pannello</h1>
          <p>{io.nome ?? io.email} · {io.ruolo}</p>
        </div>
      </header>

      <div className="ad-griglia">
        {gestisce ? (
          <>
            {voci.map((v) => (
              <a className="ad-card" key={v.href} href={v.href}>
                <strong>{v.titolo}</strong>
                <span>{v.testo}</span>
              </a>
            ))}
            <div className="ad-card ad-prossimo">
              <strong>In arrivo</strong>
              <span>Video dei tour</span>
            </div>
          </>
        ) : (
          <Link className="ad-card" href="/admin/gallery/">
            <strong>Foto della gallery</strong>
            <span>
              Carica le foto delle giornate e dì a quali pagine appartengono. Le vede un
              amministratore prima che compaiano sul sito.
            </span>
          </Link>
        )}
      </div>
    </main>
  );
}
