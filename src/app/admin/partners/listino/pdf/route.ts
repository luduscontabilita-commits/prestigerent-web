import { chiSono, haRuolo, RUOLI_GESTIONE } from '@/lib/auth';
import { rispostaPdfListino } from '@/lib/listino-pdf-risposta';

export const dynamic = 'force-dynamic';

/* IL LISTINO IN PDF: /admin/partners/listino/pdf/?lingua=it|en[&partner=1]
 *
 * Senza `partner` e' la brochure da stampare per le fiere: due facciate A4
 * con logo, presentazione, contatti e i prezzi Retail letti da Regiondo in
 * quel momento. Con `partner=1` e' il listino delle agenzie, con Net e
 * commissione sotto ogni prezzo (src/lib/listino-pdf.ts). Il file lo fa
 * src/lib/listino-pdf-risposta.ts; i partner scaricano il loro da
 * /partners/price-list/pdf/.
 *
 * Solo admin: una rotta non passa da nessuna pagina, quindi il ruolo si
 * controlla qui (come le server action con `chiAgisce`). Chi non lo e'
 * riceve 403, non il file. */

export async function GET(req: Request) {
  const io = await chiSono();
  if (!io || !haRuolo(io, RUOLI_GESTIONE)) {
    return new Response('Accesso riservato agli amministratori.', { status: 403 });
  }
  const q = new URL(req.url).searchParams;
  return rispostaPdfListino(q.get('lingua') === 'en' ? 'en' : 'it', q.get('partner') === '1');
}
