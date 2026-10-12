# Il listino prezzi, la flotta e la sincronizzazione delle tab PRICES

Sezione del pannello nata il 12/10/2026. Questo file dice come sta
insieme, quali scelte ha fatto la proprietà e cosa guardare quando
qualcosa non va.

## Cosa c'è

| Indirizzo | Chi lo vede | Cosa fa |
|---|---|---|
| `/admin/listino/` | admin + partner | tutti i servizi con i prezzi di ogni variante e opzione, da Regiondo |
| `/admin/listino/flotta/` | admin + partner | i 6 mezzi, posti massimi, a quali servizi servono |
| `/admin/listino/sincronizza/` | solo admin | tabella prima/dopo delle tab PRICES e pulsante per allinearle |
| `/admin/listino/richieste/` | solo admin | richieste di accesso: approva / rifiuta; partner: password nuova, chiudi accesso |
| `/admin/listino/login/` | pubblico | accesso dei partner (email + password), in inglese |
| `/admin/listino/register/` | pubblico | richiesta di accesso, in inglese |

Il **partner** è un utente con ruolo `listino`: un'agenzia, un hotel,
un tour operator. Vede **solo** il listino e la flotta, in inglese.
L'admin vede le stesse pagine in italiano, con in più lo stato delle
tab PRICES.

## Le decisioni della proprietà (12/10/2026)

- I prezzi sono **quelli al pubblico** di Regiondo. Niente netti, niente
  commissioni.
- L'accesso lo dà **sempre l'admin**. La registrazione lascia solo una
  richiesta. All'approvazione il sito genera una password e la manda per
  email.
- L'area del partner è **in inglese**, il pannello dell'admin in italiano.
- Nel listino il **numero di persone sta sulle righe** e le varianti
  stanno in colonna. È stata scelta fra due anteprime.
- **Le tab PRICES non si rigenerano.** Il testo resta quello scritto e si
  cambiano **solo le cifre**. Non si cambiano da sole: lo fa l'admin col
  pulsante, dopo aver visto la tabella con le modifiche.
- **Foto della flotta** prese dal web: Wikimedia Commons, licenze libere,
  scontornate. Vedi sotto.

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

- **Abbinamento mezzo → tour:** confermato dalla proprietà. L'elenco dei
  tour sotto ogni mezzo si calcola dal catalogo (`impiegoDi`): i servizi
  «per party» vanno alle auto, quelli «per person» al minibus.
- I 25 posti dell'Isuzu sono stati confermati dalla proprietà.
- 🔴 **Le foto non sono dei nostri mezzi.** Vengono da Wikimedia Commons
  (CC BY-SA). La pagina lo dice e cita autore, licenza e fonte di
  ognuna.
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
  - `listino.test.ts`: sezioni, righe, flotta.
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
- **Un partner dice che la password non va.** Da «Richieste di accesso»,
  premere «Nuova password». Il sito gliela manda per email e la mostra
  anche a te.
