import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, isLocale, LOCALES } from '@/lib/locales';
import { NoindexBadge } from '@/components/NoindexBadge';
import { Header } from '@/components/Header';
import { votiPerTour } from '@/lib/recensioni';
import { ultimePrenotazioni } from '@/lib/riprova';
import { ProvaSociale } from '@/components/ProvaSociale';
import { supabase } from '@/lib/supabase';
import { SEZIONI } from '@/lib/menu';
import { testo } from '@/lib/prosa';
import { Footer } from '@/components/Footer';
import '@/styles/landing.css';
import '@/styles/home.css';
import '@/styles/theme.css';

export const metadata: Metadata = {
  title: 'Prestige Rent — Tours & Transfers in Italy',
  /* Il marchio tondo, lo stesso delle landing e dell'intestazione: e' il
     segno con cui si riconosce la scheda fra venti aperte. */
  icons: {
    icon: 'https://prestigerent.com/lp/img/logo-prestige.png',
    apple: 'https://prestigerent.com/lp/img/logo-prestige.png',
  },
};

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
        <Header locale={locale} voti={voti} foto={foto} nomi={nomi} />
        {children}
        <Footer locale={locale} />
        {/* I riquadri delle prenotazioni vere. Il prefisso della lingua
            serve perche' il link deve restare nella lingua che si sta
            leggendo. */}
        <ProvaSociale
          avvisi={avvisi.map((a) => ({
            nome: a.nome,
            iniziale: a.iniziale,
            paese: a.paese,
            prodotto: a.prodotto,
            persone: a.persone,
            quando: a.quando,
            href: a.tour_slug
              ? (locale === 'en' ? '' : `/${locale}`) + `/tour/${a.tour_slug}/`
              : null,
          }))}
        />
        <NoindexBadge />
      </body>
    </html>
  );
}
