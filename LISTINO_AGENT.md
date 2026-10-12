# L'area partner: listino prezzi, flotta, sincronizzazione delle tab PRICES

Nata il 12/10/2026. Questo file dice come sta insieme, quali scelte ha
fatto la proprietà e cosa guardare quando qualcosa non va.

## Cosa c'è

**L'area dei partner**, in **inglese o italiano** a scelta (selettore
EN/IT), fuori da `/admin`: il partner non vede mai «admin»
nell'indirizzo.

| Indirizzo | Chi | Cosa |
|---|---|---|
| `/partners/` | pubblico | accesso; il link «Richiedilo / Request access» porta al modulo di richiesta (o `/partners/#request`) |
| `/partners/enter/?t=…` | chi ha il link dell'email | entra senza scrivere niente (vedi sotto) |
| `/partners/price-list/` | partner, admin | il listino, senza codici Regiondo |
| `/partners/fleet/` | partner, admin | i 6 mezzi, una riga per mezzo |

**Il pannello dell'admin**, in italiano, tutto sotto `/admin/partners/`:

| Indirizzo | Voce di menu | Cosa |
|---|---|---|
| `/admin/partners/listino/` | Listino prezzi → Listino | il listino con SKU, stato della tab PRICES, link «Modifica prezzi su Regiondo» per ogni servizio, pulsanti «PDF italiano / PDF English» |
| `/admin/partners/listino/pdf/?lingua=it\|en` | (pulsanti) | la brochure in PDF, solo admin |
| `/admin/partners/sincronizza/` | Listino prezzi → Sincronizza tab PRICES | tabella prima/dopo e pulsante per allineare |
| `/admin/partners/flotta/` | Flotta (voce a sé) | la flotta come la vede il partner, con le descrizioni modificabili in italiano e inglese |
| `/admin/partners/` | Partners → Richieste | richieste da approvare o rifiutare, con «Dati» |
| `/admin/partners/attivi/` | Partners → Partner attivi | chi ha accesso: «Dati», «Nuova password», «Chiudi l'accesso» |
| `/admin/partners/qrcode/` | Partners → QR code | il QR con il logo per brochure e stand, PNG su sfondo bianco, destinazione modificabile |

Gli indirizzi vecchi (`/admin/listino/…`, compresi `login/` e
`register/`) rimandano ai nuovi: alcuni sono già scritti in email
partite.

Il **partner** è un utente con ruolo `listino`: un'agenzia, un hotel,
un tour operator. Vede **solo** listino e flotta.

## Le decisioni della proprietà (12/10/2026)

- I prezzi sono **quelli al pubblico** di Regiondo. Niente netti, niente
  commissioni.
- L'accesso lo dà **sempre l'admin**. La richiesta resta in attesa;
  all'approvazione parte l'email con il link di accesso diretto e con
  email e password.
- L'area del partner sta su **`/partners`**, in **inglese o italiano**
  col selettore EN/IT. Il pannello dell'admin è in italiano, sotto
  `/admin/partners/`. La flotta ha una voce di menu propria.
- Nel listino il **numero di persone sta sulle righe** e le varianti
  stanno in colonna. È stata scelta fra due anteprime.
- **Le tab PRICES non si rigenerano.** Il testo resta quello scritto e si
  cambiano **solo le cifre**. Non si cambiano da sole: lo fa l'admin col
  pulsante, dopo aver visto la tabella con le modifiche.
- **La flotta è a righe**, con le immagini tutte della stessa misura e
  prese dal sito quando ci sono. Vedi sotto.

## Le due lingue dell'area partner

- **I testi** stanno tutti in `src/lib/partners-testi.ts`, inglese e
  italiano uno accanto all'altro. Il tipo `Testi` impedisce che una
  chiave esista in una lingua sola. I testi italiani dei mezzi sono in
  `src/lib/flotta.ts` (campo `it`), e si cambiano dal pannello (vedi
  «La flotta»).
- **La lingua** si decide in `src/lib/partners-lingua.ts`:
  1. il cookie `partners_lang`, scritto dal selettore;
  2. altrimenti la lingua del browser;
  3. altrimenti l'inglese.
- **Perché un cookie e non `/partners/it/`:** gli indirizzi sono già
  nelle email partite e nei preferiti, e devono aprirsi nella lingua
  giusta.
- **Restano in inglese:** i nomi dei tour e delle opzioni (vengono da
  Regiondo e dal sito) e le email ai partner. Il tipo di attività si
  salva sempre in inglese (`tipoInInglese`), anche se il partner l'ha
  scelto in italiano.

## Aspetto e telefono

