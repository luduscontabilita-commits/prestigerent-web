import { EntraDalLink } from '@/components/partners/EntraDalLink';
import { linguaPartner } from '@/lib/partners-lingua';

export const dynamic = 'force-dynamic';

/* prestigerent.com/partners/enter/?t=... — il link dell'email di
 * approvazione. La pagina apre la sessione da sola appena caricata
 * (EntraDalLink) e porta al listino; se il link e' scaduto o non valido,
 * lo dice e porta all'accesso con email e password, con l'email gia'
 * scritta. Come funziona il gettone: src/lib/link-partner.ts. */
export default async function Entra({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <EntraDalLink t={t ?? ''} lingua={await linguaPartner()} />;
}
