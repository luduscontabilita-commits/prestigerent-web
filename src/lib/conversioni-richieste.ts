import { createClient } from '@supabase/supabase-js';
import type { Conversione } from '@/lib/conversioni';
import {
  emailDaScartare,
  emailPerGoogle,
  emailPerMeta,
  nomePerMeta,
  telefonoPerGoogle,
  telefonoPerMeta,
} from '@/lib/identita';

/* LE RICHIESTE DAL MODULO CHE IL BROWSER NON HA RACCONTATO.
 *
 * ── LO STESSO BUCO DEGLI ACQUISTI, IN PROPORZIONE PEGGIORE ──────────
 * Dal 27 al 31 agosto 2026 il modulo ha prodotto 29 richieste, tutte
 * salvate su Supabase e tutte arrivate per email. Analytics ne ha viste
 * 12. Il 41%.
 *
 * La causa e' la stessa degli acquisti: l'evento parte dal browser, e
 * se il browser lo blocca non parte niente. La differenza e' che qui il
 * fatto ce l'abbiamo in casa -- la richiesta e' una riga nella nostra
 * tabella `richieste`, non un dato di terzi.
 *
 * ── PERCHE' CONTA PIU' DI QUANTO SEMBRI ─────────────────────────────
 * "Richiesta dal modulo" e' una conversione PRIMARIA su Google Ads:
 * e' uno dei segnali su cui le campagne decidono dove spendere. Se ne
 * arriva meno della meta', le campagne imparano da meno della meta'.
 *
 * ── IL VALORE NON SI INVENTA ────────────────────────────────────────
 * Su quell'azione c'e' un valore di 100 EUR che nessuno ha mai
 * giustificato: era una stima, non una misura. Qui NON si spedisce
 * nessun valore -- Google usa quello impostato sull'azione, e il giorno
 * che si sapra' quanto vale davvero una richiesta si cambia in un posto
 * solo. Mandare una cifra inventata dal server la renderebbe vera per
 * sbaglio.
 *
 * ── SOLO LETTURE, E SOLO IMPRONTE ───────────────────────────────────
 * Da qui esce l'identificativo della riga, l'istante, e le impronte
 * SHA-256 di email e telefono. Nessun indirizzo in chiaro esce mai.
 */

export type RichiestaGrezza = {
  id: string;
  creata_il: string;
  nome: string | null;
  email: string | null;
  telefono: string | null;
  tour: string | null;
  persone: number | null;
};

export type RaccoltoRichieste = {
  righe: Conversione[];
  lette: number;
  /** quante sono state buttate, e perche' */
  scarti: Record<string, number>;
  errore?: string;
};

/** Il nome con cui Analytics conosce gia' questo evento dal browser.
 *  Deve combaciare: due nomi diversi per la stessa cosa fanno due righe
 *  diverse nei rapporti, e nessuno capisce piu' quale guardare. */
export const EVENTO_GA4 = 'richiesta_inviata';

/** L'azione di Google Ads "Richiesta dal modulo". E' di tipo WEBPAGE,
 *  quindi accetta il caricamento multi-sorgente come "Acquisto". */
export const AZIONE_ADS = '7738882014';

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chiave) return null;
  return createClient(url, chiave, { auth: { persistSession: false } });
}

export function richiesteConfigurate(): boolean {
  return cliente() !== null;
}

/**
 * Legge le richieste degli ultimi `giorni` e le riduce alla stessa forma
 * delle prenotazioni, cosi' possono passare per gli stessi caricatori.
 */
export async function raccogliRichieste(giorni: number): Promise<RaccoltoRichieste> {
  const sb = cliente();
  if (!sb) return { righe: [], lette: 0, scarti: {}, errore: 'SUPABASE_SECRET_KEY assente' };

  const dal = new Date(Date.now() - giorni * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from('richieste')
    .select('id, creata_il, nome, email, telefono, tour, persone')
    .gte('creata_il', dal)
    .order('creata_il', { ascending: false })
    .limit(500);

  if (error) return { righe: [], lette: 0, scarti: {}, errore: error.message };

  const grezze = (data ?? []) as RichiestaGrezza[];
  const scarti: Record<string, number> = {};
  const butta = (m: string) => {
    scarti[m] = (scarti[m] ?? 0) + 1;
  };

  const righe: Conversione[] = [];
  for (const r of grezze) {
    const quando = new Date(r.creata_il);
    if (Number.isNaN(quando.getTime())) {
      butta('data illeggibile');
      continue;
    }

    /* Le email mascherate delle agenzie e quelle interne non servono a
       nessuno: Google non le abbina e sporcano il rapporto. Stessa
       regola degli acquisti, stessa funzione. */
    const motivo = r.email ? emailDaScartare(r.email) : null;
    if (motivo) {
      butta(`email ${motivo}`);
      continue;
    }

    const emailGoogle = emailPerGoogle(r.email);
    const telefonoGoogle = telefonoPerGoogle(r.telefono);
    /* Senza almeno un identificativo Google non ha niente su cui
       abbinare, e la riga verrebbe scartata dall'altra parte: meglio
       dirlo qui, dove si vede. */
    if (!emailGoogle && !telefonoGoogle) {
      butta('ne email ne telefono utilizzabili');
      continue;
    }

    const nome = (r.nome ?? '').trim();
    const spazio = nome.indexOf(' ');
    righe.push({
      /* L'identificativo della riga fa da numero d'ordine: e' unico, e'
         stabile, e non svela niente di chi ha scritto. */
      ordine: r.id,
      quando,
      /* 🔴 ZERO, E NON E' UNA DIMENTICANZA: vedi la nota in cima. */
      valore: 0,
      emailGoogle,
      emailMeta: emailPerMeta(r.email),
      telefonoGoogle,
      telefonoMeta: telefonoPerMeta(r.telefono),
      nomeMeta: nomePerMeta(spazio > 0 ? nome.slice(0, spazio) : nome),
      cognomeMeta: spazio > 0 ? nomePerMeta(nome.slice(spazio + 1)) : null,
      gclid: null,
      fbclid: null,
      prodotto: r.tour ?? 'Richiesta dal modulo',
      persone: r.persone ?? 1,
      dominio: (r.email ?? '').split('@')[1] ?? '',
    });
  }

  return { righe, lette: grezze.length, scarti };
}
