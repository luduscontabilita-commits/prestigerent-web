'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconGripVertical,
  IconStar,
  IconStarFilled,
  IconX,
} from '@tabler/icons-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { decidi, ordina, spiega, type Criterio, type Foto, type Impostazioni, type Tag } from '@/lib/gallery-tag';
import type { Esito, FotoPagina } from '@/app/admin/gallery/azioni';

/* LE FOTO DI UNA PAGINA, DAL PULSANTE «FOTO» DELLA TABELLA PAGINE.
 *
 * ── SI PARTE DALL'ORDINE CHE VEDE IL VISITATORE ────────────────────────
 * Le miniature arrivano gia' messe in fila da `ordina()`, la stessa
 * funzione che usa il sito, col criterio della pagina. Cosi' «prima foto
 * qui» vuol dire «prima foto sulla pagina», qualunque sia il criterio.
 *
 * ── TRASCINARE VUOL DIRE «MANUALE» ─────────────────────────────────────
 * Appena si sposta una foto la pagina passa al criterio «Manuale», e al
 * salvataggio il database lo registra (decisione della proprieta' del
 * 27/09/2026). Non chiederlo con un avviso: chi trascina ha gia' detto
 * cosa vuole.
 *
 * ── LA STELLA SOLO FUORI DAL MANUALE ───────────────────────────────────
 * «Fissa all'inizio» serve a tenere una foto in testa quando l'ordine lo
 * decide una regola (data, casuale, alternata). In manuale la posizione
 * la decide gia' il trascinamento, e `ordina()` la stella la ignora: qui
 * non si mostra nemmeno.
 *
 * ── TOGLIERE NON E' CANCELLARE ─────────────────────────────────────────
 * Si scollega la foto da QUESTA pagina. Resta in archivio («Tutte le
 * foto») e sulle altre pagine. Se le foto che restano scendono sotto la
 * soglia la gallery sparisce da sola: lo dice `decidi()`, la stessa regola
 * del sito, e il pannello lo annuncia PRIMA del salvataggio.
 */

type Riga = {
  id: string;
  key: string;
  label: string;
  visibility_override: 'inherit' | 'on' | 'off';
  min_images_override: number | null;
  sort_override: Criterio | null;
};

const NOME_CRITERIO: Record<Criterio, string> = {
  manual: 'Manuale',
  newest: 'Più recenti prima',
  oldest: 'Più vecchie prima',
  daily_random: 'Casuale del giorno',
  alternate: 'Alternata verticale/orizzontale',
};

/** `ordina()` vuole la forma di `Foto`: i campi che non usa si riempiono
 *  a vuoto, quelli che usa (posizione, stella, date, misure) sono veri. */
function comeFoto(f: FotoPagina): Foto {
  return { ...f, bucket: '', storage_path: '', blur_data_url: null };
}

function inFila(foto: FotoPagina[], criterio: Criterio, chiave: string): FotoPagina[] {
  const perId = new Map(foto.map((f) => [f.image_id, f]));
  return ordina(foto.map(comeFoto), criterio, chiave).map((f) => perId.get(f.image_id)!);
}

