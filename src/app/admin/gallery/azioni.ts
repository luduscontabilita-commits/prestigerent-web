'use server';

import { revalidatePath } from 'next/cache';
import { chiAgisce, RUOLI_CARICAMENTO, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import { LOCALE_CODES } from '@/lib/locales';
import { invia, postaConfigurata } from '@/lib/posta';
import {
  BUCKET_INBOX,
  BUCKET_PUBBLICO,
  cancella,
  copiaInPubblico,
  firmaCaricamento,
  nomeFile,
} from '@/lib/gallery-file';
import { chiaviDoppie, registro, type Criterio, type TipoTag, type VoceRegistro } from '@/lib/gallery-tag';

/* LE AZIONI DEL PANNELLO GALLERY.
 *
 * ── CHI PUO' FARE COSA, E DOVE SI CONTROLLA ────────────────────────────
 * In cima a OGNI azione, perche' una server action non passa da nessuna
 * pagina e da nessun layout: si chiama con una POST al suo identificativo.
 * `chiAgisce(RUOLI_GESTIONE)` per quello che fa un admin,
 * `chiAgisce(RUOLI_CARICAMENTO)` per quello che fa anche una guida.
 *
 * Sotto c'e' comunque la RLS: le scritture sulle RIGHE passano dalla
 * sessione dell'utente con la chiave pubblicabile, quindi il database
 * rifiuta da se' una guida che provasse ad approvarsi una foto. Questi
 * controlli servono a rispondere «non hai i permessi» invece di un
 * «riuscito» con zero righe toccate.
 *
 * I FILE sono l'eccezione e usano la chiave segreta: il perche' sta in
 * src/lib/gallery-file.ts, in breve `storage.objects` non e' nostra e le
 * sue policy non si possono scrivere in una migrazione.
 */

export type Esito = { ok: boolean; errore?: string };

/* ═══════════════════════════════════════════════════════════════════
   LA CACHE DELLE PAGINE
   ═══════════════════════════════════════════════════════════════════

   Non c'e' `revalidateTag` e non c'e' `unstable_cache`: questo progetto
   mette in cache le PAGINE (ISR) e le rinfresca con `revalidatePath`, come
   fa gia' `admin/foto/azioni.ts`. Il perche' di questa scelta sta in cima
   a src/lib/gallery-dati.ts.

   I percorsi sono quelli INTERNI, sotto /[locale]/: l'inglese senza
   prefisso e' una riscrittura del proxy, non una pagina a se'. */
function rinfresca(percorsi: string[]) {
  for (const l of LOCALE_CODES) {
    for (const p of percorsi) {
      const pulito = p === '/' ? '' : p.replace(/\/$/, '');
      revalidatePath(`/${l}${pulito}`);
    }
  }
}

/** I percorsi delle pagine toccate da una foto. Una foto puo' stare su
 *  piu' pagine, e vanno rinfrescate tutte: se no la si vede comparire su
 *  una scheda e non sulla categoria, e sembra un guasto a metà. */
async function percorsiDi(sb: Awaited<ReturnType<typeof supabaseServer>>, idFoto: string[]) {
  if (!idFoto.length) return [];
  const { data } = await sb
    .from('gallery_image_tags')
    .select('gallery_tags(path)')
    .in('image_id', idFoto);
  const righe = (data ?? []) as unknown as { gallery_tags: { path: string } | null }[];
  return [...new Set(righe.map((r) => r.gallery_tags?.path).filter((p): p is string => !!p))];
}

/* ═══════════════════════════════════════════════════════════════════
   1. SINCRONIZZA LE PAGINE
   ═══════════════════════════════════════════════════════════════════ */

export type EsitoSync = Esito & {
  aggiunte?: number;
  aggiornate?: number;
  orfane?: number;
  doppie?: string[];
  perTipo?: Record<string, number>;
};

/**
 * IL REGISTRO, RICOSTRUITO DAL CODICE E DAL CATALOGO.
 *
 * E' un pulsante e non uno script `npm` per la regola 1 del CLAUDE.md:
 * niente in locale. Uno script avrebbe voluto la chiave di servizio sul
 * PC di chi lo lancia, e sarebbe stato l'unico pezzo del sistema che non
 * si puo' usare dal telefono.
 *
 * 🔴 NON CANCELLA MAI UNA RIGA. Una pagina che esce dal codice diventa
 * `is_orphan = true` e resta: se aveva foto attaccate, cancellarla
 * cancellerebbe il lavoro di qualcuno in silenzio (le `gallery_image_tags`
 * vanno via in cascata). L'admin la vede segnata e decide.
 */
export async function sincronizzaPagine(): Promise<EsitoSync> {
  const { errore } = await chiAgisce(RUOLI_GESTIONE);
  if (errore) return { ok: false, errore };

  const sb = await supabaseServer();

  const [{ data: tours }, { data: contenuti }, { data: categorie }] = await Promise.all([
    sb.from('tours').select('id,slug'),
    sb.from('tour_content').select('tour_id,title').eq('locale', 'en'),
    sb.from('tour_categorie').select('categorie'),
  ]);

  const titoli = new Map(
    ((contenuti ?? []) as { tour_id: string; title: string | null }[]).map((c) => [c.tour_id, c.title])
  );
  const perTour = ((tours ?? []) as { id: string; slug: string }[]).map((t) => ({
    id: t.id,
    slug: t.slug,
    titolo: titoli.get(t.id) ?? null,
  }));

  /* Quanti tour ci sono dentro ogni categoria: serve solo a segnare
     `senza_tour`, cioe' a dire nel pannello «questa pagina non ha
     nemmeno un tour», per non far caricare venti foto su una pagina che
     non vede nessuno. */
  const conteggi: Record<string, number> = {};
  for (const r of (categorie ?? []) as { categorie: string[] | null }[]) {
    for (const c of r.categorie ?? []) conteggi[c] = (conteggi[c] ?? 0) + 1;
  }

  const voci = registro(perTour, conteggi);
  const doppie = chiaviDoppie(voci);
  /* Con una chiave doppia un `upsert` scriverebbe due volte sulla stessa
     riga e una delle due pagine perderebbe le sue foto senza un errore.
     Meglio non fare niente e dirlo. */
  if (doppie.length) {
    return { ok: false, errore: `Chiavi doppie nel registro: ${doppie.join(', ')}. Non ho scritto niente.`, doppie };
  }

  const { data: esistenti } = await sb.from('gallery_tags').select('key');
  const prima = new Set(((esistenti ?? []) as { key: string }[]).map((r) => r.key));

  const { error } = await sb.from('gallery_tags').upsert(
    voci.map((v: VoceRegistro) => ({
      key: v.key,
      type: v.type,
      label: v.label,
      path: v.path,
      ref_id: v.ref_id,
      senza_tour: v.senza_tour,
      /* Una riga che torna nel codice non resta orfana. Le impostazioni
         della pagina -- titolo, soglia, ordinamento -- NON sono in questo
         elenco, quindi l'upsert non le tocca. */
      is_orphan: false,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'key' }
  );
  if (error) return { ok: false, errore: error.message };

  const chiaviOra = voci.map((v) => v.key);
  const { data: orfane } = await sb
    .from('gallery_tags')
    .update({ is_orphan: true, updated_at: new Date().toISOString() })
    .not('key', 'in', `(${chiaviOra.map((k) => `"${k}"`).join(',')})`)
    .select('key');

  const perTipo: Record<string, number> = {};
  for (const v of voci) perTipo[v.type] = (perTipo[v.type] ?? 0) + 1;

  return {
    ok: true,
    aggiunte: voci.filter((v) => !prima.has(v.key)).length,
    aggiornate: voci.filter((v) => prima.has(v.key)).length,
    orfane: (orfane ?? []).length,
    perTipo,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   2. CARICARE
   ═══════════════════════════════════════════════════════════════════ */

export type Firma = {
  percorso: string;
  token: string;
  bucket: string;
  /** l'indirizzo completo a cui il browser fa la PUT. Il permesso sta nel
   *  token dentro l'indirizzo stesso, quindi non serve nessuna chiave nel
   *  browser: la firma vale per QUEL file e per pochi minuti. */
  url: string;
};

/**
 * Gli indirizzi firmati con cui il browser carica i file direttamente
 * nello storage, senza passare dal limite di 1 MB del corpo di una server
 * action.
 *
 * IL BUCKET DIPENDE DAL RUOLO, e non da quello che chiede il browser: una
 * guida carica nell'inbox privato, un admin dritto nel bucket pubblico
 * perche' la sua foto nasce gia' approvata. Se fosse il browser a
 * scegliere, una guida potrebbe chiedere il bucket pubblico e saltare
 * l'approvazione.
 */
export async function chiediFirme(quante: number): Promise<{ ok: boolean; errore?: string; firme?: Firma[] }> {
  const agente = await chiAgisce(RUOLI_CARICAMENTO);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };
  const io = agente.io;
  if (!Number.isInteger(quante) || quante < 1 || quante > 40) {
    return { ok: false, errore: 'Si possono caricare da 1 a 40 foto per volta.' };
  }

  const bucket = RUOLI_GESTIONE.includes(io.ruolo) ? BUCKET_PUBBLICO : BUCKET_INBOX;
  const firme: Firma[] = [];
  for (let i = 0; i < quante; i++) {
    const r = await firmaCaricamento(bucket, nomeFile());
    if ('errore' in r) return { ok: false, errore: r.errore };
    firme.push({ percorso: r.percorso, token: r.token, bucket, url: r.url });
  }
  return { ok: true, firme };
}

export type DaRegistrare = {
  bucket: string;
  storage_path: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  colore: string | null;
  /** ISO, oppure null se il file non portava la data */
  scattata: string | null;
  /** le chiavi delle pagine a cui appartiene */
  tag: string[];
};

/**
 * LE RIGHE, dopo che i file sono saliti.
 *
 * Un admin scrive `approvata` nel bucket pubblico, una guida `in_attesa`
 * nell'inbox: lo stato lo decide il RUOLO qui, non il browser. Il vincolo
 * `gallery_images_stato_bucket` nel database rifiuterebbe comunque una
 * combinazione sbagliata.
 */
export async function registraFoto(foto: DaRegistrare[]): Promise<Esito & { quante?: number }> {
  const agente = await chiAgisce(RUOLI_CARICAMENTO);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };
  const io = agente.io;
  if (!foto.length) return { ok: false, errore: 'Nessuna foto da registrare.' };

  const admin = RUOLI_GESTIONE.includes(io.ruolo);
  const sb = await supabaseServer();

  for (const f of foto) {
    if (!f.alt?.trim() || f.alt.trim().length < 3) {
      return { ok: false, errore: 'Ogni foto ha bisogno di una descrizione in inglese (alt).' };
    }
    if (!f.tag?.length) {
      return { ok: false, errore: 'Ogni foto ha bisogno di almeno una pagina.' };
    }
  }

  /* Le chiavi arrivano dal browser: si controlla che esistano nel registro
     prima di fidarsene. Una chiave inventata non darebbe errore -- darebbe
     una foto senza pagine, cioe' invisibile e incomprensibile. */
  const chiavi = [...new Set(foto.flatMap((f) => f.tag))];
  const { data: tagRighe } = await sb.from('gallery_tags').select('id,key,path').in('key', chiavi);
  const perChiave = new Map(((tagRighe ?? []) as { id: string; key: string; path: string }[]).map((t) => [t.key, t]));
  const ignote = chiavi.filter((k) => !perChiave.has(k));
  if (ignote.length) {
    return { ok: false, errore: `Pagine non nel registro: ${ignote.join(', ')}. Prova a sincronizzare le pagine.` };
  }

  const { data: inserite, error } = await sb
    .from('gallery_images')
    .insert(
      foto.map((f) => ({
        bucket: admin ? BUCKET_PUBBLICO : BUCKET_INBOX,
        storage_path: f.storage_path,
        width: f.width,
        height: f.height,
        blur_data_url: f.colore,
        alt: f.alt.trim(),
        caption: f.caption?.trim() || null,
        status: admin ? 'approvata' : 'in_attesa',
        uploaded_by: io.id,
        /* Un admin e' chi approva: approvare le proprie foto sarebbe un
           passaggio senza contenuto, quindi si registra subito chi e'
           stato invece di lasciare i campi vuoti. */
        reviewed_by: admin ? io.id : null,
        reviewed_at: admin ? new Date().toISOString() : null,
        taken_at: f.scattata,
      }))
    )
    .select('id,storage_path');
  if (error) return { ok: false, errore: error.message };

  const perPercorso = new Map(((inserite ?? []) as { id: string; storage_path: string }[]).map((r) => [r.storage_path, r.id]));

  const legami: { image_id: string; tag_id: string; position: number }[] = [];
  for (const f of foto) {
    const id = perPercorso.get(f.storage_path);
    if (!id) continue;
    for (const k of f.tag) {
      const t = perChiave.get(k);
      /* Di dieci in dieci, e in fondo: una foto nuova non scavalca l'ordine
         che qualcuno ha sistemato a mano. */
      if (t) legami.push({ image_id: id, tag_id: t.id, position: 1000 });
    }
  }
  if (legami.length) {
    const { error: e2 } = await sb.from('gallery_image_tags').insert(legami);
    if (e2) return { ok: false, errore: e2.message };
  }

  if (admin) {
    rinfresca([...new Set(foto.flatMap((f) => f.tag.map((k) => perChiave.get(k)!.path)))]);
  } else {
    await avvisaAdmin(sb, io.nome ?? io.email, foto.length);
  }

  return { ok: true, quante: foto.length };
}

/** UNA email per INVIO, non una per foto: dodici foto sono un messaggio
 *  che dice «dodici», non dodici messaggi che nessuno legge piu'. */
async function avvisaAdmin(
  sb: Awaited<ReturnType<typeof supabaseServer>>,
  chi: string,
  quante: number
) {
  if (!postaConfigurata()) return;
  /* La RLS su `profili` lascia leggere gli altri profili solo a un admin;
     qui chi scrive e' una guida, quindi l'elenco tornerebbe vuoto. Si usa
     l'indirizzo dell'ufficio, che e' lo stesso a cui arrivano le
     richieste dal sito: e' la casella che qualcuno guarda davvero. */
  const a = process.env.RICHIESTE_A;
  if (!a) return;
  const quali = quante === 1 ? 'una foto' : `${quante} foto`;
  await invia({
    a,
    oggetto: `${chi} ha inviato ${quali} da approvare`,
    testo:
      `${chi} ha caricato ${quali} per la gallery del sito.\n\n` +
      `Le foto non sono ancora visibili: aspettano l'approvazione.\n` +
      `Per vederle e approvarle: https://prestigerent.com/admin/gallery/approva/\n`,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   3. CORREGGERE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Alt, didascalia e pagine di una foto.
 *
 * Una guida modifica SOLO le proprie e solo finche' sono in attesa o
 * rifiutate -- e non serve scriverlo qui, perche' e' la policy
 * `modifica_gallery_images_mie` a stabilirlo: se la riga non e' sua o e'
 * gia' approvata, l'update tocca zero righe. Si controlla `count` per
 * poterlo DIRE, invece di rispondere «fatto» senza aver fatto niente.
 */
export async function aggiornaFoto(
  id: string,
  dati: { alt: string; caption: string | null; tag: string[] }
): Promise<Esito> {
  const { errore } = await chiAgisce(RUOLI_CARICAMENTO);
  if (errore) return { ok: false, errore };
  if (!dati.alt?.trim() || dati.alt.trim().length < 3) {
    return { ok: false, errore: 'La descrizione in inglese (alt) è obbligatoria.' };
  }
  if (!dati.tag?.length) return { ok: false, errore: 'Serve almeno una pagina.' };

  const sb = await supabaseServer();

  const { data: tagRighe } = await sb.from('gallery_tags').select('id,key,path').in('key', dati.tag);
  const trovati = (tagRighe ?? []) as { id: string; key: string; path: string }[];
  if (trovati.length !== dati.tag.length) {
    return { ok: false, errore: 'Una delle pagine indicate non è nel registro.' };
  }

  /* 🔴 CORREGGERE UNA RIFIUTATA LA RIMETTE IN CODA, NELLO STESSO UPDATE.
     Non e' una comodita': senza, la correzione non passa affatto.
     La policy `modifica_gallery_images_mie` lascia a chi ha caricato
     modificare una foto `in_attesa` o `rifiutata` (`using`), ma pretende
     che DOPO la modifica la riga sia `in_attesa` (`with check`). Una
     correzione che cambiasse solo descrizione e tag lascerebbe lo stato
     su `rifiutata`, il `with check` la respingerebbe, e l'update
     toccherebbe zero righe: il pannello direbbe «questa foto non e'
     tua», che e' falso e incomprensibile per chi la sta correggendo.
     Misurato dal vivo il 26/09/2026 con una guida vera.

     Ed e' anche la cosa giusta di suo: una foto rifiutata e poi corretta
     deve tornare in coda, non restare rifiutata con appeso il motivo di
     una versione che non esiste piu'. Per questo si azzerano anche
     `review_note`, `reviewed_by` e `reviewed_at`.

     Solo `rifiutata`, pero'. `/admin/gallery/tutte/` chiama questa
     stessa funzione su foto GIA' APPROVATE: forzare lo stato per tutti
     vorrebbe dire che un admin che sistema una didascalia toglie la foto
     dal sito senza averlo chiesto. */
  const { data: prima } = await sb
    .from('gallery_images')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  const eraRifiutata = prima?.status === 'rifiutata';

  const { error, count } = await sb
    .from('gallery_images')
    .update(
      {
        alt: dati.alt.trim(),
        caption: dati.caption?.trim() || null,
        updated_at: new Date().toISOString(),
        ...(eraRifiutata
          ? { status: 'in_attesa', review_note: null, reviewed_by: null, reviewed_at: null }
          : {}),
      },
      { count: 'exact' }
    )
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };
  if (!count) {
    return { ok: false, errore: 'Questa foto non è tua, oppure è già approvata: la può modificare solo un admin.' };
  }

  /* I tag si riscrivono per intero: togliere e rimettere e' piu' semplice
     di calcolare la differenza, e su una foto i tag sono pochissimi. */
  const { error: e1 } = await sb.from('gallery_image_tags').delete().eq('image_id', id);
  if (e1) return { ok: false, errore: e1.message };
  const { error: e2 } = await sb
    .from('gallery_image_tags')
    .insert(trovati.map((t) => ({ image_id: id, tag_id: t.id, position: 1000 })));
  if (e2) return { ok: false, errore: e2.message };

  rinfresca(trovati.map((t) => t.path));
  return { ok: true };
}

/** Rimandare in coda una foto rifiutata, dopo averla corretta. */
export async function reinvia(id: string): Promise<Esito> {
  const agente = await chiAgisce(RUOLI_CARICAMENTO);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };
  const io = agente.io;
  const sb = await supabaseServer();
  const { error, count } = await sb
    .from('gallery_images')
    .update(
      { status: 'in_attesa', review_note: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() },
      { count: 'exact' }
    )
    .eq('id', id)
    .eq('status', 'rifiutata');
  if (error) return { ok: false, errore: error.message };
  if (!count) return { ok: false, errore: 'Questa foto non è fra le tue rifiutate.' };
  await avvisaAdmin(sb, io.nome ?? io.email, 1);
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════════
   4. APPROVARE E RIFIUTARE
   ═══════════════════════════════════════════════════════════════════ */

/**
 * L'APPROVAZIONE: prima il file, poi la riga, poi si pulisce.
 *
 * 🔴 L'ORDINE NON E' INDIFFERENTE, e vale la pena dire perche' e' questo.
 * Il vincolo `gallery_images_stato_bucket` impone che una riga `approvata`
 * stia nel bucket pubblico. Quindi:
 *
 *  1. si COPIA il file nel bucket pubblico. Se qui va male, non e'
 *     cambiato niente: la riga e' ancora in attesa e la foto non e' sul
 *     sito.
 *  2. si aggiorna la RIGA (stato + bucket in un colpo). Questo passaggio
 *     passa dalla RLS: se chi chiama non e' admin il database rifiuta, e
 *     allora si BUTTA la copia appena fatta -- se no resterebbe un file
 *     nel bucket pubblico che nessuna pagina mostra ma che esiste.
 *  3. si toglie l'originale dall'inbox. Se questo va male non e' grave: e'
 *     un file in piu' in un bucket privato, e la foto e' regolarmente sul
 *     sito. Non si annulla niente per questo.
 *
 * L'ordine inverso -- prima la riga -- lascerebbe per un istante una riga
 * approvata che punta a un file che nel bucket pubblico non c'e': una foto
 * rotta in pagina, che e' peggio di una foto non ancora approvata.
 */
export async function approva(ids: string[]): Promise<Esito & { quante?: number }> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };
  const io = agente.io;
  if (!ids.length) return { ok: false, errore: 'Nessuna foto selezionata.' };

  const sb = await supabaseServer();
  const { data: righe } = await sb
    .from('gallery_images')
    .select('id,bucket,storage_path,status')
    .in('id', ids);
  const daFare = ((righe ?? []) as { id: string; bucket: string; storage_path: string; status: string }[])
    .filter((r) => r.status === 'in_attesa');
  if (!daFare.length) return { ok: false, errore: 'Nessuna di queste foto è in attesa.' };

  const percorsi = await percorsiDi(sb, daFare.map((r) => r.id));
  let fatte = 0;
  const problemi: string[] = [];

  for (const r of daFare) {
    const koCopia = await copiaInPubblico(r.storage_path);
    if (koCopia) { problemi.push(koCopia); continue; }

    const { error, count } = await sb
      .from('gallery_images')
      .update(
        {
          status: 'approvata',
          bucket: BUCKET_PUBBLICO,
          reviewed_by: io.id,
          reviewed_at: new Date().toISOString(),
          review_note: null,
          updated_at: new Date().toISOString(),
        },
        { count: 'exact' }
      )
      .eq('id', r.id);

    if (error || !count) {
      /* La riga non e' cambiata: si torna indietro sul file, per non
         lasciare nel bucket pubblico una foto che non e' approvata. */
      await cancella(BUCKET_PUBBLICO, [r.storage_path]);
      problemi.push(error?.message ?? 'il database ha rifiutato l’approvazione');
      continue;
    }

    await cancella(BUCKET_INBOX, [r.storage_path]);
    fatte++;
  }

  if (fatte) rinfresca(percorsi);
  if (!fatte) return { ok: false, errore: problemi[0] ?? 'Non ho approvato niente.' };
  return {
    ok: true,
    quante: fatte,
    errore: problemi.length ? `${fatte} approvate, ${problemi.length} no: ${problemi[0]}` : undefined,
  };
}

/** Il rifiuto, col motivo che la guida LEGGE. Il motivo e' obbligatorio, e
 *  non solo qui: il vincolo `gallery_images_rifiuto_motivato` lo impone nel
 *  database, quindi un rifiuto muto non si puo' scrivere nemmeno per
 *  errore di programmazione. */
export async function rifiuta(id: string, motivo: string): Promise<Esito> {
  const agente = await chiAgisce(RUOLI_GESTIONE);
  if (!agente.io) return { ok: false, errore: agente.errore ?? undefined };
  const io = agente.io;
  const testo = motivo?.trim();
  if (!testo) return { ok: false, errore: 'Il motivo del rifiuto è obbligatorio: è quello che la guida legge.' };

  const sb = await supabaseServer();
  const { data: riga } = await sb
    .from('gallery_images')
    .select('id,uploaded_by,alt,profili:uploaded_by(email,nome)')
    .eq('id', id)
    .maybeSingle();

  /* 🔴 ALLA GUIDA NON SI SCRIVE ALL'INDIRIZZO CON CUI ENTRA.
     Dal 26/09/2026 le guide accedono con un indirizzo interno
     `<nome>@guide.prestigerent.invalid`, che per costruzione non puo'
     ricevere niente (RFC 2606). Mandare li' l'avviso di rifiuto vorrebbe
     dire che quell'avviso non arriva MAI, e che nessuno se ne accorge --
     `invia()` non lancia, torna solo false.
     Il contatto vero, se la persona ne ha dato uno, sta in
     `autorizzati.contatto`, ed e' quello il posto dove scrivere. */
  const info = riga as unknown as { profili: { email: string } | null } | null;
  const { data: rubrica } = info?.profili?.email
    ? await sb.from('autorizzati').select('contatto').eq('email', info.profili.email).maybeSingle()
    : { data: null };
  const dove = (rubrica as { contatto: string | null } | null)?.contatto ?? null;

  const { error } = await sb
    .from('gallery_images')
    .update({
      status: 'rifiutata',
      review_note: testo.slice(0, 1000),
      reviewed_by: io.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, errore: error.message };

  const chi = riga as unknown as { alt: string; profili: { email: string; nome: string | null } | null } | null;
  if (dove && postaConfigurata()) {
    await invia({
      a: dove,
      oggetto: 'Una tua foto è stata rimandata indietro',
      testo:
        `Ciao${chi?.profili?.nome ? ' ' + chi.profili.nome : ''},\n\n` +
        `la foto «${chi?.alt ?? ''}» non è stata pubblicata.\n\nMotivo: ${testo}\n\n` +
        `Puoi correggerla e rimandarla da qui:\n` +
        `https://prestigerent.com/admin/gallery/mie/\n`,
    });
    return { ok: true };
  }

  /* Senza contatto la foto e' respinta lo stesso -- il rifiuto e' gia'
     scritto nel database e la guida lo legge in «Le mie foto» -- ma
     l'admin deve sapere che nessuno ha ricevuto niente, o restera' ad
     aspettare una correzione che non arriva perche' la persona non sa
     che c'e' da farla. */
  return {
    ok: true,
    errore: dove
      ? undefined
      : 'Rimandata indietro. Nessuna email inviata: questa persona non ha un contatto. Avvisala tu, oppure aggiungi la sua email in Utenti.',
  };
}

/** Nascondere una foto GIA' sul sito, o rimetterla. Non e' un rifiuto: il
 *  file resta nel bucket pubblico, perche' il vincolo stato/bucket vuole
 *  `nascosta` la' dentro -- e perche' rimetterla non deve voler dire
 *  ricaricarla. */
export async function cambiaVisibilita(id: string, nascondi: boolean): Promise<Esito> {
  const { errore } = await chiAgisce(RUOLI_GESTIONE);
  if (errore) return { ok: false, errore };
  const sb = await supabaseServer();
  const percorsi = await percorsiDi(sb, [id]);
  const { error } = await sb
    .from('gallery_images')
    .update({ status: nascondi ? 'nascosta' : 'approvata', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['approvata', 'nascosta']);
  if (error) return { ok: false, errore: error.message };
  rinfresca(percorsi);
  return { ok: true };
}

/** Cancellare per sempre: la riga e il file. Prima la riga, perche' e' lei
 *  che rende la foto raggiungibile: se il file sopravvivesse a una riga
 *  cancellata sarebbe soltanto spazio occupato, mentre una riga senza file
 *  sarebbe una foto rotta in pagina. */
export async function elimina(id: string): Promise<Esito> {
  const { errore } = await chiAgisce(RUOLI_CARICAMENTO);
  if (errore) return { ok: false, errore };

  const sb = await supabaseServer();
  const { data: riga } = await sb
    .from('gallery_images')
    .select('bucket,storage_path')
    .eq('id', id)
    .maybeSingle();
  const percorsi = await percorsiDi(sb, [id]);

  const { error, count } = await sb.from('gallery_images').delete({ count: 'exact' }).eq('id', id);
  if (error) return { ok: false, errore: error.message };
  if (!count) {
    return { ok: false, errore: 'Non posso eliminare questa foto: non è tua, oppure è già approvata.' };
  }

  const f = riga as { bucket: string; storage_path: string } | null;
  if (f) await cancella(f.bucket, [f.storage_path]);
  rinfresca(percorsi);
  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════════
   5. IMPOSTAZIONI E PAGINE
   ═══════════════════════════════════════════════════════════════════ */

export async function salvaImpostazioni(d: {
  galleries_enabled: boolean;
  min_images: number;
  default_title: string;
  default_subtitle: string | null;
  default_title_tour: string;
  default_subtitle_tour: string | null;
  autoplay_speed: string;
  default_sort: string;
}): Promise<Esito> {
  const { errore } = await chiAgisce(RUOLI_GESTIONE);
  if (errore) return { ok: false, errore };
  if (!Number.isInteger(d.min_images) || d.min_images < 1 || d.min_images > 50) {
    return { ok: false, errore: 'Il numero minimo di immagini va da 1 a 50.' };
  }
  if (!d.default_title.trim() || !d.default_title_tour.trim()) {
    return { ok: false, errore: 'I due titoli predefiniti non possono essere vuoti.' };
  }

  const sb = await supabaseServer();
  const { error } = await sb
    .from('gallery_settings')
    .update({ ...d, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { ok: false, errore: error.message };

  /* L'interruttore generale e le soglie riguardano OGNI pagina, quindi si
     rinfresca tutto: i percorsi delle pagine con foto sono pochi, ma
     l'interruttore spento deve far sparire la gallery anche da quelle che
     non si stanno guardando. */
  const { data } = await sb.from('gallery_tags').select('path');
  rinfresca(['/', ...((data ?? []) as { path: string }[]).map((r) => r.path)]);
  return { ok: true };
}

export async function salvaPagina(
  id: string,
  d: {
    custom_title: string | null;
    custom_subtitle: string | null;
    visibility_override: 'inherit' | 'on' | 'off';
    min_images_override: number | null;
    sort_override: Criterio | null;
  }
): Promise<Esito> {
  const { errore } = await chiAgisce(RUOLI_GESTIONE);
  if (errore) return { ok: false, errore };
  if (d.min_images_override != null && (d.min_images_override < 1 || d.min_images_override > 50)) {
    return { ok: false, errore: 'La soglia di questa pagina va da 1 a 50, oppure vuota.' };
  }

  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('gallery_tags')
    .update({
      custom_title: d.custom_title?.trim() || null,
      custom_subtitle: d.custom_subtitle?.trim() || null,
      visibility_override: d.visibility_override,
      min_images_override: d.min_images_override,
      sort_override: d.sort_override,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('path')
    .maybeSingle();
  if (error) return { ok: false, errore: error.message };
  if (data) rinfresca([(data as { path: string }).path]);
  return { ok: true };
}

/** L'ordine a mano di UNA pagina, e le foto fissate in testa. `position` e
 *  `pinned` stanno sul LEGAME e non sulla foto: la stessa foto puo' essere
 *  la prima su una scheda e l'ultima su una categoria. */
export async function riordinaPagina(
  tagId: string,
  ordine: { image_id: string; position: number; pinned: boolean }[]
): Promise<Esito> {
  const { errore } = await chiAgisce(RUOLI_GESTIONE);
  if (errore) return { ok: false, errore };
  const sb = await supabaseServer();

  for (const r of ordine) {
    const { error } = await sb
      .from('gallery_image_tags')
      .update({ position: r.position, pinned: r.pinned })
      .eq('tag_id', tagId)
      .eq('image_id', r.image_id);
    if (error) return { ok: false, errore: error.message };
  }

  const { data } = await sb.from('gallery_tags').select('path').eq('id', tagId).maybeSingle();
  if (data) rinfresca([(data as { path: string }).path]);
  return { ok: true };
}

/** Le pagine del registro, per il menu di chi carica. Le orfane restano
 *  fuori: sono pagine che non esistono piu' nel codice, e taggarle
 *  vorrebbe dire attaccare una foto al nulla. */
export async function pagineTaggabili(): Promise<{ key: string; label: string; type: TipoTag; path: string }[]> {
  const { errore } = await chiAgisce(RUOLI_CARICAMENTO);
  if (errore) return [];
  const sb = await supabaseServer();
  const { data } = await sb
    .from('gallery_tags')
    .select('key,label,type,path')
    .eq('is_orphan', false)
    .order('type')
    .order('label');
  return (data ?? []) as { key: string; label: string; type: TipoTag; path: string }[];
}
