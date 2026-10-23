/* LE REGOLE DEL GIRO CHE PUBBLICA, SCRITTE IN UN POSTO SOLO.
 *
 * Il giro automatico e' Claude Code che, ogni tanto, legge la coda e --
 * se c'e' qualcosa da far uscire -- apre il portale Viator nel browser
 * del titolare, incolla la risposta e la invia. Nessuna API: solo il
 * browser, con la sessione di chi e' entrato.
 *
 * ── 🔴 PERCHE' LE REGOLE STANNO QUI E NON «NELLA TESTA» DEL GIRO ──────
 * Regola della proprieta', 23/10/2026: «devi verificare bene, non voglio
 * processi che vanno a compromettermi Viator». Un processo che scrive
 * nell'account del fornitore deve avere i suoi freni nel codice, dove si
 * leggono, si provano e non cambiano da un giro all'altro. Ogni giro
 * chiama QUESTE funzioni prima di toccare il browser, e se una dice di
 * no, non si tocca niente.
 *
 * ── I FRENI, IN ORDINE ────────────────────────────────────────────────
 * 1. L'INTERRUTTORE e' spento?            -> non si fa niente.
 * 2. Il TETTO giornaliero e' raggiunto?   -> non si fa niente.
 * 3. C'e' una riga in ERRORE?             -> non si fa niente: un giro
 *    che ha sbagliato una volta e continua ne sbaglia dieci. Si guarda,
 *    si capisce, si sblocca a mano.
 * 4. Per OGNI riga candidata: approvata, con un testo, con l'orario
 *    scaduto, mai pubblicata, senza controlli che bloccano, non grave.
 * 5. Il RITMO vale sul pubblicato VERO: distanza minima e tetto orario
 *    si misurano su `pubblicata_il`, non sul piano.
 * 6. UNA sola riga per giro. Dopo averla pubblicata ci si ferma: la
 *    successiva aspetta il giro dopo. E' il modo piu' semplice per non
 *    fare mai una raffica, qualunque cosa succeda al calcolo.
 *
 * ── E NEL BROWSER, PRIMA DI INCOLLARE ────────────────────────────────
 * Queste non sono funzioni: sono la procedura che il giro segue, e il
 * motivo per cui esiste `confronto()` qui sotto.
 *  a. La pagina e' quella del portale e si e' DENTRO (niente login).
 *     Se no: ci si ferma e si avvisa. Mai inserire credenziali.
 *  b. Si apre la recensione e si CONFRONTA autore, titolo e data con la
 *     riga: se non combaciano, NON si incolla. Riga in errore, stop.
 *  c. Si incolla il testo e si invia UNA volta.
 *  d. Si rilegge la pagina: la risposta deve comparire sotto quella
 *     recensione, con il nostro testo. Se no: riga in errore, stop.
 *  e. Solo allora la riga diventa `pubblicata`, con l'ora vera.
 */

/* con l'estensione: questo modulo lo esegue anche Node da solo (il giro
   che pubblica), e Node non risolve le estensioni. Vedi tsconfig. */
import { FINESTRA, type Finestra } from './attesa.ts';
import { graveDi, guaiDi, siPuoPubblicare, type Recensione } from './risposte.ts';

export type RigaCoda = {
  id: number;
  fonte: string;
  autore: string | null;
  voto: number | null;
  titolo: string | null;
  testo: string | null;
  lingua: string | null;
  prodotto: string | null;
  stato: string;
  risposta: string | null;
  corretto: string | null;
  pubblicare_il: string | null;
  pubblicata_il: string | null;
  data_recensione: string | null;
};

export type Impostazioni = { automatico: boolean; max_al_giorno: number };

export type Verdetto =
  | { via: true; riga: RigaCoda; testo: string }
  | { via: false; perche: string };

const ORA = 3_600_000;
const GIORNO = 24 * ORA;

/** Il testo che esce davvero: la correzione a mano se c'e'. */
export function testoDaPubblicare(r: RigaCoda): string {
  return (r.corretto ?? r.risposta ?? '').trim();
}

/**
 * Cosa puo' uscire ADESSO, e perche' no se no.
 *
 * Torna UNA riga sola (freno 6) oppure il motivo per cui non si pubblica
 * niente. Il motivo si mostra e si registra: un giro che non fa niente
 * deve dire perche', se no sembra rotto.
 */
