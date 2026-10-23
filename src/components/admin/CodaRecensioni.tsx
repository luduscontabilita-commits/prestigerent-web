'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconPencil,
  IconStarFilled,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import {
  CRITERI,
  graveDi,
  guaiDi,
  nomeDi,
  siPuoPubblicare,
  type Guaio,
  type Recensione,
} from '@/lib/risposte';
import { costoStimato, MODELLI, modelloConsigliato, rispostaLunga } from '@/lib/modello';
import { linkProdottoViator } from '@/lib/prodotti-viator';
import {
  approva,
  importaRiepilogo,
  riapri,
  salvaCorrezione,
  salvaTestoRecensione,
  scarta,
  scriviRisposta,
  segnaPubblicata,
  type Esito,
} from '@/app/admin/recensioni/azioni';

/* LA CODA, COME SI GUARDA.
 *
 * ── PERCHE' I CONTROLLI SI RIFANNO QUI, NEL BROWSER ───────────────────
 * `guaiDi()` sta in `src/lib/risposte.ts`, che e' un modulo puro senza
 * direttive: lo stesso codice gira sul server quando scrive il modello e
 * qui mentre si corregge a mano. Non e' una copia -- e' lo stesso file. E
 * serve: correggendo una risposta si vedono gli avvisi cambiare MENTRE si
 * scrive, invece di scoprire dopo il salvataggio che si e' superata la
 * lunghezza o che si e' promesso un rimborso.
 *
 * ── 🔴 PERCHE' NON C'E' UN PULSANTE «PUBBLICA» ────────────────────────
 * Perche' non esiste niente da chiamare. Nessuno dei portali ha un'API
 * per scrivere una risposta. Il giro vero e': approva -> «Copia» ->
 * «Apri nel portale» -> incolla -> «Segna pubblicata». Un pulsante
 * «Pubblica» che in realta' marca una riga sarebbe una bugia
 * nell'interfaccia, e il giorno che qualcuno si fida la risposta non c'e'.
 *
 * ── L'ORA DI USCITA SI MOSTRA, E SI PUO' IGNORARE ─────────────────────
 * Il calcolo del ritardo (src/lib/attesa.ts) dice quando TOCCHEREBBE a
 * ogni risposta: serve a non pubblicarne diciotto nello stesso minuto.
 * Ma qui chi incolla e' una persona, e una persona puo' avere fretta:
 * l'ora e' un suggerimento scritto accanto al pulsante, non un blocco.
 */

export type Riga = {
  id: number;
  fonte: string;
  portale: string;
  prodotto: string;
  titolo: string;
  autore: string;
  voto: number | null;
  lingua: string | null;
  testo: string | null;
  risposta: string | null;
  corretto: string | null;
  stato: string;
  modello: string | null;
  costo: number | null;
  link_risposta: string | null;
  pubblicare_il: string | null;
  pubblicata_il: string | null;
  /** la data che mostra il portale: e' l'unico modo di ritrovare una
   *  recensione, perche' Viator non ha un indirizzo per la singola */
  data_recensione: string | null;
};

/** Quanti ne mostra una pagina del portale Viator. Contato a mano. */
const PER_PAGINA = 10;

/** Le emoji che servono davvero per rispondere a una recensione di un
 *  tour: ringraziamento, vino, campagna, calore. Non un pannello di
 *  trecento faccine -- otto che si premono senza pensarci. */
const EMOJI: readonly { c: string; che: string }[] = [
  { c: '\u{1F64F}', che: 'grazie (mani giunte)' },
  { c: '\u{1F377}', che: 'vino' },
  { c: '\u{1F942}', che: 'brindisi' },
  { c: '\u{1F33F}', che: 'campagna, verde' },
  { c: '\u{1F31E}', che: 'sole, bella giornata' },
  { c: '\u{1F60A}', che: 'sorriso' },
  { c: '❤️', che: 'cuore' },
  { c: '\u{1F44F}', che: 'applauso, bravo' },
];

/**
 * Dove sta ogni recensione NELL'ELENCO DEL PORTALE.
 *
 * 🔴 Serve perche' Viator non ha un indirizzo per la singola recensione:
 * per ritrovarne una bisogna scorrere cinque pagine da dieci. Ma
 * quell'elenco e' ordinato per data, dalla piu' recente — quindi la
 * posizione in quell'ordine E' l'indirizzo. «Pagina 3, nona riga» si
 * trova in dieci secondi.
 *
 * A parita' di data l'ordine del portale non e' garantito, quindi la
 * riga puo' ballare di una o due posizioni: si dice «circa», non si
 * finge una precisione che non c'e'.
 */
function posizioniNelPortale(righe: Riga[]): Map<number, { pagina: number; riga: number }> {
  const ordinate = righe
    .filter((r) => r.data_recensione)
    .sort((a, b) => (b.data_recensione ?? '').localeCompare(a.data_recensione ?? ''));
  const m = new Map<number, { pagina: number; riga: number }>();
  ordinate.forEach((r, i) => {
    m.set(r.id, { pagina: Math.floor(i / PER_PAGINA) + 1, riga: (i % PER_PAGINA) + 1 });
  });
  return m;
}

const COLORE_FONTE: Record<string, string> = {
  viator: 'teal',
  tripadvisor: 'green',
  getyourguide: 'blue',
};

const COLORE_STATO: Record<string, string> = {
  nuova: 'gray',
  letta: 'yellow',
  bozza: 'orange',
  approvata: 'blue',
  pubblicata: 'green',
  saltata: 'dark',
};

const oraRoma = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function quando(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : oraRoma.format(d);
}

/** Un prezzo in centesimi di dollaro, con tante cifre quante servono a
 *  non diventare «0,00 ¢» -- che su un pulsante si legge come «gratis». */
function prezzo(dollari: number): string {
  const c = dollari * 100;
  return `${c.toFixed(c < 0.1 ? 3 : 2).replace('.', ',')} ¢`;
}

/** Le stelle come si vedono sul portale: piene colorate, vuote grigie,
 *  e il numero accanto. Un «5★» scritto a testo si legge peggio e non si
 *  distingue al volo da un 3★ scorrendo sessanta righe -- che e' proprio
 *  quello che si fa in questa pagina. Sotto le quattro stelle il numero
 *  diventa rosso: li' cambia il modo di rispondere. */
