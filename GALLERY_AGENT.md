# La gallery con tag — come è fatta

Una striscia di fotografie in fondo alle pagine del sito, riempita da chi
accompagna gli ospiti e approvata da un amministratore. Costruita il
26/09/2026.

🔴 **Nasce spenta.** `gallery_settings.galleries_enabled = false`: il
codice è in produzione e non produce un byte di HTML per nessun
visitatore finché la proprietà non accende l'interruttore dal pannello.

---

## In due righe

Ogni pagina che può avere una gallery è un **tag**. Una foto porta uno o
più tag. Una pagina mostra la gallery quando ha almeno *N* foto
**approvate** con il suo tag. Chi carica non può approvare; chi approva
vede la foto insieme al suo testo e alle sue pagine.

---

## Le regole che non si discutono

**1. Una foto non approvata non è raggiungibile da nessuno.**
Non per convenzione: per vincolo del database.

```sql
constraint gallery_images_stato_bucket check (
  (status in ('approvata','nascosta') and bucket = 'gallery')
  or (status in ('in_attesa','rifiutata') and bucket = 'gallery-inbox')
)
```

`gallery-inbox` ha `public = false`, quindi senza un indirizzo firmato dal
server nessuna URL risponde. Provato: l'inserimento di una riga
`approvata` che punta all'inbox viene **rifiutato**.

**2. Un rifiuto senza motivo non si può scrivere.**
`gallery_images_rifiuto_motivato` lo impedisce nel database. Il motivo è
quello che la guida legge per capire cosa cambiare.

**3. La regola di visibilità sta in una funzione sola.**
`decidi()` in `src/lib/gallery-tag.ts`. La usa la pagina per decidere se
disegnarsi **e** il pannello per scrivere «Nascosta — sotto soglia 2/3».
Se fossero due, il pannello direbbe «Visibile» su una pagina vuota.

**4. Le foto non si mostrano come arrivano.**
2400px sul lato lungo, WebP, EXIF buttato (GPS compreso) — tutto **nel
browser**, prima di salire. Data di scatto e orientamento si leggono
**prima**, perché il canvas li distrugge.

**5. I prezzi non c'entrano niente con questo, e non devono entrarci.**
Qui non si scrive nessun numero commerciale: vale la regola 3 del
CLAUDE.md.

---

## I file

| File | Cosa fa |
|---|---|
| `src/lib/gallery-tag.ts` | 🔴 **le regole, senza database e senza React.** Registro, visibilità, titolo, ordinamento, proporzioni, `sizes`. È l'unico file provato dai test |
| `src/lib/gallery-dati.ts` | le tre letture per pagina, e le chiavi (`chiaveHome`, `chiaveTour`, `chiavePercorso`) |
| `src/lib/gallery-file.ts` | i file: firme di caricamento, anteprime firmate, copia, cancellazione. **L'unico posto che usa la chiave segreta** |
| `src/lib/exif-data.ts` | data di scatto e orientamento letti a mano dal JPEG. Nessuna libreria |
| `src/components/PageGallery.tsx` | il componente server: una riga nei template |
| `src/components/GalleryStriscia.tsx` | la striscia e il lightbox |
| `src/components/admin/preparaFoto.ts` | canvas: rotazione, ridimensionamento, WebP, colore dominante |
| `src/app/admin/gallery/azioni.ts` | tutte le server action |
| `src/app/admin/gallery/**` | il pannello: indice, carica, approva, mie, pagine, impostazioni |
| `src/components/admin/GalleryFotoPagina.tsx` | in «Pagine», il pulsante **Foto (n)**: ordine trascinato, stelle, foto da togliere |
| `src/styles/gallery.css` | la striscia sul sito |
| `src/styles/gallery-admin.css` | il pannello |

**Migrazioni:** `20260926_gallery.sql` (tabelle, vista, policy, bucket),
`20260926_gallery_esclusioni.sql` (fuori `/destinations/` e `/transfers/`).

🔴 **Non confondere `gallery-tag.ts` con `galleria.ts`.** `galleria.ts`
esisteva già ed è un'altra cosa: il filtro delle foto dei tour, quello che
tiene le vigne toscane fuori dalle pagine dei transfer per Venezia.

---

## Il registro: 103 voci

1 home + **1 album** + 5 categorie + 10 porti + 86 tour.

### L'album: `/album/` (dal 28/09/2026)

Un tag in più, `album` (tipo `album`), e una pagina pubblica che mostra
**tutte** le foto con quel tag, in una griglia. Deciso dalla proprietà:

