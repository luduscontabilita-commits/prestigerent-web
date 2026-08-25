'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import '@/styles/admin.css';

/* LA SCHERMATA DI ACCESSO.
 *
 * Link via email, non password. Tre ragioni, in ordine:
 *
 *  - Non c'e' nessuna password da rubare, da dimenticare o da riusare
 *    uguale a quella della posta.
 *  - Le guide, quando toccherA' a loro, lavorano dal telefono in mezzo a
 *    una vigna: scrivere una password lunga li' e' il modo migliore per
 *    non farsi usare lo strumento.
 *  - Chi entra deve gia' essere nell'elenco degli abilitati: e' il
 *    database a rifiutare gli estranei, non questa schermata. Anche
 *    scrivendo un indirizzo qualunque non succede niente.
 */
export default function Entra() {
  const [email, setEmail] = useState('');
  const [stato, setStato] = useState<'fermo' | 'invio' | 'fatto' | 'errore'>('fermo');
  const [messaggio, setMessaggio] = useState('');

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStato('invio');
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin/` },
    });
    if (error) {
      setStato('errore');
      setMessaggio(error.message);
    } else {
      setStato('fatto');
    }
  };

  return (
    <main className="ad-entra">
      <div className="ad-box">
        <h1>Pannello Prestige Rent</h1>

        {stato === 'fatto' ? (
          <p className="ad-ok">
            Ti ho mandato un link a <b>{email}</b>.<br />
            Aprilo da questo stesso dispositivo: dura pochi minuti e vale una volta sola.
          </p>
        ) : (
          <form onSubmit={invia}>
            <label htmlFor="em">La tua email</label>
            <input
              id="em"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
            />
            <button type="submit" disabled={stato === 'invio'}>
              {stato === 'invio' ? 'Invio in corso…' : 'Ricevi il link di accesso'}
            </button>
            {stato === 'errore' && <p className="ad-err">{messaggio}</p>}
            <p className="ad-nota">
              Nessuna password. Ricevi un link via email e sei dentro. Funziona solo con
              gli indirizzi abilitati.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
