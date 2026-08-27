import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEFAULT_LOCALE, getLocale, isLocale, LOCALES } from '@/lib/locales';
import { ogDiBase, TWITTER } from '@/lib/og';
import { SITE } from '@/lib/schema';
import { NoindexBadge } from '@/components/NoindexBadge';
import { Header } from '@/components/Header';
import { votiPerTour } from '@/lib/recensioni';
import { ultimePrenotazioni } from '@/lib/riprova';
import { ProvaSociale } from '@/components/ProvaSociale';
import { supabase } from '@/lib/supabase';
import { SEZIONI } from '@/lib/menu';
import { testo } from '@/lib/prosa';
import { Footer } from '@/components/Footer';
import { Consenso } from '@/components/Consenso';
import { Tracciamento } from '@/components/Tracciamento';
import '@/styles/landing.css';
import '@/styles/home.css';
import '@/styles/theme.css';

/* 🔴 ERA UN OGGETTO FISSO, ORA E' UNA FUNZIONE: SERVE LA LINGUA.
 *
 * `og:locale` deve dire in che lingua e' la pagina, e la lingua sta nei
 * params -- che a un `export const metadata` non arrivano. Il titolo e le
 * icone restano identici: cambia solo il modo di consegnarli.
 *
 * 🔴 `metadataBase` MANCAVA, e non era innocuo. Senza, Next risolve ogni
 * indirizzo relativo dei metadata contro `http://localhost:3000` (o, su
 * Vercel, contro l'hostname del deploy di prova): un'anteprima che punta
 * a localhost non si apre a nessuno. Qui c'e' scritto una volta sola che
 * la casa e' prestigerent.com.
 *
 * L'Open Graph di base sta QUI e non nelle pagine perche' e' l'unico
 * punto che le attraversa tutte e 123. Titolo e descrizione li mette ogni
 * pagina da se': vedi la nota lunga in src/lib/og.ts. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE),
    title: 'Prestige Rent — Tours & Transfers in Italy',
    /* Il marchio tondo, lo stesso delle landing e dell'intestazione: e' il
       segno con cui si riconosce la scheda fra venti aperte. */
    icons: {
      icon: 'https://prestigerent.com/lp/img/logo-prestige.png',
      apple: 'https://prestigerent.com/lp/img/logo-prestige.png',
    },
    openGraph: ogDiBase(isLocale(locale) ? locale : DEFAULT_LOCALE),
    twitter: TWITTER,
  };
}