- **Sempre visibile, senza le regole delle gallery**: niente interruttore
  generale, soglia, override, titolo o ordine delle impostazioni. La
  pagina non passa da `galleryDi()`/`decidi()`, e per questo **non compare
  in «Pagine»** (dove quelle manopole non girerebbero niente) né nel
  conteggio «su quante pagine comparirà» delle Impostazioni.
- **Ma solo foto approvate**: legge da `gallery_public`. L'approvazione è la
  tutela sul consenso delle persone ritratte, non un'impostazione.
- **Dalla più recente** (data di scatto, o di caricamento), con la stessa
  `ordina(…, 'newest')` delle gallery.
- Titolo «Our guests' *album*», link **«Guest album»** nel footer, nella
  sitemap, indicizzata. In fondo la frase sul consenso, nella forma breve.
- Griglia a **righe giustificate** in solo CSS (`AlbumGriglia.tsx`,
  `gallery.css`): foto intere e proporzionate, ordine da sinistra a destra.
  Il lightbox è quello delle gallery, esportato da `GalleryStriscia.tsx`.
- Il tag nasce dalla migration `20260928_gallery_album.sql` **e** da
  `registro()`: se mancasse lì, «Sincronizza pagine» lo marcherebbe orfano.
  Nel menu dei tag del caricamento è il primo gruppo, «Album del sito».
- Si aggiorna da solo: `rinfresca()` rigenera il percorso dei tag toccati,
  e quello del tag album è `/album/`.

🔴 **Solo i tour PUBBLICATI** (dal 27/09/2026). In `tours` ci sono 87
righe: 86 pubblicate e una bozza, `siena-san-gimignano-the-tuscan-countryside-landing`,
il doppione del vecchio WordPress che sul sito rimanda con un 308 alla
scheda vera. Prima entrava nel registro con un nome quasi uguale a quello
della scheda vera, e una foto taggata lì non sarebbe comparsa da nessuna
parte. La sua riga in `gallery_tags` (0 foto) è stata cancellata lo
stesso giorno.

**Escluse per decisione della proprietà (26/09/2026):** tutte le pagine il
cui indirizzo contiene `/destinations/` (9) o `/transfers/` (12). I tipi
`dest` e `transfer` sono usciti dal vincolo del database: non si possono
più creare.

⚠️ **Le schede dei singoli transfer restano dentro**: stanno sotto
`/tour/<slug>/`, non sotto `/transfers/`. Sono 32 delle 87 righe di
`tours`. Esce la pagina che *elenca* i transfer da Firenze, non la scheda
del transfer Firenze→Roma. Se un giorno devono uscire anche quelle, è una
riga in `ESCLUSI` dentro `gallery-tag.ts` — non una migrazione.

Escluse anche, come prima: `about-us`, `contact-us`, `faqs`,
`our-vehicles`, `guest-photos` (ha già la galleria Fotaflo), le legali, le
landing, il pannello.

**Il registro si riempie col pulsante «Sincronizza pagine»** in
`/admin/gallery/impostazioni/` (`SincronizzaPagine.tsx`; fino al
27/09/2026 stava in cima a «Pagine», spostato perché si usa di rado: la
prima volta e quando nasce un tour o una categoria). Non uno script `npm`: la regola 1 del CLAUDE.md
dice niente in locale, e uno script avrebbe voluto la chiave di servizio
sul PC. Non cancella mai una riga: una pagina che esce dal codice diventa
`is_orphan` e resta, con le sue foto.

---

## Chi può fare cosa

Si usano i ruoli che c'erano già in `profili`, **senza aggiungerne**:
`guida` era il default della colonna dall'inizio.

| | `admin` | `guida` |
|---|---|---|
| carica e tagga | sì, pubblicate subito | sì, vanno in attesa |
| approva / rifiuta / nasconde | sì | no |
| corregge foto altrui | sì | no |
| corregge le proprie | sempre | solo in attesa o rifiutate |
| Pagine, Impostazioni | sì | non le vede |
| resto di `/admin` | sì | no |

### Come si crea l'accesso di una guida

**Una riga in `autorizzati`. Non serve nessun invito da Supabase, e non
serve nessun profilo admin.**

```sql
insert into public.autorizzati (email, ruolo, nome)
values ('nome.cognome@esempio.com', 'guida', 'Nome Cognome');
```