- **Tabelle sobrie** (proprietà, 12/10/2026). La prima versione a
  colori, con fasce sfumate e intestazioni piene, è stata giudicata
  «troppo pacchiana». Oggi le tabelle sono grigio e inchiostro, e della
  sezione resta un accento minimo: l'icona del titolo e dei bottoni e una
  barra sottile a sinistra di ogni scheda (porti blu, transfer indaco,
  small group arancio, vino bordeaux, privati verde). Gli stili stanno in
  `ListinoTabelle.module.css` e non inline: inline la pagina pesava
  ~790 KB.
- **Prezzi nella lingua di chi legge**: «€1,000» in inglese, «€ 1.000»
  in italiano. Il punto delle migliaia si mette a mano, perché in
  italiano il browser non separa i numeri di quattro cifre.
- **Telefono** (provato a 390 px):
  - niente scorrimento laterale;
  - bottoni di almeno 36 px, menu a 44 px;
  - un pulsante «torna in cima» nel listino;
  - le immagini della flotta a tutta larghezza;
  - sotto i 576 px la scritta «PRESTIGE RENT» lascia il posto al solo
    logo, così il selettore EN|IT e «Esci» stanno su una riga.
- **`<html>` e `<body>` nei layout di `/admin` e `/partners`.** Mancavano,
  e senza `<html>` Next non scrive `data-dpl-id`. Il browser non
  riconosceva la versione del sito e ricaricava la pagina **per intero**
  a ogni aggiornamento, in tutto il pannello. Spiegato in
  `src/app/admin/layout.tsx`.

## La brochure in PDF

Il PDF si scarica da **Listino prezzi → PDF brochure** (`/admin/partners/pdf/`)
oppure dai pulsanti «PDF italiano» / «PDF English» in `/admin/partners/listino/`. È fatto per essere stampato e mostrato ai
clienti in fiera (proprietà, 12/10/2026).

- **Cosa contiene:** due facciate A4. In cima logo, presentazione,
  contatti e i numeri dell'azienda (dalla tabella `azienda`). Poi tutti
  i servizi con i prezzi letti da Regiondo in quel momento: una riga per
  servizio o per variante, colonne da 1 a 8 persone; i servizi a persona
  hanno «Adult € … · Youth € …» nella riga.
- **Il codice:** `src/lib/listino-pdf.ts` (funzione pura, provata da
  `listino-pdf.test.ts`) e la rotta `/admin/partners/listino/pdf/`, che
  controlla il ruolo e risponde 403 a chi non è admin.
- **Due pagine sempre:** il generatore impagina davvero a 8 pt e, se
  escono tre pagine, riprova con un carattere più piccolo, fino a 5,8 pt.
  Con 86 servizi oggi stanno in due pagine a 8 pt in italiano, poco
  meno in inglese.
- **Helvetica standard:** niente font da incorporare, il file pesa circa
  34 KB. I caratteri che non conosce (stelle e simili) li toglie
  `pulito()`.
- **Varianti uguali:** mattina e pomeriggio con gli stessi prezzi stanno
  in una riga sola; «Accademia» e «Uffizi» si scrivono senza ripetere
  l'inizio comune.

## Il QR code della fiera

Lo si trova in **Partners → QR code** (`/admin/partners/qrcode/`).

- **Cosa c'è dentro il QR:** sempre lo stesso indirizzo,
  `https://prestigerent.com/qr/partners/`.
- **Dove porta** lo decide la tabella `qr_link` (oggi
  `https://prestigerent.com/partners/`), e l'admin lo cambia dalla
  pagina. Così un QR già stampato sulle brochure si può ridirigere
  **senza ristampare niente**. È la scelta della proprietà del
  12/10/2026.
- **Il rimando** lo fa `src/app/qr/[codice]/route.ts`:
  - è un 302 e non un 301, perché i telefoni ricordano per sempre i
    rimandi permanenti e il cambio non avrebbe effetto;
  - un codice che non esiste porta alla home;
  - `/qr/` è escluso dalle lingue nel proxy.
- **Il PNG** lo genera `src/lib/qr-logo.ts`:
  - sfondo bianco (proprietà, 12/10/2026: prima era trasparente), moduli
    quasi neri, margine di 4 moduli già compreso nel PNG;
  - correzione d'errore «H», cioè leggibile anche con il 30% coperto;
  - un tondo vuoto al centro con il logo, che ne copre circa il 6%.
  - `qr-logo.test.ts` lo **rilegge** con `jsqr`, come un telefono.
  - **Va stampato su un fondo chiaro**: su un fondo scuro non si legge.