function Stelle({ voto }: { voto: number | null }) {
  if (voto === null) {
    return (
      <Text size="xs" c="dimmed">
        voto non letto
      </Text>
    );
  }
  const piene = Math.round(voto);
  const critica = voto <= 3;
  return (
    <Group gap={2} wrap="nowrap" align="center">
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStarFilled
          key={i}
          size={13}
          style={{
            color:
              i <= piene
                ? critica
                  ? 'var(--mantine-color-red-6)'
                  : 'var(--mantine-color-yellow-6)'
                : 'var(--mantine-color-gray-3)',
          }}
        />
      ))}
      <Text size="sm" fw={700} ml={4} c={critica ? 'red.8' : undefined}>
        {Number(voto) % 1 === 0 ? Number(voto).toFixed(0) : voto}
      </Text>
    </Group>
  );
}

function Numero({ n, che, colore }: { n: number; che: string; colore?: string }) {
  return (
    <Card withBorder radius="md" padding="sm">
      <Text fz={28} fw={800} lh={1.1} c={colore}>
        {n}
      </Text>
      <Text size="xs" c="dimmed">
        {che}
      </Text>
    </Card>
  );
}

/** Gli avvisi dei controlli, come si leggono accanto al testo. */
function Avvisi({ guai }: { guai: Guaio[] }) {
  if (!guai.length) {
    return (
      <Group gap={6}>
        <IconCheck size={15} color="var(--mantine-color-green-7)" />
        <Text size="xs" c="green.7" fw={600}>
          tutti i controlli passati
        </Text>
      </Group>
    );
  }
  return (
    <Stack gap={4}>
      {guai.map((g, i) => (
        <Group key={i} gap={6} wrap="nowrap" align="flex-start">
          <Badge
            size="xs"
            variant="filled"
            color={g.gravita === 'blocca' ? 'red' : 'yellow'}
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            {g.gravita === 'blocca' ? 'blocca' : 'pesa'}
          </Badge>
          <Text size="xs" c={g.gravita === 'blocca' ? 'red.8' : 'dimmed'}>
            {g.perche}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}

/** Le prime parole di una risposta, normalizzate: e' con queste che si
 *  riconosce la formula ripetuta. Sei parole bastano -- «I'm so glad you
 *  enjoyed the small group» e «I'm so glad you enjoyed the wine» sono la
 *  stessa apertura per chi legge. */
function aperturaDi(testo: string): string {
  return (testo || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\s']/gu, ' ')
    .split(/\s+/)
    .slice(0, 6)
    .join(' ');
}

function Riquadro({
  r,
  apertureRipetute,
  costoReale,
  dove,
  avvisa,
}: {
  r: Riga;
  apertureRipetute: Set<string>;
  /** la spesa MEDIA gia' misurata per ogni modello, da OpenRouter */
  costoReale: Map<string, number>;
  /** dove sta nell'elenco del portale: e' l'unico «indirizzo» che esiste */
  dove?: { pagina: number; riga: number };
  /** 🔴 Da dire al piano di sopra quando questa riga CAMBIA SCHEDA.
      Serve perche' l'avviso non puo' stare dentro il riquadro: appena
      l'azione riesce, la riga esce dal filtro e il riquadro sparisce --
      portandosi via il messaggio. */
  avvisa: (testo: string, vai?: Filtro) => void;
}) {
  /* 🔴 `useState` LEGGE LA PROPS UNA VOLTA SOLA, alla nascita del
     componente. Quando l'azione sul server finisce, la pagina si
     rinfresca e arriva la risposta nuova -- ma queste due caselle
     restano con il valore di prima, cioe' VUOTE.
     E' il guasto che si vedeva il 23/10/2026: «ho premuto, gira a
     vuoto». La risposta c'era davvero (il riquadro mostrava il modello
     e il costo), semplicemente non compariva nella casella.
     Si risolve ricordando l'ultimo valore ARRIVATO e riallineando la
     casella quando cambia -- senza toccare quello che si sta scrivendo
     a mano, perche' li' il valore arrivato non e' cambiato. */
  const servitoTesto = r.testo ?? '';
  const servitaRisposta = r.corretto ?? r.risposta ?? '';
  const [testoRec, setTestoRec] = useState(servitoTesto);
  const [risposta, setRisposta] = useState(servitaRisposta);
  const [ultimoServito, setUltimoServito] = useState({
    testo: servitoTesto,
    risposta: servitaRisposta,
  });
  if (
    ultimoServito.testo !== servitoTesto ||
    ultimoServito.risposta !== servitaRisposta
  ) {
    setUltimoServito({ testo: servitoTesto, risposta: servitaRisposta });
    setTestoRec(servitoTesto);
    setRisposta(servitaRisposta);
  }
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [copiato, setCopiato] = useState(false);
  const [inCorso, parti] = useTransition();
  /* 🔴 QUALE pulsante sta lavorando. Senza, `loading={inCorso}` accende
     la rotella su TUTTI i pulsanti del riquadro -- i quattro modelli e
     anche «Approva» -- e chi guarda non capisce cosa ha premuto ne' cosa
     sta succedendo. Visto in una schermata della proprieta' il
     23/10/2026: cinque rotelle che girano insieme. */
  const [quale, setQuale] = useState<string | null>(null);
  /* 🔴 «L'ho incollata nel portale» CHIEDE CONFERMA, e c'e' un motivo
     preciso. Il 23/10/2026 e' stata segnata per sbaglio una risposta mai
     incollata: premuto «Approva», la riga e' saltata in cima, i pulsanti
     sono cambiati sotto il cursore e il clic dopo e' finito su questo.
     E' l'unico pulsante che afferma qualcosa sul MONDO FUORI -- tutti
     gli altri cambiano solo lo stato qui dentro. Se mente, il pannello
     dice «fatto» su una risposta che nel portale non c'e'. */
  const [confermaFatta, setConfermaFatta] = useState(false);

  /* I controlli, ricalcolati a ogni battuta. La recensione che si passa e'
     quella con il testo CORRENTE della casella, non quello salvato: se si
     incolla il testo e si corregge la risposta nello stesso momento, gli
     avvisi guardano quello che si ha davanti. */
  const guai = useMemo(() => {
    if (!risposta.trim()) return [];
    const rec: Recensione = {
      id: r.id,
      fonte: r.fonte,
      autore: r.autore,
      voto: r.voto,
      titolo: r.titolo,
      testo: testoRec,
      lingua: r.lingua,
      tour_slug: r.prodotto,
      data: null,
    };
    const trovati = guaiDi(risposta, rec);
    /* 🔴 IL CONTROLLO CHE `guaiDi` NON PUO' FARE, e che serviva piu' di
       tutti: guarda le ALTRE risposte. `guaiDi` vede una risposta alla
       volta, quindi non si accorge che venti cominciano uguale -- e
       l'apertura e' la cosa che si ripete di piu' (7 su 10 il 22/10,
       e anche Haiku il 23/10). Qui il browser ha tutta la coda in mano,
       quindi il confronto si fa qui, dove e' l'unico posto in cui si
       puo' fare. */
    const ap = aperturaDi(risposta);
    if (ap && apertureRipetute.has(ap)) {
      trovati.push({
        gravita: 'pesa',
        perche: `altre risposte in coda cominciano uguale («${ap}…»): in fila sulla pagina del prodotto si vede`,
      });
    }
    return trovati;
  }, [risposta, testoRec, r, apertureRipetute]);

  const cambiata = risposta.trim() !== (r.corretto ?? r.risposta ?? '').trim();
  const testoCambiato = testoRec.trim() !== (r.testo ?? '').trim();

  /* quale modello conviene per QUESTA recensione, e se la risposta sara'
     lunga: la regola sta in src/lib/modello.ts, accanto ai prezzi, perche'
     e' una decisione di spesa e non di grafica */
  const lunga = rispostaLunga(r.voto);
  const idConsigliato = modelloConsigliato(r.voto);

  /* 🔴 La recensione che nessun modello deve toccare. Si ricalcola sul
     testo CORRENTE: se lo incolli adesso, l'avviso compare mentre scrivi,
     prima che tu possa premere un pulsante. */
  const grave = useMemo(() => graveDi(testoRec || r.testo), [testoRec, r.testo]);

  /* `dove` e `cosa` dicono dove finisce la riga dopo l'azione. Senza,
     succede quello che e' successo il 23/10/2026 premendo «Haiku»: la
     risposta viene scritta, la riga passa da «Da fare» a «Bozze», esce
     dal filtro che si stava guardando e SPARISCE senza che niente lo
     dica. Chi guarda pensa di aver rotto qualcosa. */
  function esegui(
    azione: () => Promise<Esito>,
    finisceIn?: Filtro,
    cosa?: string,
    tasto?: string
  ) {
    setMessaggio(null);
    setQuale(tasto ?? null);
    parti(async () => {
      const esito = await azione();
      if (!esito.ok) {
        setMessaggio(esito.errore ?? 'Non e` andata.');
        setQuale(null);
        return;
      }
      /* 🔴 SI SPEGNE SEMPRE, anche quando e' andata bene. Prima
         `setQuale(null)` stava solo nel ramo dell'errore: a buon fine
         la rotella restava accesa per sempre, e sembrava che il
         pulsante «girasse a vuoto». */
      setQuale(null);
      if (cosa) {
        const chi = r.autore || r.titolo || 'la recensione';
        avvisa(`${cosa} — ${chi}`, finisceIn);
      }
    });
  }

  /* L'emoji entra DOVE STA IL CURSORE, non in fondo: se stai correggendo
     la prima riga e il 🙏 ti finisce dopo la firma, il pulsante e' piu'
     fastidioso che utile. Se la casella non ha il fuoco, va in coda. */
  const casella = useRef<HTMLTextAreaElement>(null);
  function metti(emoji: string) {
    const el = casella.current;
    if (!el) {
      setRisposta((t) => t + emoji);
      return;
    }
    const a = el.selectionStart ?? el.value.length;
    const b = el.selectionEnd ?? a;
    const nuovo = el.value.slice(0, a) + emoji + el.value.slice(b);
    setRisposta(nuovo);
    /* il cursore si rimette subito dopo l'emoji, se no riparte da capo
       e si continua a scrivere all'inizio del testo */
    requestAnimationFrame(() => {
      el.focus();
      const p = a + emoji.length;
      el.setSelectionRange(p, p);
    });
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(risposta);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setMessaggio('Il browser non ha concesso la copia: seleziona il testo e copialo a mano.');
    }
  }

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      style={grave ? { borderColor: 'var(--mantine-color-red-6)', borderWidth: 2 } : undefined}
    >
      <Stack gap="xs">
        {grave ? (
          <Alert color="red" variant="filled" icon={<IconAlertTriangle size={18} />}>
            <Text size="sm" fw={700}>
              Questa non la scrive un programma: {grave.motivo}
            </Text>
            <Text size="xs" mt={4}>
              Il controllo e&rsquo; scattato su «{grave.spia}». La risposta pubblica va scritta a mano,
              e dopo aver parlato con chi c&rsquo;era: una frase sbagliata qui sotto resta pubblica per
              sempre sotto il nome dell&rsquo;azienda, e in un caso cosi&rsquo; «ci dispiace che si sia
              sentito cosi&rsquo;» sposta la colpa su chi l&rsquo;ha subita.
            </Text>
          </Alert>
        ) : null}

        {/* chi, dove, quanto */}
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap={8} wrap="wrap">
            <Badge color={COLORE_FONTE[r.fonte] ?? 'gray'} variant="light">
              {r.fonte}
            </Badge>
            <Badge
              color={COLORE_STATO[r.stato] ?? 'gray'}
              variant="filled"
              title={
                r.stato === 'pubblicata'
                  ? 'Segnata a mano da chi ha incollato la risposta nel portale. Il pannello NON pubblica: non esiste nessuna API per farlo.'
                  : undefined
              }
            >
              {r.stato === 'pubblicata' ? 'incollata a mano' : r.stato}
            </Badge>
            <Stelle voto={r.voto} />
            <Text size="sm" fw={600}>
              {r.autore || 'senza nome'}
            </Text>
            {/* 🔴 QUALE nome usera' il motore, scritto accanto. Meta' degli
                autori sui portali sono nomi utente (`lisaaX4327EU`), e su
                quelli la risposta si apre SENZA nome: scritto qui, si
                capisce subito perche' una risposta non saluta per nome,
                invece di sembrare una dimenticanza. */}
            {nomeDi(r.autore) ? (
              <Badge size="xs" variant="dot" color="teal" title="Il motore si rivolgera` al cliente con questo nome">
                {nomeDi(r.autore)}
              </Badge>
            ) : (
              <Badge size="xs" variant="dot" color="gray" title="E` un nome utente, non un nome: la risposta non salutera` per nome, e non se ne inventera` uno">
                senza nome usabile
              </Badge>
            )}
            {r.lingua ? (
              <Badge size="xs" variant="outline" color="gray">
                {r.lingua}
              </Badge>
            ) : null}
          </Group>
          <Text size="xs" c="dimmed">
            {r.stato === 'pubblicata'
              ? `incollata il ${quando(r.pubblicata_il)}`
              : r.pubblicare_il
                ? `uscirebbe il ${quando(r.pubblicare_il)}`
                : 'nessun orario assegnato'}
          </Text>
        </Group>

        <Group gap={8} wrap="wrap">
          {r.data_recensione ? (
            <Badge size="xs" variant="outline" color="gray">
              {r.data_recensione.split('-').reverse().slice(0, 2).join('/')}
            </Badge>
          ) : null}
          {dove ? (
            <Badge size="xs" variant="light" color="indigo" title="Viator non ha un indirizzo per la singola recensione: l'elenco e' ordinato per data, quindi la posizione e' l'unico modo di dire dove sta. A parita' di data puo' ballare di una riga.">
              portale: pagina {dove.pagina}, {dove.riga}ª riga circa
            </Badge>
          ) : null}
          <Text size="xs" c="dimmed">
            {r.prodotto || 'prodotto non indicato'}
          </Text>
        </Group>
        {r.titolo ? <Text fw={600}>«{r.titolo}»</Text> : null}

        {/* il testo della recensione: se manca, si incolla */}
        {r.testo ? (
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {r.testo}
          </Text>
        ) : (
          <>
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
              <Text size="xs">
                Le email dei portali non contengono il testo della recensione: aprila nel portale e
                incollalo qui. Senza il testo si puo` scrivere solo una risposta prestampata.
              </Text>
            </Alert>
            <Textarea
              label="Testo della recensione"
              placeholder="Incolla qui quello che ha scritto il cliente"
              autosize
              minRows={3}
              value={testoRec}
              onChange={(e) => setTestoRec(e.currentTarget.value)}
            />
            <Group gap="xs">
              <Button
                size="xs"
                variant="default"
                disabled={!testoCambiato || inCorso}
                onClick={() => esegui(() => salvaTestoRecensione(r.id, testoRec))}
              >
                Salva il testo
              </Button>
            </Group>
          </>
        )}

        <Divider my={4} />

        {/* la risposta */}
        <Textarea
          ref={casella}
          label="La risposta"
          description={
            r.modello
              ? `scritta da ${r.modello}${r.costo ? ` — ${(Number(r.costo) * 100).toFixed(3)} centesimi` : ''}`
              : 'ancora da scrivere'
          }
          placeholder="Premi «Scrivi la risposta», poi correggila come vuoi."
          autosize
          minRows={4}
          value={risposta}
          onChange={(e) => setRisposta(e.currentTarget.value)}
        />
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Avvisi guai={guai} />
          <Text size="xs" c={risposta.length > 700 ? 'red.8' : 'dimmed'}>
            {risposta.length} caratteri
          </Text>
        </Group>

        {/* 🔴 LE EMOJI SI PREMONO, NON SI CERCANO. Chiesto dalla
            proprieta' il 23/10/2026. Aprire il pannello delle emoji di
            Windows per mettere un 🙏 e' una seccatura che si fa una volta
            e poi non si fa piu': le risposte restano senza, e quella e'
            una delle cose che le fa sembrare scritte da un programma.
            Si inseriscono nel punto dove sta il cursore, non in fondo. */}
        <Group gap={4} wrap="wrap">
          <Text size="xs" c="dimmed" mr={4}>
            una o due, non di piu`:
          </Text>
          {EMOJI.map((e) => (
            <Button
              key={e.c}
              size="compact-xs"
              variant="default"
              px={7}
              title={e.che}
              disabled={!!grave}
              onClick={() => metti(e.c)}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>{e.c}</span>
            </Button>
          ))}
        </Group>

        {messaggio ? (
          <Alert color="red" variant="light" p="xs">
            <Text size="xs">{messaggio}</Text>
          </Alert>
        ) : null}

        {/* CHI LA SCRIVE: un pulsante per modello, col prezzo sopra.
            Regola della proprieta': «ogni bottone che consuma api a costo
            ce lo devi scrivere accanto». Il prezzo e' stimato sui token
            misurati; dopo la chiamata, sotto la casella, compare quello
            VERO che torna da OpenRouter. */}
        <Stack gap={6}>
          <Group gap={6} wrap="wrap">
            <Text size="xs" fw={600}>
              {r.risposta ? 'Riscrivi con:' : 'Chi la scrive:'}
            </Text>
            <Text size="xs" c="dimmed">
              il prezzo e` per QUESTA risposta
            </Text>
          </Group>
          <Group gap="xs" wrap="wrap">
            {MODELLI.map((m) => {
              /* 🔴 IL PREZZO MISURATO BATTE QUELLO STIMATO. La stima dai
                 token diceva 0,021 ¢ per Haiku; la prima chiamata vera ne
                 e' costati 0,034 -- il 60% in piu'. La stima serve solo
                 finche' un modello non e' mai stato usato: appena c'e'
                 una spesa vera in coda, si mostra quella. */
              const misurato = costoReale.get(m.id);
              const costo = misurato ?? costoStimato(m.id, lunga ? 'lunga' : 'corta');
              const consigliato = m.id === idConsigliato;
              return (
                <Button
                  key={m.id}
                  size="xs"
                  variant={consigliato ? 'filled' : 'default'}
                  leftSection={consigliato ? <IconSparkles size={14} /> : undefined}
                  loading={quale === m.id}
                  disabled={inCorso || !r.testo || !!grave}
                  title={`${m.cose}\n\n${m.quando}\n\n${misurato ? 'Prezzo MISURATO sulle risposte gia’ scritte con questo modello.' : 'Prezzo stimato: questo modello non e’ ancora stato usato.'}`}
                  onClick={() =>
                    esegui(
                      () => scriviRisposta(r.id, m.id),
                      'bozze',
                      `Risposta scritta con ${m.nome}: ora sta in «Bozze»`,
                      m.id
                    )
                  }
                >
                  {m.nome} · {prezzo(costo)}
                </Button>
              );
            })}
          </Group>
          <Text size="xs" c="dimmed">
            {grave ? (
              <Text component="span" c="red.8" fw={600}>
                Spenti apposta. La scrive una persona, e la firma una persona.
              </Text>
            ) : !r.testo ? (
              <>Spenti finche` non c&rsquo;e` il testo della recensione.</>
            ) : lunga ? (
              <>
                Questa e` una <b>recensione critica</b> ({r.voto}★): qui serve una risposta lunga e
                argomentata, e <b>Opus</b> e` l&rsquo;unico che la regge. Mezzo centesimo in piu` su
                una risposta che la leggeranno tutti i prossimi clienti.
              </>
            ) : (
              <>
                Recensione positiva: bastano tre righe, e <b>Haiku</b> le scrive bene e costa meno di
                tutti. Passa a Opus solo se questa risposta ti sta particolarmente a cuore.
              </>
            )}
          </Text>
        </Stack>

        {/* i comandi */}
        <Group gap="xs" wrap="wrap">
          <Button
            size="xs"
            variant="default"
            leftSection={<IconPencil size={14} />}
            disabled={!cambiata || inCorso}
            onClick={() => esegui(() => salvaCorrezione(r.id, risposta))}
          >
            Salva la correzione
          </Button>

          <Button
            size="xs"
            variant="default"
            leftSection={<IconCopy size={14} />}
            disabled={!risposta.trim()}
            onClick={copia}
          >
            {copiato ? 'copiata' : 'Copia'}
          </Button>

          {r.link_risposta ? (
            <Button
              size="xs"
              variant="default"
              component="a"
              href={r.link_risposta}
              target="_blank"
              rel="noreferrer"
              leftSection={<IconExternalLink size={14} />}
            >
              Apri nel portale
            </Button>
          ) : null}

          {/* 🔴 DOVE STA, UNA VOLTA PUBBLICATA. Il portale toglie
              dall'elenco le recensioni a cui si e' risposto, e la pagina
              pubblica di Viator le risposte non le mostra: senza questo
              link una risposta pubblicata non si ritrova piu'. */}
          {linkProdottoViator(r.prodotto) ? (
            <Button
              size="xs"
              variant="subtle"
              component="a"
              href={linkProdottoViator(r.prodotto) as string}
              target="_blank"
              rel="noreferrer"
              leftSection={<IconExternalLink size={14} />}
            >
              Scheda del prodotto
            </Button>
          ) : null}

          {r.stato === 'approvata' ? (
            <>
              <Button
                size="xs"
                color={confermaFatta ? 'orange' : 'green'}
                variant={confermaFatta ? 'filled' : 'light'}
                leftSection={<IconCheck size={14} />}
                loading={quale === 'fatta'}
                disabled={inCorso}
                onClick={() => {
                  if (!confermaFatta) {
                    setConfermaFatta(true);
                    return;
                  }
                  setConfermaFatta(false);
                  esegui(
                    () => segnaPubblicata(r.id),
                    'pubblicate',
                    'Segnata come incollata nel portale',
                    'fatta'
                  );
                }}
              >
                {confermaFatta
                  ? 'Confermi? L’hai gia’ incollata nel portale'
                  : 'L’ho incollata nel portale'}
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                disabled={inCorso}
                onClick={() => esegui(() => riapri(r.id), 'bozze', 'Rimessa fra le bozze')}
              >
                Rimetti in bozza
              </Button>
            </>
          ) : r.stato === 'pubblicata' ? null : (
            <Button
              size="xs"
              color="blue"
              leftSection={<IconCheck size={14} />}
              loading={quale === 'approva'}
              disabled={inCorso || !risposta.trim()}
              onClick={() =>
                esegui(async () => {
                  /* se c'e' una correzione non salvata, si salva prima:
                     approvare un testo diverso da quello che si ha
                     davanti e' il modo piu' semplice di pubblicare la
                     cosa sbagliata */
                  if (cambiata) {
                    const s = await salvaCorrezione(r.id, risposta);
                    if (!s.ok) return s;
                  }
                  return approva(r.id);
                }, 'approvate', 'Approvata: ora sta in «Approvate», pronta da copiare', 'approva')
              }
            >
              Approva
            </Button>
          )}

          {r.stato !== 'pubblicata' && r.stato !== 'saltata' ? (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              disabled={inCorso}
              onClick={() => esegui(() => scarta(r.id), 'tutte', 'Scartata: non le si rispondera`')}
            >
              Non rispondere
            </Button>
          ) : null}
        </Group>

        {!siPuoPubblicare(guai) ? (
          <Text size="xs" c="red.8">
            Un controllo dice «blocca»: si puo` approvare comunque, ma leggi prima l&rsquo;avviso.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

/* LA CASELLA DOVE SI INCOLLA IL RIEPILOGO DI VIATOR.
 *
 * Il riepilogo arriva una volta al giorno a usa@prestigerent.com verso le
 * 15:16 italiane, oggetto «You have N new reviews». Si incolla qui e la
 * coda si riempie.
 *
 * 🔴 Perche' non si legge la posta da soli: servirebbe registrare
 * un'applicazione su Microsoft 365 e far approvare il permesso `Mail.Read`
 * da un amministratore. Mezza giornata di lavoro e un consenso, per
 * risparmiare un «copia e incolla» al giorno.
 *
 * 🔴 «Trovate 11, nuove 0» NON e' un guasto: Viator ripete le stesse
 * recensioni ogni giorno finche' non si risponde. Per questo si mostrano
 * due numeri e non uno -- con un numero solo sembrerebbe che
 * l'importazione non abbia funzionato, e si riproverebbe a vuoto.
 */
function Importatore() {
  const [testo, setTesto] = useState('');
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, parti] = useTransition();

  /* 🔴 SEMPRE APERTO, e non e' una scelta estetica. Era un pulsante da
     premere per far comparire la casella, e il 23/10/2026 la proprieta'
     ha chiesto «dov'e' incolla riepilogo da viator?» avendolo davanti
     agli occhi. E' il PRIMO passo di tutto il giro -- senza, la coda
     resta vuota e il resto della schermata non serve a niente. Un primo
     passo che si deve cercare e' un primo passo fatto male. */
  return (
    <Card withBorder radius="md" padding="md" bg="var(--mantine-color-orange-0)">
      <Stack gap="xs">
        <Group gap={8}>
          <IconDownload size={18} />
          <Text fw={700}>Far entrare le recensioni, a mano</Text>
        </Group>
        <Text size="xs" c="dimmed">
          <b>Questa casella e` una riserva, non il modo normale di lavorare.</b> Il riepilogo arriva
          a <b>usa@prestigerent.com</b> verso le 15:16 («You have N new reviews») e il sito deve
          leggerlo da solo: finche` quel pezzo non e` acceso, si incolla qui. Aprila, seleziona
          tutto, incolla: va bene sia il testo sia l&rsquo;HTML. Dentro ci sono anche le recensioni{' '}
          <b>Tripadvisor</b>. Il testo delle recensioni nell&rsquo;email non c&rsquo;e&rsquo;: quello si
          prende nel portale, una per una.
        </Text>
        <Textarea
          placeholder="Incolla qui tutta l'email"
          autosize
          minRows={4}
          maxRows={10}
          value={testo}
          onChange={(e) => setTesto(e.currentTarget.value)}
        />
        {esito ? (
          <Alert color={esito.ok ? 'green' : 'red'} variant="light" p="xs">
            <Text size="xs">{esito.testo}</Text>
          </Alert>
        ) : null}
        <Group gap="xs">
          <Button
            size="xs"
            loading={inCorso}
            disabled={!testo.trim()}
            onClick={() =>
              parti(async () => {
                const r = await importaRiepilogo(testo);
                if (!r.ok) {
                  setEsito({ ok: false, testo: r.errore ?? 'Non e` andata.' });
                  return;
                }
                const gia = (r.trovate ?? 0) - (r.nuove ?? 0);
                setEsito({
                  ok: true,
                  testo:
                    `Trovate ${r.trovate}, nuove ${r.nuove}` +
                    (gia > 0 ? `, ${gia} c'erano gia' (Viator ripete le stesse finche' non si risponde).` : '.'),
                });
                setTesto('');
              })
            }
          >
            Leggi e metti in coda
          </Button>
          {testo ? (
            <Button size="xs" variant="subtle" color="gray" onClick={() => setTesto('')}>
              svuota
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Card>
  );
}

type Filtro = 'gravi' | 'da-fare' | 'bozze' | 'approvate' | 'pubblicate' | 'tutte';

export function CodaRecensioni({ righe }: { righe: Riga[] }) {
  const [filtro, setFiltro] = useState<Filtro>('bozze');
  const [criteriAperti, setCriteriAperti] = useState(false);
  const [prezziAperti, setPrezziAperti] = useState(false);
  /* 🔴 L'avviso sta QUI e non nel riquadro: quando un'azione riesce, la
     riga cambia stato, esce dal filtro e il suo riquadro viene smontato.
     Un messaggio scritto li' dentro sparirebbe insieme a lui -- che e'
     esattamente il guasto che questo risolve. */
  const [avviso, setAvviso] = useState<{ testo: string; vai?: Filtro } | null>(null);
  /* 🔴 LE RIGHE APPENA TOCCATE RESTANO VISIBILI, anche se il loro nuovo
     stato non appartiene al filtro che si sta guardando.
     Dire «ora sta in Bozze» non bastava: la proprieta' ha riprovato e la
     riga spariva lo stesso. Chi preme un pulsante si aspetta di vedere
     il risultato LI', non di andarlo a cercare in un'altra scheda. Si
     svuota cambiando filtro: a quel punto si sta guardando altro. */
  const [appenaToccate, setAppenaToccate] = useState<Set<number>>(new Set());

  const conti = useMemo(() => {
    const c = { daFare: 0, bozze: 0, approvate: 0, pubblicate: 0, gravi: 0, speso: 0 };
    for (const r of righe) {
      if (r.stato === 'nuova' || r.stato === 'letta') c.daFare++;
      if (r.stato === 'bozza') c.bozze++;
      if (r.stato === 'approvata') c.approvate++;
      if (r.stato === 'pubblicata') c.pubblicate++;
      if (r.stato !== 'pubblicata' && r.stato !== 'saltata' && graveDi(r.testo)) c.gravi++;
      c.speso += Number(r.costo ?? 0);
    }
    return c;
  }, [righe]);

  /* Le aperture che compaiono in piu' di una risposta. Si calcolano qui
     perche' qui c'e' tutta la coda: il singolo riquadro vede solo se
     stesso, ed e' il motivo per cui «I'm so glad» su 7 risposte su 10 non
     l'aveva segnalato nessun controllo. */
  const apertureRipetute = useMemo(() => {
    const conta = new Map<string, number>();
    for (const r of righe) {
      const a = aperturaDi(r.corretto ?? r.risposta ?? '');
      if (a) conta.set(a, (conta.get(a) ?? 0) + 1);
    }
    return new Set([...conta].filter(([, n]) => n > 1).map(([a]) => a));
  }, [righe]);

  /** La spesa media gia' sostenuta per ogni modello, dai dati veri di
   *  OpenRouter salvati in coda. Batte qualunque stima. */
  const costoReale = useMemo(() => {
    const somme = new Map<string, { tot: number; n: number }>();
    for (const r of righe) {
      const c = Number(r.costo ?? 0);
      if (!r.modello || !c) continue;
      const s = somme.get(r.modello) ?? { tot: 0, n: 0 };
      s.tot += c;
      s.n += 1;
      somme.set(r.modello, s);
    }
    return new Map([...somme].map(([id, s]) => [id, s.tot / s.n]));
  }, [righe]);

  /* dove sta ognuna nell'elenco del portale: calcolato su TUTTE le righe,
     non su quelle filtrate, perche' il portale non conosce i nostri
     filtri */
  const dove = useMemo(() => posizioniNelPortale(righe), [righe]);

  const viste = useMemo(() => {
    const tieni = (r: Riga, dentro: boolean) => dentro || appenaToccate.has(r.id);
    let lista = righe;
    if (filtro === 'gravi') lista = righe.filter((r) => tieni(r, !!graveDi(r.testo)));
    else if (filtro === 'da-fare')
      lista = righe.filter((r) => tieni(r, r.stato === 'nuova' || r.stato === 'letta'));
    else if (filtro === 'bozze') lista = righe.filter((r) => tieni(r, r.stato === 'bozza'));
    else if (filtro === 'approvate') lista = righe.filter((r) => tieni(r, r.stato === 'approvata'));
    else if (filtro === 'pubblicate')
      lista = righe.filter((r) => tieni(r, r.stato === 'pubblicata'));

    /* L'ORDINE, E I DUE MOTIVI PER CUI NON E' QUELLO DEL DATABASE.

       1. 🔴 LA RIGA CHE HAI APPENA TOCCATO VA IN CIMA. Riscrivendo una
          bozza le viene assegnato un NUOVO orario di uscita, e l'elenco
          e' ordinato per orario: la riga saltava in fondo a dodici
          bozze. Non spariva -- si spostava, che da chi guarda si vede
          uguale. «Si toglie e si perde e non si sa dove va», detto dalla
          proprieta' il 23/10/2026 dopo che il primo rimedio (l'avviso)
          non era bastato.

       2. LE GRAVI SUBITO DOPO, dentro qualunque filtro. Quella di
          John_S e' rimasta pubblica e senza risposta per quattro giorni
          perche' stava in mezzo ad altre 59: nessuno legge sessanta
          recensioni in fila. Una cosa che va vista si mette in cima, non
          si spera che qualcuno ci arrivi scorrendo. */
    const peso = (r: Riga) =>
      (appenaToccate.has(r.id) ? 0 : 2) + (graveDi(r.testo) ? 0 : 1);
    return [...lista].sort((a, b) => peso(a) - peso(b));
  }, [righe, filtro, appenaToccate]);

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
        <Numero n={conti.daFare} che="senza risposta" colore={conti.daFare ? 'orange.8' : undefined} />
        <Numero n={conti.bozze} che="bozze da leggere" />
        <Numero n={conti.approvate} che="approvate, da incollare" colore="blue.8" />
        <Numero n={conti.pubblicate} che="pubblicate &rarr; scheda «Pubblicate»" colore="green.8" />
        <Card withBorder radius="md" padding="sm">
          <Text fz={28} fw={800} lh={1.1}>
            {(conti.speso * 100).toFixed(2)}
          </Text>
          <Text size="xs" c="dimmed">
            centesimi di dollaro spesi in tutto
          </Text>
        </Card>
      </SimpleGrid>

      {conti.gravi ? (
        <Alert color="red" variant="filled" p="sm" icon={<IconAlertTriangle size={18} />}>
          <Text size="sm" fw={700}>
            {conti.gravi === 1
              ? 'Una recensione in coda va trattata a mano.'
              : `${conti.gravi} recensioni in coda vanno trattate a mano.`}
          </Text>
          <Text size="xs" mt={4}>
            Accuse di molestia, aggressione, furto, discriminazione, infortuni, personale ubriaco,
            minacce legali. Sono in cima all&rsquo;elenco e i pulsanti dei modelli sono spenti: queste
            non le scrive un programma.
          </Text>
        </Alert>
      ) : null}

      <Alert color="gray" variant="light" p="sm">
        <Text size="xs">
          <b>Nessun portale permette di pubblicare da qui.</b> Viator, Tripadvisor e GetYourGuide non
          hanno un&rsquo;API per scrivere una risposta: il giro e` <b>approva</b> →{' '}
          <b>Copia</b> → <b>Apri nel portale</b> → incolla → <b>«L&rsquo;ho incollata»</b>. L&rsquo;ora
          scritta accanto a ogni risposta dice quando toccherebbe a quella, per non pubblicarne
          quindici nello stesso minuto.
        </Text>
      </Alert>

      <Importatore />

      <Group justify="space-between" wrap="wrap" gap="xs">
        <SegmentedControl
          size="xs"
          value={filtro}
          onChange={(v) => {
            setFiltro(v as Filtro);
            setAppenaToccate(new Set());
            setAvviso(null);
          }}
          data={[
            ...(conti.gravi ? [{ label: `⚠ A mano (${conti.gravi})`, value: 'gravi' }] : []),
            { label: `Da fare (${conti.daFare})`, value: 'da-fare' },
            { label: `Bozze (${conti.bozze})`, value: 'bozze' },
            { label: `Approvate (${conti.approvate})`, value: 'approvate' },
            { label: `Pubblicate (${conti.pubblicate})`, value: 'pubblicate' },
            { label: `Tutte (${righe.length})`, value: 'tutte' },
          ]}
        />
        <Group gap="md">
          <Anchor component="button" type="button" size="xs" onClick={() => setPrezziAperti((x) => !x)}>
            {prezziAperti ? 'nascondi i prezzi' : 'chi scrive e quanto costa'}
          </Anchor>
          <Anchor
            component="button"
            type="button"
            size="xs"
            onClick={() => setCriteriAperti((x) => !x)}
          >
            {criteriAperti ? 'nascondi i criteri' : `i ${CRITERI.length} criteri`}
          </Anchor>
        </Group>
      </Group>

      {prezziAperti ? (
        <Card withBorder radius="md" padding="md">
          <Title order={5} mb={4}>
            Chi scrive la risposta, e quanto costa
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Accanto a ogni recensione trovi un pulsante per ognuno di questi: scegli di volta in
            volta. Il prezzo sul pulsante e` <b>stimato</b> sui token misurati sulle risposte vere;
            quello <b>vero</b> compare sotto la casella appena la risposta e` scritta, perche` lo
            dice OpenRouter a ogni chiamata. I prezzi qui sotto sono quelli di listino del{' '}
            <b>23/10/2026</b>.
          </Text>
          <Stack gap="sm">
            {MODELLI.map((m) => (
              <Card key={m.id} withBorder radius="sm" padding="sm">
                <Group justify="space-between" wrap="wrap" gap="xs" mb={4}>
                  <Text fw={700} size="sm">
                    {m.nome}
                  </Text>
                  <Group gap="xs">
                    <Badge variant="light" color="gray" size="sm">
                      corta {prezzo(costoStimato(m.id, 'corta'))}
                    </Badge>
                    <Badge variant="light" color="gray" size="sm">
                      lunga {prezzo(costoStimato(m.id, 'lunga'))}
                    </Badge>
                    <Badge variant="light" color="blue" size="sm">
                      400 al mese: {(costoStimato(m.id, 'corta') * 400).toFixed(2).replace('.', ',')} $
                    </Badge>
                  </Group>
                </Group>
                <Text size="xs" mb={2}>
                  {m.cose}
                </Text>
                <Text size="xs" c="dimmed">
                  {m.quando}
                </Text>
              </Card>
            ))}
          </Stack>
          <Text size="xs" c="dimmed" mt="sm">
            <b>Due cose da sapere.</b> Passano tutti dalla stessa porta (OpenRouter) con la stessa
            chiave: scegliere Claude invece di Gemini non vuol dire un altro account ne` un altro
            abbonamento. E la cifra «400 al mese» e` il caso in cui si rispondesse a{' '}
            <b>tutte</b> le recensioni con quel modello: nella pratica le negative sono una su
            dieci, quindi la spesa vera e` quella di Haiku piu` un decimo di quella di Opus —{' '}
            <b>meno di un euro al mese.</b>
          </Text>
        </Card>
      ) : null}

      {criteriAperti ? (
        <Card withBorder radius="md" padding="md">
          <Title order={5} mb="xs">
            I criteri con cui si scrive
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            Sono gli stessi che finiscono nelle istruzioni del modello e che il codice controlla:
            stanno scritti in un posto solo (<code>src/lib/risposte.ts</code>).
          </Text>
          <Stack gap={6}>
            {CRITERI.map((c, i) => (
              <Text key={i} size="xs">
                <b>{i + 1}.</b> {c}
              </Text>
            ))}
          </Stack>
        </Card>
      ) : null}

      {/* 🔴 L'ELENCO DI QUELLO CHE E' GIA' USCITO.
          Chiesto dalla proprieta' il 23/10/2026 con una domanda che era
          un difetto: «1 incollate nel portale -- dove sono???». Il
          contatore diceva quante, e poi bisognava cercarsele. E cercarle
          non si poteva: il portale toglie dall'elenco le recensioni a cui
          si e' risposto, e la pagina pubblica di Viator le risposte non
          le mostra. Fuori di qui, una risposta pubblicata non esiste piu'.
          Quindi qui si vede tutto in una riga: quando, chi, con cosa e'
          stata scritta, quanto e' costata, e il link alla scheda. */}
      {filtro === 'pubblicate' && viste.length > 0 ? (
        <Card withBorder radius="md" padding="md">
          <Title order={5} mb={4}>
            Le risposte gia` pubblicate
          </Title>
          <Text size="xs" c="dimmed" mb="sm">
            <b>Viator non ha un indirizzo per la singola recensione:</b> nessun link porta
            esattamente a quella. La <b>scheda del prodotto</b> qui sotto apre la pagina giusta, ma
            mostra una decina di recensioni scelte dall&rsquo;algoritmo su migliaia, e{' '}
            <b>le risposte del fornitore sulla pagina pubblica non compaiono affatto</b> (verificato:
            8.531 recensioni in pagina, zero risposte visibili). Per rileggere una risposta con
            sotto la sua recensione si va nel <b>portale fornitore</b>: li` la riga resta anche dopo
            che hai risposto, e la risposta si vede sotto.
          </Text>
          <Group gap="xs" mb="sm">
            <Button
              size="xs"
              variant="default"
              component="a"
              href="https://supplier.viator.com/reviews"
              target="_blank"
              rel="noreferrer"
              leftSection={<IconExternalLink size={14} />}
            >
              Portale Viator: tutte le recensioni
            </Button>
          </Group>
          <Stack gap={6}>
            {viste.map((p) => {
              const link = linkProdottoViator(p.prodotto);
              return (
                <Group key={p.id} gap="xs" wrap="wrap" align="baseline">
                  <Badge size="sm" variant="light" color={COLORE_FONTE[p.fonte] ?? 'gray'}>
                    {p.fonte}
                  </Badge>
                  <Text size="xs" fw={600}>
                    {quando(p.pubblicata_il)}
                  </Text>
                  {dove.get(p.id) ? (
                    <Badge size="xs" variant="light" color="indigo">
                      portale p.{dove.get(p.id)!.pagina} · {dove.get(p.id)!.riga}ª
                    </Badge>
                  ) : null}
                  <Text size="xs">{p.autore || 'senza nome'}</Text>
                  <Stelle voto={p.voto} />
                  <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 180 }}>
                    {p.titolo}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {p.modello ?? 'scritta a mano'}
                    {p.costo ? ` · ${prezzo(Number(p.costo))}` : ''}
                  </Text>
                  {link ? (
                    <Anchor href={link} target="_blank" rel="noreferrer" size="xs">
                      scheda del prodotto ↗
                    </Anchor>
                  ) : null}
                </Group>
              );
            })}
          </Stack>
        </Card>
      ) : null}

      {avviso ? (
        <Alert
          color="teal"
          variant="light"
          icon={<IconCheck size={18} />}
          withCloseButton
          onClose={() => setAvviso(null)}
        >
          <Group gap="sm" wrap="wrap">
            <Text size="sm">
              {avviso.testo}. <b>&darr; e&rsquo; la prima qui sotto</b>
            </Text>
            {avviso.vai && avviso.vai !== filtro ? (
              <Button
                size="compact-xs"
                variant="white"
                onClick={() => {
                  setFiltro(avviso.vai as Filtro);
                  setAppenaToccate(new Set());
                  setAvviso(null);
                }}
              >
                portami li’
              </Button>
            ) : null}
          </Group>
        </Alert>
      ) : null}

      {viste.length === 0 ? (
        <Card withBorder radius="md" padding="lg">
          <Text size="sm" c="dimmed">
            Niente in questo elenco.
          </Text>
        </Card>
      ) : (
        <Stack gap="md">
          {viste.map((r) => (
            <Riquadro
              key={r.id}
              r={r}
              apertureRipetute={apertureRipetute}
              costoReale={costoReale}
              dove={dove.get(r.id)}
              avvisa={(testo, vai) => {
                setAvviso({ testo, vai });
                setAppenaToccate((p) => new Set(p).add(r.id));
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
