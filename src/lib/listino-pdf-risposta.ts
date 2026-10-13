import { listino } from '@/lib/regiondo-listino';
import { creaPdfListino, type DatiAzienda } from '@/lib/listino-pdf';
import { supabase } from '@/lib/supabase';
import { leggiCommissioni } from '@/lib/commissioni-db';
import { riprova } from '@/lib/riprova';

/* IL PDF DEL LISTINO COME RISPOSTA HTTP, per le due rotte che lo danno:
 *  - /admin/partners/listino/pdf/  (admin: brochure e versione partner)
 *  - /partners/price-list/pdf/     (partner: solo la versione partner)
 * Il controllo del ruolo lo fa ciascuna rotta PRIMA di chiamare questa
 * funzione: qui non si guarda chi chiede. */

const LOGO = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png';

export async function rispostaPdfListino(lingua: 'it' | 'en', partner: boolean): Promise<Response> {
  const [{ servizi, letto }, { data: azienda }, logo, c, rp] = await Promise.all([
    listino(false),
    supabase.from('azienda').select('*').eq('id', 1).maybeSingle(),
    fetch(LOGO, { next: { revalidate: 86400 } })
      .then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : null))
      .catch(() => null),
    partner ? leggiCommissioni() : Promise.resolve(null),
    /* i numeri della testata: gli stessi della home, dalla stessa fonte */
    riprova(),
  ]);

  const quando = new Date(letto);
  /* «Price list 2026», «Listino prezzi 2026»: solo l'anno (proprieta',
     12/10/2026). Il giorno resta nel nome del file, per distinguere le
     versioni scaricate. */
  const data = quando.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', year: 'numeric' });
  const file = await creaPdfListino({
    servizi,
    lingua,
    azienda: (azienda ?? {}) as DatiAzienda,
    logoPng: logo,
    data,
    commissioni: c ? { privato: c.privato, gruppo: c.gruppo } : undefined,
    numeri: {
      voto: rp.voto,
      clienti: rp.azienda?.clienti_serviti ?? null,
      tour: rp.azienda?.tour_effettuati ?? null,
      posizione: rp.azienda?.classifica_posizione ?? null,
      categoria: rp.azienda?.classifica_categoria ?? null,
      anni: rp.anni,
      /* 🔴 Il numero del MEDAGLIONE della home, non il totale del
         database. La home non scrive il totale come testo: lo mostra
         solo il badge «based on 12,000+ reviews on Viator & Tripadvisor»
         (src/components/Premi.tsx, un'immagine). Il 13/10/2026 il totale
         di `riprova()` dava gia' 14.000+: scriverlo qui avrebbe messo nel
         PDF un numero diverso da quello che il cliente vede sul sito.
         Quando il badge viene rifatto, si cambia anche questa riga. */
      recensioni: 12000,
    },
  });

  const giorno = quando.toISOString().slice(0, 10);
  const nome = partner
    ? lingua === 'it' ? `Prestige-Rent-listino-partner-${giorno}.pdf` : `Prestige-Rent-partner-price-list-${giorno}.pdf`
    : lingua === 'it' ? `Prestige-Rent-listino-prezzi-${giorno}.pdf` : `Prestige-Rent-price-list-${giorno}.pdf`;
  return new Response(file as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
