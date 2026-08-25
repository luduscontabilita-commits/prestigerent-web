/* I CONTI, SENZA DATABASE E SENZA RETE.
 *
 * Stanno qui e non dentro `azioni.ts` per un motivo pratico: un file
 * marcato `'use server'` puo' esportare SOLO funzioni asincrone, e queste
 * sono funzioni pure che si leggono (e all'occorrenza si provano) da sole.
 */

/* Regiondo ragiona in ora locale di Roma e non lo dice: `created_at` vale
   "2026-08-25 17:41:39" senza fuso. Trattarla come UTC sposta ogni
   prenotazione due ore avanti in estate -- abbastanza da far comparire nel
   riquadro "prenotata poco fa" una prenotazione del futuro, e abbastanza
   da spostare nel giorno sbagliato quelle fatte dopo le 22. */
const FUSO = 'Europe/Rome';

function offsetMinuti(istante: Date): number {
  const parti = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(istante);
  const p = Object.fromEntries(parti.map((x) => [x.type, x.value])) as Record<string, string>;
  /* alcune versioni di ICU scrivono "24" per la mezzanotte con hour12:false */
  const ore = Number(p.hour) % 24;
  const comeUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), ore, Number(p.minute), Number(p.second));
  return (comeUtc - istante.getTime()) / 60000;
}

/** "2026-08-25 17:41:39" (ora di Roma) -> ISO in UTC. */
export function daRomaAIso(locale: string): string | null {
  const m = locale?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const finto = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  /* Due passaggi: il primo offset e' calcolato su un istante sbagliato di
     un'ora o due, e nelle due notti del cambio d'ora sbaglierebbe segno.
     Ricalcolarlo sull'istante corretto chiude il cerchio. */
  let vero = finto - offsetMinuti(new Date(finto)) * 60000;
  vero = finto - offsetMinuti(new Date(vero)) * 60000;
  return new Date(vero).toISOString();
}

/** La data di OGGI a Roma, "2026-08-25". E' il giorno che intende Regiondo
 *  quando dice `created_at`, quindi e' quello con cui si confronta. */
