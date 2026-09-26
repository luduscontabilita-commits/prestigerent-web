import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { GestioneUtenti, type Utente } from '@/components/admin/GestioneUtenti';
import { cambiaAttivo, creaGuida, rigeneraPassword } from './azioni';
import '@/styles/gallery-admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

type Riga = {
  id: string;
  username: string | null;
  nome: string | null;
  email: string;
  ruolo: string;
  attivo: boolean;
  ultimo_accesso: string | null;
};

export default async function Utenti() {
  const io = await soloGestione();
  const sb = await supabaseServer();

  /* La policy `profilo_proprio` e' `(id = auth.uid()) OR e_admin()`:
     un admin vede tutti i profili, una guida solo il proprio. Quindi qui
     non serve nessun filtro -- e non metterlo e' meglio che metterlo,
     perche' la regola resta una sola e sta nel database. */
  const [{ data: profili }, { data: abilitati }, { data: foto }] = await Promise.all([
    sb.from('profili').select('id,username,nome,email,ruolo,attivo,ultimo_accesso').order('ruolo').order('nome'),
    sb.from('autorizzati').select('email,contatto'),
    sb.from('gallery_images').select('uploaded_by'),
  ]);

  const contatti = new Map(
    ((abilitati ?? []) as { email: string; contatto: string | null }[]).map((a) => [a.email.toLowerCase(), a.contatto])
  );
  const quanteFoto: Record<string, number> = {};
  for (const f of (foto ?? []) as { uploaded_by: string | null }[]) {
    if (f.uploaded_by) quanteFoto[f.uploaded_by] = (quanteFoto[f.uploaded_by] ?? 0) + 1;
  }

  const utenti: Utente[] = ((profili ?? []) as Riga[]).map((p) => ({
    id: p.id,
    username: p.username,
    nome: p.nome,
    ruolo: p.ruolo,
    attivo: p.attivo,
    contatto: contatti.get(p.email.toLowerCase()) ?? null,
    ultimoAccesso: p.ultimo_accesso,
    foto: quanteFoto[p.id] ?? 0,
    sonoIo: p.id === io.id,
  }));

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo={"Utenti"}
      sottotitolo={<>
          Chi può entrare nel pannello. Le <b>guide</b> vedono soltanto la gallery e
          soltanto le foto che hanno caricato loro.
        </>}
    >

      {/* Detto qui perche' e' il posto dove verrebbe cercato, e perche'
          prometterlo e non poterlo mantenere sarebbe peggio che dirlo. */}
      <div className="g-stato off">
        <b>Le password degli amministratori si cambiano da Supabase</b>, non da qui, e
        vanno cambiate su tutti e tre gli account insieme: sono la stessa password per
        scelta. Da questa pagina si gestiscono le <b>guide</b>.
      </div>

      <GestioneUtenti
        utenti={utenti}
        creaGuida={creaGuida}
        rigeneraPassword={rigeneraPassword}
        cambiaAttivo={cambiaAttivo}
      />
    </Guscio>
  );
}
