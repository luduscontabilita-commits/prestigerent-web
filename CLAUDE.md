# prestigerent-web — sito nuovo di Prestige Rent

Sostituisce il WordPress di `prestigerent.com`. Next.js 16 + React 19 su Vercel,
Supabase per contenuti e testimonianze, **Regiondo come unica fonte dei prezzi**.

---

## 🔴 DA FARE IL GIORNO DEL PASSAGGIO — TOGLIERE IL NOINDEX

Finche' il sito e' in prova gira con `SITE_NOINDEX=true`: manda l'header
`X-Robots-Tag: noindex` su ogni pagina e mostra un riquadro rosso in basso a
destra.

**Quando si va in produzione, in questo ordine:**

1. su Vercel: `SITE_NOINDEX=false`
2. ripubblicare
3. **verificare davvero**: `curl -sI https://prestigerent.com/ | grep -i robots`
   non deve stampare niente
4. il riquadro rosso deve essere sparito da solo

Se ci si dimentica, il sito nuovo funziona benissimo e **sparisce da Google**.
Ci si accorge del perche' settimane dopo, guardando il traffico a zero.

---

## Le regole che non si discutono

**1. Le URL non cambiano.** `/tour/nome-tour/` deve restare identico a quello di
WordPress, carattere per carattere. Sono 124 pagine con anni di posizionamento:
se cambiano servono 124 redirect e si brucia autorita'. Per questo l'inglese sta
alla radice e solo le altre lingue hanno il prefisso (`/es/tour/...`) — vedi
`src/middleware.ts`.

**2. I prezzi non si scrivono a mano, mai.** Stanno su Regiondo e si leggono da
li' (`src/lib/regiondo.ts`). Sul sito vecchio la stessa informazione viveva in
tre copie discordanti — landing, pagina WordPress, scheda Regiondo — e nessuna
era aggiornata. Se un prezzo appare in una tabella di Supabase, e' un bug.

**3. RLS accesa nella stessa migrazione che crea la tabella.** La chiave
pubblicabile finisce nel browser: senza policy, chiunque legge tutto. Sul
progetto Supabase dell'altra app dieci tabelle sono rimaste scoperte, non
ripetiamo l'errore.

**4. Niente segreti nei file versionati.** `.env*` e' gitignorato. Non mettere
mai un token dentro l'URL di un remote git.

## Dove sta cosa

| | |
|---|---|
| Supabase | progetto `prestigerent-web` — `oeipsfnbpaqkmwrxtcrn` (eu-west-1) |
| Regiondo | provider `PR193`, shop `prestigerent.regiondo.com` |
| Grafica | `src/styles/landing.css` — **importata dalla landing privata Siena**, gia' collaudata su traffico a pagamento. Non riscriverla |
| Lingue | `src/lib/locales.ts` — 8 lingue, inglese alla radice |

## Il limite di Regiondo sulle lingue

Provato il 24/08/2026, uno per uno: il widget di prenotazione accetta
`en, es, pt, de, ja, zh` ma **rifiuta russo e arabo**. Su quelle due lingue la
pagina e' tradotta e il solo calendario resta in inglese. Va detto al lettore,
non nascosto.

## Stato dei tour

87 righe in `tours`, **49 con prodotto Regiondo agganciato**, 38 senza. Di questi
38 alcuni il prodotto ce l'hanno davvero e non era mai stato montato sul sito
(`wine-experience-in-tuscany` -> `T-PR193-210790`,
`private-tour-siena-and-san-gimignano` -> `T-PR193-210791`). Vanno agganciati
quando arriva l'export completo dal pannello Regiondo.
