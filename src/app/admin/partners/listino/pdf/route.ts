import { chiSono, haRuolo, RUOLI_GESTIONE } from '@/lib/auth';
import { listino } from '@/lib/regiondo-listino';
import { creaPdfListino, type DatiAzienda } from '@/lib/listino-pdf';
import { supabase } from '@/lib/supabase';
import { leggiCommissioni } from '@/lib/commissioni-db';

export const dynamic = 'force-dynamic';

/* IL LISTINO IN PDF: /admin/partners/listino/pdf/?lingua=it|en[&partner=1]
 *
 * Con `partner=1` e' il listino da dare alle agenzie, con Net e
 * commissione sotto ogni prezzo (percentuali da /admin/partners/commissioni/).
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

  const q = new URL(req.url).searchParams;
  const lingua = q.get('lingua') === 'en' ? 'en' : 'it';
  const partner = q.get('partner') === '1';
  const [{ servizi, letto }, { data: azienda }, logo, c] = await Promise.all([
    listino(false),
    supabase.from('azienda').select('*').eq('id', 1).maybeSingle(),
    fetch(LOGO, { next: { revalidate: 86400 } })
      .then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : null))
      .catch(() => null),
    partner ? leggiCommissioni() : Promise.resolve(null),
  ]);

  const quando = new Date(letto);
  /* «Price list 2026», «Listino prezzi 2026»: solo l'anno (proprieta',
     12/10/2026). Il giorno resta nel nome del file, per distinguere le
     versioni scaricate. */
  const data = quando.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', year: 'numeric' });
  const file = await creaPdfListino({
    servizi,
    lingua,
    azienda: (azienda ?? {}) as DatiAzienda,
    logoPng: logo,
    data,
    commissioni: c ? { privato: c.privato, gruppo: c.gruppo } : undefined,
  });

  const giorno = quando.toISOString().slice(0, 10);
  const nome = partner
    ? lingua === 'it' ? `Prestige-Rent-listino-partner-${giorno}.pdf` : `Prestige-Rent-partner-price-list-${giorno}.pdf`
    : lingua === 'it' ? `Prestige-Rent-listino-prezzi-${giorno}.pdf` : `Prestige-Rent-price-list-${giorno}.pdf`;
  return new Response(file as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
