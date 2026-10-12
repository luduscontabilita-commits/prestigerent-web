import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* L'INDIRIZZO FISSO DEI QR CODE: prestigerent.com/qr/<codice>.
 *
 * E' l'indirizzo stampato dentro il QR (brochure, stand in fiera). Non
 * cambia mai; dove porta lo decide la tabella `qr_link`, modificabile
 * dall'admin in /admin/partners/qrcode/. Cosi' un QR gia' stampato si
 * puo' ridirigere senza ristampare niente.
 *
 * 302 e non 301, apposta: un rimando permanente i telefoni e i motori di
 * ricerca lo ricordano per sempre, e cambiare destinazione non avrebbe
 * piu' effetto su chi l'ha gia' scansionato una volta.
 *
 * Fuori dalle lingue del sito: il proxy lo esclude (src/proxy.ts). */

const RISERVA = 'https://prestigerent.com/';

export async function GET(_req: Request, { params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { data } = await supabase.from('qr_link').select('destinazione').eq('codice', codice).maybeSingle();
  const dest = (data as { destinazione?: string } | null)?.destinazione;
  /* Un codice che non esiste porta alla home e non a un 404: chi ha
     scansionato un QR deve arrivare comunque da qualche parte. */
  const verso = dest && /^https:\/\//.test(dest) ? dest : RISERVA;
  return new Response(null, {
    status: 302,
    headers: { Location: verso, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
