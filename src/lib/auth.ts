import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/* L'accesso lato server.
 *
 * `@supabase/ssr` tiene la sessione nei cookie invece che nel browser:
 * cosi' le pagine del pannello sanno CHI STA GUARDANDO gia' mentre le
 * costruiscono, e non devono disegnare prima una pagina vuota e poi
 * riempirla. Con i dati nel browser, per un istante il pannello sarebbe
 * visibile a chiunque prima del controllo.
 */
export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            /* nelle pagine (non nelle azioni) i cookie sono in sola
               lettura: qui non c'e' niente da fare, il rinnovo lo fa il
               proxy alla richiesta dopo. */
          }
        },
      },
    }
  );
}

export type Profilo = {
  id: string;
  email: string;
  nome: string | null;
  ruolo: string;
  attivo: boolean;
};

/* ─────────────────────────────────────────────────────────────────────
   I RUOLI, SCRITTI IN UN POSTO SOLO
   ─────────────────────────────────────────────────────────────────────

   In `profili` il vincolo ammette `admin` e `guida`. Cosa puo' fare
   ognuno si dice QUI, e le pagine e le azioni chiedono a queste liste:
   aggiungere un ruolo domani e' una riga in un elenco, non una caccia ai
   controlli sparsi.

   Sono LISTE e non stringhe di proposito. Il primo tentativo naturale e'
   `if (io.ruolo !== 'admin')`: funziona finche' i ruoli sono due, e il
   giorno che ne arriva un terzo bisogna ritrovare tutti i confronti. */

/** Chi gestisce il sito: SEO, foto dei tour, numeri da Regiondo, e --
 *  quando ci sara' -- l'approvazione delle foto della gallery. */
export const RUOLI_GESTIONE: readonly string[] = ['admin'];

/** Chi puo' caricare e taggare le foto della gallery. Le guide caricano,
 *  gli admin caricano e approvano. */
export const RUOLI_CARICAMENTO: readonly string[] = ['admin', 'guida'];

/** `readonly string[]` e non `as const`: cosi' `includes(io.ruolo)`
 *  funziona senza cast. Il tipo letterale non serve a nessuno qui, e
 *  costringerebbe ogni chiamante a un `as` per confrontare una stringa
 *  che arriva dal database. */
export function haRuolo(io: Profilo, ammessi: readonly string[]): boolean {
  return io.attivo && ammessi.includes(io.ruolo);
}

/** Chi sta guardando, oppure null. Legge `profili`, quindi passa dalle
 *  regole del database: un utente autenticato ma non abilitato non
 *  ottiene niente nemmeno se aggira il controllo nel codice.
 *
 *  🔴 `attivo` VA LETTO, e prima non lo era. E' la colonna con cui si
 *  chiude l'accesso a qualcuno senza cancellarne il profilo -- e senza
 *  perdere la paternita' di quello che ha caricato. La funzione RLS
 *  `e_admin()` la controlla da sempre; qui no, quindi un profilo
 *  disattivato entrava nel pannello e si trovava davanti pagine che il
 *  database gli svuotava: dentro, ma rotto. Ora non entra. */
export async function chiSono(): Promise<Profilo | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from('profili')
    .select('id,email,nome,ruolo,attivo')
    .eq('id', user.id)
    .maybeSingle();
  const io = (data as Profilo) ?? null;
  return io && io.attivo ? io : null;
}

/* ─────────────────────────────────────────────────────────────────────
   LE GUARDIE
   ─────────────────────────────────────────────────────────────────────

   🔴 UN LAYOUT NON PROTEGGE NIENTE, e per questo la guardia si chiama in
   ogni pagina. In Next le pagine figlie possono essere servite senza
   rieseguire il layout: un controllo messo solo la' sembra funzionare
   quando si naviga e non c'e' quando si arriva diretti.

   E NON PROTEGGE LE SERVER ACTION, che non sono pagine: si chiamano con
   una POST al loro identificativo, senza passare da nessun layout e da
   nessuna pagina. Per questo le azioni hanno la loro guardia, sotto.

   Sotto a tutto c'e' comunque la RLS: le action di questo progetto
   scrivono con la sessione dell'utente e la chiave pubblicabile, quindi
   una scrittura non autorizzata la rifiuta il database anche se qui ci
   si dimentica un controllo. Queste funzioni servono a dare la risposta
   giusta -- una redirezione, un messaggio -- invece di una pagina vuota. */

/** Per le PAGINE di gestione. Chi non ha fatto l'accesso va alla
 *  schermata di accesso; chi e' dentro ma non gestisce (una guida) torna
 *  all'indice del pannello, che gli mostra quello che puo' fare.
 *
 *  Non si rimanda direttamente a `/admin/gallery/`: quella pagina
 *  arrivera' in Fase 2a, e un rimando a una pagina che non esiste e' un
 *  404 al posto di un messaggio. */
export async function soloGestione(): Promise<Profilo> {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  if (!haRuolo(io, RUOLI_GESTIONE)) redirect('/admin/');
  return io;
}

/** Per le PAGINE di caricamento della gallery (Fase 2a): admin e guide. */
export async function soloCaricatori(): Promise<Profilo> {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  if (!haRuolo(io, RUOLI_CARICAMENTO)) redirect('/admin/entra/');
  return io;
}

/** Per le SERVER ACTION. Non redirige -- in un'azione una redirezione
 *  arriverebbe al browser come un errore e non come una spiegazione --
 *  ma torna il profilo oppure il messaggio da mostrare a chi ha premuto
 *  il pulsante. */
export async function chiAgisce(
  ammessi: readonly string[] = RUOLI_GESTIONE
): Promise<{ io: Profilo; errore?: undefined } | { io?: undefined; errore: string }> {
  const io = await chiSono();
  if (!io) return { errore: 'Sessione scaduta: rientra dal pannello.' };
  if (!haRuolo(io, ammessi)) return { errore: 'Non hai i permessi per questa operazione.' };
  return { io };
}
