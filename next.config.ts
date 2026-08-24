import type { NextConfig } from 'next';

/* Finche' il sito nuovo e' in prova su nuovo-sito.prestigerent.com deve
 * restare FUORI da Google. Se venisse indicizzato, sarebbero 124 pagine
 * duplicate di quelle vive: Google dovrebbe scegliere quale delle due
 * mostrare, e nel dubbio ne penalizza entrambe. Si toglie SITE_NOINDEX il
 * giorno del passaggio, non prima.
 */
const noindex = process.env.SITE_NOINDEX !== 'false';

const nextConfig: NextConfig = {
  /* WordPress serve le pagine CON la barra finale: /tour/nome-tour/
     Next per default la toglie, e ogni indirizzo indicizzato risponderebbe
     308 invece di 200. Su 124 URL con anni di posizionamento non e' un
     dettaglio estetico: e' la regola numero uno della migrazione. */
  trailingSlash: true,

  images: {
    remotePatterns: [
      // le foto dei tour oggi stanno ancora su WordPress: si leggono da li'
      // finche' non sono state spostate su Supabase Storage
      { protocol: 'https', hostname: 'prestigerent.com' },
      { protocol: 'https', hostname: 'cdn.shortpixel.ai' },
      { protocol: 'https', hostname: 'oeipsfnbpaqkmwrxtcrn.supabase.co' },
    ],
  },
  /* I doppioni: due URL diverse per lo STESSO prodotto Regiondo.
     Non si cancellano -- esistono su WordPress da anni e sparire vorrebbe
     dire un 404 il giorno del passaggio -- si reindirizzano a quella buona
     con un 301, che e' anche il modo in cui si dice a Google quale delle due
     tenere. */
  async redirects() {
    return [
      {
        source: '/tour/siena-san-gimignano-the-tuscan-countryside-landing/',
        destination:
          '/tour/small-group-tour-to-siena-san-gimignano-and-the-tuscan-countryside-from-florence/',
        permanent: true,
      },
    ];
  },

  async headers() {
    if (!noindex) return [];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
};

export default nextConfig;
