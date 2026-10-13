import { testiBenvenuto, whatsappLeggibile, type ContattiAzienda } from '@/lib/partners-benvenuto';
import type { Lingua } from '@/lib/partners-testi';
import css from './Benvenuto.module.css';

/* LA PRESENTAZIONE DELL'AZIENDA (pagina iniziale dell'area partner), uguale
 * alle due brochure B2B in PDF di docs/pdf_partner/: lo stesso ordine, gli
 * stessi testi (src/lib/partners-benvenuto.ts), le stesse due foto -- prese
 * dalle brochure senza le scritte sopra, in public/partners/.
 *
 * Server Component in HTML semplice con un modulo CSS: nessun componente
 * Mantine, quindi nessun problema di confine (CLAUDE.md). */

const LOGO = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png';

export function Benvenuto({ lingua, c }: { lingua: Lingua; c: ContattiAzienda }) {
  const T = testiBenvenuto(lingua);
  const wa = c.whatsapp.replace(/\D/g, '');
  return (
    <article className={css.pagina}>
      <header className={css.testa}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/partners/benvenuto-vigne-2000.webp"
          srcSet="/partners/benvenuto-vigne-1000.webp 1000w, /partners/benvenuto-vigne-2000.webp 2000w"
          sizes="(max-width: 1100px) 100vw, 980px"
          alt={T.fotoVigne}
          width={2000}
          height={1118}
          fetchPriority="high"
        />
        <div className={css.nome}>
          <h1>PRESTIGE RENT</h1>
          <p>{T.sopratitolo(c.anno)}</p>
        </div>
      </header>
      <div className={css.filetto} />

      <section className={css.corpo}>
        <h2>{T.titolo}</h2>
        <p className={css.intro}>{T.intro}</p>
        <div className={css.punti}>
          {T.punti.map((p) => (
            <div key={p.titolo} className={css.punto}>
              <h3>{p.titolo}</h3>
              <p>{p.testo}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={css.servizi}>
        <h2>{T.serviziTitolo}</h2>
        {T.servizi.map((s) => (
          <div key={s.titolo} className={css.servizio}>
            <h3>{s.titolo}</h3>
            <p>{s.testo}</p>
          </div>
        ))}
      </section>

      <figure className={css.flotta} style={{ margin: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/partners/benvenuto-flotta-2000.webp"
          srcSet="/partners/benvenuto-flotta-1000.webp 1000w, /partners/benvenuto-flotta-2000.webp 2000w"
          sizes="(max-width: 1100px) 100vw, 980px"
          alt={T.fotoFlotta}
          width={2000}
          height={663}
          loading="lazy"
        />
      </figure>

      <footer className={css.fondo}>
        <div>
          <h2>{T.chiusura}</h2>
          <ul className={css.contatti}>
            <li>
              <b>{T.sede}:</b> {T.sedeValore}
            </li>
            <li>
              <b>{T.web}:</b>{' '}
              <a href="https://prestigerent.com/" target="_blank" rel="noopener">
                www.prestigerent.com
              </a>
            </li>
            <li>
              <b>{T.email}:</b> <a href={`mailto:${c.email}`}>{c.email}</a>
            </li>
            <li>
              <b>{T.telefono}:</b> <a href={`tel:${c.telefono.replace(/\s/g, '')}`}>{c.telefono}</a>
            </li>
            <li>
              <b>{T.whatsapp}:</b>{' '}
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                {whatsappLeggibile(c.whatsapp)}
              </a>
            </li>
          </ul>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={css.logo} src={LOGO} alt="Prestige Rent" width={150} height={150} loading="lazy" />
      </footer>
    </article>
  );
}