export function cosaEsce(
  righe: readonly RigaCoda[],
  imp: Impostazioni,
  adesso: Date = new Date(),
  f: Finestra = FINESTRA
): Verdetto {
  if (!imp.automatico) return { via: false, perche: 'interruttore spento' };

  const inErrore = righe.filter((r) => r.stato === 'errore');
  if (inErrore.length) {
    return {
      via: false,
      perche: `${inErrore.length} riga/e in errore: si sblocca a mano prima di continuare (id ${inErrore.map((r) => r.id).join(', ')})`,
    };
  }

  const uscite = righe
    .filter((r) => r.stato === 'pubblicata' && r.pubblicata_il)
    .map((r) => new Date(r.pubblicata_il as string).getTime())
    .filter((t) => !Number.isNaN(t));

  const t0 = adesso.getTime();
  const oggi = uscite.filter((t) => t0 - t < GIORNO).length;
  if (oggi >= imp.max_al_giorno) {
    return { via: false, perche: `tetto giornaliero raggiunto (${oggi}/${imp.max_al_giorno})` };
  }

  /* il ritmo sul pubblicato VERO: l'ultima uscita quanto tempo fa, e
     quante nell'ultima ora */
  const ultima = uscite.length ? Math.max(...uscite) : 0;
  if (ultima && t0 - ultima < f.distanzaMinima * 60_000) {
    const fra = Math.ceil((f.distanzaMinima * 60_000 - (t0 - ultima)) / 60_000);
    return { via: false, perche: `l'ultima e' uscita da poco: si aspetta ancora ${fra} min` };
  }
  const nellUltimaOra = uscite.filter((t) => t0 - t < ORA).length;
  if (nellUltimaOra >= f.maxPerOra) {
    return { via: false, perche: `gia' ${nellUltimaOra} nell'ultima ora: tetto orario` };
  }

  const candidate = righe
    .filter((r) => r.stato === 'approvata')
    .filter((r) => r.pubblicare_il && new Date(r.pubblicare_il).getTime() <= t0)
    .sort((a, b) => (a.pubblicare_il ?? '').localeCompare(b.pubblicare_il ?? ''));

  if (!candidate.length) return { via: false, perche: 'nessuna approvata con l’orario scaduto' };

  for (const r of candidate) {
    const testo = testoDaPubblicare(r);
    if (!testo) continue;
    if (!r.testo || graveDi(r.testo)) continue;
    const rec: Recensione = {
      id: r.id,
      fonte: r.fonte,
      autore: r.autore,
      voto: r.voto,
      titolo: r.titolo,
      testo: r.testo,
      lingua: r.lingua,
      tour_slug: r.prodotto,
      data: r.data_recensione,
    };
    /* i controlli si rifanno QUI, all'uscita: l'approvazione umana puo'
       aver chiuso un occhio, ma un blocco e' un blocco */
    if (!siPuoPubblicare(guaiDi(testo, rec))) continue;
    return { via: true, riga: r, testo };
  }

  return {
    via: false,
    perche: `${candidate.length} approvate con l’orario scaduto, ma nessuna passa i controlli d’uscita (testo vuoto, grave, o un blocco)`,
  };
}

/**
 * Il confronto fra la riga e quello che il browser vede nel portale
 * PRIMA di incollare. Autore e titolo devono combaciare; la data, se il
 * portale la mostra, pure. Un «quasi» non basta: incollare sotto la
 * recensione sbagliata e' il danno peggiore che questo giro puo' fare,
 * e non si ripara.
 */
export function confronto(
  riga: RigaCoda,
  visto: { autore: string; titolo: string; data?: string | null }
): { ok: true } | { ok: false; perche: string } {
  const pulisci = (s: string | null | undefined) =>
    (s ?? '').toLowerCase().replace(/\s+/g, ' ').replace(/[.…]+$/g, '').trim();

  const a1 = pulisci(riga.autore);
  const a2 = pulisci(visto.autore);
  if (a1 && a2 && a1 !== a2) return { ok: false, perche: `autore diverso: coda «${riga.autore}», portale «${visto.autore}»` };

  /* il portale tronca i titoli lunghi con «...»: basta che uno sia
     l'inizio dell'altro */
  const t1 = pulisci(riga.titolo);
  const t2 = pulisci(visto.titolo);
  if (t1 && t2 && !t1.startsWith(t2) && !t2.startsWith(t1)) {
    return { ok: false, perche: `titolo diverso: coda «${riga.titolo}», portale «${visto.titolo}»` };
  }

  if (riga.data_recensione && visto.data) {
    /* 🔴 NON SI PASSA DA `toISOString()`: «Oct 20, 2026» senza fuso
       viene letto come mezzanotte LOCALE, e in UTC diventa il 19 alle
       22:00 -- cioe' il giorno prima. Trovato alla prima prova: il
       confronto di una riga identica diceva «data diversa». Si legge la
       data con i getter locali, che restituiscono il giorno scritto. */
    const d = new Date(visto.data);
    if (!Number.isNaN(d.getTime())) {
      const z = (n: number) => String(n).padStart(2, '0');
      const giorno = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
      if (giorno !== riga.data_recensione) {
        return { ok: false, perche: `data diversa: coda ${riga.data_recensione}, portale ${visto.data}` };
      }
    }
  }
  return { ok: true };
}
