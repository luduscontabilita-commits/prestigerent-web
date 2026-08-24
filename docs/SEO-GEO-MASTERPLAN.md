# PRESTIGE RENT — MASTER PLAN SEO + GEO MULTILINGUA
### Documento operativo permanente. Da tenere in repo come `docs/SEO-GEO-MASTERPLAN.md` e referenziare da `CLAUDE.md`.

**Versione:** 1.0 — agosto 2026
**Owner:** Ing. Michele Mocciola
**Scope:** rifacimento sito prestigerent.com, architettura multilingua, motore di contenuti AI-assistito, posizionamento su motori generativi.

---

## 0. COME USARE QUESTO FILE (istruzioni per Claude Code)

Questo non è un articolo di blog. È la **costituzione del progetto**. Regole d'ingaggio:

1. **Prima di scrivere qualsiasi codice**, leggi §1 (contesto business) e §16 (anti-pattern). Molte scelte "tecnicamente corrette" sono sbagliate per questo business specifico.
2. **Non implementare tutto in una volta.** L'ordine dei layer (§4 → §14) è un ordine di dipendenza, non un menu. Il Layer 0 rotto rende inutile tutto il resto.
3. **Ogni volta che una sezione dice `[DECISIONE APERTA]`, fermati e chiedi a Michele.** Non scegliere di default.
4. **Ogni volta che una sezione dice `[VERIFICA]`, controlla la fonte primaria prima di implementare** (schema.org, documentazione Google, docs del provider). Questo documento è aggiornato ad agosto 2026 e il campo si muove ogni trimestre.
5. Quando aggiungi codice, aggiorna la sezione §18 (registro implementazione) in fondo a questo file.

---

## 1. CONTESTO BUSINESS — LEGGERE PRIMA DI TUTTO

Senza questo, si costruisce un sito SEO-perfetto che non cambia il conto economico.

| Fatto | Implicazione strategica |
|---|---|
| Fatturato ~3-4,5M€/anno, margine ~45% | C'è budget vero. Non serve fare economia sulla qualità editoriale. |
| ~95% del fatturato viene da OTA (≈70% Viator, ≈25% GetYourGuide) | **Il progetto non è "fare traffico". È spostare punti percentuali di mix da OTA a diretto.** Ogni punto percentuale spostato vale ~30-45k€ di fatturato a margine molto più alto. |
| Viator opera in perdita, sussidiata dal gruppo TripAdvisor | Non si compete sul prezzo con Viator. Si compete su **relazione diretta, flessibilità e fiducia**. |
| Le pagine Viator/GYG di Prestige oggi surclassano il sito proprio | **Prestige compete contro se stessa nella SERP e nelle risposte AI.** Questo è il problema numero uno ed è quasi assente dal documento di partenza. |
| Landing statiche sotto `/lp/`, hosting Serverplan, PHP 7.4 EOL | Debito tecnico. Non ci si costruisce sopra un motore multilingua. |
| Esistono 10 domini satellite per cold email (getprestigerent.com, tryprestigerent.com, ecc.) | **Rischio entità.** Vedi §6.4 — vanno gestiti o inquinano il brand agli occhi di Google e degli LLM. |
| Stack di Michele: Next.js, Supabase, Vercel, n8n, Claude Code, Playwright | Il motore di contenuti si costruisce su questo, non su plugin WordPress. |
| Roadmap SaaS a 5 moduli già definita (AI Review Engine prioritario) | Quello che costruiamo qui **è** il prototipo dei Moduli 1, 2 e 5. Costruire pensando al riuso multi-tenant. |

**North star del progetto:**
> Quando un turista americano, tedesco o francese chiede — a Google o a un'AI — come muoversi in Toscana con autista, Prestige Rent deve comparire come risposta, e la prenotazione deve chiudersi sul sito di Prestige, non su Viator.

---

## 2. VERDETTO SUL DOCUMENTO DI PARTENZA

Il documento ricevuto è **corretto al 70% e incompleto al 100% nei punti che contano**. Analisi puntuale.

### 2.1 Cosa è giusto e va tenuto
- Google non penalizza il contenuto per il fatto di essere generato da AI. Penalizza lo **scaled content abuse**: molte pagine prodotte principalmente per manipolare il ranking, senza valore aggiunto — a prescindere da chi le scriva. Questo è confermato dalla policy Google e rinforzato dagli aggiornamenti del 2026.
- L'human-in-the-loop non è un vezzo: nei case study, i siti con revisione editoriale hanno guadagnato traffico, quelli con pubblicazione massiva non revisionata hanno perso il 40-90%.
- Localizzare invece di tradurre 1:1 è corretto e sottovalutato.
- Information gain (dati proprietari) è il concetto giusto ed è il cuore di tutto il piano (§5.2).
- Struttura Q&A + risposta secca in apertura: corretto, ma va reso molto più rigoroso (§10).

