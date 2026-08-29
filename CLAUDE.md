# prestigerent-web — il sito di Prestige Rent

Next.js 16 + React 19 su Vercel, Supabase per i contenuti, **Regiondo come
unica fonte dei prezzi**. Online su `prestigerent.com` dal **28/08/2026**,
al posto del WordPress.

---

## Le regole che non si discutono

**1. Niente in locale: si compila e si pubblica solo su Vercel.**
Niente `next build`, niente `next dev`, niente localhost, niente `vercel`
da riga di comando. Si fa `git push` e compila Vercel.

🔴 **A pubblicare e' `.github/workflows/deploy.yml`, NON il collegamento
nativo fra Vercel e GitHub.** Quel collegamento non c'e': se interroghi
l'API di Vercel, `link` sul progetto risulta `null`, ed **e' normale**.
Non concluderne che un push non costruisca niente -- l'errore e' gia'
stato fatto il 29/08/2026, ed e' costato una mattina di deploy dal CLI
raddoppiati, piu' l'installazione di un'app GitHub che non serviva.
Per sapere se un push ha pubblicato si guardano le Actions:
`https://github.com/luduscontabilita-commits/prestigerent-web/actions`,
oppure `curl -s https://api.github.com/repos/luduscontabilita-commits/prestigerent-web/actions/runs?per_page=3`. Non e' una
preferenza: il CLI di Vercel su questa macchina si pianta senza stampare
una riga e lascia deploy in stato UNKNOWN, e un `next build` locale crea
`.next` che poi il CLI prova a caricare. Se serve verificare qualcosa, si
verifica **sull'indirizzo pubblicato**, con `curl`.

**2. Le URL non cambiano.** `/tour/nome-tour/` e' identico a quello di
WordPress, carattere per carattere: sono 124 pagine con anni di
posizionamento. Per questo l'inglese sta alla radice e solo le altre
lingue hanno il prefisso (`/es/tour/...`) — vedi `src/middleware.ts`.

**3. I prezzi non si scrivono a mano, mai.** Stanno su Regiondo e si
leggono da li' (`src/lib/regiondo.ts`). Sul sito vecchio la stessa
informazione viveva in tre copie discordanti — landing, pagina WordPress,
scheda Regiondo — e nessuna era aggiornata. Se un prezzo appare in una
tabella di Supabase, e' un bug.

**4. RLS accesa nella stessa migrazione che crea la tabella.** La chiave
pubblicabile finisce nel browser: senza policy, chiunque legge tutto.

**5. Niente segreti nei file versionati.** `.env*` e' gitignorato. Mai un
token dentro l'URL di un remote git.

**6. I DNS non si toccano senza permesso esplicito, ogni volta.**

---

## 🔴 Da fare, in ordine di urgenza

| | cosa | perche' |
|---|---|---|
| 1 | **Vercel: passare da Hobby a Pro** ($20/mese) | Il piano Hobby vieta l'uso commerciale. Vercel puo' sospendere il progetto senza preavviso, e sul gratis non c'e' supporto. C'e' anche il tetto di 100 GB di banda |
| 2 | **Rimettere privato il repo GitHub**, poi `REPO_PUBLIC=false` su Vercel | Era pubblico solo per collegare Vercel senza inviti. Prima di renderlo privato: verificare che Vercel mantenga l'accesso, altrimenti i deploy si fermano |
| 3 | cPanel: instradamento posta da "locale" a "remoto" | Vedi la sezione Posta |

---

## Dove sta cosa

| | |
|---|---|
| Supabase | `prestigerent-web` — `oeipsfnbpaqkmwrxtcrn` (eu-west-1) |
| Regiondo | provider `PR193`, shop `prestigerent.regiondo.com` |
| Vercel | account `traliccioelettrico`, team `traliccioelettrico-wqs-projects` |
| Grafica | `src/styles/landing.css` — importata dalla landing Siena, gia' collaudata su traffico a pagamento. Non riscriverla |
| Lingue | `src/lib/locales.ts` — inglese alla radice |
| GTM | `GTM-TL7VV3RL`, caricato solo su `prestigerent.com` |

---

## Indicizzazione

Il sito e' visibile a Google: `SITE_NOINDEX=false`, nessun `X-Robots-Tag`
su nessun tipo di pagina, `robots.txt` con l'elenco dei bot (compresi
quelli delle AI, ammessi apposta), `sitemap.xml` con 114 URL.

**Due eccezioni volute:**

- **`/lp/*`** — le landing degli annunci, servite dal vecchio host. Hanno
  `X-Robots-Tag: noindex, nofollow` **sempre**, anche a sito pubblicato:
  dicono le stesse cose delle schede tour e senza noindex si
  contenderebbero la stessa ricerca. Il noindex non tocca gli annunci,
  che portano traffico comunque.