Poi la persona va da sé su `https://prestigerent.com/admin/entra/`, scrive
il suo indirizzo, **lascia vuoto il campo password** e apre il link che
riceve per email. Al primo accesso il profilo nasce da solo.

🔴 **Il ruolo lo decide `autorizzati`, non il default della colonna.** È il
trigger `al_primo_accesso` su `auth.users`, che esegue `crea_profilo()`:

```sql
select ruolo, nome into r, n from autorizzati where lower(email) = lower(new.email);
if r is null then raise exception 'Questo indirizzo non e'' abilitato ad accedere.';
insert into profili (id, email, nome, ruolo) values (new.id, new.email, n, r);
```

Due conseguenze pratiche:

- **se l'indirizzo non è in `autorizzati`, l'accesso non si crea affatto.**
  Supabase risponde «Database error saving new user», che sembra un guasto
  del sito e non lo è: la schermata di accesso lo traduce già in «Questo
  indirizzo non è abilitato. Controlla di averlo scritto giusto».
  Invitare la persona da Supabase → Authentication → Users **senza** la
  riga in `autorizzati` non funziona: il trigger rifiuta l'inserimento;
- `ruolo` in `autorizzati` ammette solo `admin` e `guida`
  (`autorizzati_ruolo_check`): scriverne un altro fa fallire l'insert, che
  è quello che si vuole.

**Per cambiare ruolo a chi è già entrato** bisogna toccare tutte e due le
tabelle: `autorizzati` decide cosa succede al *primo* accesso, `profili` è
quello che il sito legge ogni volta.

```sql
update public.autorizzati set ruolo = 'guida' where email = '...';
update public.profili     set ruolo = 'guida' where email = '...';
```

**Per chiudere l'accesso** senza perdere la paternità delle foto
caricate: `update public.profili set attivo = false where email = '...'`.
`chiSono()` legge `attivo`, quindi la persona non entra più, e le sue foto
restano dove sono con il suo nome.

**Tre punti di controllo, non uno:**
1. le pagine chiamano `soloGestione()` (o controllano il ruolo a mano dove
   servono entrambi);
2. **ogni server action** chiama `chiAgisce()` — una action non passa da
   nessuna pagina e da nessun layout: si chiama con una POST;
3. **la RLS**, che è la difesa vera: le action scrivono con la sessione
   dell'utente e la chiave pubblicabile, quindi un controllo dimenticato
   nel codice non apre niente. Il database rifiuta comunque.

---

## L'ordine delle foto di una pagina

Da `/admin/gallery/pagine/`, pulsante **«Foto (n)»** sulla riga della
pagina (`GalleryFotoPagina.tsx`). Deciso con la proprietà il 27/09/2026:

- **le miniature arrivano nell'ordine del sito**, messe in fila da
  `ordina()` col criterio della pagina. «Prima qui» vuol dire «prima sul
  sito», qualunque sia il criterio;
- **trascinare vuol dire «Manuale»**: al salvataggio le posizioni diventano
  quelle dell'elenco (10, 20, 30…) e `sort_override` passa a `manual` da
  solo. Senza trascinamento le posizioni non si toccano e il criterio
  resta quello che era;
- 🔴 **in manuale la stella non conta.** `ordina()` con `manual` guarda
  solo la posizione, e il pannello la stella non la mostra. `pinned` resta
  nel database e torna a valere se la pagina passa a un criterio per data,
  casuale o alternato — solo lì serve a tenere una foto in testa;
- **togliere non è cancellare**: si cancella la riga di
  `gallery_image_tags` per QUELLA pagina. La foto resta in archivio
  («Tutte le foto») e sulle altre pagine, e si ritagga da lì;
- **sotto soglia la gallery sparisce da sola**, per `decidi()`. Il
  pannello lo annuncia prima del salvataggio, e dopo aggiorna la colonna
  «Foto» e lo «Stato» con il numero riletto dal database;
- si lavora sulle foto **approvate** (vista `gallery_public`): sono quelle
  che la colonna conta e la soglia misura. Una foto in attesa taggata su
  una pagina non ha un posto nella striscia finché non è approvata;
- 🔴 **una foto nuova su una pagina va IN FONDO**: l'ultima posizione di
  quella pagina + 10 (`inFondo()` in `gallery-tag.ts`, provata dai test),
  al caricamento, quando la si aggiunge a una pagina da «Tutte le foto»,
  e **di nuovo all'approvazione**. Non più un 1000 fisso;
