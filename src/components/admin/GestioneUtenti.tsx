'use client';

import { useState, useTransition } from 'react';

/* GLI UTENTI DEL PANNELLO.
 *
 * ── LA PASSWORD SI VEDE UNA VOLTA SOLA ────────────────────────────────
 * Non e' un vezzo: in Supabase resta solo l'impronta bcrypt, che e' un
 * calcolo a senso unico. Chiusa questa finestra, quella password non la
 * sa piu' nessuno -- nemmeno il database. Per questo il riquadro verde
 * non si chiude da solo, ha il testo gia' pronto da inviare e un pulsante
 * per copiarlo, e se si perde l'unica strada e' rigenerarla.
 *
 * ── L'ELENCO C'E' PERCHE' QUALCUNO LO GUARDI ─────────────────────────
 * Mostra TUTTI gli account con ruolo e stato, admin compresi. Serve a
 * rendere visibile un account creato di nascosto: con una password
 * condivisa fra tre persone, chi la ottenesse potrebbe crearsi un
 * accesso suo, e senza un elenco non se ne accorgerebbe nessuno.
 */

export type Utente = {
  id: string;
  username: string | null;
  nome: string | null;
  ruolo: string;
  attivo: boolean;
  contatto: string | null;
  ultimoAccesso: string | null;
  /** foto caricate da questa persona: dice se disattivarla ha conseguenze */
  foto: number;
  /** vero per chi sta guardando: non deve potersi disattivare */
  sonoIo: boolean;
};

type Credenziali = { username?: string; password?: string; consegna?: string };
type Esito = { ok: boolean; errore?: string } & Credenziali;

export function GestioneUtenti({
  utenti,
  creaGuida,
  rigeneraPassword,
  cambiaAttivo,
}: {
  utenti: Utente[];
  creaGuida: (d: { username: string; nome: string; contatto: string }) => Promise<Esito>;
  rigeneraPassword: (id: string) => Promise<Esito>;
  cambiaAttivo: (id: string, attivo: boolean) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [lista, setLista] = useState(utenti);
  const [form, setForm] = useState({ username: '', nome: '', contatto: '' });
  const [cred, setCred] = useState<Credenziali | null>(null);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [inCorso, avvia] = useTransition();

  const copia = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      /* Senza permesso per gli appunti (succede su qualche browser da
         telefono) il testo resta comunque selezionabile a mano nel
         riquadro: non si perde niente, si fa un gesto in piu'. */
      setCopiato(false);
    }
  };

  return (
    <div className="ut">
      {messaggio && <p className={messaggio.ok ? 'ad-ok' : 'ad-err'}>{messaggio.testo}</p>}

      {/* ── le credenziali appena create ── */}
      {cred?.password && (
        <div className="ut-cred">
          <h2>Credenziali di «{cred.username}»</h2>
          <p className="ut-avviso">
            🔴 <b>Questa password si vede una volta sola.</b> Non è conservata da nessuna
            parte: in Supabase resta solo la sua impronta, che non si può riportare
            indietro. Copiala e mandala adesso.
          </p>
          <textarea readOnly rows={9} value={cred.consegna} onFocus={(e) => e.currentTarget.select()} />
          <div className="ut-cred-azioni">
            <button type="button" onClick={() => copia(cred.consegna ?? '')}>
              {copiato ? 'Copiato ✓' : 'Copia il messaggio'}
            </button>
            <button type="button" className="ut-chiudi" onClick={() => setCred(null)}>
              Ho finito, chiudi
            </button>
          </div>
        </div>
      )}

      {/* ── nuova guida ── */}
      <section className="ut-nuovo">
        <h2>Nuova guida</h2>
        <div className="ut-campi">
          <label>
            Nome utente
            <input
              type="text"
              value={form.username}
              placeholder="mario"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <span className="gc-aiuto">
              Da 3 a 32 caratteri: minuscole, numeri, punto, trattino. È quello che la
              persona scriverà per entrare.
            </span>
          </label>
          <label>
            Nome e cognome
            <input
              type="text"
              value={form.nome}
              placeholder="Mario Rossi"
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
            <span className="gc-aiuto">È quello che si vede nel pannello accanto alle sue foto.</span>
          </label>
          <label>
            Email di contatto <span className="gc-opt">facoltativa</span>
            <input
              type="email"
              value={form.contatto}
              placeholder="mario@esempio.com"
              autoCapitalize="off"
              onChange={(e) => setForm({ ...form, contatto: e.target.value })}
            />
            <span className="gc-aiuto">
              Serve solo per scriverle: <b>non</b> è l’indirizzo con cui entra, e non
              riceverà nessun accesso da qui.
            </span>
          </label>
        </div>
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            avvia(async () => {
              setMessaggio(null);
              const r = await creaGuida(form);
              if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
              setCred({ username: r.username, password: r.password, consegna: r.consegna });
              setForm({ username: '', nome: '', contatto: '' });
              setMessaggio({ ok: true, testo: 'Guida creata. Ricarica la pagina per vederla nell’elenco.' });
            })
          }
        >
          {inCorso ? 'Creo…' : 'Crea la guida'}
        </button>
      </section>

      {/* ── elenco ── */}
      <section className="ut-elenco">
        <h2>Tutti gli account ({lista.length})</h2>
        {lista.map((u) => (
          <article className={'ut-riga' + (u.attivo ? '' : ' spento')} key={u.id}>
            <div className="ut-chi">
              <strong>{u.nome ?? u.username ?? 'senza nome'}</strong>
              <code>{u.username ?? '—'}</code>
              <span className={'ut-ruolo ' + u.ruolo}>
                {u.ruolo === 'admin' ? 'amministratore' : 'guida'}
              </span>
              {!u.attivo && <span className="ut-spento">accesso chiuso</span>}
              {u.sonoIo && <span className="ut-io">sei tu</span>}
            </div>

            <p className="ut-dati">
              {u.foto > 0 ? `${u.foto} foto caricate` : 'nessuna foto caricata'}
              {' · '}
              {u.ultimoAccesso
                ? `ultimo accesso ${new Date(u.ultimoAccesso).toLocaleDateString('it-IT')}`
                : 'non è mai entrata'}
              {u.contatto ? ` · ${u.contatto}` : ''}
            </p>

            <div className="ut-azioni">
              {u.ruolo === 'guida' && (
                <button
                  type="button"
                  disabled={inCorso}
                  onClick={() =>
                    avvia(async () => {
                      setMessaggio(null);
                      const r = await rigeneraPassword(u.id);
                      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                      setCred({ username: r.username, password: r.password, consegna: r.consegna });
                    })
                  }
                >
                  Nuova password
                </button>
              )}

              {!u.sonoIo && (
                <button
                  type="button"
                  className={u.attivo ? 'ut-chiudi-acc' : ''}
                  disabled={inCorso}
                  onClick={() =>
                    avvia(async () => {
                      setMessaggio(null);
                      const r = await cambiaAttivo(u.id, !u.attivo);
                      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
                      setLista((l) => l.map((x) => (x.id === u.id ? { ...x, attivo: !u.attivo } : x)));
                      setMessaggio({
                        ok: true,
                        testo: u.attivo
                          ? 'Accesso chiuso. Le foto già caricate restano dove sono, col suo nome.'
                          : 'Accesso riaperto.',
                      });
                    })
                  }
                >
                  {u.attivo ? 'Chiudi l’accesso' : 'Riapri l’accesso'}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
