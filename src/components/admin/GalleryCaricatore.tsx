'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Grid,
  Group,
  List,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconPhotoPlus,
  IconSearch,
  IconSend,
} from '@tabler/icons-react';
import { preparaFoto, type Preparata } from './preparaFoto';
import type { TipoTag } from '@/lib/gallery-tag';
import type { DaRegistrare, Firma } from '@/app/admin/gallery/azioni';

/* CARICARE E TAGGARE, DAL TELEFONO.
 *
 * ── COME FUNZIONA, IN ORDINE ───────────────────────────────────────────
 *  1. si scelgono le foto (trascinandole, o col pulsante che sul telefono
 *     apre la galleria o la fotocamera);
 *  2. ognuna viene preparata NEL BROWSER: data di scatto e orientamento
 *     letti dall'EXIF, rotazione applicata ai pixel, ridimensionamento a
 *     2400px, conversione in WebP. Da qui in poi i metadati non ci sono
 *     piu', GPS compreso;
 *  3. si scrive la descrizione in inglese e si scelgono le pagine;
 *  4. "Invia per approvazione" chiede gli indirizzi firmati, carica i file
 *     dritti nello storage e poi registra le righe.
 *
 * ── PERCHE' IL PULSANTE RESTA SPENTO E SI DICE PERCHE' ─────────────────
 * Si accende solo quando OGNI foto ha la descrizione e almeno una pagina.
 * Ma sopra al pulsante c'e' scritto cosa manca e a quale foto: un pulsante
 * grigio senza spiegazione e' il modo piu' sicuro di far chiudere la
 * pagina a chi sta caricando da un telefono in mezzo a una vigna.
 *
 * ── QUESTA E' LA PAGINA DELLE GUIDE, E SI VEDE NELLE SCELTE ────────────
 * Le due colonne diventano una sotto i 768px, i bersagli del dito sono
 * quelli di Mantine (piu' grandi delle caselle native che c'erano prima),
 * e l'elenco delle pagine ha un'altezza massima con scorrimento proprio:
 * senza, su un telefono, le 103 pagine spingerebbero il pulsante di invio
 * a schermate di distanza dalle foto.
 */

export type Pagina = { key: string; label: string; type: TipoTag; path: string };

type Scheda = {
  /** id locale, solo per React: le foto non hanno ancora un id vero */
  id: string;
  nome: string;
  anteprima: string;
  pronta: Preparata | null;
  errore: string | null;
  alt: string;
  caption: string;
  tag: string[];
  lavorando: boolean;
};

const GRUPPI: { tipo: TipoTag; titolo: string }[] = [
  { tipo: 'home', titolo: 'Home' },
  { tipo: 'cat', titolo: 'Categorie' },
  { tipo: 'port', titolo: 'Porti' },
  { tipo: 'tour', titolo: 'Tour' },
];