export function oggiARoma(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** La data di `quanti` giorni prima (o dopo, con numero negativo). */
export function giorniPrima(data: string, quanti: number): string {
  const d = new Date(data + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - quanti);
  return d.toISOString().slice(0, 10);
}

/* ─── il paese dal prefisso telefonico ────────────────────────────────
 *
 * Il numero di telefono NON si salva: e' un dato personale che finirebbe
 * in chiaro nel browser di chiunque passi dal sito, visto che la tabella
 * si legge senza autenticazione. Del numero resta solo la nazione, che e'
 * l'unica cosa che serve al riquadro ("Sarah from the United States").
 *
 * I prefissi si provano dal piu' lungo al piu' corto: +1868 e' Trinidad,
 * ma se si prova +1 per primo diventa Stati Uniti e nessuno se ne accorge.
 *
 * Limite noto e non risolvibile da qui: il Canada condivide +1 con gli
 * Stati Uniti. Distinguerli richiederebbe la tabella dei prefissi di zona,
 * quindi i canadesi risultano americani. E' l'errore piu' piccolo
 * disponibile: l'alternativa e' non dire il paese a nessuno dei due.
 */
const PAESI: Record<string, string> = {
  '+1242': 'the Bahamas', '+1246': 'Barbados', '+1264': 'Anguilla', '+1268': 'Antigua',
  '+1284': 'the British Virgin Islands', '+1345': 'the Cayman Islands', '+1441': 'Bermuda',
  '+1473': 'Grenada', '+1649': 'the Turks and Caicos', '+1664': 'Montserrat',
  '+1721': 'Sint Maarten', '+1758': 'Saint Lucia', '+1767': 'Dominica',
  '+1784': 'Saint Vincent', '+1809': 'the Dominican Republic', '+1829': 'the Dominican Republic',
  '+1849': 'the Dominican Republic', '+1868': 'Trinidad and Tobago', '+1869': 'Saint Kitts',
  '+1876': 'Jamaica',
  '+1': 'the United States',
  '+20': 'Egypt', '+27': 'South Africa',
  '+30': 'Greece', '+31': 'the Netherlands', '+32': 'Belgium', '+33': 'France',
  '+34': 'Spain', '+36': 'Hungary', '+39': 'Italy',
  '+40': 'Romania', '+41': 'Switzerland', '+43': 'Austria', '+44': 'the UK',
  '+45': 'Denmark', '+46': 'Sweden', '+47': 'Norway', '+48': 'Poland', '+49': 'Germany',
  '+51': 'Peru', '+52': 'Mexico', '+53': 'Cuba', '+54': 'Argentina', '+55': 'Brazil',
  '+56': 'Chile', '+57': 'Colombia', '+58': 'Venezuela',
  '+60': 'Malaysia', '+61': 'Australia', '+62': 'Indonesia', '+63': 'the Philippines',
  '+64': 'New Zealand', '+65': 'Singapore', '+66': 'Thailand',
  '+7': 'Russia',
  '+81': 'Japan', '+82': 'South Korea', '+84': 'Vietnam', '+86': 'China',
  '+90': 'Turkey', '+91': 'India', '+92': 'Pakistan', '+94': 'Sri Lanka', '+98': 'Iran',
  '+212': 'Morocco', '+213': 'Algeria', '+216': 'Tunisia', '+218': 'Libya',
  '+230': 'Mauritius', '+233': 'Ghana', '+234': 'Nigeria', '+254': 'Kenya',
  '+255': 'Tanzania', '+256': 'Uganda', '+260': 'Zambia', '+263': 'Zimbabwe',
  '+351': 'Portugal', '+352': 'Luxembourg', '+353': 'Ireland', '+354': 'Iceland',
  '+355': 'Albania', '+356': 'Malta', '+357': 'Cyprus', '+358': 'Finland',
  '+359': 'Bulgaria', '+370': 'Lithuania', '+371': 'Latvia', '+372': 'Estonia',
  '+373': 'Moldova', '+374': 'Armenia', '+375': 'Belarus', '+376': 'Andorra',
  '+377': 'Monaco', '+378': 'San Marino', '+380': 'Ukraine', '+381': 'Serbia',
  '+382': 'Montenegro', '+385': 'Croatia', '+386': 'Slovenia', '+387': 'Bosnia',
  '+389': 'North Macedonia', '+420': 'Czechia', '+421': 'Slovakia', '+423': 'Liechtenstein',
  '+501': 'Belize', '+502': 'Guatemala', '+503': 'El Salvador', '+504': 'Honduras',
  '+505': 'Nicaragua', '+506': 'Costa Rica', '+507': 'Panama', '+509': 'Haiti',
  '+591': 'Bolivia', '+593': 'Ecuador', '+595': 'Paraguay', '+598': 'Uruguay',
  '+673': 'Brunei', '+679': 'Fiji',
  '+852': 'Hong Kong', '+853': 'Macau', '+855': 'Cambodia', '+856': 'Laos',
  '+880': 'Bangladesh', '+886': 'Taiwan',
  '+960': 'the Maldives', '+961': 'Lebanon', '+962': 'Jordan', '+964': 'Iraq',
  '+965': 'Kuwait', '+966': 'Saudi Arabia', '+968': 'Oman', '+971': 'the UAE',
  '+972': 'Israel', '+973': 'Bahrain', '+974': 'Qatar', '+975': 'Bhutan',
  '+976': 'Mongolia', '+977': 'Nepal', '+994': 'Azerbaijan', '+995': 'Georgia',
  '+998': 'Uzbekistan',
};

/* Ordinati una volta sola all'avvio, non a ogni prenotazione: qui dentro
   passano quasi duemila numeri per aggiornamento. */
const PREFISSI = Object.keys(PAESI).sort((a, b) => b.length - a.length);

export function paeseDaTelefono(tel: string | null | undefined): string | null {
  if (!tel) return null;
  let n = String(tel).replace(/[^\d+]/g, '');
  if (n.startsWith('00')) n = '+' + n.slice(2);
  if (!n.startsWith('+')) return null;
  for (const p of PREFISSI) if (n.startsWith(p)) return PAESI[p];
  return null;
}

/* ─── il nome, tagliato prima di entrare nel database ─────────────────
 *
 * L'anonimizzazione si fa QUI, alla scrittura, non alla lettura: se il
 * cognome intero entra nella tabella, prima o poi qualcuno lo mostra --
 * e nel frattempo e' comunque leggibile da chiunque, perche' la tabella e'
 * pubblica in lettura. Quello che non e' mai stato salvato non puo'
 * uscire per sbaglio.
 */
export function iniziale(cognome: string | null | undefined): string | null {
  const c = (cognome ?? '').trim();
  if (!c) return null;
  return c.charAt(0).toUpperCase();
}

/** Solo la prima parola del nome.
 *
 *  Non e' pignoleria: su 150 prenotazioni vere quattro clienti scrivono
 *  tutto dentro il campo "nome" -- "Evellyn Camargo Antunes da Silva" --
 *  e il cognome entrerebbe nel database dalla porta sbagliata, aggirando
 *  la regola che il campo `iniziale` doveva far rispettare. Chi si chiama
 *  "Maria Teresa" diventa "Maria", che e' comunque un nome giusto: il
 *  danno e' zero, quello dell'alternativa no. */
export function soloNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}

/* ─── il riassunto del calendario ─────────────────────────────────────
 *
 * Sopra questa capienza il prodotto non ha un limite vero: i transfer
 * privati sono dichiarati con ventun milioni di posti. Scrivere "196 posti
 * rimasti" e' inutile, scrivere "2.999.997 posti rimasti" e' ridicolo, e
 * la scarsita' li' semplicemente non esiste: `posti_prima` resta nullo e
 * la pagina non dice niente invece di dire una cosa che si smonta da sola.
 */
export const SENZA_LIMITE = 200;

export type GiornoLibero = { data: string; capienza: number; liberi: number };

export type RiassuntoDisponibilita = {
  esaurite_su_3: number;
  prima_libera: string | null;
  posti_prima: number | null;
  esaurite_30gg: number;
  date_totali_30gg: number;
};

export function riassumiCalendario(giorni: GiornoLibero[], oggi: string): RiassuntoDisponibilita {
  /* Il calendario arriva anche con i giorni passati: contarli fra le date
     "esaurite" farebbe sembrare pieno un tour che semplicemente e' gia'
     partito. */
  const futuri = giorni.filter((g) => g.data >= oggi).sort((a, b) => (a.data < b.data ? -1 : 1));
  const limite = giorniPrima(oggi, -29);
  const trenta = futuri.filter((g) => g.data <= limite);
  const prima = futuri.find((g) => g.liberi > 0) ?? null;

  return {
    esaurite_su_3: futuri.slice(0, 3).filter((g) => g.liberi === 0).length,
    prima_libera: prima?.data ?? null,
    posti_prima: prima && prima.capienza > 0 && prima.capienza <= SENZA_LIMITE ? prima.liberi : null,
    esaurite_30gg: trenta.filter((g) => g.liberi === 0).length,
    date_totali_30gg: trenta.length,
  };
}
