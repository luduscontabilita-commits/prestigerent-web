/* IL PASSAGGIO NOTTURNO che riempie il pannello /michele/.
 *
 * Il lavoro vero sta in `src/lib/pannello-fonti.ts`, perche' lo chiama
 * anche il pulsante "aggiorna adesso" dentro il pannello.
 *
 *   GET /api/pannello/?chiave=CRON_SECRET
 *
 * Risponde 404 e non 401 a chi sbaglia chiave: a chi bussa non si
 * conferma che la porta esiste. Dentro ci sono incassi e spesa.
 */
import { NextRequest, NextResponse } from 'next/server';
import { aggiornaTutto } from '@/lib/pannello-fonti';

export const dynamic = 'force-dynamic';
/* Regiondo su trenta giorni pagina 250 righe per volta: col tetto di
   dieci secondi di Vercel non finirebbe mai. */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const chiave = req.nextUrl.searchParams.get('chiave');
  if (!process.env.CRON_SECRET || chiave !== process.env.CRON_SECRET) {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.json({ ok: true, esiti: await aggiornaTutto() });
}
