import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, isLocale, LOCALES } from '@/lib/locales';
import { NoindexBadge } from '@/components/NoindexBadge';
import '@/styles/landing.css';

export const metadata: Metadata = {
  title: 'Prestige Rent — Tours & Transfers in Italy',
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

  /* dir="rtl" sull'arabo non e' un dettaglio: ribalta l'intero impaginato,
     compresi i margini e l'ordine delle colonne. Va messo qui, sull'<html>,
     perche' il browser lo propaghi a tutto. */
  return (
    <html lang={info.htmlLang} dir={info.dir}>
      <body>
        {children}
        <NoindexBadge />
      </body>
    </html>
  );
}
