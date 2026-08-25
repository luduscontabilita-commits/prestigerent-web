import { redirect } from 'next/navigation';
import { chiSono, supabaseServer } from '@/lib/auth';
import { Numeri, type RigaNumeri } from '@/components/admin/Numeri';
import { passoConteggi, passoDisponibilita, passoPrenotazioni, passoRecensioni } from './azioni';
import '@/styles/admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* I Server Action di questa pagina ereditano questo tetto. Il predefinito
   di Vercel e' dieci secondi: una fetta di quattro pagine di prenotazioni
   ne dura otto, e sarebbe un pulsante che funziona finche' Regiondo e'
   svelto e fallisce nei giorni in cui e' lento -- il peggior modo di
   rompersi, perche' non si riesce a riprodurlo. */
export const maxDuration = 60;

/* I NUMERI CHE IL SITO DICHIARA.
 *
 * Recensioni, prenotazioni e disponibilita' erano una fotografia presa a
 * mano: giusta il giorno che e' stata presa, e da li' in poi sempre meno.
 * Questa pagina fa due cose che una fotografia non fa -- dice quanti anni
 * ha, e si rifa' da sola quando si preme il pulsante.
 *
 * La tabella non serve a leggere i numeri (quelli si leggono sul sito):
 * serve a vedere in un colpo d'occhio QUALI tour hanno numeri e quali no.
 * Un tour senza recensioni e senza prenotazioni non e' un errore, ma un
 * tour che ieri ne aveva e oggi no lo e'.
 */

/** Il piu' recente fra due istanti, saltando i nulli. */
function piuRecente(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function aRoma(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default async function NumeriPannello() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');

  const sb = await supabaseServer();
  const [{ data: tours }, { data: valutazioni }, { data: conteggi }, { data: disponibilita }] =
    await Promise.all([
      sb.from('tours').select('slug,regiondo_sku').order('slug'),
      sb.from('valutazioni_tour').select('tour_slug,voto,quante').eq('fonte', 'regiondo'),
      sb.from('prenotazioni_conteggio').select('tour_slug,oggi,ultimi_7,aggiornato'),
      sb
        .from('disponibilita')
        .select('tour_slug,prima_libera,posti_prima,esaurite_30gg,date_totali_30gg,aggiornato'),
    ]);

  const perVoto = new Map((valutazioni ?? []).map((v) => [v.tour_slug as string, v]));
  const perConto = new Map((conteggi ?? []).map((c) => [c.tour_slug as string, c]));
  const perDisp = new Map((disponibilita ?? []).map((d) => [d.tour_slug as string, d]));

  const righe: RigaNumeri[] = (tours ?? []).map((t) => {
    const slug = t.slug as string;
    const v = perVoto.get(slug);
    const c = perConto.get(slug);
    const d = perDisp.get(slug);
    return {
      slug,
      sku: (t.regiondo_sku as string | null) ?? null,
      voto: v?.voto != null ? Number(v.voto) : null,
      quante: (v?.quante as number | null) ?? null,
      oggi: (c?.oggi as number | null) ?? null,
      ultimi_7: (c?.ultimi_7 as number | null) ?? null,
      prima_libera: (d?.prima_libera as string | null) ?? null,
      posti_prima: (d?.posti_prima as number | null) ?? null,
      esaurite_30gg: (d?.esaurite_30gg as number | null) ?? null,
      date_totali_30gg: (d?.date_totali_30gg as number | null) ?? null,
      /* Le tre tabelle si scrivono in tre momenti diversi: della riga conta
         la lettura piu' recente, perche' e' quella che dice "questi dati
         sono stati toccati". */
      aggiornato: piuRecente(
        (c?.aggiornato as string | null) ?? null,
        (d?.aggiornato as string | null) ?? null
      ),
    };
  });

  const aggiornato = righe.reduce<string | null>((s, r) => piuRecente(s, r.aggiornato), null);

  return (
    <main className="ad-main ad-largo">
      <header className="ad-head">
        <div>
          <h1>Numeri da Regiondo</h1>
          <p>
            Recensioni, prenotazioni e disponibilita’: quello che il sito dichiara come vero.
            Gli annullamenti non vengono contati. {righe.length} tour.
          </p>
        </div>
        <a className="ad-back" href="/admin/">
          &larr; Pannello
        </a>
      </header>

      <Numeri
        righe={righe}
        aggiornato={aggiornato}
        quandoAssoluto={aggiornato ? aRoma(aggiornato) : null}
        azioni={{
          recensioni: passoRecensioni,
          prenotazioni: passoPrenotazioni,
          conteggi: passoConteggi,
          disponibilita: passoDisponibilita,
        }}
      />
    </main>
  );
}
