'use server';

/* I DUE PULSANTI DEL PANNELLO.
 *
 * Il passaggio notturno riempie la fotografia una volta al giorno. Ma chi
 * lavora sulle campagne non aspetta la notte: cambia un budget e vuole
 * vedere il numero adesso. Quindi le stesse funzioni si chiamano anche da
 * qui, a mano.
 *
 * La guardia c'e' anche su queste, e non e' pedanteria: un Server Action
 * e' una rotta a tutti gli effetti: chi ne conosce l'indirizzo la puo'
 * chiamare senza passare dalla pagina. Proteggere solo la pagina
 * lascerebbe la porta di servizio aperta.
 */
import { chiSono } from '@/lib/auth';
import { aggiornaTutto, cercaParole } from '@/lib/pannello-fonti';
import type { Potenziale } from '@/lib/pannello';
import { revalidatePath } from 'next/cache';

export async function aggiornaAdesso(): Promise<{ ok: boolean; messaggio: string }> {
  if (!(await chiSono())) return { ok: false, messaggio: 'non autorizzato' };
  const esiti = await aggiornaTutto();
  revalidatePath('/michele');
  const guasti = Object.entries(esiti).filter(([, v]) => !v.startsWith('aggiornata'));
  return {
    ok: guasti.length === 0,
    messaggio: guasti.length
      ? guasti.map(([k, v]) => `${k}: ${v}`).join(' · ')
      : `aggiornate tutte e ${Object.keys(esiti).length} le sezioni`,
  };
}

export async function interroga(
  _stato: unknown,
  modulo: FormData
): Promise<{ righe: Potenziale[]; cercato: string }> {
  if (!(await chiSono())) return { righe: [], cercato: '' };
  const testo = String(modulo.get('parole') ?? '');
  const paese = String(modulo.get('paese') ?? '2840');
  /* Una per riga o separate da virgola: chi incolla da un foglio non deve
     stare a riformattare. */
  const semi = testo.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  return { righe: await cercaParole(semi, paese), cercato: testo };
}
