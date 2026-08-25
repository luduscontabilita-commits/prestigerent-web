import { redirect } from 'next/navigation';
import { chiSono } from '@/lib/auth';
import '@/styles/admin.css';

/* Il pannello NON deve mai finire su Google, nemmeno il giorno in cui il
   sito diventa visibile: e' l'unica parte che resta chiusa per sempre. */
export const metadata = { robots: { index: false, follow: false } };

export default async function PannelloLayout({ children }: { children: React.ReactNode }) {
  return <div className="ad">{children}</div>;
}

/* Il controllo vero sta in ogni pagina (vedi `guardia`): un layout in
   Next non protegge da solo, perche' le pagine figlie possono essere
   servite senza rieseguirlo. */
export async function guardia() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  return io;
}
