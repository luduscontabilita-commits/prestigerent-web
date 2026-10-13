import { redirect } from 'next/navigation';
import { chiSono, haRuolo, RUOLI_LISTINO } from '@/lib/auth';
import { IngressoPartner } from '@/components/partners/IngressoPartner';
import { linguaPartner } from '@/lib/partners-lingua';

export const dynamic = 'force-dynamic';

/* prestigerent.com/partners/ — accesso e richiesta di accesso dei
 * partner, in una pagina sola (vedi IngressoPartner).
 *
 * Chi ha GIA' fatto l'accesso non deve rivedere il modulo: va dritto al
 * listino. Vale anche per l'admin, che cosi' vede l'area come la vede un
 * partner. */
export default async function Partners() {
  const io = await chiSono();
  if (io && haRuolo(io, RUOLI_LISTINO)) redirect('/partners/welcome/');
  /* Inglese o italiano: cookie del selettore, se no la lingua del
     browser (src/lib/partners-lingua.ts). */
  return <IngressoPartner lingua={await linguaPartner()} />;
}