### 2.2 Cosa è impreciso e va corretto
| Affermazione nel doc | Correzione |
|---|---|
| "Il Princeton GEO Study ha dimostrato che inserire cifre aumenta fino al 40% la probabilità di citazione" | Il paper (Aggarwal et al., GEO, KDD 2024) misura un miglioramento **fino al 40% della visibilità della fonte nella risposta generata**, su benchmark, e **solo per alcuni metodi** (citazioni, statistiche, virgolettati). Non è "+40% di probabilità di citazione" e non è garantito. La ricerca 2026 su ~252.000 trial mostra che **rilevanza e posizione nel contesto di retrieval pesano più della riscrittura del testo**: se la pagina non entra nel set recuperato, la formattazione perfetta non serve a nulla. → **Priorità: prima essere recuperabili, poi essere citabili.** |
| "Schema `LimoService`" | Non esiste in schema.org. `[VERIFICA]` su schema.org: esistono `LocalBusiness`, `AutomotiveBusiness`, `AutoRental`, `TaxiService`, `TouristTrip`, `Trip`, `Service`. Usare la gerarchia reale + `additionalType` verso Wikidata. Uno schema inventato viene ignorato e in alcuni casi invalida l'intero blocco JSON-LD. |
| "hreflang in HTML" | Per un sito multilingua serio, hreflang va **anche e soprattutto nella sitemap XML**. Le implementazioni solo-HTML e solo-homepage sono la causa più comune di fallimento internazionale. |
| "80% del successo GEO è off-site" | Direzionalmente vero (l'autorità è il segnale dominante), ma la percentuale è marketing, non ricerca. Non usarla come KPI. |
| Il doc tratta SEO e GEO come due strategie parallele | Sono **una piramide**: crawlabilità → indicizzazione → rilevanza → retrieval → citazione. Il GEO senza SEO tecnico non esiste. |

### 2.3 Cosa manca completamente (ed è la parte più importante)
1. **Il layer di accesso dei crawler AI** (§4). Se `OAI-SearchBot` o `Claude-SearchBot` sono bloccati — da robots.txt copiato nel 2023 o dal default del CDN — tutta la strategia GEO vale zero. Questo è oggi il fallimento silenzioso più comune.
2. **Il layer entità / knowledge graph** (§6). Gli LLM ragionano su entità, non su pagine. Se "Prestige Rent" non è un'entità disambiguata, non verrà mai raccomandata per nome.
3. **La cannibalizzazione OTA** (§9.2). Viator è oggi la fonte che gli LLM citano parlando di Prestige.
4. **I domini satellite** (§6.4).
5. **La banca dati proprietaria strutturata** (§5.2) — senza la quale "aggiungi information gain" resta uno slogan.
6. **L'ottimizzazione a livello di chunk** (§10). Il RAG non recupera pagine, recupera pezzi di pagina.
7. **La misurazione** (§14). Il documento non definisce un solo KPI misurabile.
8. **La conversione** (§13). Un sito che posiziona e non converte è un costo.
9. **Il ritmo di pubblicazione sicuro** (§5.6). "Centinaia di articoli" contro "human-in-the-loop" non è una policy: serve un numero.
10. **Il pruning** (§5.8). Nessuno pianifica mai la rimozione, ed è metà del lavoro.

---

## 3. I SETTE PRINCIPI ARCHITETTURALI

Questi principi vincono su qualsiasi tattica in conflitto.

1. **Il collo di bottiglia è il retrieval, non la scrittura.** Prima crawlabilità e rilevanza, poi bellezza del testo.
2. **Una pagina esiste solo se risponde a un bisogno che nessun'altra pagina del sito risponde.** Se non passa questo test, non si pubblica.
3. **Nessun fatto entra in un articolo se non è nella Fact Base verificata.** L'AI compone, non inventa.
4. **La lingua non è una traduzione: è un mercato.** Ricerca keyword nativa, prezzi, unità di misura, riferimenti culturali, aeroporti di partenza.
5. **L'autorità è off-site, la citabilità è on-site.** Servono entrambe; sono workstream paralleli, non sequenziali.
6. **Ogni pagina deve essere autosufficiente a livello di paragrafo.** Un chunk estratto senza contesto deve restare vero e attribuibile.
7. **Si misura per lingua, mai in aggregato.** Un aggregato in salita può nascondere un mercato in crollo.

---

## 4. LAYER 0 — ACCESSO, CRAWL, INFRASTRUTTURA
### *Il layer che nessuno controlla e che azzera tutto il resto.*

### 4.1 Audit immediato (Sprint 0, giorno 1)
- [ ] Verifica che il dominio non sia dietro un CDN che blocca i crawler AI di default. **Cloudflare blocca per default i crawler AI di training e agentici sui nuovi domini**, e migliaia di siti risultano bloccati a livello di edge mentre il loro robots.txt dice "allow". `[VERIFICA]` stato attuale nel pannello CDN.
- [ ] Estrai i log del server (Serverplan) degli ultimi 90 giorni e conta gli hit per user-agent: `Googlebot`, `Bingbot`, `OAI-SearchBot`, `GPTBot`, `ChatGPT-User`, `Claude-SearchBot`, `ClaudeBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot`, `Applebot-Extended`, `Amazonbot`, `meta-externalagent`, `Bytespider`, `CCBot`.
- [ ] Se il numero di hit dei search-bot AI è ~0 → il problema è di accesso, non di contenuto. Risolvi prima.
- [ ] Verifica coerenza tra i due layer: robots.txt e regole WAF/CDN **devono dire la stessa cosa**.

### 4.2 Decisione training vs search — e perché per Prestige è diversa dal consiglio standard

I fornitori hanno **separato i crawler**: `GPTBot` (training) ≠ `OAI-SearchBot` (ricerca), `ClaudeBot` (training) ≠ `Claude-SearchBot` (ricerca). Bloccare l'uno non blocca l'altro.

Il consiglio diffuso è "blocca il training, consenti la ricerca", motivato dall'economia crawl-to-refer (rapporti nell'ordine di migliaia di pagine scaricate per ogni click restituito).

**Per Prestige quel consiglio non si applica.** Quell'economia riguarda gli editori che monetizzano il contenuto stesso. Per un'azienda di servizi, il contenuto **è materiale di vendita** e finire nei pesi del modello è un asset: significa che l'AI "sa" chi è Prestige Rent anche senza retrieval, in ogni lingua, per anni.

**Raccomandazione: consentire tutto, training incluso**, con la sola eccezione dei bot noti per non rispettare robots.txt e per costo infrastrutturale (`Bytespider`). `[DECISIONE APERTA]` — confermare con Michele.

### 4.3 `robots.txt` di riferimento

```txt
# ============================================
# prestigerent.com — robots.txt
# Policy: massima visibilità. Il contenuto è materiale di vendita,
# non inventario editoriale da proteggere.
# Ultimo aggiornamento: [DATA]
# ============================================

# --- Motori di ricerca classici ---
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: Applebot
Allow: /
User-agent: DuckDuckBot
Allow: /

# --- Crawler di ricerca/risposta AI: SEMPRE ALLOW (danno citazioni e traffico) ---
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Amzn-SearchBot
Allow: /

# --- Crawler di training: ALLOW per scelta strategica (vedi §4.2) ---
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: meta-externalagent
Allow: /

# --- Bot con storico di non conformità / costo infra senza ritorno ---
User-agent: Bytespider
Disallow: /

# --- Tutti gli altri ---
User-agent: *
Allow: /
Disallow: /wp-admin/
Disallow: /*?utm_
Disallow: /*?fbclid
Disallow: /search
Disallow: /cart
Disallow: /checkout
Disallow: /thank-you

Sitemap: https://www.prestigerent.com/sitemap-index.xml
```

> ⚠️ `robots.txt` è una richiesta cortese (RFC 9309), non un blocco. L'enforcement reale sta a livello server/WAF.

### 4.4 `llms.txt` — valutazione onesta
Nessun grande provider (OpenAI, Anthropic, Google, Meta) documenta di onorare `llms.txt`; Google ha dichiarato pubblicamente di non supportarlo. L'analisi dei log di rete mostra i bot che scaricano HTML e ignorano il file.

**Verdetto:** implementalo (costa 20 minuti, i consumatori reali oggi sono browser agentici e tool di coding), ma **non contarci** e mantienilo aggiornato. Un `llms.txt` con prezzi vecchi è peggio di nessun file. Priorità: bassa. Non prima di aver chiuso §4.1-4.3.