export function GalleryCaricatore({
  pagine,
  approvaSubito,
  chiediFirme,
  registraFoto,
}: {
  pagine: Pagina[];
  /** vero per un admin: le sue foto nascono approvate, quindi il pulsante
   *  si chiama "Pubblica" e non "Invia per approvazione" */
  approvaSubito: boolean;
  chiediFirme: (quante: number) => Promise<{ ok: boolean; errore?: string; firme?: Firma[] }>;
  registraFoto: (foto: DaRegistrare[]) => Promise<{ ok: boolean; errore?: string; quante?: number }>;
}) {
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [selezione, setSelezione] = useState<Set<string>>(new Set());
  const [cerca, setCerca] = useState('');
  const [sopra, setSopra] = useState(false);
  const [aperti, setAperti] = useState<string[]>(['home', 'cat', 'port']);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [invio, avvia] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  /* ── aggiunta e preparazione ───────────────────────────────────────── */

  const aggiungi = useCallback(async (files: FileList | File[]) => {
    const scelte = Array.from(files).slice(0, 40);
    if (!scelte.length) return;

    const nuove: Scheda[] = scelte.map((f) => ({
      id: crypto.randomUUID(),
      nome: f.name,
      anteprima: URL.createObjectURL(f),
      pronta: null,
      errore: null,
      alt: '',
      caption: '',
      tag: [],
      lavorando: true,
    }));
    setSchede((s) => [...s, ...nuove]);

    /* Una per volta e non tutte insieme: dieci canvas da dodici megapixel
       in parallelo fanno finire la memoria a un telefono, e la scheda si
       ricarica perdendo tutto. In fila ogni foto compare pronta mentre la
       successiva lavora, e si vede che sta succedendo qualcosa. */
    for (let i = 0; i < scelte.length; i++) {
      const r = await preparaFoto(scelte[i]);
      const id = nuove[i].id;
      setSchede((s) =>
        s.map((x) =>
          x.id !== id
            ? x
            : r.ok
              ? { ...x, pronta: r.foto, lavorando: false }
              : { ...x, errore: r.errore, lavorando: false }
        )
      );
    }
  }, []);

  /* ── tag ───────────────────────────────────────────────────────────── */

  const tocca = useCallback((ids: string[], key: string, metti: boolean) => {
    setSchede((s) =>
      s.map((x) =>
        !ids.includes(x.id)
          ? x
          : { ...x, tag: metti ? [...new Set([...x.tag, key])] : x.tag.filter((k) => k !== key) }
      )
    );
  }, []);

  const bersagli = useMemo(
    () => (selezione.size ? [...selezione] : schede.map((s) => s.id)),
    [selezione, schede]
  );

  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    if (!q) return pagine;
    return pagine.filter((p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
  }, [pagine, cerca]);

  /* ── cosa manca ────────────────────────────────────────────────────── */

  const valide = schede.filter((s) => s.pronta && !s.errore);
  const senzaAlt = valide.filter((s) => s.alt.trim().length < 3).length;
  const senzaPagina = valide.filter((s) => !s.tag.length).length;
  const puoInviare = valide.length > 0 && !senzaAlt && !senzaPagina && !invio;

  /* ── invio ─────────────────────────────────────────────────────────── */

  const invia = () => {
    setEsito(null);
    avvia(async () => {
      const r1 = await chiediFirme(valide.length);
      if (!r1.ok || !r1.firme) {
        setEsito({ ok: false, testo: r1.errore ?? 'Non riesco a ottenere il permesso di caricare.' });
        return;
      }

      const daRegistrare: DaRegistrare[] = [];
      for (let i = 0; i < valide.length; i++) {
        const s = valide[i];
        const firma = r1.firme[i];
        /* Il file va dritto nello storage con la firma: non passa dalla
           server action, che ha un limite di 1 MB nel corpo. */
        /* Nessuna chiave nel browser: il permesso e' il token dentro
           l'indirizzo firmato, che vale per QUEL file e per pochi minuti. */
        const su = await fetch(firma.url, {
          method: 'PUT',
          headers: { 'content-type': 'image/webp' },
          body: s.pronta!.blob,
        }).catch(() => null);

        if (!su || !su.ok) {
          setEsito({
            ok: false,
            testo: `«${s.nome}» non è salita. Le altre non sono state registrate: riprova.`,
          });
          return;
        }

        daRegistrare.push({
          bucket: firma.bucket,
          storage_path: firma.percorso,
          width: s.pronta!.width,
          height: s.pronta!.height,
          alt: s.alt,
          caption: s.caption.trim() || null,
          colore: s.pronta!.colore,
          scattata: s.pronta!.scattata ? s.pronta!.scattata.toISOString() : null,
          tag: s.tag,
        });
      }

      const r2 = await registraFoto(daRegistrare);
      if (!r2.ok) {
        setEsito({ ok: false, testo: r2.errore ?? 'Le foto sono salite ma non le ho registrate.' });
        return;
      }

      setEsito({
        ok: true,
        testo: approvaSubito
          ? `${r2.quante} foto pubblicate.`
          : `${r2.quante} foto inviate. Un amministratore le vedrà e le approverà: fino a quel momento non sono sul sito.`,
      });
      /* Si svuota tutto: lasciare le schede dopo un invio riuscito invita
         a premere due volte e a caricare i doppioni. */
      schede.forEach((s) => URL.revokeObjectURL(s.anteprima));
      setSchede([]);
      setSelezione(new Set());
    });
  };

  /* ── disegno ───────────────────────────────────────────────────────── */

  /* Cercando si aprono tutti i gruppi: se una pagina corrisponde ma sta
     dentro un gruppo chiuso, la ricerca sembra non aver trovato niente. */
  const gruppiAperti = cerca.trim() ? GRUPPI.map((g) => g.tipo) : aperti;

  return (
    <Stack gap="md">
      <Paper
        withBorder
        radius="md"
        p="lg"
        style={{
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: sopra ? 'var(--mantine-color-prestige-6)' : undefined,
          background: sopra ? 'var(--mantine-color-prestige-0)' : undefined,
          textAlign: 'center',
        }}
        onDragOver={(e) => { e.preventDefault(); setSopra(true); }}
        onDragLeave={() => setSopra(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSopra(false);
          if (e.dataTransfer?.files?.length) aggiungi(e.dataTransfer.files);
        }}
      >
        <Stack gap="xs" align="center">
          <Text fw={600}>Trascina qui le foto</Text>
          {/* Sul telefono il trascinamento non esiste: il pulsante e' la
              strada principale, non l'alternativa. `accept="image/*"` fa
              aprire a iOS la galleria o la fotocamera, e consegna JPEG anche
              quando sul telefono la foto e' HEIC. */}
          <Button leftSection={<IconPhotoPlus size={18} />} onClick={() => input.current?.click()}>
            Scegli foto
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { if (e.target.files) aggiungi(e.target.files); e.target.value = ''; }}
          />
          <Text size="xs" c="dimmed" maw={520}>
            Fino a 40 per volta. Le foto vengono rimpicciolite e ripulite dei dati nascosti
            (compresa la posizione GPS) qui sul tuo telefono, prima di partire.
          </Text>
        </Stack>
      </Paper>

      {schede.length > 0 && (
        <Grid gap="md">
          {/* ── le foto ── */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="sm">
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Text size="sm" c="dimmed">
                  {valide.length} foto{selezione.size ? ` · ${selezione.size} selezionate` : ''}
                </Text>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  onClick={() => setSelezione(selezione.size ? new Set() : new Set(schede.map((s) => s.id)))}
                >
                  {selezione.size ? 'Deseleziona tutte' : 'Seleziona tutte'}
                </Button>
              </Group>

              {schede.map((s) => (
                <Card
                  withBorder
                  radius="md"
                  padding="sm"
                  key={s.id}
                  style={s.errore ? { borderColor: 'var(--mantine-color-red-4)' } : undefined}
                >
                  <Stack gap="sm">
                    <Checkbox
                      checked={selezione.has(s.id)}
                      onChange={(e) => {
                        const n = new Set(selezione);
                        if (e.currentTarget.checked) n.add(s.id); else n.delete(s.id);
                        setSelezione(n);
                      }}
                      label="Seleziona"
                    />

                    <Group align="flex-start" gap="sm" wrap="wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.anteprima}
                        alt=""
                        style={{ width: 120, maxWidth: '100%', borderRadius: 8, display: 'block',
                                 background: 'var(--mantine-color-gray-1)', flex: '0 0 auto' }}
                      />

                      <Stack gap="xs" style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                          <code>{s.nome}</code>
                        </Text>

                        {s.lavorando && <Text size="sm" c="dimmed">Preparo la foto…</Text>}
                        {s.errore && <Text size="sm" c="red">{s.errore}</Text>}

                        {s.pronta && (
                          <>
                            <Text size="xs" c="dimmed">
                              {s.pronta.width}×{s.pronta.height}
                              {' · '}
                              {s.pronta.scattata
                                ? `scattata il ${s.pronta.scattata.toLocaleDateString('it-IT')}`
                                : 'senza data di scatto: si userà la data di caricamento'}
                            </Text>
                            {s.pronta.avvisi.map((a, i) => (
                              <Text key={i} size="xs" c="orange">{a}</Text>
                            ))}

                            <TextInput
                              label={<>Descrizione in inglese <b>obbligatoria</b></>}
                              size="sm"
                              value={s.alt}
                              placeholder="Guests tasting wine at a Chianti winery"
                              error={s.alt.trim().length > 0 && s.alt.trim().length < 3 ? 'Troppo corta' : undefined}
                              description="Cosa si vede nella foto, in inglese. La leggono Google e chi non può vedere l’immagine. Non «foto 1» o «Toscana»."
                              onChange={(e) => {
                                const v = e.currentTarget.value;
                                setSchede((x) => x.map((y) => (y.id === s.id ? { ...y, alt: v } : y)));
                              }}
                            />

                            <TextInput
                              label={<>Didascalia <Text span size="xs" c="dimmed">facoltativa</Text></>}
                              size="sm"
                              value={s.caption}
                              placeholder="Harvest week in Chianti"
                              onChange={(e) => {
                                const v = e.currentTarget.value;
                                setSchede((x) => x.map((y) => (y.id === s.id ? { ...y, caption: v } : y)));
                              }}
                            />

                            <Group gap={6}>
                              {s.tag.length === 0 ? (
                                <Text size="xs" c="red">Nessuna pagina scelta</Text>
                              ) : (
                                s.tag.map((k) => {
                                  const p = pagine.find((x) => x.key === k);
                                  return (
                                    <Badge
                                      key={k}
                                      variant="light"
                                      color="prestige"
                                      rightSection={
                                        <Text
                                          component="span"
                                          role="button"
                                          aria-label={`Togli ${p?.label ?? k}`}
                                          style={{ cursor: 'pointer', lineHeight: 1 }}
                                          onClick={() => tocca([s.id], k, false)}
                                        >
                                          ×
                                        </Text>
                                      }
                                    >
                                      {p?.label ?? k}
                                    </Badge>
                                  );
                                })
                              )}
                            </Group>
                          </>
                        )}
                      </Stack>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Grid.Col>

          {/* ── le pagine ── */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card withBorder radius="md" padding="sm">
              <Stack gap="sm">
                <Title order={2} size="h5">Pagine</Title>
                <Text size="xs" c="dimmed">
                  {selezione.size
                    ? `Le spunte valgono per le ${selezione.size} foto selezionate.`
                    : 'Nessuna foto selezionata: le spunte valgono per tutte.'}
                </Text>

                <TextInput
                  size="sm"
                  type="search"
                  placeholder="cerca pagina…"
                  leftSection={<IconSearch size={15} />}
                  value={cerca}
                  onChange={(e) => setCerca(e.currentTarget.value)}
                />

                {/* Altezza massima con scorrimento proprio: 103 pagine in
                    un telefono spingerebbero il pulsante di invio a
                    schermate di distanza. */}
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <Accordion multiple value={gruppiAperti} onChange={setAperti} variant="contained">
                    {GRUPPI.map((g) => {
                      const voci = filtrate.filter((p) => p.type === g.tipo);
                      if (!voci.length) return null;
                      return (
                        <Accordion.Item value={g.tipo} key={g.tipo}>
                          <Accordion.Control>
                            <Group gap="xs">
                              <Text size="sm" fw={600}>{g.titolo}</Text>
                              <Badge size="sm" variant="light" color="gray">{voci.length}</Badge>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap={8}>
                              {voci.map((p) => {
                                /* La spunta e' piena solo se TUTTE le foto
                                   bersaglio hanno quel tag: con una selezione
                                   mista si vede subito che non sono
                                   d'accordo. */
                                const quante = schede.filter((s) => bersagli.includes(s.id) && s.tag.includes(p.key)).length;
                                const tutte = bersagli.length > 0 && quante === bersagli.length;
                                return (
                                  <Checkbox
                                    key={p.key}
                                    size="sm"
                                    label={p.label}
                                    checked={tutte}
                                    indeterminate={quante > 0 && !tutte}
                                    onChange={(e) => tocca(bersagli, p.key, e.currentTarget.checked)}
                                  />
                                );
                              })}
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                </div>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {schede.length > 0 && (
        <Card withBorder radius="md" padding="md">
          <Stack gap="sm">
            {/* COSA MANCA, E A QUANTE FOTO. Un pulsante grigio senza
                spiegazione fa chiudere la pagina. */}
            {!puoInviare && !invio && (
              <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title="Manca ancora qualcosa">
                <List size="sm" spacing={2}>
                  {!valide.length && <List.Item>Nessuna foto pronta da inviare.</List.Item>}
                  {senzaAlt > 0 && (
                    <List.Item>
                      {senzaAlt === 1 ? 'Una foto non ha' : `${senzaAlt} foto non hanno`} la descrizione in inglese.
                    </List.Item>
                  )}
                  {senzaPagina > 0 && (
                    <List.Item>
                      {senzaPagina === 1 ? 'Una foto non ha' : `${senzaPagina} foto non hanno`} nessuna pagina.
                    </List.Item>
                  )}
                </List>
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                size="md"
                disabled={!puoInviare}
                loading={invio}
                leftSection={<IconSend size={18} />}
                onClick={invia}
              >
                {approvaSubito
                  ? `Pubblica ${valide.length || ''}`.trim()
                  : `Invia per approvazione ${valide.length || ''}`.trim()}
              </Button>
            </Group>

            {esito && (
              <Alert
                color={esito.ok ? 'green' : 'red'}
                icon={esito.ok ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
              >
                {esito.testo}
              </Alert>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