- **Download:** 512, 1024 o 2048 px (fino a 4096 con
  `?misura=`), solo per l'admin.

## Il link a Regiondo dal listino dell'admin

Ogni scheda del listino dell'admin ha **«Modifica prezzi su Regiondo»**,
che apre `regiondo.it/product/ticket/create/step/3/edit/<numero>/lang/3`.
Il numero è la parte finale dello SKU (T-PR193-**299825**). L'indirizzo
che usa Regiondo ha anche un `draft_id`, che cambia a ogni modifica e da
qui non si conosce. Serve aver fatto l'accesso a Regiondo nello stesso
browser. Il partner non lo vede: a lui lo SKU non arriva.

## L'email di accesso e il link diretto

L'email si scrive in `letteraAccesso()` (`src/app/admin/partners/azioni.ts`).
Parla di «Partners area», non di «price list». Contiene:

1. un **link che porta dentro senza scrivere niente**:
   `/partners/enter/?t=…`, valido **14 giorni**;
2. sotto, `prestigerent.com/partners/` con email e password, per quando
   il link è scaduto o da un altro dispositivo.

La richiesta era un link «con user e password già precompilate». Il
link **non contiene la password**: una password in un indirizzo finisce
nella cronologia, nei log e in chi riceve l'email inoltrata. Contiene un
gettone firmato dal sito (`src/lib/link-partner.ts`, HMAC con chiave
derivata da `SUPABASE_SECRET_KEY`), che dice «questa persona, fino a
questa data». Il gettone non si può fabbricare né modificare. All'apertura:
- l'azione `entraConLink()` controlla la firma, la scadenza e che il
  partner sia ancora attivo;
- apre la sessione con `generateLink` + `verifyOtp` di Supabase, senza
  mandare email;
- porta al listino.

Se il link è scaduto, la pagina lo dice e porta a `/partners/` con
l'email già scritta. **Non è monouso, apposta**: i filtri antispam
«aprono» i link per controllarli, e un link monouso arriverebbe già
consumato. Il rischio non cresce, perché la stessa email contiene già la
password. Chiudere l'accesso del partner spegne anche il link.

## Da dove vengono i prezzi

Da `widgets/booking/product/ticketVariations` di Regiondo
(`src/lib/regiondo-listino.ts`):
- è lo stesso indirizzo che chiama il widget di prenotazione;
- è pubblico e non chiede chiavi, ma va chiamato col `Referer` giusto;
- in una sola chiamata dà tutte le varianti di un prodotto, con opzioni
  e prezzi;
- la lettura dura 5 minuti in cache; l'admin ha «Rileggi adesso».

La riserva ufficiale è `products/availoptions/{variationId}` dell'API
firmata, che dà gli stessi prezzi. Vuole però una chiamata per ogni
variante e una data.

**Sito → Regiondo non si può fare.** L'API ufficiale
(`https://api.regiondo.com/api.json`, 56 endpoint) non ha nessuna
scrittura su prodotti, varianti, opzioni o prezzi. L'unica strada sarebbe
automatizzare il pannello web di Regiondo: è fragile, non è supportata e
si sconsiglia. Se serve davvero, va chiesto a Regiondo un accesso in
scrittura.

Il prezzo «from» della riga `hero-dep` nelle schede era già letto da
Regiondo (`fetchProduct().price`, aggiornato ogni ora) e non è stato
toccato. Su 3 tour (Siena small group, Wine Experience, Wine & Food)
mostra il prezzo adulto anche se la tariffa youth costa meno: è giusto
così.

## La sincronizzazione delle tab PRICES

La logica sta in `src/lib/prezzi-tab.ts` ed è provata da
`prezzi-tab.test.ts`.

1. Si leggono gli importi della tab nell'ordine in cui compaiono. La
   lettura si ferma ai titoletti degli extra («Optional», «Important»…)
   e scarta le cifre sotto i 10 €.
2. Si abbinano **per ordine** alle opzioni di Regiondo, non per valore,
   perché il valore è proprio quello che cambia. Le file possibili sono
   due: tutte le varianti (La Spezia: «Accademia» e «Uffizi» costano
   uguale, ma la tab le scrive tutte e due) oppure le varianti identiche
   contate una volta (wine experience AM/PM). Vale quella il cui conto
   torna con gli importi della tab.
3. Ci sono due freni. Il numero di importi deve tornare, e dove la riga
   dice «party of N» l'opzione deve essere «N people». Se un freno scatta,
   la pagina risulta «da sistemare a mano» e il pulsante non la tocca.
