'use client';

import { useState } from 'react';
import { entra } from './azioni';
import '@/styles/admin.css';
import '@/styles/admin-telefono.css';

/* LA SCHERMATA DI ACCESSO.
 *
 * Nome utente e password. Il link via email non c'e' piu': gli utenti li
 * crea l'amministratore e consegna le credenziali, quindi non serve un
 * modo per farsi riconoscere da soli.
 *
 * ── PENSATA PER UN TELEFONO ───────────────────────────────────────────
 * Le guide entrano qui dallo smartphone con cui hanno appena scattato le
 * foto, spesso all'aperto e con una mano sola. Da qui tre scelte che
 * sembrano dettagli e non lo sono:
 *
 *  - `type="text"` e non `type="email"` sul primo campo. Sembra ovvio e
 *    non lo e': il campo prima era `type="email" required`, e un nome
 *    utente senza chiocciola NON PASSA la validazione del browser -- il
 *    modulo non si invierebbe proprio. In piu' su iOS `type="email"`
 *    apre una tastiera con la chiocciola al posto della barra
 *    spaziatrice, che per scrivere "mario" e' la tastiera sbagliata.
 *  - `autoCapitalize="off"` e `autoCorrect="off"`: il telefono
 *    maiuscolizza la prima lettera e "corregge" i nomi propri. `Mario`
 *    non entrerebbe, e la persona riproverebbe la stessa cosa tre volte
 *    senza capire.
 *  - `autoComplete="username"` e `"current-password"`: cosi' il gestore
 *    di password del telefono si offre di salvarli e poi li riempie da
 *    solo. E' la differenza fra usarlo e non usarlo.
 */
export default function Entra() {
  const [nome, setNome] = useState('');
  const [pw, setPw] = useState('');
  const [stato, setStato] = useState<'fermo' | 'invio'>('fermo');
  const [errore, setErrore] = useState('');

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStato('invio');
    setErrore('');

    const r = await entra(nome, pw);

    if (!r.ok) {
      setStato('fermo');
      setErrore(r.errore ?? 'Non è andata. Riprova.');
      return;
    }

    /* I cookie di sessione li ha gia' scritti l'azione sul server. Qui
       serve solo andare al pannello, e si usa un cambio di indirizzo vero
       e non il router del client: cosi' la pagina si ricostruisce da zero
       e nessun pezzo dell'albero React resta con lo stato di prima. */
    window.location.href = '/admin/';
  };

  return (
    <main className="ad-entra">
      <div className="ad-box">
        <h1>Pannello Prestige Rent</h1>

        <form onSubmit={invia}>
          <label htmlFor="nu">Nome utente</label>
          <input
            id="nu"
            name="username"
            type="text"
            inputMode="text"
            required
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="il tuo nome utente"
          />

          <label htmlFor="pw">Password</label>
          <input
            id="pw"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="la tua password"
          />

          <button type="submit" disabled={stato === 'invio'}>
            {stato === 'invio' ? 'Accesso…' : 'Entra'}
          </button>

          {/* `role="alert"`: chi usa un lettore di schermo sente
              l'errore appena compare, senza doverlo andare a cercare. */}
          {errore && (
            <p className="ad-err" role="alert">
              {errore}
            </p>
          )}

          <p className="ad-nota">
            Le credenziali te le dà l’amministratore. Se non riesci a entrare,
            chiedi a lui: può assegnarti una password nuova in un momento.
          </p>
        </form>
      </div>
    </main>
  );
}
