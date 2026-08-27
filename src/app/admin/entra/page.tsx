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
  const [pw, setPw] = useState('');
  const [stato, setStato] = useState<'fermo' | 'invio' | 'fatto' | 'errore'>('fermo');
  const [messaggio, setMessaggio] = useState('');

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStato('invio');
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    /* DUE STRADE, E LA PASSWORD E' FACOLTATIVA.
       Il link via email resta il modo consigliato -- non c'e' niente da
       rubare e niente da ricordare -- ma chi entra spesso vuole poter
       digitare e basta. Se il campo password e' vuoto si manda il link,
       se e' pieno si prova la password: nessuno deve scegliere prima. */
    const { error } = pw
      ? await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: pw,
        })
      : await sb.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin/` },
        });
    if (error) {
      setStato('errore');
      /* Supabase risponde "Database error saving new user" quando il
         trigger rifiuta l'iscrizione, cioe' quando l'indirizzo non e'
         nell'elenco degli abilitati. E' il controllo che funziona, ma
         detto cosi' sembra un guasto -- e la causa piu' frequente e'
         banale: un refuso nell'indirizzo. */
      setMessaggio(
        /database error|saving new user|unexpected/i.test(error.message)
          ? "Questo indirizzo non è abilitato. Controlla di averlo scritto giusto: basta un punto di troppo."
          : error.message
      );
    } else if (pw) {
      /* La password entra subito: non c'e' nessun link da aprire, quindi
         non si passa da /auth/callback e la redirezione la fa questa
         pagina. */
      window.location.href = '/admin/';
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
            <label htmlFor="pw">
              Password <span className="ad-opt">facoltativa</span>
            </label>
            <input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="lascia vuoto per ricevere il link"
            />
            <button type="submit" disabled={stato === 'invio'}>
              {stato === 'invio'
                ? (pw ? 'Accesso…' : 'Invio in corso…')
                : (pw ? 'Entra' : 'Ricevi il link di accesso')}
            </button>
            {stato === 'errore' && <p className="ad-err">{messaggio}</p>}
            <p className="ad-nota">
              Con la password entri subito. Lasciandola vuota ricevi un link via email:
              e&rsquo; il modo consigliato, perche&rsquo; non c&rsquo;e&rsquo; niente da
              ricordare e niente da rubare. In tutti e due i casi funziona solo con gli
              indirizzi abilitati.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
