'use client';

import Script from 'next/script';
import { bookingIsEnglishOnly, regiondoLocale } from '@/lib/locales';

/* Il calendario di Regiondo. E' lo stesso identico embed delle landing:
 * incassa lui, e l'evento `purchase` che manda la conversione a Google Ads
 * parte da qui. Non va sostituito con niente di fatto in casa.
 *
 * `strategy="lazyOnload"`: e' l'elemento piu' pesante della pagina e nessuno
 * prenota nel primo secondo di visita. Prima si carica il contenuto, poi lui.
 */
export function RegiondoWidget({
  sku,
  title,
  locale,
}: {
  sku: string;
  title: string;
  locale: string;
}) {
  const provider = process.env.NEXT_PUBLIC_REGIONDO_PROVIDER ?? 'PR193';
  const shop = process.env.NEXT_PUBLIC_REGIONDO_SHOP ?? 'https://prestigerent.regiondo.com';

  return (
    <div className="pr-widget-holder">
      {/* Regiondo non ha russo e arabo. Meglio dirlo che lasciare il lettore
          a chiedersi perche' il calendario e' in un'altra lingua. */}
      {bookingIsEnglishOnly(locale) && (
        <p className="pr-pickup-note">The booking calendar is in English.</p>
      )}

      <div
        className="regiondo-booking-widget"
        data-locale={regiondoLocale(locale)}
        data-provider={provider}
        data-product={sku}
        data-title={title}
        data-url={`${shop}/`}
        data-width="400px"
        data-font="Open Sans"
      />

      <Script
        src="https://cdn.regiondo.net/js/integration/bookingwidget/bookingwidget.js"
        strategy="lazyOnload"
      />
    </div>
  );
}
