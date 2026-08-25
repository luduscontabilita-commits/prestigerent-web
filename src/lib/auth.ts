import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export type Profilo = { id: string; email: string; nome: string | null; ruolo: string };

/** Chi sta guardando, oppure null. Legge `profili`, quindi passa dalle
 *  regole del database: un utente autenticato ma non abilitato non
 *  ottiene niente nemmeno se aggira il controllo nel codice. */
export async function chiSono(): Promise<Profilo | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('profili').select('id,email,nome,ruolo').eq('id', user.id).maybeSingle();
  return (data as Profilo) ?? null;
}
