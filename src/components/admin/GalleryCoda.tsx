'use client';

import { useState, useTransition } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconPencil,
  IconX,
} from '@tabler/icons-react';
import type { Pagina } from './GalleryCaricatore';

/* LA CODA DA APPROVARE.
 *
 * ── COSA SI APPROVA ────────────────────────────────────────────────────
 * La foto INSIEME al suo alt, alla didascalia e alle sue pagine. Un tag
 * messo da una guida arriva sul sito solo con l'approvazione: se si
 * approvasse solo l'immagine, una foto giusta finirebbe su una pagina
 * sbagliata senza che nessuno l'abbia deciso.
 *
 * ── PERCHE' «CORREGGI E APPROVA» E NON SOLO «RIMANDA INDIETRO» ─────────
 * Nove volte su dieci il problema e' l'alt scritto in italiano o una
 * pagina di troppo. Rimandare indietro per quello vuol dire far rifare il
 * giro a una persona che e' in mezzo al lavoro, per una riga che qui si
 * cambia in cinque secondi. Il rifiuto resta per le foto che non vanno
 * bene come foto.
 *
 * ── LE ANTEPRIME SCADONO ───────────────────────────────────────────────
 * Sono indirizzi firmati validi dieci minuti, perche' le foto in attesa
 * stanno in un bucket privato e non hanno nessun indirizzo pubblico. Se la
 * pagina resta aperta piu' a lungo le immagini smettono di comparire: si
 * ricarica e tornano. E' il prezzo del fatto che una foto non approvata non
 * sia raggiungibile da nessuno.
 *
 * ── PERCHE' MANTINE E NON PIU' LE CLASSI A MANO ────────────────────────
 * Il CSS c'era e funzionava -- niente classi orfane, niente che sbordava,
 * misurato in Chrome il 26/09/2026. Stonavano tre cose, e tutte e tre
 * dicevano qualcosa di sbagliato all'occhio:
 *  - le caselle di spunta erano quelle native del browser, in mezzo a
 *    pagine dove sono di Mantine;
 *  - «Rimanda indietro» era un `<details>` col triangolino del browser:
 *    l'unico pezzo di pannello che sembrava una pagina di vent'anni fa;
 *  - «Approva le selezionate» da DISATTIVATO era arancione slavato invece
 *    che grigio, cioe' leggeva come un pulsante acceso e sbiadito proprio
 *    nello stato in cui la pagina si apre.
 */

export type InCoda = {
  id: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  colore: string | null;
  anteprima: string | null;
  caricata: string;
  scattata: string | null;
  chi: string;
  tag: string[];
  avvisi: string[];
};

type Esito = { ok: boolean; errore?: string };

