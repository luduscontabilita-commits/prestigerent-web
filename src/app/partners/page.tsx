import { redirect } from 'next/navigation';
import { chiSono, haRuolo, RUOLI_LISTINO } from '@/lib/auth';
import { IngressoPartner } from '@/components/partners/IngressoPartner';

export const dynamic = 'force-dynamic';

/* prestigerent.com/partners/ — accesso e richiesta di accesso dei
 * partner, in una pagina sola (vedi IngressoPartner).
 *
 * Chi ha GIA' fatto l'accesso non deve rivedere il modulo: va dritto al
 * listino. Vale anche per l'admin, che cosi' vede l'area come la vede un
 * partner. */
export default async function Partners() {
  const io = await chiSono();
  if (io && haRuolo(io, RUOLI_LISTINO)) redirect('/partners/price-list/');
  return <IngressoPartner />;
}