export function GalleryFotoPagina({
  riga,
  impostazioni,
  carica,
  salva,
  onSalvato,
}: {
  riga: Riga;
  impostazioni: Impostazioni;
  carica: (tagId: string) => Promise<Esito & { foto?: FotoPagina[] }>;
  salva: (
    tagId: string,
    d: { ordine: { image_id: string; pinned: boolean }[]; tolte: string[]; manuale: boolean }
  ) => Promise<Esito & { quante?: number }>;
  onSalvato: (patch: { quante: number; sort_override?: Criterio }) => void;
}) {
  const [voci, setVoci] = useState<FotoPagina[] | null>(null);
  const [salvate, setSalvate] = useState<FotoPagina[]>([]);
  const [tolte, setTolte] = useState<FotoPagina[]>([]);
  const [trascinato, setTrascinato] = useState(false);
  const [criterioSalvato, setCriterioSalvato] = useState<Criterio>(
    riga.sort_override ?? impostazioni.default_sort
  );
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const criterio: Criterio = trascinato ? 'manual' : criterioSalvato;
  const manuale = criterio === 'manual';

  useEffect(() => {
    let vivo = true;
    carica(riga.id).then((r) => {
      if (!vivo) return;
      if (!r.ok || !r.foto) {
        setEsito({ ok: false, testo: r.errore ?? 'Non riesco a leggere le foto di questa pagina.' });
        setVoci([]);
        return;
      }
      const fila = inFila(r.foto, criterioSalvato, riga.key);
      setVoci(fila);
      setSalvate(fila);
    });
    return () => { vivo = false; };
    // Si carica una volta, all'apertura: dopo, la verita' e' lo stato locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riga.id]);

  const sensori = useSensors(
    /* 8 pixel di soglia: un tocco sulla maniglia non e' ancora uno
       spostamento. Come in RiordinaFoto. */
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => (voci ?? []).map((v) => v.image_id), [voci]);

  if (voci === null) {
    return (
      <Group gap="xs" py="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Carico le foto di «{riga.label}»…</Text>
      </Group>
    );
  }

  const firma = (l: FotoPagina[]) => l.map((f) => `${f.image_id}:${f.pinned ? 1 : 0}`).join('|');
  const sporco = trascinato || tolte.length > 0 || firma(voci) !== firma(salvate);

  /* LO STATO DOPO IL SALVATAGGIO, con la regola del sito: se le foto che
     restano non bastano, si dice adesso e non dopo. */
  const dopo = decidi(
    impostazioni,
    { visibility_override: riga.visibility_override, min_images_override: riga.min_images_override } as Tag,
    voci.length
  );

  const fineTrascinamento = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setVoci((v) => {
      if (!v) return v;
      const da = v.findIndex((x) => x.image_id === active.id);
      const a = v.findIndex((x) => x.image_id === over.id);
      return da < 0 || a < 0 ? v : arrayMove(v, da, a);
    });
    setTrascinato(true);
    setEsito(null);
  };

  /* Fuori dal manuale l'ordine lo fa la regola: dopo ogni cambiamento
     (stella, foto rimessa) si rimette in fila con `ordina()`, cosi' quello
     che si vede resta quello che vedra' il visitatore. */
  const rifila = (l: FotoPagina[]) => (manuale ? l : inFila(l, criterio, riga.key));

  const stella = (id: string) => {
    setVoci((v) => v && rifila(v.map((f) => (f.image_id === id ? { ...f, pinned: !f.pinned } : f))));
    setEsito(null);
  };

  const togli = (id: string) => {
    const f = voci.find((x) => x.image_id === id);
    if (!f) return;
    setVoci(voci.filter((x) => x.image_id !== id));
    setTolte((t) => [...t, f]);
    setEsito(null);
  };

  const togliTutte = () => {
    setTolte((t) => [...t, ...voci]);
    setVoci([]);
    setEsito(null);
  };

  const rimetti = (id: string) => {
    const f = tolte.find((x) => x.image_id === id);
    if (!f) return;
    setTolte(tolte.filter((x) => x.image_id !== id));
    setVoci(rifila([...voci, f]));
    setEsito(null);
  };

  const annulla = () => {
    setVoci(salvate);
    setTolte([]);
    setTrascinato(false);
    setEsito(null);
  };

  const invia = () => {
    const ordine = voci;
    const via = tolte;
    const eraTrascinato = trascinato;
    setEsito(null);
    avvia(async () => {
      const r = await salva(riga.id, {
        ordine: ordine.map((f) => ({ image_id: f.image_id, pinned: f.pinned })),
        tolte: via.map((f) => f.image_id),
        manuale: eraTrascinato,
      });
      if (!r.ok) {
        setEsito({ ok: false, testo: r.errore ?? 'Non salvato.' });
        return;
      }
      const quante = r.quante ?? ordine.length;
      setSalvate(ordine);
      setTolte([]);
      setTrascinato(false);
      if (eraTrascinato) setCriterioSalvato('manual');
      onSalvato(eraTrascinato ? { quante, sort_override: 'manual' } : { quante });

      const pezzi = [
        eraTrascinato && 'ordine salvato, criterio passato a «Manuale»',
        via.length > 0 && `${via.length} ${via.length === 1 ? 'foto tolta' : 'foto tolte'} da questa pagina (restano in archivio)`,
        !eraTrascinato && via.length === 0 && 'stelle salvate',
      ].filter(Boolean);
      setEsito({
        ok: true,
        testo: `«${riga.label}»: ${pezzi.join(', ')}. La pagina si aggiorna in pochi secondi.`,
      });
    });
  };

  return (
    <Stack gap="sm" py="xs">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Text size="sm">
            Ordinamento di questa pagina: <b>{NOME_CRITERIO[criterio]}</b>
            {riga.sort_override == null && !trascinato && <Text span c="dimmed"> (quello predefinito)</Text>}
          </Text>
          <Text size="xs" c="dimmed">
            {manuale
              ? 'Trascina le foto dalla maniglia: sul sito compaiono in quest’ordine.'
              : 'Le vedi nell’ordine del sito. Trascinandone una la pagina passa a «Manuale»; la stella tiene una foto in testa con questo criterio.'}
          </Text>
        </Stack>
        <Group gap="xs">
          {voci.length > 0 && (
            <Button size="xs" variant="subtle" color="red" onClick={togliTutte} disabled={inCorso}>
              Togli tutte
            </Button>
          )}
          {sporco && (
            <Button size="xs" variant="default" onClick={annulla} disabled={inCorso}>
              Annulla
            </Button>
          )}
          <Button
            size="xs"
            onClick={invia}
            loading={inCorso}
            disabled={!sporco}
            leftSection={<IconCheck size={14} />}
          >
            Salva ordine
          </Button>
        </Group>
      </Group>

      {esito && (
        <Alert
          color={esito.ok ? 'green' : 'red'}
          icon={esito.ok ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setEsito(null)}
        >
          {esito.testo}
        </Alert>
      )}

      {sporco && !dopo.visibile && (
        <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
          Dopo il salvataggio: <b>{spiega(dopo)}</b>. Con {voci.length} foto la gallery non
          comparirà su questa pagina.
        </Alert>
      )}

      {voci.length === 0 ? (
        <Text size="sm" c="dimmed">Nessuna foto approvata su questa pagina.</Text>
      ) : (
        <DndContext sensors={sensori} collisionDetection={closestCenter} onDragEnd={fineTrascinamento}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5, lg: 6 }} spacing="sm">
              {voci.map((f, i) => (
                <Miniatura
                  key={f.image_id}
                  foto={f}
                  posizione={i}
                  conStella={!manuale}
                  onStella={() => stella(f.image_id)}
                  onTogli={() => togli(f.image_id)}
                />
              ))}
            </SimpleGrid>
          </SortableContext>
        </DndContext>
      )}

      {tolte.length > 0 && (
        <Card withBorder radius="md" padding="sm">
          <Stack gap="xs">
            <Text size="sm" fw={600}>Da togliere da questa pagina ({tolte.length})</Text>
            <Text size="xs" c="dimmed">
              Finché non salvi puoi rimetterle. Dopo, restano comunque in archivio e sulle altre
              pagine: si ritaggano da «Tutte le foto».
            </Text>
            <SimpleGrid cols={{ base: 3, sm: 5, md: 8 }} spacing="xs">
              {tolte.map((f) => (
                <Card withBorder radius="sm" padding={4} key={f.image_id}>
                  <Stack gap={4}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                               borderRadius: 4, display: 'block', opacity: 0.6 }}
                    />
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<IconArrowBackUp size={12} />}
                      onClick={() => rimetti(f.image_id)}
                    >
                      Rimetti
                    </Button>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

function Miniatura({
  foto,
  posizione,
  conStella,
  onStella,
  onTogli,
}: {
  foto: FotoPagina;
  posizione: number;
  conStella: boolean;
  onStella: () => void;
  onTogli: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: foto.image_id,
  });

  return (
    <Card
      ref={setNodeRef}
      withBorder
      radius="md"
      padding={6}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* `contain` e non `cover`: una verticale deve sembrare verticale,
            e' l'informazione che serve per decidere dove metterla. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={foto.alt}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain',
                   borderRadius: 6, display: 'block', background: 'var(--mantine-color-gray-1)' }}
        />

        {/* 🔴 Il trascinamento sta sulla MANIGLIA, non sull'immagine:
            dnd-kit mette `touch-action: none` su quello che ascolta, e
            sull'immagine intera la pagina non scorrerebbe piu' col dito.
            Vedi RiordinaFoto. */}
        <ActionIcon
          variant="filled"
          color="dark"
          size="lg"
          radius="sm"
          style={{ position: 'absolute', top: 6, left: 6, cursor: 'grab', touchAction: 'none' }}
          aria-label={`Trascina per spostare la foto ${posizione + 1}`}
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={18} />
        </ActionIcon>

        <Badge size="sm" variant="filled" color="dark" style={{ position: 'absolute', top: 6, right: 6 }}>
          {posizione + 1}
        </Badge>

        <Group gap={4} style={{ position: 'absolute', bottom: 6, right: 6 }}>
          {conStella && (
            <Tooltip label={foto.pinned ? 'Non tenerla più in testa' : 'Tienila sempre in testa'} withArrow>
              <ActionIcon
                variant="filled"
                color={foto.pinned ? 'yellow' : 'gray'}
                size="md"
                radius="sm"
                onClick={onStella}
                aria-label={foto.pinned ? 'Togli la stella' : 'Metti la stella'}
                aria-pressed={foto.pinned}
              >
                {foto.pinned ? <IconStarFilled size={15} /> : <IconStar size={15} />}
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Togli da questa pagina" withArrow>
            <ActionIcon
              variant="filled"
              color="red"
              size="md"
              radius="sm"
              onClick={onTogli}
              aria-label={`Togli la foto ${posizione + 1} da questa pagina`}
            >
              <IconX size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
    </Card>
  );
}
