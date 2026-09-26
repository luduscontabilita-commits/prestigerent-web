import Link from 'next/link';
import { chiSono, haRuolo, RUOLI_CARICAMENTO, RUOLI_GESTIONE, supabaseServer } from '@/lib/auth';
import { Esci } from '@/components/admin/Esci';
import { redirect } from 'next/navigation';
import '@/styles/admin.css';
import '@/styles/admin-telefono.css';
import '@/styles/gallery-admin.css';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/* L'INDICE DELLA GALLERY.
 *
 * Non usa `soloGestione()` perche' ci entrano tutti e due i ruoli: un
 * admin vede tutto, una guida vede caricamento e "Le mie foto". Le pagine
 * riservate hanno il loro controllo, e cosi' le azioni.
 *
 * 🔴 QUI SI DICE CHE COSA E' QUESTA GALLERY, e non e' decorazione: in
 * /admin/foto/ si riordinano le foto DEL PRODOTTO, quelle della striscia
 * in cima alle schede. Sono due cose diverse gestite da due pannelli, e
 * senza una riga che lo dica chi ci arriva ne cerca una nell'altra.
 */
export default async function GalleryIndice() {
  const io = await chiSono();
  if (!io) redirect('/admin/entra/');
  if (!haRuolo(io, RUOLI_CARICAMENTO)) redirect('/admin/');

  const gestisce = haRuolo(io, RUOLI_GESTIONE);
  const sb = await supabaseServer();

  /* `head: true` e `count`: torna solo il numero, non le righe. La coda
     puo' avere centinaia di foto e qui serve un contatore. */
  const { count: inAttesa } = await sb
    .from('gallery_images')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_attesa');

  const { count: approvate } = await sb
    .from('gallery_images')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approvata');

  const { count: pagine } = await sb
    .from('gallery_tags')
    .select('id', { count: 'exact', head: true })
    .eq('is_orphan', false);

  const { data: imp } = await sb
    .from('gallery_settings')
    .select('galleries_enabled,min_images')
    .eq('id', 1)
    .maybeSingle();
  const acceso = (imp as { galleries_enabled: boolean } | null)?.galleries_enabled ?? false;

  return (
    <main className="ad-main">
      <header className="ad-head">
        <div>
          <h1>Foto della gallery</h1>
          <p>
            Le foto delle giornate, caricate da chi accompagna gli ospiti. Compaiono in
            fondo alle pagine del sito.
            <br />
            <b>Non</b> sono le foto dei tour: quelle stanno in <Link href="/admin/foto/">Foto dei tour</Link> e
            sono la striscia in cima alle schede, con la copertina.
          </p>
        </div>
        <div className="ad-head-dx">
          <Esci io={io} />
          <Link className="ad-back" href="/admin/">&larr; Pannello</Link>
        </div>
      </header>

      {/* Lo stato dell'interruttore in cima, sempre: e' la domanda che si
          fa chi non capisce perche' le foto non si vedono sul sito. */}
      <div className={'g-stato ' + (acceso ? 'on' : 'off')}>
        {acceso ? (
          <>
            <b>Le gallery sono accese.</b> Una pagina le mostra quando ha almeno{' '}
            {(imp as { min_images: number } | null)?.min_images ?? 3} foto approvate.
          </>
        ) : (
          <>
            <b>Le gallery sono spente su tutto il sito.</b> Si può caricare, taggare e
            approvare: niente compare ai visitatori finché l’interruttore resta spento.
          </>
        )}
      </div>

      <div className="ad-conta">
        <div className={inAttesa ? 'male' : 'bene'}>
          <b>{inAttesa ?? 0}</b>
          <span>da approvare</span>
        </div>
        <div>
          <b>{approvate ?? 0}</b>
          <span>approvate</span>
        </div>
        <div>
          <b>{pagine ?? 0}</b>
          <span>pagine nel registro</span>
        </div>
      </div>

      <div className="ad-griglia">
        <Link className="ad-card" href="/admin/gallery/carica/">
          <strong>Carica e tagga</strong>
          <span>Aggiungi foto e scegli su quali pagine devono comparire.</span>
        </Link>

        <Link className="ad-card" href="/admin/gallery/mie/">
          <strong>Le mie foto</strong>
          <span>In attesa, approvate, rifiutate. Le rifiutate dicono perché.</span>
        </Link>

        {gestisce && (
          <>
            <Link className="ad-card" href="/admin/gallery/approva/">
              <strong>Da approvare {inAttesa ? `(${inAttesa})` : ''}</strong>
              <span>Le foto inviate dalle guide. Approva, correggi o rimanda indietro.</span>
            </Link>
            <Link className="ad-card" href="/admin/gallery/pagine/">
              <strong>Pagine</strong>
              <span>Quali pagine hanno la gallery, con che titolo e in che ordine.</span>
            </Link>
            <Link className="ad-card" href="/admin/gallery/impostazioni/">
              <strong>Impostazioni</strong>
              <span>L’interruttore generale, il numero minimo di foto, i titoli.</span>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
