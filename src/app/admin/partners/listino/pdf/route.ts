import { chiSono, haRuolo, RUOLI_GESTIONE } from '@/lib/auth';
import { listino } from '@/lib/regiondo-listino';
import { creaPdfListino, type DatiAzienda } from '@/lib/listino-pdf';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* IL LISTINO IN PDF: /admin/partners/listino/pdf/?lingua=it|en
 *
 * La brochure da stampare per le fiere (src/lib/listino-pdf.ts): due
 * facciate A4 con logo, presentazione, contatti e tutti i prezzi letti
 * da Regiondo in quel momento. Si scarica dai pulsanti in cima al
 * listino dell'admin.
 *
 * Solo admin: una rotta non passa da nessuna pagina, quindi il ruolo si
 * controlla qui (come le server action con `chiAgisce`). Chi non lo e'
 * riceve 403, non il file. */

const LOGO = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png';

export async function GET(req: Request) {
  const io = await chiSono();
  if (!io || !haRuolo(io, RUOLI_GESTIONE)) {
    return new Response('Accesso riservato agli amministratori.', { status: 403 });
  }

  const lingua = new URL(req.url).searchParams.get('lingua') === 'en' ? 'en' : 'it';
  const [{ servizi, letto }, { data: azienda }, logo] = await Promise.all([
    listino(false),
    supabase.from('azienda').select('*').eq('id', 1).maybeSingle(),
    fetch(LOGO, { next: { revalidate: 86400 } })
      .then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : null))
      .catch(() => null),
  ]);

  const quando = new Date(letto);
  const data = quando.toLocaleDateString(lingua === 'it' ? 'it-IT' : 'en-GB', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const file = await creaPdfListino({
    servizi,
    lingua,
    azienda: (azienda ?? {}) as DatiAzienda,
    logoPng: logo,
    data,
  });

  const giorno = quando.toISOString().slice(0, 10);
  const nome = lingua === 'it' ? `Prestige-Rent-listino-prezzi-${giorno}.pdf` : `Prestige-Rent-price-list-${giorno}.pdf`;
  return new Response(file as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
