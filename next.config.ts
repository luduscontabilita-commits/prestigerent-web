import type { NextConfig } from 'next';

/* Finche' il sito nuovo e' in prova su nuovo-sito.prestigerent.com deve
 * restare FUORI da Google. Se venisse indicizzato, sarebbero 124 pagine
 * duplicate di quelle vive: Google dovrebbe scegliere quale delle due
 * mostrare, e nel dubbio ne penalizza entrambe. Si toglie SITE_NOINDEX il
 * giorno del passaggio, non prima.
 */
const noindex = process.env.SITE_NOINDEX !== 'false';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // le foto dei tour oggi stanno ancora su WordPress: si leggono da li'
      // finche' non sono state spostate su Supabase Storage
      { protocol: 'https', hostname: 'prestigerent.com' },
      { protocol: 'https', hostname: 'cdn.shortpixel.ai' },
      { protocol: 'https', hostname: 'oeipsfnbpaqkmwrxtcrn.supabase.co' },
    ],
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