- 🔴 **all'approvazione la foto di una guida si sposta in fondo, adesso**
  (dal 27/09/2026). La posizione presa al caricamento può essere diventata
  «in mezzo»: mentre la foto aspettava, la gallery può essere stata
  riordinata (le posizioni ripartono da 10) o allungata da un admin. Più
  foto approvate insieme arrivano in fila nell'ordine della coda. Una foto
  nascosta e poi rimessa, invece, torna **dov'era**: lì non si sposta;
- 🔴 **correggere una foto non disfa l'ordine**: `aggiornaFoto()` tocca
  solo le pagine aggiunte o tolte. Fino al 27/09/2026 riscriveva tutti i
  legami con posizione 1000 e senza stella: correggere una didascalia
  mandava la foto in fondo su ogni pagina. Rinfresca anche le pagine da
  cui la foto esce, che prima restavano in cache con la foto dentro.

Azioni: `fotoDellaPagina()` e `salvaFotoPagina()` in `azioni.ts`, tutte e
due dietro `chiAgisce(RUOLI_GESTIONE)`. Hanno sostituito `riordinaPagina()`,
che esisteva ma non la chiamava nessuno.

---

## Il ciclo di vita di una foto

```
guida carica ──► in_attesa ──admin approva──► approvata ──nascondi──► nascosta
                     │                            ▲                      │
                     └──admin rifiuta──► rifiutata ┘  (reinvia)          └──mostra──┘
admin carica ──────────────────────────► approvata
```

**L'approvazione fa tre cose, in questo ordine, e l'ordine conta:**
1. **copia** il file nel bucket pubblico — se va male non è cambiato
   niente;
2. **aggiorna la riga** (stato + bucket insieme) — passa dalla RLS; se il
   database rifiuta, la copia appena fatta viene **buttata**;
3. **toglie** l'originale dall'inbox — se va male è solo un file in più in
   un bucket privato, e non si annulla niente.

L'ordine inverso lascerebbe per un istante una riga approvata che punta a
un file che nel bucket pubblico non c'è: una foto rotta in pagina, che è
peggio di una foto non ancora approvata.

---

## Le email

`src/lib/posta.ts`, funzione `invia()` (aggiunta accanto a
`avvisaRichiesta()` e `confermaAlCliente()`, che non sono state toccate).
Parte da `SMTP_USER` e consegna dentro Microsoft, come le richieste: **l'hosting
Serverplan non riesce a mandare email a nessun indirizzo
`@prestigerent.com`** (vedi la sezione Posta del CLAUDE.md).

- **una email per invio**, non una per foto: «Marco ha inviato 12 foto da
  approvare», a `RICHIESTE_A`;
- a chi ha caricato, quando una foto viene rifiutata, **con il motivo**.

`invia()` non lancia mai: se la posta è giù, le dodici foto restano
caricate e l'admin le trova in coda comunque.

---

## Le scelte che si discostano dal piano, e perché

| | Il piano | Cosa c'è | Perché |
|---|---|---|---|
| cache | `unstable_cache` + `revalidateTag` | `revalidatePath` | il progetto **non ha nessuna cache di query**: mette in cache le pagine (ISR) e le rinfresca con `revalidatePath`, come fa già `admin/foto/azioni.ts`. Una seconda cache dentro una pagina già in cache non fa risparmiare niente e aggiunge un modo perché i due strati dicano cose diverse |
| ruolo | nuovo ruolo `user` | `guida` che c'era già | è il default di `profili.ruolo`, sta nel vincolo di `profili` **e** di `autorizzati`, e il pannello annunciava già «Caricamenti delle guide». Zero DDL sui ruoli |
| policy sui file | in migrazione | chiave segreta lato server | `storage.objects` appartiene a `supabase_storage_admin` e il ruolo delle migrazioni **non ne è membro** (`pg_has_role(...,'MEMBER') = false`, misurato). Una `create policy` lì dentro farebbe fallire la migrazione intera |
| menu dei tag | albero da `SEZIONI` | gruppi + ricerca | dopo le esclusioni il registro è 102 voci di cui **86 tour**: un albero di navigazione aggiunge profondità senza aiutare a trovare un tour, la ricerca sì. I quattro gruppi (Home/Categorie/Porti/Tour) coincidono con quello che resterebbe dell'albero |
| orientamento EXIF | `imageOrientation: 'from-image'` | letto e applicato a mano | dove quell'opzione non è supportata viene **ignorata in silenzio**: nessun errore, solo tutte le verticali coricate. Leggendo il tag e girando noi il risultato è uguale su ogni browser |
| data di scatto | `exifr` | ~60 righe nostre | serve **un** campo. `exifr` porta decine di tag nel bundle del pannello, cioè nel telefono di chi carica |
| titolo | uno predefinito | **due** | sulle schede tour in cima c'è già `PhotoStrip`: due strisce con lo stesso titolo sembrano un errore. L'alternativa era scrivere un titolo a mano su 87 schede |
| drag & drop dei tag | con `@dnd-kit` | caselle da spuntare + selezione multipla | il drag & drop c'è per i **file** (l'area di caricamento). Per i tag, su un telefono trascinare una foto su un albero di 103 voci è peggio di spuntare: la selezione multipla fa lo stesso lavoro in meno gesti |

