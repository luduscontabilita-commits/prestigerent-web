/* IL METEO DI FIRENZE E DEL CHIANTI, GIORNO PER GIORNO.
 *
 * Serve al calendario delle recensioni: accanto a ogni giorno si vede
 * che tempo faceva (o fara'). E serve alla singola riga, quando si
 * conosce la DATA DEL SERVIZIO: il tempo che conta e' quello del giorno
 * in cui il cliente ha fatto il tour, non quello in cui ha scritto.
 *
 * ── OPEN-METEO, E PERCHE' ─────────────────────────────────────────────
 * Gratis, senza chiave, senza registrazione, con storico e previsione
 * nella stessa chiamata (`past_days` fino a 92, `forecast_days` fino a
 * 16). Per un calendario che guarda un mese alla volta basta e avanza.
 * Il punto scelto e' Firenze: i tour partono da li' e il Chianti e' a
 * venti chilometri -- per dire «pioveva o c'era il sole» e' la stessa
 * cosa. Non si prende il meteo di ogni cantina.
 *
 * ── LA CACHE E' DI NEXT ───────────────────────────────────────────────
 * `next: { revalidate: 3600 }`: la risposta si tiene un'ora. Il meteo di
 * ieri non cambia, quello di oggi cambia poco, e il pannello si apre
 * dieci volte al giorno -- senza cache sarebbero dieci chiamate uguali.
 */

export type Meteo = {
  /** «AAAA-MM-GG» */
  giorno: string;
  /** codice WMO: 0 sereno ... 95 temporale */
  codice: number;
  max: number;
  min: number;
  /** millimetri di pioggia nel giorno */
  pioggia: number;
};

const FIRENZE = { lat: 43.7696, lon: 11.2558 };

/** Le parole e il simbolo per un codice WMO. Pochi gruppi, quelli che
 *  contano per un tour all'aperto: sereno, nuvole, pioggia, temporale,
 *  neve, nebbia. */
export function descriviMeteo(codice: number): { simbolo: string; testo: string } {
  if (codice === 0) return { simbolo: '☀️', testo: 'sereno' };
  if (codice <= 2) return { simbolo: '\u{1F324}️', testo: 'poco nuvoloso' };
  if (codice === 3) return { simbolo: '☁️', testo: 'coperto' };
  if (codice <= 48) return { simbolo: '\u{1F32B}️', testo: 'nebbia' };
  if (codice <= 57) return { simbolo: '\u{1F326}️', testo: 'pioviggine' };
  if (codice <= 67) return { simbolo: '\u{1F327}️', testo: 'pioggia' };
  if (codice <= 77) return { simbolo: '❄️', testo: 'neve' };
  if (codice <= 82) return { simbolo: '\u{1F326}️', testo: 'rovesci' };
  if (codice <= 86) return { simbolo: '\u{1F328}️', testo: 'rovesci di neve' };
  return { simbolo: '⛈️', testo: 'temporale' };
}

/**
 * Il meteo degli ultimi `indietro` giorni e dei prossimi `avanti`, come
 * mappa «AAAA-MM-GG» -> Meteo. Se Open-Meteo non risponde torna una
 * mappa vuota: il calendario si disegna lo stesso, solo senza tempo.
 */
export async function meteoGiorni(indietro = 92, avanti = 7): Promise<Map<string, Meteo>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${FIRENZE.lat}&longitude=${FIRENZE.lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=Europe%2FRome&past_days=${Math.min(92, indietro)}&forecast_days=${Math.min(16, avanti)}`;
  const mappa = new Map<string, Meteo>();
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return mappa;
    const j = (await r.json()) as {
      daily?: {
        time: string[];
        weather_code: (number | null)[];
        temperature_2m_max: (number | null)[];
        temperature_2m_min: (number | null)[];
        precipitation_sum: (number | null)[];
      };
    };
    const d = j.daily;
    if (!d) return mappa;
    d.time.forEach((giorno, i) => {
      const codice = d.weather_code[i];
      if (codice === null || codice === undefined) return;
      mappa.set(giorno, {
        giorno,
        codice,
        max: Math.round(d.temperature_2m_max[i] ?? 0),
        min: Math.round(d.temperature_2m_min[i] ?? 0),
        pioggia: Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
      });
    });
  } catch {
    /* niente meteo: non e' un errore del pannello */
  }
  return mappa;
}
