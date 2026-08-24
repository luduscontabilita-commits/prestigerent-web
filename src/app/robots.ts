import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/schema';

/* robots.txt secondo §4.3 del masterplan, con due adattamenti motivati.
 *
 * 1. NON-WWW. Il documento scriveva `www.prestigerent.com`, ma era un
 *    segnaposto: verificato il 24/08/2026, www risponde 301 verso non-www e
 *    il canonical della home dice `https://prestigerent.com/`. E' gia'
 *    deciso e gia' coerente; cambiare significherebbe 301 su 124 URL per
 *    guadagnare zero.
 *
 * 2. CRAWLER DI TRAINING CONSENTITI. §4.2: il consiglio diffuso e' "blocca
 *    il training, consenti la ricerca", ma nasce dall'economia degli editori
 *    che monetizzano il contenuto. Qui il contenuto e' materiale di vendita,
 *    e finire nei pesi del modello significa che l'AI sa chi e' Prestige Rent
 *    anche senza andarlo a cercare, in ogni lingua, per anni.
 *
 * Nota: robots.txt e' una richiesta cortese (RFC 9309), non un blocco. Chi
 * non lo rispetta va fermato a livello di server o WAF.
 */

const RICERCA_CLASSICA = ['Googlebot', 'Bingbot', 'Applebot', 'DuckDuckBot'];

// danno citazioni e traffico: sempre consentiti
const RICERCA_AI = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Amzn-SearchBot',
];

// consentiti per scelta strategica, vedi sopra
const TRAINING = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  const consentiti = [...RICERCA_CLASSICA, ...RICERCA_AI, ...TRAINING].map((userAgent) => ({
    userAgent,
    allow: '/',
  }));

  return {
    rules: [
      ...consentiti,
      // storico di non conformita' e costo di banda senza ritorno
      { userAgent: 'Bytespider', disallow: '/' },
      {
        userAgent: '*',
        allow: '/',
        // parametri di tracciamento: pagine identiche a URL diversi
        disallow: ['/*?utm_', '/*?fbclid', '/*?gclid'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