/* Le otto lingue si generano tutte in anticipo: sono poche e fisse. */
export function generateStaticParams() {
  return LOCALES.map((l) => ({ locale: l.code }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const info = getLocale(locale);
  /* I punteggi per il menu: una lettura sola, non una per voce.
     Il menu sta su ogni pagina del sito. */
  const inRilievo = SEZIONI.flatMap((s) => s.evidenza ?? []);
  const avvisi = await ultimePrenotazioni(25);
  const [voti, schede] = await Promise.all([
    votiPerTour(),
    supabase
      .from('tours')
      .select('slug, tour_content(locale, blocks)')
      .in('slug', inRilievo.length ? inRilievo : ['-']),
  ]);

  /* Foto e nome dei tour in evidenza nel menu: si leggono qui, una volta,
     e non dentro il componente -- il menu e' su ogni pagina del sito. */
  const foto: Record<string, string> = {};
  const nomi: Record<string, string> = {};
  for (const r of (schede.data ?? []) as unknown as {
    slug: string;
    tour_content?: { locale: string; blocks: Record<string, unknown> }[];
  }[]) {
    const c = r.tour_content?.find((x) => x.locale === locale) ?? r.tour_content?.[0];
    const b = (c?.blocks ?? {}) as { name?: string; gallery?: { src: string }[]; images?: string[] };
    const src = b.gallery?.[0]?.src ?? b.images?.[0];
    if (src) foto[r.slug] = src;
    if (b.name) nomi[r.slug] = testo(b.name);
  }

  /* dir="rtl" sull'arabo non e' un dettaglio: ribalta l'intero impaginato,
     compresi i margini e l'ordine delle colonne. Va messo qui, sull'<html>,
     perche' il browser lo propaghi a tutto. */
  return (
    <html lang={info.htmlLang} dir={info.dir}>
      <head>
        {/* IL TEMA, DECISO PRIMA DEL DISEGNO.

            Deve stare qui, inline e prima di tutto il resto. Se il tema si
            applicasse da React, chi ha scelto lo scuro vedrebbe prima un
            lampo di pagina bianca -- di notte e' fastidioso sul serio, e
            sembra un difetto del sito.

            La regola: vince la scelta salvata; se non c'e', si segue
            l'impostazione del sistema operativo. Tutto dentro un try,
            perche' in navigazione privata localStorage puo' lanciare
            un'eccezione invece di rispondere: in quel caso si resta sul
            chiaro, che e' il tema giusto per la maggioranza dei visitatori
            di giorno. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('pr-theme');" +
              "if(!t)t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';" +
              "document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        {/* Il CSS ereditato dalla landing chiama Fraunces e Manrope per nome.
            Senza questo collegamento nessuno li scarica e tutta la pagina
            ripiega sul font di sistema: il testo resta leggibile ma la
            grafica sembra "spoglia". Sono gli stessi identici pesi della
            landing, non un'approssimazione. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,560;1,9..144,640&family=Manrope:wght@500;600;800&display=swap"
        />
      </head>
      <body>
        {/* IL CONSENSO, PRIMA DEL TRACCIAMENTO.

            Non e' un dettaglio d'ordine: `gtag('consent','default',...)`
            deve essere gia' nel dataLayer quando gtm.js parte. Se GTM
            arrivasse per primo leggerebbe "nessun segnale" e i tag
            partirebbero comunque -- il banner ci sarebbe, ma non
            servirebbe a niente, e ogni visitatore europeo verrebbe
            profilato dal primo millisecondo. Il sito WordPress che
            questo sostituisce il consenso ce l'ha e funziona: andare
            online senza sarebbe una regressione, non una mancanza.

            `beforeInteractive` contro l'`afterInteractive` di
            <Tracciamento /> e' cio' che rende l'ordine garantito e non
            una corsa fra due script. */}
        <Consenso />

        {/* IL TRACCIAMENTO, MONTATO QUI E NON NELLE PAGINE.

            Sta nel layout perche' questo componente e' l'unico punto che
            attraversa tutte le pagine pubbliche di tutte e otto le lingue:
            montandolo qui il contenitore GTM si carica una volta sola e
            l'ascoltatore dei clic si registra una volta sola. Se stesse in
            una pagina, cambiando pagina Next lo smonterebbe e rimonterebbe,
            e ogni volta ripartirebbe una `gtm.js` in piu'.

            Sta come primo figlio del <body> e non dentro <head> per due
            motivi. Primo: e' un componente client con `useEffect`, e nel
            App Router dentro <head> ci vanno solo tag statici. Secondo:
            `next/script` con `afterInteractive` non stampa niente nell'HTML,
            inietta lo script da solo dopo l'idratazione -- quindi la
            posizione nell'albero non cambia quando parte, ma essere il primo
            figlio garantisce che il dataLayer esista prima che il resto
            dell'interfaccia cominci a parlarci.

            Nota: si accende da solo solo su prestigerent.com. Su
            prestigerent-web.vercel.app resta spento apposta, per non
            sporcare i dati delle campagne. Non e' un bug da "sistemare". */}
        <Tracciamento />
        <Header locale={locale} voti={voti} foto={foto} nomi={nomi} />
        {children}
        <Footer locale={locale} />
        {/* I riquadri delle prenotazioni vere. Le righe passano cosi' come
            sono e il link se lo costruisce il componente: ogni minuto ne
            rilegge di nuove da /api/prenotazioni, e se il collegamento si
            componesse qui quelle nuove resterebbero senza. La lingua serve
            proprio a quello -- il link deve restare nella lingua che si
            sta leggendo. */}
        <ProvaSociale avvisi={avvisi} locale={locale} />
        <NoindexBadge />
      </body>
    </html>
  );
}
