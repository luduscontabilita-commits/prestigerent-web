import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { ripassaNumeri, etaMinuti, ripassoConfigurato } from '@/lib/numeri-freschi';

/* IL RIPASSO DEI NUMERI, A COMANDO.
 *
 * Rilegge da Regiondo gli ultimi sette giorni e riscrive il riquadro
 * delle ultime prenotazioni e i conteggi di oggi/ieri/settimana. La
 * spiegazione lunga -- perche' esiste, perche' sette giorni, perche' non
 * serve un secondo cron -- sta in `src/lib/numeri-freschi.ts`.
 *
 * ── COME SI CHIAMA A MANO ───────────────────────────────────────────
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://prestigerent.com/api/numeri/oggi/?forza=1" | jq
 *
 * Senza `forza=1` la chiamata rispetta la guardia sulla freschezza e
 * risponde `saltato: true` se i numeri hanno meno di mezz'ora. Con
 * `forza=1` rilegge comunque.
 *
 * ── PERCHE' E' PROTETTA ─────────────────────────────────────────────
 * Non scrive niente di pericoloso, ma ogni chiamata sono due richieste a
 * Regiondo. Lasciata aperta sarebbe un modo gratuito per far bussare il
 * nostro sito al gestionale di chi incassa, quante volte si vuole.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function uguale(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  /* `timingSafeEqual` pretende la stessa lunghezza e altrimenti lancia:
     il confronto sulle lunghezze va fatto prima, ed e' innocuo perche' la
     lunghezza di un segreto non e' il segreto. */
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function autorizzata(req: NextRequest): boolean {
  /* Lo stesso segreto del lavoro notturno, e per lo stesso motivo: e' il
     nome che Vercel usa da solo per i lavori programmati. Mai dalla
     querystring -- finisce nei registri di accesso. */
  const atteso = process.env.CRON_SECRET ?? process.env.CONVERSIONI_SEGRETO;
  if (!atteso) return false;

  const intestazione = req.headers.get('authorization') ?? '';
  if (intestazione.startsWith('Bearer ') && uguale(intestazione.slice(7), atteso)) return true;

  const chiave = req.headers.get('x-chiave');
  return chiave !== null && uguale(chiave, atteso);
}

export async function GET(req: NextRequest) {
  if (!autorizzata(req)) {
    return NextResponse.json({ ok: false, errore: 'Non autorizzata.' }, { status: 401 });
  }
  if (!ripassoConfigurato()) {
    return NextResponse.json(
      { ok: false, errore: 'Chiave di servizio Supabase mancante.' },
      { status: 500 },
    );
  }

  const forza = req.nextUrl.searchParams.get('forza') === '1';
  const prima = await etaMinuti();
  const esito = await ripassaNumeri(forza);

  return NextResponse.json(
    { ...esito, minuti_prima: prima },
    { status: esito.ok ? 200 : 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
