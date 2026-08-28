'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { bookingIsEnglishOnly, regiondoLocale } from '@/lib/locales';
import { identificativoClic } from '@/lib/clic';

/* Il calendario di Regiondo. E' lo stesso identico embed delle landing:
 * incassa lui, e l'evento `purchase` che manda la conversione a Google Ads
 * parte da qui. Non va sostituito con niente di fatto in casa.
 *
 * `strategy="lazyOnload"`: e' l'elemento piu' pesante della pagina e nessuno
 * prenota nel primo secondo di visita. Prima si carica il contenuto, poi lui.
 *
 * ── 🔴 IL `sub_id`: L'ULTIMO ANELLO CHE MANCAVA ────────────────────────
 * Tutto il resto c'era gia'. `Tracciamento.tsx` salva il `gclid` in
 * `localStorage` per novanta giorni (solo col consenso di marketing), e
 * il caricamento notturno sa gia' leggerlo da una prenotazione e mandarlo
 * a Google. Fra i due mancava UN ATTRIBUTO: nessuno diceva a Regiondo di
 * portarsi dietro quel valore, quindi `sub_id` tornava sempre vuoto e
 * l'attribuzione restava per somiglianza -- Google prende email e
 * telefono e cerca se quella persona ha cliccato. Funziona a volte.
 *
 * Con il `sub_id` smette di essere una ricerca: la prenotazione dice da
 * quale clic e' nata, ed e' esatta al 100% anche se Safari ha cancellato
 * ogni cookie e anche se il cliente ha pagato tre settimane dopo.
 *
 * Il prefisso di una lettera non e' un vezzo: `gclid` e `fbclid` si
 * assomigliano abbastanza da scambiarli, e un identificativo attribuito
 * alla rete sbagliata e' peggio di nessun identificativo. La convenzione
 * la impone `sorgenteDaSubId` in `conversioni.ts`, che scarta tutto
 * quello che non comincia per `g-` o `f-`.
 *
 * Si legge dentro `useEffect` e non durante il disegno: `localStorage`
 * sul server non esiste, e leggerlo prima farebbe divergere il primo
 * disegno dal secondo. Il widget parte con `lazyOnload`, cioe' molto
 * dopo: quando arriva, l'attributo c'e' gia'.
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

  /* Il clic che ha portato qui, se c'e' e se e' stato concesso di
     tenerlo. Google vince su Meta perche' e' la rete su cui si spende:
     `sub_id` e' un campo solo e non si possono mandare tutti e due. */
  const [sub, setSub] = useState<string | undefined>(undefined);
  useEffect(() => setSub(identificativoClic()), []);

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
        data-sub-id={sub}
      />

      <Script
        src="https://cdn.regiondo.net/js/integration/bookingwidget/bookingwidget.js"
        strategy="lazyOnload"
      />
    </div>
  );
}