export function GalleryCoda({
  foto,
  pagine,
  approva,
  rifiuta,
  aggiornaFoto,
}: {
  foto: InCoda[];
  pagine: Pagina[];
  approva: (ids: string[]) => Promise<Esito & { quante?: number }>;
  rifiuta: (id: string, motivo: string) => Promise<Esito>;
  aggiornaFoto: (id: string, d: { alt: string; caption: string | null; tag: string[] }) => Promise<Esito>;
}) {
  const [resto, setResto] = useState(foto);
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [modifica, setModifica] = useState<string | null>(null);
  const [bozza, setBozza] = useState<{ alt: string; caption: string; tag: string[] }>({ alt: '', caption: '', tag: [] });
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  /** quale scheda ha il riquadro del rifiuto aperto */
  const [rimanda, setRimanda] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const nome = (k: string) => pagine.find((p) => p.key === k)?.label ?? k;

  const togli = (ids: string[]) => {
    setResto((r) => r.filter((f) => !ids.includes(f.id)));
    setScelte((s) => {
      const n = new Set(s);
      ids.forEach((i) => n.delete(i));
      return n;
    });
  };

  const fai = (azione: () => Promise<Esito & { quante?: number }>, ids: string[], fatto: string) =>
    avvia(async () => {
      setMessaggio(null);
      const r = await azione();
      if (!r.ok) { setMessaggio({ ok: false, testo: r.errore ?? 'Non è andata.' }); return; }
      togli(ids);
      setMessaggio({ ok: true, testo: r.errore ?? fatto });
    });

  if (!resto.length) {
    return (
      <Alert color="green" icon={<IconCheck size={18} />}>
        Niente da approvare. {messaggio?.ok && messaggio.testo}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      {messaggio && (
        <Alert
          color={messaggio.ok ? 'green' : 'red'}
          icon={messaggio.ok ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setMessaggio(null)}
        >
          {messaggio.testo}
        </Alert>
      )}

      <Card withBorder padding="sm" radius="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Checkbox
            checked={scelte.size === resto.length}
            indeterminate={scelte.size > 0 && scelte.size < resto.length}
            onChange={(e) => setScelte(e.currentTarget.checked ? new Set(resto.map((f) => f.id)) : new Set())}
            label={`Seleziona tutte (${resto.length})`}
          />
          <Button
            disabled={!scelte.size || inCorso}
            loading={inCorso && scelte.size > 0}
            leftSection={<IconCheck size={16} />}
            onClick={() => fai(() => approva([...scelte]), [...scelte], `${scelte.size} foto approvate.`)}
          >
            {scelte.size ? `Approva le ${scelte.size} selezionate` : 'Approva le selezionate'}
          </Button>
        </Group>
      </Card>

      {resto.map((f) => {
        const inModifica = modifica === f.id;
        const motivoScritto = (motivo[f.id] ?? '').trim();
        return (
          <Card withBorder padding="md" radius="md" key={f.id}>
            <Stack gap="sm">
              <Checkbox
                checked={scelte.has(f.id)}
                onChange={(e) => {
                  const n = new Set(scelte);
                  if (e.currentTarget.checked) n.add(f.id); else n.delete(f.id);
                  setScelte(n);
                }}
                label="Seleziona"
              />

              {/* Su telefono la foto sta sopra e i dati sotto; da 640px in
                  su affiancate. `wrap` invece di due impaginazioni: una
                  sola regola, e la soglia la decide il contenuto. */}
              <Group align="flex-start" gap="md" wrap="wrap">
                <div
                  style={{
                    width: 200, maxWidth: '100%', flex: '0 0 auto',
                    background: f.colore ?? 'var(--mantine-color-gray-1)',
                    borderRadius: 8, overflow: 'hidden',
                  }}
                >
                  {f.anteprima ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.anteprima}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', display: 'block', aspectRatio: `${f.width} / ${f.height}`, objectFit: 'cover' }}
                    />
                  ) : (
                    <Text size="xs" c="dimmed" p="sm" ta="center">
                      Anteprima scaduta: ricarica la pagina
                    </Text>
                  )}
                </div>

                <Stack gap="xs" style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <Text size="xs" c="dimmed">
                    <b>{f.chi}</b> · caricata il {new Date(f.caricata).toLocaleDateString('it-IT')}
                    {' · '}
                    {f.width}×{f.height} ({f.height > f.width ? 'verticale' : 'orizzontale'})
                    {' · '}
                    {f.scattata
                      ? `scattata il ${new Date(f.scattata).toLocaleDateString('it-IT')}`
                      : 'senza data di scatto'}
                  </Text>

                  {f.avvisi.map((a, i) => (
                    <Text key={i} size="xs" c="orange">{a}</Text>
                  ))}

                  {inModifica ? (
                    <>
                      <TextInput
                        label="Descrizione in inglese"
                        size="sm"
                        value={bozza.alt}
                        onChange={(e) => setBozza({ ...bozza, alt: e.currentTarget.value })}
                      />
                      <TextInput
                        label="Didascalia"
                        size="sm"
                        value={bozza.caption}
                        onChange={(e) => setBozza({ ...bozza, caption: e.currentTarget.value })}
                      />
                      <Checkbox.Group
                        label="Pagine"
                        value={bozza.tag}
                        onChange={(v) => setBozza({ ...bozza, tag: v })}
                      >
                        <Stack gap={4} mt={6} mah={220} style={{ overflowY: 'auto' }}>
                          {pagine.map((p) => (
                            <Checkbox key={p.key} value={p.key} label={p.label} size="sm" />
                          ))}
                        </Stack>
                      </Checkbox.Group>

                      <Group gap="xs" mt={4}>
                        <Button
                          size="sm"
                          loading={inCorso}
                          leftSection={<IconCheck size={16} />}
                          onClick={() =>
                            avvia(async () => {
                              const r1 = await aggiornaFoto(f.id, {
                                alt: bozza.alt,
                                caption: bozza.caption || null,
                                tag: bozza.tag,
                              });
                              if (!r1.ok) { setMessaggio({ ok: false, testo: r1.errore ?? 'Non salvata.' }); return; }
                              const r2 = await approva([f.id]);
                              if (!r2.ok) { setMessaggio({ ok: false, testo: r2.errore ?? 'Corretta ma non approvata.' }); return; }
                              togli([f.id]);
                              setModifica(null);
                              setMessaggio({ ok: true, testo: 'Corretta e approvata.' });
                            })
                          }
                        >
                          Salva e approva
                        </Button>
                        <Button size="sm" variant="default" leftSection={<IconX size={16} />} onClick={() => setModifica(null)}>
                          Annulla
                        </Button>
                      </Group>
                    </>
                  ) : (
                    <>
                      <Text fw={600}>{f.alt}</Text>
                      {f.caption && <Text size="sm" c="dimmed">{f.caption}</Text>}

                      <Group gap={6}>
                        {f.tag.length ? (
                          f.tag.map((k) => <Badge key={k} variant="light" color="gray">{nome(k)}</Badge>)
                        ) : (
                          <Text size="sm" c="dimmed" fs="italic">nessuna pagina</Text>
                        )}
                      </Group>

                      <Group gap="xs" mt={4}>
                        <Button
                          size="sm"
                          disabled={inCorso}
                          leftSection={<IconCheck size={16} />}
                          onClick={() => fai(() => approva([f.id]), [f.id], 'Approvata.')}
                        >
                          Approva
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          leftSection={<IconPencil size={16} />}
                          onClick={() => {
                            setModifica(f.id);
                            setBozza({ alt: f.alt, caption: f.caption ?? '', tag: [...f.tag] });
                          }}
                        >
                          Correggi e approva
                        </Button>
                        <Button
                          size="sm"
                          variant="subtle"
                          color="red"
                          leftSection={<IconArrowBackUp size={16} />}
                          onClick={() => setRimanda(rimanda === f.id ? null : f.id)}
                          aria-expanded={rimanda === f.id}
                        >
                          Rimanda indietro
                        </Button>
                      </Group>

                      <Collapse expanded={rimanda === f.id}>
                        <Stack gap="xs" mt="xs">
                          <TextInput
                            label={<>Motivo <b>obbligatorio</b></>}
                            size="sm"
                            value={motivo[f.id] ?? ''}
                            placeholder="Es.: la descrizione è in italiano, riscrivila in inglese"
                            onChange={(e) => setMotivo({ ...motivo, [f.id]: e.currentTarget.value })}
                            description="Lo legge chi ha caricato la foto, e da lì capisce cosa cambiare. Senza motivo il database rifiuta il rifiuto."
                          />
                          <Group>
                            <Button
                              size="sm"
                              color="red"
                              disabled={inCorso || !motivoScritto}
                              leftSection={<IconArrowBackUp size={16} />}
                              onClick={() => fai(() => rifiuta(f.id, motivo[f.id] ?? ''), [f.id], 'Rimandata indietro.')}
                            >
                              Rimanda indietro
                            </Button>
                          </Group>
                        </Stack>
                      </Collapse>
                    </>
                  )}
                </Stack>
              </Group>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
