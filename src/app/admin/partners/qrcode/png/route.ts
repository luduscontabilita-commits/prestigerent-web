import { chiSono, haRuolo, RUOLI_GESTIONE } from '@/lib/auth';
import { INDIRIZZO_QR, qrConLogo } from '@/lib/qr-logo';

export const dynamic = 'force-dynamic';

/* IL PNG DEL QR CODE: /admin/partners/qrcode/png/?misura=1024[&scarica=1]
 *
 * Il QR contiene l'indirizzo FISSO prestigerent.com/qr/partners/ (con la
 * barra finale: il sito ha `trailingSlash`, e senza si farebbe un rimando
 * in piu' a ogni scansione). Dove porta si cambia dalla pagina
 * /admin/partners/qrcode/, senza rigenerare il PNG.
 *
 * Solo admin, controllato qui: una rotta non passa da nessuna pagina. */

const LOGO = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png';

export async function GET(req: Request) {
  const io = await chiSono();
  if (!io || !haRuolo(io, RUOLI_GESTIONE)) {
    return new Response('Accesso riservato agli amministratori.', { status: 403 });
  }
  const q = new URL(req.url).searchParams;
  const misura = Math.min(4096, Math.max(256, Math.round(Number(q.get('misura')) || 1024)));
  const logo = await fetch(LOGO, { next: { revalidate: 86400 } })
    .then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : null))
    .catch(() => null);
  const png = await qrConLogo(INDIRIZZO_QR, logo, misura);
  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      ...(q.get('scarica') ? { 'Content-Disposition': `attachment; filename="prestige-rent-qr-partners-${misura}.png"` } : {}),
    },
  });
}
