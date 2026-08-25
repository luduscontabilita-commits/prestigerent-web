import { redirect } from 'next/navigation';
import { chiSono } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pannello() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');

  const voci = [
    { href: '/admin/seo/', titolo: 'Title e description', testo: 'I testi che compaiono su Google, pagina per pagina. 123 pagine.' },
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
          <span>Foto e video dei tour · Numeri delle recensioni · Caricamenti delle guide</span>
        </div>
      </div>
    </main>
  );
}
