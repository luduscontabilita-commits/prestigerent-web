import { supabaseServer } from '@/lib/auth';
import type { Partner, RichiestaListino } from '@/components/admin/RichiesteListino';

/* I DATI DELLE DUE PAGINE «PARTNERS» DEL PANNELLO: le richieste di accesso
 * (/admin/partners/) e chi ha gia' accesso (/admin/partners/attivi/).
 *
 * Si leggono con la sessione dell'admin: `richieste_listino` e' visibile
 * solo a `e_admin()`, `profili` mostra tutti i profili solo all'admin.
 * Chi chiama deve aver gia' chiamato `soloGestione()`. */

type PartnerGrezzo = Omit<Partner, 'telefono' | 'azienda' | 'richiesta'>;

export async function caricaPartners(): Promise<{ richieste: RichiestaListino[]; partner: Partner[] }> {
  const sb = await supabaseServer();
  const [{ data: richieste }, { data: partner }] = await Promise.all([
    sb
      .from('richieste_listino')
      .select('id, creata_il, nome, cognome, azienda, tipo_attivita, paese, email, telefono, sito_web, note, stato, decisa_il')
      .order('creata_il', { ascending: false })
      .limit(300),
    sb.from('profili').select('id, email, nome, attivo, ultimo_accesso').eq('ruolo', 'listino').order('nome'),
  ]);
  const r = (richieste ?? []) as RichiestaListino[];
  return { richieste: r, partner: conRecapiti((partner ?? []) as PartnerGrezzo[], r) };
}

/** Telefono, azienda e la richiesta intera dei partner gia' approvati.
 *  `profili` non li ha: stanno nella richiesta da cui il partner e' nato,
 *  e si ritrovano per email. Il pannello «Dati» mostra tutto quello che la
 *  persona ha scritto registrandosi. */
function conRecapiti(partner: PartnerGrezzo[], richieste: RichiestaListino[]): Partner[] {
  const per = new Map<string, RichiestaListino>();
  /* le richieste arrivano dalla piu' recente: vince l'ultima approvata */
  for (const r of richieste) {
    const k = r.email.toLowerCase();
    if (r.stato === 'approvata' && !per.has(k)) per.set(k, r);
  }
  return partner.map((p) => {
    const r = per.get(p.email.toLowerCase());
    return { ...p, telefono: r?.telefono ?? null, azienda: r?.azienda ?? null, richiesta: r ?? null };
  });
}