### 4.5 Performance & Core Web Vitals
- Target: LCP < 2.0s, INP < 200ms, CLS < 0.05 — **misurati da mobile USA/Germania**, non da Firenze in fibra.
- Immagini flotta/tour: AVIF + WebP fallback, `srcset`, lazy loading sotto la piega, dimensioni esplicite.
- **Le pagine devono rendere il contenuto lato server.** Molti crawler AI hanno esecuzione JS limitata o assente. Contenuto che appare solo dopo idratazione client = contenuto invisibile agli LLM. Con Next.js: SSR/SSG, mai CSR per il contenuto principale. **Questo è un requisito bloccante, non un'ottimizzazione.**
- Test obbligatorio: `curl -A "OAI-SearchBot" https://...` e verifica che il testo completo sia nell'HTML grezzo.

---

## 5. LAYER 1 — ARCHITETTURA TECNICA E INTERNAZIONALIZZAZIONE

### 5.1 Piattaforma
`[DECISIONE APERTA]` ma raccomandazione forte: **Next.js (App Router) + i18n routing + Vercel + Supabase**, coerente con lo stack esistente e con la roadmap SaaS. Motivi: SSR nativo, controllo totale su hreflang e JSON-LD, generazione programmatica sicura, deploy atomici, riuso del motore per il prodotto.

Migrazione da Serverplan: PHP 7.4 è EOL — è un rischio di sicurezza, non solo un fastidio. Le landing `/lp/` esistenti vanno portate con redirect 301 mappati 1:1. **Prima del cutover: crawl completo con Screaming Frog/Playwright, mappa redirect, verifica post-deploy.**

### 5.2 Struttura URL
```
prestigerent.com/            → x-default (EN)
prestigerent.com/en/         → inglese
prestigerent.com/de/         → tedesco
prestigerent.com/fr/         → francese
prestigerent.com/es/         → spagnolo
prestigerent.com/it/         → italiano
prestigerent.com/pt-br/      → portoghese Brasile
```
Sottodirectory, non sottodomini né ccTLD: consolida l'autorità su un unico dominio. Slug **localizzati** (`/de/weintouren-chianti/`, non `/de/wine-tours-chianti/`).

### 5.3 hreflang fatto bene
Regole non negoziabili:
- **Bidirezionalità:** se A punta a B, B deve puntare ad A. Un solo link mancante invalida il cluster.
- **Auto-referenza:** ogni pagina include l'hreflang verso se stessa.
- **`x-default`** obbligatorio, verso la versione EN.
- **Implementazione in sitemap XML** come fonte primaria (più affidabile e verificabile a scala) + tag HTML come ridondanza.
- Codici: ISO 639-1 lingua + ISO 3166-1 alpha-2 paese. `de` per il tedesco generico; `de-DE`/`de-AT`/`de-CH` solo se esiste contenuto realmente differenziato (prezzi CHF, aeroporti diversi). **Non frammentare senza motivo.**
- **Canonical auto-referenziale** su ogni versione. Mai canonical cross-lingua.
- Validazione automatizzata in CI: script che crawla la sitemap e fallisce la build se un cluster hreflang è incoerente. `[TASK CLAUDE CODE]`

### 5.4 Sitemap
```
/sitemap-index.xml
  ├── /sitemap-pages-en.xml
  ├── /sitemap-pages-de.xml
  ├── /sitemap-posts-en.xml
  ├── ...
  └── /sitemap-images.xml
```
`lastmod` **reale** (non la data di build). Property separate in Google Search Console **per ogni sottocartella di lingua** — altrimenti non si diagnostica nulla.

### 5.5 Selezione dei mercati
Non aprire 10 lingue insieme. Errore classico e fatale: 10 lingue mediocri battute da 3 lingue eccellenti, sempre.

**Fase 1 (mesi 1-4):** EN (US-first), DE, IT
**Fase 2 (mesi 5-8):** FR, ES
**Fase 3 (mesi 9-12):** PT-BR, NL — poi valutare PL, JA, AR (mercato lusso Golfo verso Toscana), HE

Criterio di apertura di un nuovo mercato: il precedente deve avere ≥20 pagine indicizzate con impression stabili e almeno una conversione diretta attribuita.

> **Nota critica sulla lingua e le AI:** i dati di training degli LLM sono per larga parte in inglese, quindi le fonti non inglesi hanno densità di citazione più bassa — ma le query in tedesco vengono risposte prevalentemente con fonti tedesche. Tradurre non è opzionale: uno studio su 1,3M di citazioni ha rilevato che i siti tradotti ricevono più citazioni per query dei siti non tradotti, e che il contenuto localizzato alza anche la visibilità in inglese. **La citazione è binaria e avviene lingua per lingua.**

---

## 6. LAYER 2 — ENTITÀ E KNOWLEDGE GRAPH
### *Il layer che decide se un'AI sa chi sei.*

Gli LLM non raccomandano URL: raccomandano **entità**. Se "Prestige Rent" non è un'entità stabile e disambiguata, il modello non ha nulla da nominare.

