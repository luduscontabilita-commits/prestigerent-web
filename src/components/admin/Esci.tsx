import { esci } from '@/app/admin/entra/azioni';
import { comeSiChiama } from '@/lib/accesso';
import { redirect } from 'next/navigation';
import type { Profilo } from '@/lib/auth';

/* CHI SEI, E COME ESCI.
 *
 * ── 🔴 PERCHE' NON STA NEL LAYOUT ─────────────────────────────────────
 * Il posto naturale sarebbe `src/app/admin/layout.tsx`, ma la schermata
 * di accesso e' FIGLIA di quel layout: un'intestazione li' dentro
 * comparirebbe anche sopra al modulo di accesso, e se chiamasse
 * `chiSono()` con un rimando per chi non e' entrato, la schermata di
 * accesso rimanderebbe a se stessa -- un ciclo, e nessuno entra piu'.
 * Quindi lo includono le PAGINE, esattamente come fanno le guardie.
 *
 * ── PERCHE' UN <form> E NON UN LINK ──────────────────────────────────
 * Next PREFETCHA i link visibili o al passaggio del mouse. Un
 * `<Link href="/admin/esci/">` verrebbe chiamato senza che nessuno lo
 * prema, e ci si ritroverebbe disconnessi da soli aprendo il pannello.
 * Un'azione in POST non si prefetcha.
 *
 * ── PERCHE' IL NOME E NON L'EMAIL ────────────────────────────────────
 * Per una guida l'email e' l'indirizzo interno finto
 * (`mario@guide.prestigerent.invalid`): vederlo scritto accanto al
 * proprio nome fa pensare a un guasto. Per un admin sarebbe l'indirizzo
 * personale, che non c'e' motivo di stampare su ogni pagina.
 */
export function Esci({ io }: { io: Profilo }) {
  async function esciEVai() {
    'use server';
    await esci();
    /* Il redirect sta FUORI da qualunque try/catch, qui e in `esci()`:
       `redirect()` funziona lanciando un'eccezione, e un catch di troppo
       se la mangerebbe lasciando il pulsante senza effetto. */
    redirect('/admin/entra/');
  }

  return (
    <div className="ad-io">
      <span className="ad-io-chi">
        {comeSiChiama(io)}
        <em>{io.ruolo === 'admin' ? 'amministratore' : 'guida'}</em>
      </span>
      <form action={esciEVai}>
        <button type="submit" className="ad-esci">
          Esci
        </button>
      </form>
    </div>
  );
}
