import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/auth';

/* Il ritorno dal link ricevuto via email.
 *
 * Supabase manda un codice usa e getta; qui lo si scambia con la
 * sessione vera e si scrivono i cookie. Il codice vale pochi minuti e
 * una volta sola: se qualcuno intercetta il link dopo il primo clic,
 * non ci fa niente.
 */
/* 🔴 `next` ARRIVA DA FUORI, QUINDI SI GUARDA PRIMA DI USARLO.
 *
 * `new URL(pezzo, base)` non incolla due stringhe: e' il parser degli
 * indirizzi del web, e se `pezzo` ha gia' la sua autorita' la `base`
 * viene ignorata. Misurato il 26/09/2026 con `https://prestigerent.com`
 * come base:
 *
 *     /admin/              -> https://prestigerent.com/admin/    va bene
 *     //evil.com           -> https://evil.com/                  FUORI
 *     https://evil.com     -> https://evil.com/                  FUORI
 *     /\evil.com           -> https://evil.com/                  FUORI
 *
 * Il terzo caso e' il piu' banale e il primo a cui non si pensa; il
 * quarto e' quello che si dimentica sempre di filtrare, perche' il
 * parser tratta il backslash come una barra nella posizione dell'host.
 *
 * COSA NON SUCCEDEVA, per non far sembrare questa riga piu' grossa di
 * quello che e': la sessione non viaggia nell'indirizzo -- lo scambio del
 * codice avviene qui sul server e i cookie sono httpOnly -- quindi un
 * sito esterno non riceveva nessun token, e nemmeno il `code`. Il danno
 * era la credibilita': la vittima clicca un link autentico di
 * prestigerent.com e atterra su una pagina che puo' imitare il pannello.
 *
 * Perche' si chiude comunque: la difesa stava solo nell'elenco dei
 * Redirect URLs di Supabase, cioe' nella configurazione di un servizio
 * esterno che nessuno ricontrolla quando ne aggiunge uno per un altro
 * motivo. E da questa strada, col link via email, stanno per entrare le
 * guide.
 *
 * Una barra iniziale NON seguita da un'altra barra o da un backslash: i
 * percorsi interni passano intatti, tutto il resto torna al pannello. */
function soloInterno(dove: string): string {
  return /^\/(?![/\\])/.test(dove) ? dove : '/admin/';
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const dove = soloInterno(req.nextUrl.searchParams.get('next') || '/admin/');

  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dove, req.nextUrl.origin));
  }
  return NextResponse.redirect(new URL('/admin/entra/?errore=1', req.nextUrl.origin));
}
