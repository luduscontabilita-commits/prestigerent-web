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

- **`/lp/*`** — le landing degli annunci, ora servite da Vercel da
  `public/lp/` (prima stavano sul vecchio host). Hanno
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
- ~~**nel popup "Quick Request"**~~ — **tolto il 03/09/2026.** Il pulsante
  stava nella colonna della scheda tour, sotto il calendario, e si
  sovrapponeva alla striscia delle carte di credito aggiunta lo stesso
  giorno. La colonna la richiesta ce l'aveva comunque doppia (`Diretto`
  col numero e WhatsApp), e il modulo intero e' in fondo a ogni pagina.
  Tolto il pulsante nessuno poteva piu' aprire il `<dialog>`, quindi sono
  stati tolti anche il montaggio nel layout e `RichiestaModale.tsx`.

Il campo si chiama **"Service"**, non "Tour": il modulo sta anche sulle
pagine dei transfer, e un transfer per l'aeroporto non e' un tour. Arriva
gia' compilato — nome del tour sulle schede, titolo sulle categorie,
"Contact page" sui contatti — e finisce nell'oggetto dell'email.

---

## Le foto dei tour

**Non si mostra `blocks.images` cosi' com'e'.** Su WordPress le gallerie
erano state pareggiate a quattro foto tappando i buchi con le stesse
immagini per tutti: le Mercedes su fondo bianco stanno su 44 tour su 87,
`TUSCANY-HILLTOP-WINERY.jpg` su 42. Il risultato erano vigne toscane sulle
pagine dei transfer per Venezia e per Roma.

Il filtro sta in **`src/lib/galleria.ts`** e lo usano tutti e quattro i
posti che leggono quelle foto (scheda, home, categorie, vetrina del menu).
La regola e' a due livelli: i **mezzi e gli sfondi** escono sempre; una
foto di **luogo** resta se il luogo e' nominato da qualche parte nella
pagina, itinerario compreso; una **vigna generica** resta solo se il vino
e' nel *titolo* del tour. Provata su tutti gli 87 prima di scriverla: 156
foto tolte, 285 tenute, nessun tour resta senza foto.

🔴 Se un tour perde una foto che doveva tenere, **non si tocca il
database**: si aggiunge il posto in `LUOGHI`, o lo si nomina nella
descrizione del tour.

---

## La gallery con tag — le foto delle guide

Una **seconda** striscia, in fondo alle pagine, con le foto delle giornate
caricate da chi accompagna gli ospiti. Non c'entra niente con la sezione
qui sopra: quelle sono le foto del prodotto in cima alle schede
(`PhotoStrip`, `/admin/foto`), queste sono le giornate vere
(`PageGallery`, `/admin/gallery`). Entrambi i pannelli lo dicono in
interfaccia, perché chi cerca «le foto» non sa quale delle due gli serve.

🔴 **È spenta.** `gallery_settings.galleries_enabled = false`: il codice è
in produzione e non produce un byte di HTML per nessun visitatore finché
la proprietà non accende l'interruttore da `/admin/gallery/impostazioni/`.
Accendendolo il pannello chiede conferma e dice su quante pagine
comparirà.

**Come sta insieme: `GALLERY_AGENT.md`** nella radice — file, regole,
scelte che si discostano dal piano e perché, cosa fare la prima volta,
cosa guardare quando qualcosa non va. La guida per chi carica dal telefono
è `docs/gallery-guida-admin.md`, in italiano e senza tecnicismi.

Le tre cose da sapere senza aprire niente:

- **103 pagine nel registro**, non 124: per decisione della proprietà del
  26/09/2026 sono escluse tutte le pagine il cui indirizzo contiene
  `/destinations/` o `/transfers/`. Le **schede** dei singoli transfer
  restano dentro, perché stanno sotto `/tour/`.
- **Chi carica non approva.** Si usano i ruoli che c'erano già: `admin` fa
  tutto, `guida` carica e tagga. Una foto non approvata sta in un bucket
  **privato**, e che non possa finire in quello pubblico è un vincolo del
  database, non una convenzione del codice.
