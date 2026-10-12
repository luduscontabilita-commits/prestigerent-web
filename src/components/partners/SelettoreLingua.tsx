'use client';

import { SegmentedControl } from '@mantine/core';
import { COOKIE_LINGUA, type Lingua } from '@/lib/partners-testi';

/* IL SELETTORE EN / IT DELL'AREA PARTNER.
 *
 * Scrive la scelta nel cookie `partners_lang` (un anno, tutto il sito) e
 * ricarica la pagina: la lingua la legge il server
 * (src/lib/partners-lingua.ts), cosi' anche i testi delle pagine server e
 * i messaggi delle azioni cambiano insieme. Un ricaricamento vero e non
 * il router: e' una scelta che si fa una volta. */
export function SelettoreLingua({ lingua, size = 'xs' }: { lingua: Lingua; size?: 'xs' | 'sm' }) {
  return (
    <SegmentedControl
      size={size}
      radius="xl"
      value={lingua}
      aria-label="Language / Lingua"
      data={[
        { value: 'en', label: 'EN' },
        { value: 'it', label: 'IT' },
      ]}
      onChange={(v) => {
        document.cookie = `${COOKIE_LINGUA}=${v}; path=/; max-age=31536000; samesite=lax; secure`;
        window.location.reload();
      }}
    />
  );
}
