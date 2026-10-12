import { comeSiChiama } from '@/lib/accesso';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { RichiesteListino, type Partner, type RichiestaListino } from '@/components/admin/RichiesteListino';
import { vociPerRuolo } from '@/lib/menu-admin';
import { approvaRichiesta, nuovaPasswordPartner, rifiutaRichiesta } from '../azioni';
import { cambiaAttivo } from '../../utenti/azioni';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* CHI HA CHIESTO DI VEDERE IL LISTINO, E CHI LO VEDE GIA'.
 *
 * Solo admin. Le richieste arrivano da /admin/listino/register/ e restano
 * qui finche' qualcuno non le decide; approvando, il sito crea l'accesso e
 * manda la password per email (src/app/admin/listino/azioni.ts).
 *
 * Gli utenti gia' approvati si gestiscono SOLO qui: /admin/utenti/ elenca
 * guide e admin e non li mostra. Qui ci sono i due comandi che servono:
 * chiudere l'accesso e mandare una password nuova. */
/** Telefono e azienda dei partner gia' approvati. `profili` non li ha:
 *  stanno nella richiesta da cui il partner e' nato, e si ritrovano per
 *  email. Senza, l'elenco «Chi vede il listino» mostrerebbe solo nome ed
 *  email -- e la proprieta' vuole poter richiamare chiunque abbia
 *  accesso. */
function conRecapiti(partner: Omit<Partner, 'telefono' | 'azienda' | 'richiesta'>[], richieste: RichiestaListino[]): Partner[] {
  const per = new Map<string, RichiestaListino>();
  /* le richieste arrivano dalla piu' recente: vince l'ultima approvata */
  for (const r of richieste) {
    const k = r.email.toLowerCase();
    if (r.stato === 'approvata' && !per.has(k)) per.set(k, r);
  }
  return partner.map((p) => {
    const r = per.get(p.email.toLowerCase());
    /* La richiesta intera: il pannello «Dati» mostra tutto quello che la
       persona ha scritto registrandosi, non solo i recapiti. */
    return { ...p, telefono: r?.telefono ?? null, azienda: r?.azienda ?? null, richiesta: r ?? null };
  });
}

export default async function Richieste() {
  const io = await soloGestione();
  const sb = await supabaseServer();

  const [{ data: richieste }, { data: partner }] = await Promise.all([
    sb
      .from('richieste_listino')
      .select('id, creata_il, nome, cognome, azienda, tipo_attivita, paese, email, telefono, sito_web, note, stato, decisa_il')
      .order('creata_il', { ascending: false })
      .limit(300),
    sb.from('profili').select('id, email, nome, attivo, ultimo_accesso').eq('ruolo', 'listino').order('nome'),
  ]);

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Accessi listino e flotta"
      sottotitolo="Chi si registra da prestigerent.com/admin/listino/register/ compare qui. Approvando, il sito crea l’accesso e manda all’utente un’email con la password: potrà vedere solo il listino e la flotta. Sotto, chi li vede già."
    >
      <RichiesteListino
        richieste={(richieste ?? []) as RichiestaListino[]}
        partner={conRecapiti((partner ?? []) as Omit<Partner, 'telefono' | 'azienda' | 'richiesta'>[], (richieste ?? []) as RichiestaListino[])}
        approva={approvaRichiesta}
        rifiuta={rifiutaRichiesta}
        nuovaPassword={nuovaPasswordPartner}
        cambiaAttivo={cambiaAttivo}
      />
    </Guscio>
  );
}