---

## Cosa è provato, e come

`npm test` — 92 test in tre file (questo, l'EXIF, l'accesso), nessuna rete, nessun database, nessun `.next`.

- **la regola di visibilità**: interruttore, override `on`/`off`, soglia
  globale e per pagina, foto sotto soglia, zero foto;
- **il titolo**: `*parola*`, asterischi spaiati, i due predefiniti, il
  titolo della pagina che vince;
- **l'ordinamento**: i 5 criteri, le foto fissate in testa (ma **non** in
  manuale), lo spareggio stabile a parità di posizione, la data di
  caricamento quando manca quella di scatto, «casuale del giorno» uguale
  tutto il giorno e diverso domani, «alternata» con un solo formato,
  nessun criterio che perde foto;
- **le proporzioni**: limiti 9:16–2:1, panoramica contenuta, `sizes`
  diverso per verticale e orizzontale, «ci stanno tutte» misurato;
- **il registro**: esclusioni, nessun tipo `dest`/`transfer`, `ref_id`,
  chiavi doppie;
- **l'EXIF**: tutti e 8 gli orientamenti in **little e big endian** (gli
  iPhone scrivono MM), file rotti, date assurde, JPEG costruito byte per
  byte nel test.

🔴 **Non è provato e non si può provare in locale** (regola 1 del
CLAUDE.md, che vieta `next dev`): le redirezioni, i permessi in pratica,
come si vede in pagina, la posta. Si verifica con `curl`
sull'indirizzo pubblicato **dopo il push**.

---

## Da fare la prima volta, in ordine

1. **push** e attendere `deploy.yml` nelle Actions;
2. `/admin/gallery/impostazioni/` → **«Sincronizza pagine»**. Deve dire 102
   pagine;
3. **creare l'account di chi caricherà** — una riga in `autorizzati`, e
   basta (vedi sotto: non serve nessun invito da Supabase);
4. caricare qualche foto come guida, approvarle come admin;
5. `/admin/gallery/pagine/` → su **una** pagina di prova mettere
   visibilità «sempre accesa», e guardarla sul sito con l'interruttore
   generale ancora spento;
6. quando va bene: `/admin/gallery/impostazioni/` → l'interruttore. Chiede
   conferma e dice **su quante pagine** comparirà.

**Nessuna variabile d'ambiente nuova.** `SUPABASE_SECRET_KEY` era già in
uso (`numeri-freschi.ts`, `conversioni-memoria.ts`); `SMTP_*` e
`RICHIESTE_A` erano già lì per i moduli.

---

## Se qualcosa non va

| Sintomo | Dove guardare |
|---|---|
| le foto non compaiono sul sito | `/admin/gallery/pagine/`: la colonna Stato dice il motivo esatto, con la stessa funzione che usa la pagina |
| «Il registro delle pagine è vuoto» | «Sincronizza pagine», in Impostazioni |
| l'anteprima nella coda è un rettangolo vuoto | le firme durano 10 minuti: ricarica. È il prezzo del fatto che una foto in attesa non sia raggiungibile |
| «Lo spazio file non è configurato» | manca `SUPABASE_SECRET_KEY` nell'ambiente di Vercel |
| una foto HEIC viene rifiutata | è voluto, e il messaggio dice cosa fare (iPhone → Impostazioni → Fotocamera → Formati → «Più compatibile») |
| la guida vede tutto `/admin` | non dovrebbe più: `soloGestione()` in ogni pagina e `chiAgisce()` in ogni action, dal 26/09/2026 |
| una pagina segnata «orfana» | il suo indirizzo non è più nel codice. Le foto ci sono ancora: decidere se spostarle o cancellare la riga a mano |