4. Si riscrivono solo le cifre, nel formato di prima: «690.00» diventa
   «680.00», «90,00» resta con la virgola.
5. Ogni sincronizzazione salva la tab di prima in `prezzi_tab_storico`.
   «Annulla» la rimette, ma solo se nel frattempo nessuno l'ha cambiata.

Stato al 12/10/2026, su 86 tour pubblicati (tutti con prodotto
Regiondo): **85 allineate, 1 da aggiornare**. È
`/tour/chianti-wineries-from-livorno-port/`: sul sito 690…1520,
su Regiondo 680…1440.

🔴 **Eccezione dichiarata alla regola 3 del CLAUDE.md.** Le tab PRICES
contengono una copia dei prezzi. La fonte resta Regiondo, e la copia si
riallinea col pulsante. È una scelta della proprietà, che vuole vedere
la modifica prima che vada online.

## Gli utenti del listino

- **Il ruolo è `listino`**, accettato dai vincoli di `profili` e
  `autorizzati` (migrazione `20261012_listino.sql`). `e_admin()` ed
  `e_caricatore()` non lo riconoscono, quindi nessuna policy esistente
  gli dà niente. Verificato su `pg_policies`: le uniche policy aperte a
  qualunque autenticato riguardano dati già pubblici, più il proprio
  profilo.
- **Come è chiuso il recinto:**
  - `soloListino()` (`src/lib/auth.ts`) apre solo le due pagine;
  - `/admin/` rimanda il ruolo `listino` al listino;
  - tutte le altre pagine usano `soloGestione()` / `soloCaricatori()`,
    che lo rimandano a `/admin/`;
  - le azioni usano `chiAgisce(RUOLI_GESTIONE)`.
- **La registrazione non crea un utente.** Lascia una riga in
  `richieste_listino`, scritta dalla server action con la chiave
  segreta: non c'è nessuna policy per `anon`. I motivi:
  - Supabase Auth è condiviso col pannello TURNI;
  - il trigger `crea_profilo()` rifiuta chi non è in `autorizzati`.
- **All'approvazione** si fa come in `creaGuida()`:
  1. si scrive la riga in `autorizzati` (ruolo costante `listino`);
  2. si crea l'utente con la chiave segreta;
  3. si manda l'email con la password.

  Se l'email non parte, il pannello mostra la password all'admin.
- **I dati della registrazione.** Obbligatori:
  - nome e cognome;
  - azienda e tipo di attività;
  - paese;
  - email;
  - **telefono**, obbligatorio per decisione della proprietà del
    12/10/2026: nome, email e telefono sono il minimo.

  Facoltativi: sito e note. L'admin vede tutto in «Partners»
  (Richieste e Partner attivi) e nell'email di avviso. Il pulsante **«Dati»** apre il pannello
  laterale con tutti i campi scritti alla registrazione. Lo si trova su
  ogni richiesta e su ogni partner già approvato: per questi i dati si
  leggono dalla loro richiesta, perché `profili` non li conserva.
- **Freni alla registrazione:**
  - un campo esca;
  - una sola richiesta in attesa per indirizzo;
  - al massimo 30 richieste all'ora;
  - niente indirizzi `.invalid`.

## La flotta

I dati stanno in `src/lib/flotta.ts`. I mezzi sono sei:

| Mezzo | Posti max | Per cosa |
|---|---|---|
| Mercedes Classe E | 4 | privati, porti e transfer da 1 a 3 persone |
| Mercedes Classe S | 4 | gli stessi servizi, su richiesta |
| Mercedes Classe V | 6 | da 4 a 6 persone |
| Mercedes Sprinter | 8 | da 7 a 8 persone |
| Isuzu minibus (6 in flotta) | 25 | i 3 small group |
| Mercedes Atego (4 in flotta) | 36 | gruppi da 9 in su, eventi e matrimoni, su richiesta; uno ha il bagno e 28 posti |

- **Una riga per mezzo**, non schede (proprietà, 12/10/2026):
  l'immagine a sinistra in un riquadro fisso 2:1, accanto nome, posti,
  descrizione e servizi. Sul telefono l'immagine va sopra
  (`src/components/partners/FlottaRighe.tsx`, client; i dati li prepara
  `FlottaVista.tsx`).
