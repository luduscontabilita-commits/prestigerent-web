import { redirect } from 'next/navigation';
import { chiSono } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pannello() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');

  const voci = [
    { href: '/admin/seo/', titolo: 'Title e description', testo: 'I testi che compaiono su Google, pagina per pagina. 123 pagine.' },
    { href: '/admin/foto/', titolo: 'Foto dei tour', testo: 'L’ordine delle foto. La prima e’ la copertina: elenco della home e anteprime social.' },
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
        {voci.map((v) => (
          <a className="ad-card" key={v.href} href={v.href}>
            <strong>{v.titolo}</strong>
            <span>{v.testo}</span>
          </a>
        ))}
        <div className="ad-card ad-prossimo">
          <strong>In arrivo</strong>
          <span>Video dei tour · Caricamenti delle guide</span>
        </div>
      </div>
    </main>
  );
}
