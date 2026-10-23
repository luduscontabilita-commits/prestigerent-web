import { Alert, Text } from '@mantine/core';
import { comeSiChiama } from '@/lib/accesso';
import { soloGestione, supabaseServer } from '@/lib/auth';
import { Guscio } from '@/components/admin/Guscio';
import { vociPerRuolo } from '@/lib/menu-admin';
import { CodaRecensioni, type Riga } from '@/components/admin/CodaRecensioni';
import { meteoGiorni } from '@/lib/meteo';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* 🔴 IL TETTO LO EREDITANO LE AZIONI DI QUESTA PAGINA, e serve a una
   sola di loro: `scriviRisposta()` chiama il modello, e una chiamata a
   Gemini via OpenRouter sta fra i 2 e i 6 secondi -- dentro i dieci
   secondi predefiniti di Vercel, ma senza margine per una giornata in cui
   il servizio e' lento. Un pulsante che funziona quando la rete e' svelta
   e fallisce quando e' lenta e' il peggior modo di rompersi, perche' non
   si riesce a riprodurlo. */
export const maxDuration = 60;

/* LE RECENSIONI DEI PORTALI, E LE RISPOSTE.
 *
 * ── COSA FA QUESTA PAGINA, IN UNA RIGA ────────────────────────────────
 * Tiene la coda delle recensioni che arrivano da Viator e Tripadvisor,
 * fa scrivere una bozza di risposta, la mostra accanto ai controlli, e
 * aspetta che una persona la approvi.
 *
 * ── 🔴 QUELLO CHE QUESTA PAGINA NON FA, E NON PUO' FARE ───────────────
 * Non pubblica. Nessuno dei portali ha un'API per scrivere una risposta
 * (verificato il 22/10/2026): la risposta si copia e si incolla nel
 * portale, e la coda registra che e' stato fatto. Non e' una scelta di
 * prudenza -- e' l'unica strada che esiste.
 *
 * ── PERCHE' LA CODA NON STA IN `recensioni` ───────────────────────────
 * `recensioni` e' quello che il sito MOSTRA, leggibile da chiunque abbia
 * la chiave pubblicabile. Qui dentro, per gran parte del ciclo di vita di
 * ogni riga, c'e' una bozza NON approvata: testo che parla con la voce
 * dell'azienda e che nessuno ha ancora letto. `coda_recensioni` ha RLS
 * accesa e nessuna policy per `anon`.
 *
 * ── L'ORDINE DELL'ELENCO ──────────────────────────────────────────────
 * Non per data: per QUANTO MANCA A FARLE. Prima quelle senza risposta,
 * poi le bozze da leggere, poi le approvate in attesa di essere
 * incollate; le fatte e le scartate in fondo. Chi apre questa pagina non
 * vuole la cronologia, vuole la prossima cosa da fare.
 */

/** Quanto «urge» ogni stato: piu' basso, piu' in alto nell'elenco. */
const PESO: Record<string, number> = {
  nuova: 0,
  letta: 1,
  bozza: 2,
  approvata: 3,
  pubblicata: 4,
  saltata: 5,
};

export default async function RecensioniPannello() {
  const io = await soloGestione();

  const sb = await supabaseServer();
  const [{ data, error }, { data: imp }, meteo] = await Promise.all([
    sb
      .from('coda_recensioni')
      .select(
        'id,fonte,portale,prodotto,titolo,autore,voto,lingua,testo,risposta,corretto,stato,modello,costo,link_risposta,pubblicare_il,pubblicata_il,data_recensione,data_servizio,nota'
      )
      .order('id', { ascending: false }),
    /* l'interruttore della pubblicazione automatica: una riga sola, e se
       per qualunque motivo non si legge si considera SPENTO -- e' il
       verso sicuro dell'errore */
    sb.from('impostazioni_recensioni').select('automatico,max_al_giorno').eq('id', true).maybeSingle(),
    /* il tempo a Firenze, 92 giorni indietro e 7 avanti: per il calendario
       e per le righe che conoscono la data del servizio. Se non risponde,
       mappa vuota e il pannello si disegna lo stesso. */
    meteoGiorni(92, 7),
  ]);
  /* una Map non attraversa il confine server/client: si passa come
     oggetto semplice */
  const meteoPerGiorno = Object.fromEntries(meteo);
  const impostazioni = {
    automatico: Boolean(imp?.automatico),
    maxAlGiorno: Number(imp?.max_al_giorno ?? 20),
  };

  const righe: Riga[] = ((data ?? []) as Riga[]).slice().sort((a, b) => {
    const pa = PESO[a.stato] ?? 9;
    const pb = PESO[b.stato] ?? 9;
    if (pa !== pb) return pa - pb;
    /* dentro lo stesso stato: prima quella che tocca prima. Chi non ha
       un orario assegnato sta in cima -- e' una riga su cui non e' ancora
       passato nessuno. */
    const ta = a.pubblicare_il ? Date.parse(a.pubblicare_il) : 0;
    const tb = b.pubblicare_il ? Date.parse(b.pubblicare_il) : 0;
    return ta - tb;
  });

  return (
    <Guscio
      chi={comeSiChiama(io)}
      ruolo={io.ruolo}
      voci={vociPerRuolo(io.ruolo)}
      titolo="Recensioni dai portali"
      sottotitolo={
        <Text size="sm" c="dimmed">
          Viator e Tripadvisor: la coda, le bozze di risposta e l&rsquo;approvazione. Si pubblica
          incollando nel portale.
        </Text>
      }
    >
      {error ? (
        <Alert color="red" variant="light" mb="md">
          <Text size="sm">
            La coda non si e` potuta leggere: {error.message}. Se dice «relation does not exist», la
            migrazione <code>20261022_coda_recensioni.sql</code> non e` stata applicata su questo
            database.
          </Text>
        </Alert>
      ) : null}

      <CodaRecensioni righe={righe} impostazioni={impostazioni} meteo={meteoPerGiorno} />
    </Guscio>
  );
}
