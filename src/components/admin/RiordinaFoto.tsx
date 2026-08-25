'use client';

import { useMemo, useState, useTransition } from 'react';
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
    /* Gli 8 pixel di soglia distinguono il clic su "Togli" da un
       trascinamento appena iniziato: senza, ogni clic muove la foto. */
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
        setEsito({ tipo: 'ok', testo: 'Salvato. La pagina del tour e’ gia’ aggiornata.' });
      } else {
        setEsito({ tipo: 'ko', testo: r.errore ?? 'Non sono riuscito a salvare.' });
      }
    });
  };

  return (
    <>
      <div className="ad-barra ad-foto-barra">
        <span className="ad-quante ad-quante-sx">
          {voci.length} foto in elenco
          {escluse.length > 0 && ` · ${escluse.length} tolte`}
        </span>
        {sporco && (
          <button type="button" onClick={annulla} disabled={inCorso}>
            Annulla le modifiche
          </button>
        )}
        <button
          type="button"
          className="ad-salva"
          onClick={invia}
          disabled={!sporco || inCorso || voci.length === 0}
        >
          {inCorso ? 'Salvo…' : 'Salva'}
        </button>
      </div>

      {esito && <p className={esito.tipo === 'ok' ? 'ad-esito-ok' : 'ad-esito-ko'}>{esito.testo}</p>}

      <DndContext sensors={sensori} collisionDetection={closestCenter} onDragEnd={fineTrascinamento}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="ad-foto-griglia">
            {voci.map((v, i) => (
              <Riquadro
                key={v.id}
                voce={v}
                posizione={i}
                onTogli={() => togli(v.id)}
                onCopertina={() => inCopertina(v.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {escluse.length > 0 && (
        <section className="ad-foto-fuori">
          <h2>Tolte dall&apos;elenco</h2>
          <p>
            Restano qui finche&apos; non salvi. Dopo il salvataggio spariscono dalla scheda del
            tour: il file resta dov&apos;e&apos;, ma per rimetterlo servira&apos; il suo indirizzo.
          </p>
          <div className="ad-foto-griglia ad-piccola">
            {escluse.map((v) => (
              <figure className="ad-foto" key={v.id}>
                <div className="ad-presa">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.foto.src} alt="" loading="lazy" decoding="async" />
                </div>
                <figcaption>
                  <div className="ad-foto-azioni">
                    <button type="button" onClick={() => rimetti(v.id)}>
                      Rimetti
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
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
    <figure
      ref={setNodeRef}
      className={'ad-foto' + (copertina ? ' ad-copertina' : '') + (isDragging ? ' ad-trascino' : '')}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {/* L'aggancio del trascinamento sta sull'immagine e non sull'intero
          riquadro, altrimenti inghiotte i clic dei pulsanti qui sotto. */}
      <div className="ad-presa" {...attributes} {...listeners}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={voce.foto.src} alt="" loading="lazy" decoding="async" />
        <span className="ad-pos">{posizione + 1}</span>
        {copertina && <span className="ad-bollo">COPERTINA</span>}
      </div>

      <figcaption>
        {(voce.foto.label || voce.foto.caption) && (
          <span className="ad-dida">{voce.foto.label || voce.foto.caption}</span>
        )}
        <div className="ad-foto-azioni">
          {!copertina && (
            <button type="button" onClick={onCopertina}>
              In copertina
            </button>
          )}
          <button type="button" className="ad-togli" onClick={onTogli}>
            Togli
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
