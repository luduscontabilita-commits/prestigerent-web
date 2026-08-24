/* "Talk to a real person", con la foto del team.
 *
 * E' lo stesso blocco della landing, e non e' un vezzo: su un sito che vende
 * giornate da centinaia di euro a persone dall'altra parte del mondo, la
 * faccia di chi risponde vale piu' di qualunque garanzia scritta. Chi ha un
 * dubbio e nessuno a cui chiederlo non prenota: chiude.
 *
 * Sta in un componente solo perche' compare in home e su tutte le pagine
 * tour: cambiare un numero di telefono deve essere una modifica sola.
 */
export function ContactSection() {
  return (
    <section className="pr-sec tight alt" id="contact">
      <div className="pr-wrap">
        <div className="pr-head" style={{ marginBottom: 22 }}>
          <p className="pr-kicker">Before you book</p>
          <h2 className="pr-title">
            Talk to a <em className="hl place">real person</em>
          </h2>
          <p className="pr-lead">Before you book, or while you travel. We answer.</p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pr-team-photo"
          src="https://prestigerent.com/lp/img/team-prestige-rent.webp"
          width={170}
          height={170}
          loading="lazy"
          decoding="async"
          alt="The Prestige Rent team in Italy — real people ready to help you"
        />

        <div className="pr-help-copy">
          <p className="pr-hc-head">
            Have questions? <em>Let&rsquo;s chat!</em>
          </p>
          <p className="pr-hc-body">
            Meet our native English-speaking experts, <strong>Violeta and Carrie</strong>. A
            different pick-up time, a second vehicle for a larger family, a licensed guide,
            a winery to add, a wheelchair to fit in the boot, a drop-off at the airport on
            your last day &mdash; tell them what your day needs to look like and they will
            build it.
          </p>
        </div>

        <div className="pr-help">
          <a href="https://wa.me/393338424047" target="_blank" rel="noopener">
            <svg className="pr-gico wa" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.27.86 5.82 2.42a8.19 8.19 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.25 8.26-8.25" />
            </svg>
            <div><b>WhatsApp</b><span>Chat with us</span></div>
          </a>

          <a href="tel:+39055286059">
            <svg className="pr-gico tel" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2" />
            </svg>
            <div><b>+39 055 286059</b><span>Call us</span></div>
          </a>

          <a href="mailto:usa@prestigerent.com">
            <svg className="pr-gico mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 6 10-6" />
            </svg>
            <div><b>usa@prestigerent.com</b><span>Email us</span></div>
          </a>
        </div>
      </div>
    </section>
  );
}
