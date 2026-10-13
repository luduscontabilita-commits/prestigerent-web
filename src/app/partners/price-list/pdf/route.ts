import { chiSono, haRuolo, RUOLI_LISTINO } from '@/lib/auth';
import { rispostaPdfListino } from '@/lib/listino-pdf-risposta';

export const dynamic = 'force-dynamic';

/* IL LISTINO DEI PARTNER IN PDF: /partners/price-list/pdf/?lingua=en|it
 *
 * Lo scarica il partner dai pulsanti in cima al suo listino (proprieta',
 * 13/10/2026): Retail, Net e commissione sotto ogni prezzo. SEMPRE la
 * versione partner -- la brochure da fiera resta dell'admin.
 *
 * Solo partner e admin (RUOLI_LISTINO), controllato qui: una rotta non
 * passa da nessuna pagina. Senza sessione, o con un ruolo diverso (una
 * guida), 403. */

export async function GET(req: Request) {
  const io = await chiSono();
  if (!io || !haRuolo(io, RUOLI_LISTINO)) {
    return new Response('Partners only. Please sign in at https://prestigerent.com/partners/', { status: 403 });
  }
  const lingua = new URL(req.url).searchParams.get('lingua') === 'it' ? 'it' : 'en';
  return rispostaPdfListino(lingua, true);
}
