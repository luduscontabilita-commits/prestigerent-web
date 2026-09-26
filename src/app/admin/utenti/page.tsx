import { Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { comeSiChiama } from '@/lib/accesso';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { GestioneUtenti, type Utente } from '@/components/admin/GestioneUtenti';
import { cambiaAttivo, creaGuida, eliminaGuida, rigeneraPassword, verificaPassword } from './azioni';

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
    sb.from('autorizzati').select('email,contatto,password_chiara'),
    sb.from('gallery_images').select('uploaded_by'),
  ]);

  /* 🔴 La password in chiaro arriva SOLO qui, in una pagina che chiama
     `soloGestione()`, e la tabella da cui viene e' invisibile a chi non e'
     amministratore (policy `autorizzati_admin`). Non finisce in nessuna
     query del sito pubblico. */
  const rubrica = new Map(
    ((abilitati ?? []) as { email: string; contatto: string | null; password_chiara: string | null }[])
      .map((a) => [a.email.toLowerCase(), a])
  );
  const quanteFoto: Record<string, number> = {};
  for (const f of (foto ?? []) as { uploaded_by: string | null }[]) {
    if (f.uploaded_by) quanteFoto[f.uploaded_by] = (quanteFoto[f.uploaded_by] ?? 0) + 1;
  }

  const utenti: Utente[] = ((profili ?? []) as Riga[]).map((p) => ({
    id: p.id,
    username: p.username,
    email: p.email,
    nome: p.nome,
    ruolo: p.ruolo,
    attivo: p.attivo,
    contatto: rubrica.get(p.email.toLowerCase())?.contatto ?? null,
    password: rubrica.get(p.email.toLowerCase())?.password_chiara ?? null,
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
      <Alert color="gray" icon={<IconInfoCircle size={18} />} mb="md">
        <b>Le password degli amministratori si cambiano da Supabase</b>, non da qui, e
        vanno cambiate su tutti e tre gli account insieme: sono la stessa password per
        scelta. Da questa pagina si gestiscono le <b>guide</b>.
      </Alert>

      <GestioneUtenti
        utenti={utenti}
        creaGuida={creaGuida}
        rigeneraPassword={rigeneraPassword}
        cambiaAttivo={cambiaAttivo}
        eliminaGuida={eliminaGuida}
        verificaPassword={verificaPassword}
      />
    </Guscio>
  );
}