- **Il ruolo si controlla adesso, in tutto `/admin`.** Fino al 26/09/2026
  il codice non guardava mai `profili.ruolo`: chiunque avesse un profilo
  entrava in SEO, foto dei tour e numeri di Regiondo. Ora ogni pagina
  chiama `soloGestione()` e **ogni server action** chiama `chiAgisce()` —
  perché una action non passa da nessuna pagina e da nessun layout.

🔴 **IL CONFINE SERVER/CLIENT HA GIA' ROTTO IL PANNELLO TRE VOLTE.**
Quando un Server Component importa da un modulo client -- e tutto
`@mantine/core` lo e' -- non riceve i componenti veri: riceve dei
**riferimenti**, che Next sostituisce nel browser. Un riferimento non
porta con se' niente di quello che stava attaccato all'originale. Le tre
forme viste finora, tutte con lo stesso esito (500 su ogni pagina, o su
una sola):
  1. una funzione normale esportata da un file `'use client'` e chiamata
     da un Server Component (`vociPerRuolo()`) -- risolto spostandola in
     `src/lib/menu-admin.ts`;
  2. un componente passato come proprieta' (`component={Link}` su una
     `Card`) -- risolto mettendo il `Link` fuori e la `Card` dentro;
  3. la **notazione col punto**: `Table.Thead`, `Table.ScrollContainer`
     diventano `undefined`, e React rende `undefined` come componente
     (errore #130). Risolto spostando la tabella in
     `ElencoFotoTour.tsx`, che e' client.

**La regola:** in un Server Component solo componenti Mantine SEMPLICI
(`Alert`, `Card`, `Text`, `Badge`). Appena serve il punto, quel pezzo
va in un componente client, che riceve solo dati serializzabili.
`tsc` non vede niente di tutto questo: i tipi sono giusti.

🔴 **`npm run prova:pannello` entra e prova il pannello DA DENTRO.**
Il 26/09/2026 tutte e quindici le pagine hanno risposto 500 a chi era
entrato, e la verifica non se n'era accorta: si controllavano le pagine
con `curl` **senza sessione**, si vedeva il `307 -> /admin/entra/` e si
scriveva «chiuso, giusto». Ma cosi' il codice che sta **dopo** l'accesso
non lo esegue mai nessuno — ed era li' tutto il guasto, trovato dalla
proprieta' usando il pannello.
Lo script fa l'accesso come un browser (token da Supabase, cookie nel
formato di `@supabase/ssr`) e chiede ogni pagina. Non esegue JavaScript:
prova il rendering sul **server**, cioe' proprio gli errori di confine
fra Server e Client Component che `tsc` non vede. **Va lanciato dopo ogni
push che tocca `/admin`.**

`npm test` prova la logica pura (86 test, nessuna rete, nessun `.next`):
la regola di visibilità, l'ordinamento, le proporzioni, il registro e la
lettura dell'EXIF. Tutto il resto si verifica con `curl` sull'indirizzo
pubblicato, come dice la regola 1.

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
| ~~`/lp/*.html`~~ | **spostate su Vercel il 02/09/2026** — i file stanno in `public/lp/`, i nove video su Supabase Storage (`media/lp/video/`). Il vecchio server non le serve più |
| `/myb/` | i biglietti dei clienti |
| `/mp/` | i meeting point |
| `/wp-content/uploads/**` | le immagini storiche |

Verificato il giorno del passaggio: rispondono tutte, con lo stesso peso
al byte. **Non si spegne quel server** finche' queste cose non sono state portate
altrove. Dal 02/09/2026 le landing non sono piu' fra queste: restano
`/myb/`, `/mp/`, `/wp-content/uploads/`, e — per decisione della
proprieta' — **`/booking/` e `/guest-albums/`, che restano li' e basta**.

🔴 **Le landing non si pubblicano piu' con `deploy.sh`.** I file veri
stanno in `public/lp/` e si pubblicano con `git push`. Lo script ora si
rifiuta di partire senza `FORZA=1`, perche' pubblicare da li' non darebbe
nessun errore e non cambierebbe niente: si lavorerebbe a vuoto.

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
