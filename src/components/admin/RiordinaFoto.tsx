'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconGripVertical,
  IconStar,
  IconTrash,
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

/* Stessa forma di `Foto` in src/components/PhotoStrip.tsx: quello che si
   riordina qui e' esattamente l'oggetto che finisce in `blocks.gallery`.
   Se i due tipi divergono, il pannello salva campi che la pagina non
   legge e le didascalie scritte a mano spariscono senza avvisare. */
export type FotoAdmin = { src: string; alt?: string; label?: string; caption?: string };

type Voce = { id: string; foto: FotoAdmin };

/* L'id del trascinamento non puo' essere l'indirizzo della foto: su
   qualche tour la stessa immagine compare due volte, e due elementi con
   lo stesso id fanno saltare l'ordinamento a meta' gesto. */
function inVoci(foto: FotoAdmin[]): Voce[] {
  return foto.map((f, i) => ({ id: `f${i}`, foto: f }));
}

function ordineDi(voci: Voce[]): string {
  return voci.map((v) => v.foto.src).join('\n');
}

export function RiordinaFoto({
  slug,
  iniziali,
  salva,
}: {
  slug: string;
  iniziali: FotoAdmin[];
  salva: (slug: string, foto: FotoAdmin[]) => Promise<{ ok: boolean; errore?: string }>;
}) {
  const [voci, setVoci] = useState<Voce[]>(() => inVoci(iniziali));
  const [escluse, setEscluse] = useState<Voce[]>([]);
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'ko'; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  /* Quello che c'e' davvero nel database, non quello che c'era all'apertura
     della pagina: dopo un salvataggio riuscito si sposta qui, cosi'
     "Annulla" riporta all'ultimo salvato e non a mezz'ora fa. */
  const [salvate, setSalvate] = useState<Voce[]>(() => inVoci(iniziali));

  /* Il confronto e' sulla sequenza degli indirizzi, non sugli oggetti: e'
     quella che il salvataggio cambia davvero, ed e' quella che rende il
     pulsante "Salva" onesto invece che sempre acceso. */
  const sporco = ordineDi(voci) !== ordineDi(salvate);

  const sensori = useSensors(
    /* Gli 8 pixel di soglia distinguono il clic sulla maniglia da un
       trascinamento appena iniziato: senza, ogni tocco muove la foto. */
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => voci.map((v) => v.id), [voci]);

  const fineTrascinamento = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setVoci((v) => {
      const da = v.findIndex((x) => x.id === active.id);
      const a = v.findIndex((x) => x.id === over.id);
      return da < 0 || a < 0 ? v : arrayMove(v, da, a);
    });
    setEsito(null);
  };

  const togli = (id: string) => {
    setVoci((v) => {
      const fuori = v.find((x) => x.id === id);
      if (fuori) setEscluse((e) => [...e, fuori]);
      return v.filter((x) => x.id !== id);
    });
    setEsito(null);
  };

  const rimetti = (id: string) => {
    setEscluse((e) => {
      const dentro = e.find((x) => x.id === id);
      if (dentro) setVoci((v) => [...v, dentro]);
      return e.filter((x) => x.id !== id);
    });
    setEsito(null);
  };

  /* Trascinare la ventesima foto fino alla prima posizione, in una
     griglia che scorre, e' un gesto che si sbaglia. La copertina e'
     l'unica posizione che conta davvero: merita un pulsante. */
  const inCopertina = (id: string) => {
    setVoci((v) => {
      const i = v.findIndex((x) => x.id === id);
      return i <= 0 ? v : arrayMove(v, i, 0);
    });
    setEsito(null);
  };

  const annulla = () => {
    setVoci(salvate);
    setEscluse([]);
    setEsito(null);
  };

  const invia = () => {
    setEsito(null);
    const ordine = voci;
    avvia(async () => {
      const r = await salva(slug, ordine.map((v) => v.foto));
      if (r.ok) {
        /* Da qui in poi il salvato e' questo: senza spostare il termine di
           paragone il pulsante resterebbe acceso dopo un salvataggio
           riuscito, e si finirebbe per salvare due volte per sicurezza. */
        setSalvate(ordine);
        setEscluse([]);
        setEsito({ tipo: 'ok', testo: 'Salvato. La pagina del tour è già aggiornata.' });
      } else {
        setEsito({ tipo: 'ko', testo: r.errore ?? 'Non sono riuscito a salvare.' });
      }
    });
  };

  return (
    <Stack gap="md">
      <Card withBorder radius="md" padding="sm">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Text size="sm" c="dimmed">
            {voci.length} foto in elenco
            {escluse.length > 0 && ` · ${escluse.length} tolte`}
          </Text>
          <Group gap="xs">
            {sporco && (
              <Button variant="default" onClick={annulla} disabled={inCorso}>
                Annulla le modifiche
              </Button>
            )}
            <Button
              onClick={invia}
              loading={inCorso}
              disabled={!sporco || voci.length === 0}
              leftSection={<IconCheck size={16} />}
            >
              Salva
            </Button>
          </Group>
        </Group>
      </Card>

      {esito && (
        <Alert
          color={esito.tipo === 'ok' ? 'green' : 'red'}
          icon={esito.tipo === 'ok' ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setEsito(null)}
        >
          {esito.testo}
        </Alert>
      )}

      <DndContext sensors={sensori} collisionDetection={closestCenter} onDragEnd={fineTrascinamento}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
            {voci.map((v, i) => (
              <Riquadro
                key={v.id}
                voce={v}
                posizione={i}
                onTogli={() => togli(v.id)}
                onCopertina={() => inCopertina(v.id)}
              />
            ))}
          </SimpleGrid>
        </SortableContext>
      </DndContext>

      {escluse.length > 0 && (
        <Card withBorder radius="md" padding="md">
          <Stack gap="sm">
            <Title order={2} size="h5">Tolte dall’elenco</Title>
            <Text size="sm" c="dimmed">
              Restano qui finché non salvi. Dopo il salvataggio spariscono dalla scheda del
              tour: il file resta dov’è, ma per rimetterlo servirà il suo indirizzo.
            </Text>
            <SimpleGrid cols={{ base: 3, sm: 5, md: 7 }} spacing="xs">
              {escluse.map((v) => (
                <Card withBorder radius="sm" padding={4} key={v.id}>
                  <Stack gap={4}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.foto.src}
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
                      onClick={() => rimetti(v.id)}
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

function Riquadro({
  voce,
  posizione,
  onTogli,
  onCopertina,
}: {
  voce: Voce;
  posizione: number;
  onTogli: () => void;
  onCopertina: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: voce.id,
  });

  const copertina = posizione === 0;

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
        borderColor: copertina ? 'var(--mantine-color-prestige-5)' : undefined,
        borderWidth: copertina ? 2 : undefined,
      }}
    >
      <Stack gap={6}>
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={voce.foto.src}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                     borderRadius: 6, display: 'block', background: 'var(--mantine-color-gray-1)' }}
          />

          {/* 🔴 IL TRASCINAMENTO STA SULLA MANIGLIA, NON SULL'IMMAGINE.
              Non e' un vezzo: dnd-kit mette `touch-action: none` su quello
              che ascolta, e con l'ascolto sull'immagine intera la pagina
              NON SCORREVA PIU' col dito -- su un telefono, con venti foto,
              si restava bloccati a meta' griglia. Con la maniglia solo
              quel quadratino blocca il dito e tutto il resto scorre. */}
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

          <Badge
            size="sm"
            variant="filled"
            color="dark"
            style={{ position: 'absolute', top: 6, right: 6 }}
          >
            {posizione + 1}
          </Badge>

          {copertina && (
            <Badge
              size="sm"
              variant="filled"
              color="prestige"
              style={{ position: 'absolute', bottom: 6, left: 6 }}
            >
              COPERTINA
            </Badge>
          )}
        </div>

        {(voce.foto.label || voce.foto.caption) && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {voce.foto.label || voce.foto.caption}
          </Text>
        )}

        <Group gap={4} wrap="nowrap">
          {!copertina && (
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconStar size={12} />}
              onClick={onCopertina}
              style={{ flex: 1 }}
            >
              Copertina
            </Button>
          )}
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={12} />}
            onClick={onTogli}
            style={{ flex: copertina ? 1 : '0 0 auto' }}
          >
            Togli
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
