import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { avvisaRichiesta, postaConfigurata } from '@/lib/posta';

/* UNA ROTTA DI DIAGNOSI, TEMPORANEA.
 *
 * Il modulo risponde `ok` e l'email non arriva. Da fuori non si distingue
 * fra "Vercel blocca la porta 587", "Microsoft rifiuta la connessione da
 * un indirizzo di datacentro" e "la funzione va in timeout": sono tre
 * guasti diversi con tre rimedi diversi, e tirare a indovinare vuol dire
 * riscrivere l'invio per il motivo sbagliato.
 *
 * Questa rotta prova a mandare e RESTITUISCE L'ERRORE, invece di
 * scriverlo in un log che non si riesce a leggere.
 *
 * Protetta dallo stesso segreto del lavoro notturno, e da cancellare
 * appena la posta funziona: una rotta che manda email a comando non deve
 * restare in giro.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function segretoGiusto(dato: string | null) {
  const atteso = process.env.CRON_SECRET;
  if (!atteso || !dato) return false;
  const a = Buffer.from(dato);
  const b = Buffer.from(atteso);
  /* Confronto a tempo costante: la lunghezza diversa va gestita prima,
     perche' `timingSafeEqual` solleva invece di rispondere falso. */
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const dato = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!segretoGiusto(dato)) {
    /* 404 e non 403: a chi non ha il segreto questa rotta non esiste. */
    return NextResponse.json({ errore: 'non trovato' }, { status: 404 });
  }

  const inizio = Date.now();
  const esito = await avvisaRichiesta({
    nome: 'DIAGNOSI POSTA',
    email: 'redattorisulweb@gmail.com',
    telefono: null,
    tour: null,
    quando: null,
    persone: null,
    messaggio: 'Prova di diagnosi: se questa arriva, l uscita SMTP funziona.',
    pagina: null,
    lingua: 'en',
    marketing: false,
  });

  return NextResponse.json({
    configurata: postaConfigurata(),
    host: process.env.SMTP_HOST ?? null,
    porta: process.env.SMTP_PORT ?? null,
    /* Solo il dominio del destinatario: non serve altro per capire, e
       l'indirizzo intero non deve uscire da una rotta di diagnosi. */
    a: (process.env.RICHIESTE_A ?? '').split('@')[1] ?? null,
    ok: esito.ok,
    errore: esito.errore ?? null,
    ms: Date.now() - inizio,
  });
}