- **I testi si modificano dal pannello** (proprietà, 12/10/2026), in
  `/admin/partners/flotta/`:
  - selettore Italiano / English in alto;
  - clic su un testo → sale dal basso una finestra con l'editor; la
    pagina scorre perché il testo resti visibile sopra, e cambia mentre
    si scrive;
  - salvataggio automatico dopo 700 ms senza scrivere, e subito alla
    chiusura o al cambio di lingua;
  - «Ripristina il testo originale» torna a quello di `src/lib/flotta.ts`.

  Campi modificabili: nome del mezzo, tipo, descrizione, «posti e
  bagagli», «per cosa si usa» (solo l'Atego: per gli altri lo dice la
  regola dei posti). **Ogni riga è un testo intero** (proprietà,
  12/10/2026: «fammi modificare tutta la riga, non a porzioni»): nota sui
  posti e bagagli, che erano due pezzi della stessa riga, sono un campo
  solo, `dettagli`. Il nome è lo stesso nelle due lingue finché non lo si
  cambia in una. Nome, tipo e descrizione non possono restare vuoti; gli
  altri, svuotati, spariscono dalla pagina. Posti, foto e numero di
  mezzi restano nel codice.

  Le modifiche stanno in **`flotta_testi`** (chiave, lingua, campo, testo;
  migrazione `20261012_flotta_testi.sql`, lettura per tutti, scrittura
  solo `e_admin()`) e **vincono sul codice** (`testiMezzo`). Azioni in
  `src/app/admin/partners/flotta/azioni.ts`, con `chiAgisce` in prima
  riga. Il partner vede la modifica alla prima pagina che apre: le due
  pagine sono dinamiche, niente cache da svuotare. Se la tabella non si
  legge, la pagina mostra i testi del codice invece di rompersi.
- **Foto tutte uguali**: tela 800×400 trasparente, il mezzo dentro un
  riquadro 740×330, centrato, a 24 px dal fondo. Le **4 auto** sono le
  immagini di studio già usate dal sito (`/our-vehicles/`). L'**Isuzu** è
  un nostro minibus vero, con la livrea «Wine Experience», scontornato.
  L'**Atego** resta la foto di Wikimedia Commons: l'unica nostra, a
  Piazzale Montelungo, è troppo piccola. È l'unica con i crediti, in
  fondo alla pagina.
- **Abbinamento mezzo → tour:** confermato dalla proprietà. Per le auto la
  pagina dice solo per quante persone sono: l'elenco «Show the 83
  services» è stato tolto su richiesta della proprietà. Per il minibus
  elenca i 3 small group, calcolati dal catalogo (`impiegoDi`).
- I 25 posti dell'Isuzu sono stati confermati dalla proprietà.
- 🔴 **Le foto non sono dei nostri mezzi.** Vengono da Wikimedia Commons
  (CC BY-SA). I crediti (autore, licenza, fonte) stanno in **una riga in
  fondo alla pagina**. Dalle schede li ha fatti togliere la proprietà, ma
  del tutto non si possono togliere: la licenza obbliga a citare
  l'autore.
- 🔴 **Niente marchi di altre aziende** (proprietà, 12/10/2026). Restano
  solo quelli del costruttore. Le prime foto dei bus portavano la livrea
  di altre compagnie e sono state sostituite: l'Isuzu ora è un Turquoise
  senza scritte, e sull'Atego è stato cancellato il blocco col nome del
  proprietario. Targhe sfocate.
- **Per cambiare una foto:**
  - i file sono in `public/listino/flotta/`;
  - si scontornano con `rembg` (modello `isnet-general-use`);
  - va rifatto il controllo su marchi e targhe.

## Come si prova

- `npm test` prova:
  - `prezzi-tab.test.ts`: importi, abbinamento, riscrittura;
  - `listino.test.ts`: sezioni, righe, flotta;
  - `flotta.test.ts`: i testi modificati dall'admin sopra quelli del
    codice.
- `npm run prova:pannello` entra come admin e apre tutte le pagine,
  comprese le sei nuove. Con `PROVA_PARTNER_EMAIL` e
  `PROVA_PARTNER_PASSWORD` in `.env.local` entra anche come partner e
  controlla due cose:
  - il listino e la flotta si aprono;
  - tutte le altre pagine lo rimandano altrove.

## Cosa guardare quando qualcosa non va

- **«Regiondo non ha risposto per N prodotti».** Riprova fra poco. Se
  succede su tutti, il widget di Regiondo ha cambiato indirizzo: passare
  alla riserva `availoptions`.
- **Una tab diventa «da sistemare a mano».** Qualcuno ha aggiunto o tolto
  un'opzione su Regiondo, o una variante non è più identica alla sua
  gemella. Si corregge il testo della tab a mano; il pulsante non lo fa,
  apposta.
- **Un partner dice che la password non va.** Da «Partners → Partner attivi»,
  premere «Nuova password». Il sito gliela manda per email e la mostra
  anche a te.