### 6.1 Definizione canonica dell'entità
Scrivere **una volta** e usare identica ovunque (sito, GBP, social, comunicati, directory):
- Nome legale esatto + nome commerciale
- Categoria: servizio di noleggio con conducente (NCC) e tour privati in Toscana
- Sede, anno di fondazione, dimensione flotta, numero licenza NCC, P.IVA
- Aree servite (Firenze, Siena, Chianti, Val d'Orcia, Lucca, Pisa, porti di Livorno e La Spezia, aeroporti FLR/PSA)
- Lingue parlate dagli autisti
- Fondatori / persone chiave

**Coerenza NAP assoluta** (Name, Address, Phone) su ogni superficie. Una virgola diversa nell'indirizzo crea entità duplicate.

### 6.2 Ancoraggi esterni
- [ ] Google Business Profile completo, categorizzato, con foto recenti, Q&A popolate, post settimanali. **Una scheda per ogni sede fisica reale, non una per città target** (le sedi fittizie sono spam e vengono rimosse).
- [ ] Voce **Wikidata** con proprietà: `instance of`, `country`, `headquarters location`, `official website`, `inception`. Wikidata è una delle corpora aperte su cui il retrieval si concentra.
- [ ] Profili completi: LinkedIn azienda, TripAdvisor, Trustpilot, GetYourGuide, Viator, registri di categoria italiani, Camera di Commercio.
- [ ] `sameAs` nello schema Organization che punta a **tutti** questi profili → è così che si dice a una macchina "questi sono la stessa entità".

### 6.3 Persone come entità (E-E-A-T reale)
Il travel di lusso è un settore in cui l'esperienza si dimostra. Costruire:
- Pagina "Chi siamo" con **persone vere, nomi, foto, ruoli, anni di esperienza**.
- Pagine autore per chi firma i contenuti, con schema `Person`, `jobTitle`, `knowsAbout`, `sameAs`.
- Profili autisti/guide (con consenso): lingue parlate, anni di guida in Toscana, aneddoti. **Questo è contenuto che nessun concorrente può copiare e che nessuna AI può inventare.**
- Non firmare gli articoli con "Redazione" o con un autore fittizio. È verificabile ed è un rischio.

### 6.4 ⚠️ I domini satellite del cold email — problema aperto
Esistono ~10 domini tipo `getprestigerent.com`, `tryprestigerent.com`. Rischi concreti:
1. **Confusione di entità:** un LLM che incontra 10 domini simili può non capire quale sia canonico, o considerare il pattern un segnale di bassa qualità.
2. **Contenuto duplicato** se ospitano copie del sito.
3. **Reputazione:** i domini per cold outreach possono finire in blocklist; l'associazione al brand non aiuta.

**Azione obbligatoria:**
- I domini satellite servono un one-pager minimale, **`noindex, nofollow`**, senza copiare contenuto del sito principale.
- Nessun link seguito verso il dominio principale da questi domini.
- La firma email e le landing di destinazione delle campagne puntano al **dominio canonico**.
- `[DECISIONE APERTA]` valutare se il dominio canonico debba essere `prestigerent.com` o `getprestigerent.com` — decidere UNA volta e non tornarci più. Tutti gli altri: 301 o noindex.

---

## 7. LAYER 3 — STRUCTURED DATA (SCHEMA.ORG)

I dati strutturati non fanno rankare da soli, ma rendono l'entità e i fatti **leggibili da una macchina**. Nel GEO valgono più che nella SEO classica: la struttura ha peso indipendente dall'autorità.

`[VERIFICA]` ogni tipo su schema.org prima di usarlo. Tipi inventati = blocco ignorato.

### 7.1 Mappa tipo → pagina
| Pagina | Schema |
|---|---|
| Homepage | `Organization` (+`LocalBusiness`), `WebSite` con `SearchAction` |
| Servizio (transfer, chauffeur) | `Service` + `Offer` + `areaServed` |
| Tour | `TouristTrip` + `itinerary` (`ItemList` di `TouristAttraction`) + `Offer` |
| Destinazione (Chianti, Val d'Orcia) | `Place` / `TouristDestination` + `FAQPage` |
| Articolo blog | `Article` + `author` (`Person`) + `inLanguage` |
| FAQ | `FAQPage` (solo con Q&A realmente visibili in pagina) |
| Recensioni | `AggregateRating` + `Review` (**solo recensioni reali e verificabili**) |
| Ogni pagina | `BreadcrumbList` |

### 7.2 Esempio Organization (adattare, non copiare alla cieca)
```json
{
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": "https://www.prestigerent.com/#organization",
  "name": "Prestige Rent",
  "legalName": "[RAGIONE SOCIALE ESATTA]",
  "url": "https://www.prestigerent.com/",
  "logo": "https://www.prestigerent.com/logo.png",
  "foundingDate": "[ANNO]",
  "vatID": "[P.IVA]",
  "description": "[UNA FRASE, IDENTICA OVUNQUE]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[...]",
    "addressLocality": "[...]",
    "addressRegion": "Toscana",
    "postalCode": "[...]",
    "addressCountry": "IT"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 0, "longitude": 0 },
  "telephone": "+39...",
  "areaServed": [
    { "@type": "City", "name": "Florence" },
    { "@type": "City", "name": "Siena" },
    { "@type": "AdministrativeArea", "name": "Tuscany" }
  ],
  "knowsLanguage": ["it", "en", "de", "fr", "es"],
  "sameAs": [
    "https://www.tripadvisor.com/...",
    "https://www.linkedin.com/company/...",
    "https://www.wikidata.org/wiki/Q...",
    "https://www.instagram.com/..."
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[REALE]",
    "reviewCount": "[REALE]"
  }
}
```

### 7.3 Regole
- **Un solo `@id` per entità**, riusato via `"@id"` reference in tutte le pagine. Niente Organization ridefinita 400 volte.
- `inLanguage` su **ogni** versione linguistica.
- JSON-LD renderizzato **server-side**.
- Validazione in CI con Schema Markup Validator + Rich Results Test. Build che fallisce su errore. `[TASK CLAUDE CODE]`
- **Mai** markup di dati non presenti nella pagina visibile. È una violazione esplicita e produce azioni manuali.

---

## 8. LAYER 4 — ARCHITETTURA DEI CONTENUTI

### 8.1 Dalla keyword map alla prompt map
La keyword research tradizionale serve ancora, ma **non basta**. Le AI scompongono la domanda dell'utente in **sotto-query** (query fan-out) e recuperano fonti per ciascuna. Bisogna quindi costruire due mappe:

**A. Keyword map** (per lingua, con ricerca nativa — non traduzioni di keyword italiane).
**B. Prompt map**: 150-300 prompt reali per lingua, del tipo:
- "best way to get from Florence airport to a Chianti villa"
- "wie kommt man ohne Auto von Florenz in die Toskana"
- "is it worth hiring a private driver in Tuscany"
- "Chianti wine tour with driver — how much does it cost"
- "quel est le meilleur service de chauffeur privé à Florence"
- "can a bus reach [nome cantina]?"

Ogni prompt viene assegnato a una pagina responsabile. **Se un prompt non ha pagina, è un gap. Se una pagina non ha prompt, non va scritta.**

### 8.2 Struttura a cluster
```
PILLAR: Private Chauffeur Service in Tuscany
├── Florence airport transfers (FLR) — guida operativa
├── Pisa airport transfers (PSA)
├── Livorno cruise port → Florence (con tempi reali)
├── Chauffeur vs taxi vs train: confronto onesto con tabella
├── ZTL Firenze spiegata ai visitatori
└── Costi reali di un autista privato in Toscana (con fasce di prezzo)

PILLAR: Tuscan Wine Tours
├── Chianti Classico in un giorno da Firenze
├── Montalcino & Brunello
├── Bolgheri / Super Tuscans
├── Quali cantine sono raggiungibili in minivan e quali no  ← information gain puro
└── Wine tour con bambini / gruppi / matrimoni

PILLAR: Group & Bus Tours
PILLAR: Semi-private 8-seat experiences
```
Regole: link interni **dal supporting al pillar sempre**, dal pillar ai supporting selettivamente, anchor descrittive e variate, **mai più di 3 click dalla home a qualunque pagina**.

### 8.3 Pagine che valgono più di 50 articoli
Da costruire per prime, in EN, poi localizzate:
1. **Pagina prezzi reale** con fasce, cosa è incluso, cosa no. Le AI amano i numeri e la maggior parte dei competitor nasconde i prezzi. Vantaggio di citabilità enorme.
2. **Pagina flotta** con specifiche verificabili: modello, posti, bagagli, seggiolini, accessibilità.
3. **Pagina "ZTL, permessi e accessi"** — Prestige ha permessi NCC che i pullman non hanno. Questo è il differenziale operativo. Va documentato con numeri di licenza.
4. **Matrice tempi di percorrenza reali** (Firenze→Greve, Firenze→Montalcino, Livorno→Firenze...), misurati, con nota su traffico stagionale. Dato proprietario perfetto.
5. **Confronto onesto "diretto vs OTA"** — cosa cambia prenotando direttamente.
6. **FAQ operative** per ogni servizio.

---

## 9. LAYER 5 — LA CONTENT FACTORY MULTILINGUA
### *Il cuore del sistema. Questa è la parte da costruire in codice.*

### 9.1 Principio
> L'AI non produce conoscenza. **Assembla conoscenza fornita.** Il valore del sistema sta nella qualità della Fact Base e nella severità dei gate, non nel modello.

### 9.2 LA FACT BASE — costruire questa PRIMA di generare un solo articolo

Tabella Supabase `facts` con fatti proprietari **verificati e attribuibili**. Nessun fatto entra in un articolo se non ha un `fact_id`.

```sql
create table facts (
  id                uuid primary key default gen_random_uuid(),
  category          text not null,  -- fleet | routes | permits | pricing | logistics | seasonality | venues | team
  claim             text not null,  -- il fatto, in italiano, in una frase
  numeric_value     numeric,
  unit              text,
  source            text not null,  -- chi/cosa lo attesta
  verified_by       text not null,  -- persona che ha verificato
  verified_at       date not null,
  expires_at        date,           -- prezzi e tempi scadono!
  confidence        text check (confidence in ('verified','estimated')),
  usable_publicly   boolean default true,
  notes             text
);
```

**Cosa Prestige possiede e nessun competitor ha (da popolare in Sprint 0):**
- Specifiche esatte della flotta: modello, anno, posti, capienza bagagli in litri/valigie, disponibilità seggiolini, accesso disabili
- Numeri di licenza NCC e quali ZTL/aree pedonali sono accessibili
- **Tempi di percorrenza reali misurati** su rotte ricorrenti, per fascia oraria e stagione
- Quali cantine/agriturismi hanno accessi stretti dove un pullman non entra e un minivan sì — **con nomi**
- Punti di pickup autorizzati a Firenze centro, Livorno, FLR, PSA
- Numero di transfer/tour eseguiti per anno, anni di attività, numero autisti
- Lingue parlate da ciascun autista
- Politiche reali: attesa inclusa, cancellazione, no-show, bagaglio extra
- Pattern stagionali osservati (settimane di picco, mesi migliori, chiusure)
- Errori tipici dei clienti e come li si risolve (oro per le FAQ)

> Regola: **ogni articolo deve contenere almeno 3 `fact_id` distinti**, di cui almeno 1 numerico. Nessuna eccezione. È questo che trasforma "contenuto AI generico" in "contenuto con information gain".

### 9.3 Il termbase (glossario per lingua)
Tabella `terminology`: previene la deriva terminologica, che è il segnale più visibile di traduzione automatica.

Esempi da fissare:
| IT | EN | DE | FR | ES |
|---|---|---|---|---|
| noleggio con conducente | private chauffeur service *(mai "car rental with driver")* | Chauffeurservice / Privattransfer | service de chauffeur privé | servicio de chófer privado |
| trasferimento | transfer | Transfer | transfert | traslado |
| degustazione | wine tasting | Weinprobe | dégustation | cata de vinos |
| cantina | winery / wine estate | Weingut | domaine viticole | bodega |
| gita di un giorno | day trip | Tagesausflug | excursion d'une journée | excursión de un día |
| ZTL | limited traffic zone (ZTL) | Verkehrsbeschränkte Zone (ZTL) | zone à trafic limité (ZTL) | zona de tráfico limitado (ZTL) |

Il termbase entra nel prompt di generazione **come vincolo rigido** e nel QA come check automatico.

### 9.4 La pipeline a 7 stadi

```
[1] BRIEF        → derivato dalla prompt map. Include: prompt target, sotto-query
                    attese, fact_id obbligatori, termbase della lingua, competitor
                    da superare, angolo differenziante, tipo di schema, lunghezza.
                    STATO: draft_brief
                            ↓
[2] RICERCA      → SERP nativa nella lingua target + estrazione delle sotto-query
                    che le AI generano su quel prompt + gap analysis competitor.
                    NON tradurre la ricerca italiana. STATO: researched
                            ↓
[3] OUTLINE      → H2/H3 che rispecchiano domande reali. Ogni H2 mappato a una
                    sotto-query. GATE UMANO #1 (5 min): l'outline è approvato?
                    STATO: outline_approved
                            ↓
[4] DRAFT        → generazione con: brief + fatti (solo dalla Fact Base) + termbase
                    + esempi di tone of voice + vincoli di formato (§10).
                    STATO: drafted
                            ↓
[5] QA AUTOMATICO → gate di macchina, tutti bloccanti (§9.5).
                    STATO: qa_passed | qa_failed
                            ↓
[6] EDITING UMANO → revisore madrelingua. Non "rilettura": riscrittura di almeno
                    il 20% del testo, aggiunta di 1 osservazione di prima mano,
                    verifica di ogni nome proprio e ogni numero.
                    GATE UMANO #2. STATO: human_approved
                            ↓
[7] PUBBLICAZIONE → schema, hreflang, link interni, immagini originali,
                    firma autore reale, data. STATO: published
                            ↓
[8] MONITORAGGIO → a 30/90/180 giorni: performance + refresh o pruning (§9.8).
```

Tabella `content_pipeline` in Supabase con questi stati, orchestrata in n8n. **Nessun articolo può saltare uno stato.** Il DB deve rendere fisicamente impossibile pubblicare senza `human_approved`.

### 9.5 I gate automatici (tutti bloccanti)
- [ ] **Fact check:** ≥3 `fact_id` referenziati, ≥1 numerico, nessun `fact_id` scaduto
- [ ] **Anti-hallucination:** ogni entità nominata (cantina, hotel, strada, ristorante) esiste nella Fact Base o in una whitelist verificata. Nomi inventati = fail immediato.
- [ ] **Termbase:** 100% di aderenza al glossario della lingua
- [ ] **Similarità interna:** cosine similarity < 0,80 rispetto a **qualunque** pagina esistente del sito, **nella stessa lingua** (embedding via pgvector su Supabase). Questo è il gate anti-scaled-content-abuse.
- [ ] **Similarità cross-lingua:** la versione DE non deve essere una mappatura frase-per-frase della EN (struttura degli H2 deve divergere ≥30%)
- [ ] **Answer capsule:** presente sotto ogni H2, 40-60 parole, autosufficiente (§10)
- [ ] **Schema valido**
- [ ] **Link interni:** ≥3 in uscita coerenti, ≥1 verso il pillar
- [ ] **Leggibilità** appropriata alla lingua
- [ ] **Zero claim non verificabili** su sicurezza, licenze, primati ("il migliore", "il numero 1")
- [ ] **Immagini originali**, non stock generico. Foto reali della flotta e dei luoghi. `[TASK]` shooting fotografico è una dipendenza del progetto.

### 9.6 Il ritmo di pubblicazione (numeri, non slogan)
Il documento di partenza dice "non centinaia". Ecco i numeri operativi:

| Periodo | Volume | Note |
|---|---|---|
| Mesi 1-2 | **2-4 pagine/settimana totali**, solo EN | Fase di fondazione: pillar + pagine ad alto valore (§8.3) |
| Mesi 3-4 | 4-6/settimana, EN + DE | Si apre la seconda lingua solo dopo validazione EN |
| Mesi 5-8 | 8-12/settimana su 3-4 lingue | Solo se il tasso di indicizzazione a 30gg è >85% |
| Mesi 9+ | Scalare **in funzione dell'indicizzazione**, non del calendario | |

**Regola d'oro:** se il tasso di indicizzazione a 30 giorni scende sotto l'85%, **si ferma la produzione** e si migliora ciò che esiste. L'indicizzazione è il termometro della qualità percepita.

Mai: import massivo di 200 URL in un giorno. Mai: pubblicare simultaneamente la stessa settimana la stessa pagina in 6 lingue nate dallo stesso draft.

### 9.7 Localizzazione ≠ traduzione — checklist per il revisore
Ogni versione linguistica deve differire su:
- [ ] Keyword primaria da ricerca **nativa**
- [ ] Struttura degli H2 (i tedeschi cercano informazioni diverse dagli americani)
- [ ] Aeroporti/città di partenza citati (JFK vs Frankfurt vs CDG)
- [ ] Unità di misura e valuta di riferimento
- [ ] Riferimenti culturali e comparazioni ("come il Napa" funziona per gli USA, non per la Francia)
- [ ] Registro: il tedesco del lusso è più formale e più tecnico; l'americano è più caldo e narrativo
- [ ] Obiezioni tipiche del mercato (i tedeschi chiedono puntualità e assicurazione; gli americani chiedono flessibilità e mance; i francesi chiedono la qualità del vino)

### 9.8 Refresh e pruning — metà del lavoro
Gli LLM privilegiano contenuto recente e aggiornato.
- **Ogni 90 giorni:** report automatico delle pagine con impression ma zero citazioni AI e zero click → candidate a refresh (nuovi dati, nuove statistiche, nuova citazione esperta).
- **Ogni 180 giorni:** pagine con <10 impression/mese e nessun link interno in entrata → **prune** (rimuovi + 301 verso la pagina cluster più vicina, o `noindex` se ha ancora valore utente).
- Fatti con `expires_at` superato → alert automatico su tutte le pagine che li usano.
- Un audit regolare è l'assicurazione più economica contro un'azione di spam: è molto più facile potare contenuto sottile che recuperare da una penalizzazione (3-6 mesi per una demozione algoritmica, 6-12 per una sitewide).

---

## 10. LAYER 6 — SCRIVERE PER IL RETRIEVAL (chunk-level)

Il RAG non recupera pagine: recupera **chunk**. Ogni sezione va progettata per sopravvivere all'estrazione.

### 10.1 Il pattern "Answer Capsule"
```markdown
## Can a minibus reach Chianti wineries that coaches cannot?

Yes. Prestige Rent's Mercedes V-Class minivans (8 seats, 2.1 m width)
access the gravel approach roads of 14 Chianti Classico estates where
50-seat coaches are prohibited by road width limits. This includes
[Estate A] and [Estate B], where the final 1.2 km is a single-lane
strada bianca.

[poi 200-400 parole di approfondimento, contesto, esempi]
```
Regole:
- H2/H3 **formulati come la domanda reale dell'utente**, nella lingua target
- Prima risposta: **40-60 parole**, fattuale, autosufficiente, **contiene il nome del brand almeno una volta** (le AI citano anche solo menzionando il brand, senza link)
- Nessun pronome ambiguo: "Prestige Rent's vans", non "our vans" (il chunk viene estratto senza contesto)
- Numeri, non aggettivi: "8 posti, 2,1 m di larghezza" batte "spaziosi e comodi"
- Date esplicite: "aggiornato ad agosto 2026", non "di recente"

### 10.2 Formati che vengono citati più spesso
- Tabelle comparative con criteri espliciti
- Liste numerate di passi
- Definizioni in una frase
- Prezzi in fasce, con cosa è incluso
- Statistiche attribuite a una fonte nominata con data
- Q&A dirette

### 10.3 Formati che vengono ignorati
- Introduzioni narrative di 200 parole prima del contenuto
- "Nel mondo di oggi, il viaggio di lusso..." — taglia tutto
- Muri di testo senza sotto-intestazioni
- Contenuto chiave dentro immagini o carousel JS
- Superlativi non supportati

---

## 11. LAYER 7 — ECOSISTEMA OFF-SITE
### *L'autorità è il segnale dominante. Non si compra on-site.*

Workstream **parallelo** al contenuto, non successivo.

### 11.1 Digital PR e menzioni editoriali
Target realistici per un operatore toscano di lusso:
- Guide di viaggio internazionali e riviste di settore (EN, DE)
- Blog di travel di fascia alta con audience US/DE
- Publisher di wine travel
- Wedding planner internazionali che operano in Toscana (segmento ad alto valore)
- DMC e concierge di hotel 5 stelle (che sono anche canale B2B — sinergia con il cold outreach già attivo)

Angolo giornalistico da vendere (non "siamo bravi"): **dati proprietari**. "Quali cantine del Chianti sono inaccessibili ai pullman: la mappa" è una storia. "Prestige Rent offre servizi di qualità" non lo è. La Fact Base (§9.2) è anche il motore della PR.

### 11.2 Comunità reali
Reddit (r/italytravel, r/tuscany, r/winetravel), forum TripAdvisor, gruppi Facebook di viaggio: gli LLM estraggono opinioni da qui.

⚠️ **Regola assoluta: nessun astroturfing.** Account finti che raccomandano Prestige = rischio reputazionale enorme, ban permanenti, e le comunità lo scoprono sempre. L'approccio corretto: account aziendale trasparente che risponde a domande logistiche con competenza reale, senza vendere. Il valore si accumula in 12 mesi, non in 3 settimane.

### 11.3 Directory e citazioni locali
NAP identica ovunque. Priorità: Google Business Profile, TripAdvisor, Trustpilot, Yelp, Apple Business Connect, Bing Places, directory italiane di categoria, directory di settore travel.

### 11.4 Il paradosso Viator
`[DECISIONE APERTA — strategica]` Le pagine Viator/GYG di Prestige sono forti e sono la fonte che le AI trovano. Non si possono rimuovere (sono il 95% del fatturato). Strategia:
- **Non combatterle: circondarle.** Ottimizzare le schede OTA con nome brand completo e coerente, così che chi le legge cerchi "Prestige Rent" per nome.
- Vincere la **brand SERP**: chi cerca "Prestige Rent Florence" deve trovare il sito ufficiale al primo posto, con sitelink, knowledge panel e recensioni.
- Costruire contenuto su query dove le OTA sono strutturalmente deboli: guide operative, ZTL, logistica, confronti, contenuto tecnico. Viator non pubblica una guida sulla ZTL di Firenze.

---

## 12. LAYER 8 — LE RECENSIONI COME ASSET GEO

Le AI verificano la reputazione su fonti terze. Per un servizio locale, **le recensioni sono probabilmente il singolo segnale off-site più pesante**.

Questo si collega direttamente al Modulo 1 della roadmap SaaS (AI Review Engine). Requisiti:
- **Volume e freschezza:** le recensioni recenti pesano più di quelle vecchie. Target: flusso costante, non picchi.
- **Richiesta sistematica post-servizio**, nella lingua del cliente, via WhatsApp/email a T+2h dalla fine del servizio (il momento di massimo entusiasmo).
- **Distribuzione multi-piattaforma:** Google, TripAdvisor, Trustpilot. Non concentrare tutto su una.
- **Risposta a ogni recensione**, in lingua, con contenuto informativo (le risposte sono testo indicizzabile e citabile).
- **Recensioni dettagliate > recensioni a 5 stelle mute.** Una recensione che dice "l'autista Marco ci ha portati a Montalcino evitando il traffico della SS2" è materiale di citazione. Incoraggiare la specificità nella richiesta.
- **Recensioni in lingua nativa** su ogni mercato: servono citazioni tedesche per essere citati in tedesco.
- ⚠️ Mai recensioni incentivate in violazione dei ToS delle piattaforme, mai gating (chiedere solo ai soddisfatti). È rilevabile e sanzionabile.

---

## 13. LAYER 9 — CONVERSIONE
### *Senza questo, tutto il resto è un costo.*

Il traffico da AI converte meglio della media (arriva già con una raccomandazione), ma è **poco** in volume assoluto. Ogni visita vale il triplo. Il sito deve essere pronto.

- [ ] **Motore di prenotazione affidabile.** Il widget Regiondo era rotto (mese scaduto, €0,00): quello era un blocco totale di conversione. Va monitorato con test automatici Playwright **giornalieri** che simulano una prenotazione. `[TASK CLAUDE CODE]`
- [ ] **Prezzi visibili.** Nascondere il prezzo perde sia utenti sia citazioni AI.
- [ ] **Contatto immediato:** WhatsApp Business in evidenza, risposta <1h in orario, form breve (nome, email, data, persone, tratta — nient'altro).
- [ ] **Prova sociale sopra la piega:** recensioni reali, numero di servizi eseguiti, anni di attività, loghi partner.
- [ ] **Motivi per prenotare diretto** che non violino le clausole di parità tariffaria delle OTA `[VERIFICA LEGALE con Saverio/Stefano]`: attesa gratuita estesa, seggiolini inclusi, contatto diretto con l'autista prima del servizio, cancellazione flessibile, modifiche senza penale, personalizzazione dell'itinerario. **Valore aggiunto, non sconto.**
- [ ] **Tracciamento:** GTM/GA4/Ads già migrati e Consent Mode v2 già implementato. Aggiungere: canale personalizzato "AI Referral" (§14.3).
- [ ] Pagine in lingua che convertono in lingua: modulo, conferme, email transazionali, **e la persona che risponde**. Un lead tedesco a cui si risponde in inglese approssimativo si perde.

---

## 14. LAYER 10 — MISURAZIONE

Regola: **si misura per lingua e per superficie, mai in aggregato.**

### 14.1 KPI SEO classica (per sottocartella)
Property GSC separate per `/en/`, `/de/`, ecc. Metriche: pagine indicizzate / pubblicate, impression, click, CTR, posizione media per cluster, tempo di indicizzazione di una nuova pagina.

### 14.2 KPI GEO
Nei motori generativi **non esiste la posizione #1**: sono non deterministici, la stessa domanda dà risposte diverse. Si misura la **frequenza**, cioè un tasso di menzione.

| KPI | Definizione | Come |
|---|---|---|
| **Mention rate** | % di prompt del set in cui Prestige è nominata | Prompt set testato mensilmente |
| **Citation rate** | % in cui viene linkato un URL di prestigerent.com | Idem |
| **Share of voice** | Menzioni Prestige / menzioni totali dei competitor definiti | Idem |
| **Sentiment** | Come viene descritta | Classificazione LLM |
| **Source mix** | Da quali domini l'AI prende le informazioni su Prestige | ⚠️ se è quasi tutto Viator, si sta perdendo |
| **Crawl AI** | Hit di OAI-SearchBot / Claude-SearchBot / PerplexityBot per settimana | Log server |

### 14.3 Il tracker GEO — da costruire `[TASK CLAUDE CODE — PRIORITARIO]`
Questo è anche il prototipo di un modulo SaaS vendibile. Specifica:
- Tabella `prompts` (150-300 prompt × lingua), tabella `runs`, tabella `results`
- n8n schedulato: ogni prompt, ogni mese, su ChatGPT / Perplexity / Gemini / Claude / Google AI Overviews
- Parsing della risposta: brand menzionato sì/no, URL citati, posizione della menzione, sentiment, competitor citati
- Dashboard Next.js: trend per lingua, per cluster, per motore
- **Alert:** se la mention rate cala >20% in un mese, notifica
- Nota tecnica: le risposte AI sono geo-personalizzate — testare da IP dei paesi target (proxy residenziali), non da Firenze.

### 14.4 Traffico AI in GA4
Creare un gruppo di canali personalizzato "AI Referral" con sorgenti: `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`, `copilot.microsoft.com`, `you.com`. Attribuire conversioni. **Aspettarsi volumi bassi ma tassi di conversione alti** — comunicarlo a Saverio e Stefano prima, per evitare che il progetto venga giudicato sul volume sbagliato.

### 14.5 Il KPI che conta davvero
> **% di fatturato da canale diretto.**
> Baseline oggi: ~5%. Obiettivo 12 mesi: 12-15%. Obiettivo 24 mesi: 25%.
> Tutto il resto sono metriche di processo.

---

## 15. ROADMAP 12 MESI

### Sprint 0 — Settimane 1-2: FONDAZIONI
- Audit crawler AI + CDN (§4.1) — **bloccante**
- robots.txt corretto in produzione
- Decisione dominio canonico + bonifica domini satellite (§6.4)
- Definizione entità canonica + NAP (§6.1)
- **Popolamento Fact Base: minimo 80 fatti verificati** (§9.2) — è il lavoro più importante di tutto il progetto e richiede Saverio/Stefano/autisti
- Termbase EN + DE (§9.3)
- Prompt map EN: 150 prompt
- Baseline: mention rate attuale su tutti i motori, prima di toccare qualsiasi cosa

### Mesi 1-2 — TECNICO + EN CORE
- Nuovo sito Next.js: architettura i18n, hreflang in sitemap, schema, SSR verificato
- Migrazione `/lp/` con mappa redirect 301, uscita da PHP 7.4
- Le 6 pagine ad alto valore (§8.3) in EN
- 2 pillar EN + 6 supporting
- Wikidata, GBP, sameAs, directory
- Playwright: monitoraggio giornaliero del booking engine

### Mesi 3-4 — MOTORE + DE
- Content factory operativa in Supabase + n8n con tutti i gate
- Tracker GEO operativo
- Apertura DE: pagine core localizzate + prompt map DE
- Avvio digital PR (primo dato proprietario pubblicato come studio)
- Motore recensioni multi-piattaforma attivo

### Mesi 5-8 — SCALA
- 8-12 pagine/settimana su EN/DE/IT, apertura FR
- Presenza comunità (genuina)
- Primo audit di refresh a 90 giorni
- Ottimizzazione conversione basata su dati reali

### Mesi 9-12 — CONSOLIDAMENTO
- Apertura ES / PT-BR se i KPI reggono
- Primo ciclo di pruning
- Rifacimento delle pagine che hanno impression senza citazioni
- Valutazione: il motore è pronto per essere multi-tenant? → Modulo SaaS

---

## 16. ANTI-PATTERN — COSE DA NON FARE MAI

1. ❌ Generare l'articolo in italiano e tradurlo in 8 lingue. È il pattern che il March 2026 core update ha colpito. Il contenuto tradotto è esplicitamente coperto dalla policy sullo scaled content abuse.
2. ❌ Pubblicare 100 pagine in un giorno. Anche se sono buone.
3. ❌ Pagine template che cambiano solo il nome della città ("Autista privato a {CITTÀ}") senza informazioni materialmente diverse. È il pattern doorway.
4. ❌ Firmare articoli con autori inventati o con foto stock. Verificabile, e distrugge l'E-E-A-T.
5. ❌ Markup schema di dati non visibili in pagina.
6. ❌ Recensioni finte, gating delle recensioni, astroturfing su Reddit.
7. ❌ Bloccare i crawler AI di ricerca "per sicurezza".
8. ❌ Contenuto principale renderizzato solo lato client.
9. ❌ Canonical cross-lingua.
10. ❌ Aprire 8 lingue insieme.
11. ❌ Cluster hreflang unidirezionali.
12. ❌ Rincorrere il volume di keyword ignorando la prompt map.
13. ❌ Superlativi non verificabili ("il miglior servizio di Firenze") — nel travel di lusso possono anche essere un problema di pubblicità ingannevole.
14. ❌ Misurare il successo in sessioni invece che in prenotazioni dirette.
15. ❌ Giudicare il progetto a 3 mesi. La SEO internazionale + GEO ha un orizzonte di 9-18 mesi.
16. ⚠️ Compliance: da marzo 2026 Google Ads richiede la disclosure per immagini generate da AI, voci sintetiche e copy pubblicitario AI. `[VERIFICA]` prima di lanciare creatività generate. Su Google Search la disclosure resta facoltativa ma consigliata.

---

## 17. DEFINITION OF DONE — CHECKLIST PER OGNI PAGINA

Nessuna pagina va in produzione senza tutte le caselle spuntate.

**Contenuto**
- [ ] Risponde a un prompt della prompt map, assegnato e non duplicato
- [ ] ≥3 fatti dalla Fact Base, di cui ≥1 numerico, nessuno scaduto
- [ ] Almeno 1 osservazione di prima mano aggiunta dal revisore umano
- [ ] Ogni entità nominata verificata (cantine, hotel, strade, ristoranti)
- [ ] Similarità <0,80 con ogni pagina esistente nella stessa lingua
- [ ] Struttura H2 divergente ≥30% dalle altre versioni linguistiche
- [ ] Answer capsule 40-60 parole sotto ogni H2, con brand nominato
- [ ] Zero superlativi non supportati
- [ ] Termbase rispettato al 100%

**Tecnico**
- [ ] Slug localizzato
- [ ] hreflang bidirezionale completo + x-default + canonical auto-referenziale
- [ ] JSON-LD valido, server-side, `inLanguage` corretto
- [ ] Presente nella sitemap della lingua con `lastmod` reale
- [ ] ≥3 link interni in uscita, ≥1 verso il pillar, ≥1 link in entrata da pagina esistente
- [ ] Contenuto completo nell'HTML grezzo (test con user-agent AI)
- [ ] LCP < 2,0s da mobile nel mercato target
- [ ] Immagini originali, alt descrittivi in lingua

**Editoriale**
- [ ] Revisione madrelingua con riscrittura ≥20%
- [ ] Autore reale con pagina autore e schema Person
- [ ] Data di pubblicazione e data di aggiornamento visibili
- [ ] Stato `human_approved` nel DB

---

## 18. REGISTRO IMPLEMENTAZIONE
*(Claude Code aggiorna questa sezione a ogni intervento)*

| Data | Layer | Cosa | Stato | Note |
|---|---|---|---|---|
| | | | | |

---

## 19. DOMANDE APERTE DA CHIUDERE CON MICHELE

1. Dominio canonico definitivo: `prestigerent.com` o `getprestigerent.com`?
2. Il sito si rifà su Next.js/Vercel o resta su Serverplan? (raccomandazione: Next.js)
3. Chi sono i revisori madrelingua per EN, DE, FR? Interni, freelance, agenzia? **Senza questa risposta la content factory non parte.**
4. Esistono clausole di parità tariffaria nei contratti Viator/GetYourGuide? Vincola la strategia di conversione diretta.
5. Saverio e Stefano sono disponibili per 2 sessioni da 2 ore per popolare la Fact Base?
6. Budget e tempi per shooting fotografico originale della flotta e delle rotte?
7. Chi firma i contenuti? Serve un'identità editoriale reale.
8. Consentiamo i crawler di training AI? (raccomandazione: sì)
9. Quali sono i 5 competitor di riferimento da tracciare nel share of voice?
10. Il progetto è giudicato su quale KPI dal cliente? Va allineato **prima** di partire, altrimenti a 4 mesi arriva "ma il traffico non è esploso".

---

*Fine documento. Se una tattica non è in questo file, è perché non è stata ancora valutata — non perché sia vietata. Aprire una PR su questo documento prima di implementarla.*
