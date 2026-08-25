import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/auth';

/* Il ritorno dal link ricevuto via email.
 *
 * Supabase manda un codice usa e getta; qui lo si scambia con la
 * sessione vera e si scrivono i cookie. Il codice vale pochi minuti e
 * una volta sola: se qualcuno intercetta il link dopo il primo clic,
 * non ci fa niente.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const dove = req.nextUrl.searchParams.get('next') || '/admin/';

  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dove, req.nextUrl.origin));
  }
  return NextResponse.redirect(new URL('/admin/entra/?errore=1', req.nextUrl.origin));
}