- **`legacy.prestigerent.com`** — le pagine hanno il `canonical` che punta
  a `prestigerent.com`, quindi Google le attribuisce al dominio vero. La
  home rimanda al dominio, `/myb/` e `/mp/` hanno noindex propri.

Il vecchio WordPress aveva una pagina
`/tour/siena-san-gimignano-...-landing/` indicizzabile con canonical su se
stessa, che si mangiava la scheda tour vera: ora e' un 308 verso la
scheda, il problema si e' chiuso da solo col passaggio.

---

## Tracciamento e consenso

**Il consenso e' fatto in casa** (`src/components/Consenso.tsx`, e
`lp/js/consenso.js` per le landing). Ha sostituito Cookiebot, la cui prova
gratuita e' scaduta il 21/08/2026 negando ogni consenso in Europa: il 59%
della spesa pubblicitaria finiva in una zona dove le conversioni non si
potevano registrare.

La zona la decide **Google, non il fuso orario del browser**: si legge
`google_tag_data.ics.entries.ad_storage.default`, che e' il segnale basato
sull'IP. Solo `default`, mai `update`.

**Il dataLayer parla sempre, GTM ascolta solo in produzione.** Gli eventi
si scrivono su qualunque dominio; il contenitore si carica solo su
`prestigerent.com`. Con `?prova=1` si accende anche altrove, per una
visita sola. I tag di conversione (Google Ads, pixel Meta) stanno **dentro
GTM**, non nel codice del sito: per questo nei bundle non si trovano.

---

## Il modulo di richiesta

Un solo componente (`ModuloRichiesta`) usato ovunque, in due modi:

- **in fondo a ogni pagina**, dentro `ContactSection`;
- **nel popup "Quick Request"**, un `<dialog>` che vive una volta sola nel
  layout. Chi vuole aprirlo lancia l'evento `pr-richiesta-apri`. Prima era
  un link a `/#contact`, cioe' un salto alla home: chi lo premeva da una
  scheda tour perdeva la pagina.

Il campo si chiama **"Service"**, non "Tour": il modulo sta anche sulle
pagine dei transfer, e un transfer per l'aeroporto non e' un tour. Arriva
gia' compilato — nome del tour sulle schede, titolo sulle categorie,
"Contact page" sui contatti — e finisce nell'oggetto dell'email.

---

## La posta

**Gli MX puntano a Microsoft 365.** Ma l'hosting Serverplan e' configurato
come se la posta fosse sua, con indirizzo predefinito
`":fail: No Such User Here"`: **quel server non riesce a mandare un'email
a nessun indirizzo `@prestigerent.com`**. E' quasi certamente il motivo
per cui le notifiche dei moduli di WordPress non sono mai arrivate a
nessuno — non e' un guasto recente, e' sempre stato cosi'.

Il sito nuovo manda da Microsoft, non dall'hosting:

    SMTP_HOST=smtp.office365.com   PORT=587 (STARTTLS, requireTLS)
    SMTP_USER=usa@prestigerent.com   RICHIESTE_A=usa@prestigerent.com

Mittente e destinatario coincidono: la consegna resta dentro Microsoft.
Codice in `src/lib/posta.ts`, chiamato da `src/app/api/richieste/route.ts`.
Provato dal vivo: l'invio parte in ~2,9 secondi.

---

## Il vecchio host, che serve ancora

`legacy.prestigerent.com` (86.107.36.121) continua a servire, attraverso i
rewrite in `next.config.ts`:

| | |
|---|---|
| `/lp/*.html` | le landing degli annunci — **3.977 click negli ultimi 30 giorni** |
| `/myb/` | i biglietti dei clienti |
| `/mp/` | i meeting point |
| `/wp-content/uploads/**` | le immagini storiche |

Verificato il giorno del passaggio: rispondono tutte, con lo stesso peso
al byte. **Non si spegne quel server** finche' queste quattro cose non
sono state portate altrove.

---

## Il limite di Regiondo sulle lingue

Provato uno per uno: il widget accetta `en, es, pt, de, ja, zh` ma
**rifiuta russo e arabo**. Su quelle due lingue la pagina e' tradotta e il
solo calendario resta in inglese. Va detto al lettore, non nascosto.

## Stato dei tour

87 righe in `tours`, **49 con prodotto Regiondo agganciato**, 38 senza. Di
questi 38 alcuni il prodotto ce l'hanno davvero e non era mai stato
montato sul sito (`wine-experience-in-tuscany` -> `T-PR193-210790`,
`private-tour-siena-and-san-gimignano` -> `T-PR193-210791`). Vanno
agganciati quando arriva l'export completo dal pannello Regiondo.
