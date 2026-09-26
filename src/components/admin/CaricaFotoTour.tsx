'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  FileButton,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconPhotoPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { preparaFoto, type Preparata } from './preparaFoto';
import type { aggiungiFoto as TipoAggiungi, firmeTour as TipoFirme } from '@/app/admin/foto/azioni';

/* AGGIUNGERE FOTO A UN TOUR, DAL PANNELLO.
 *
 * ── PERCHE' RIUSA `preparaFoto` DELLA GALLERY ──────────────────────────
 * Perche' fa esattamente quello che serve anche qui: legge data e
 * orientamento dall'EXIF, ruota i PIXEL, ridimensiona a 2400px e
 * ricodifica in WebP. La ricodifica ha un effetto che qui conta quanto la
 * dimensione: un canvas ricodificato non porta EXIF, quindi la posizione
 * GPS non finisce su una foto pubblica del sito.
 * Scrivere una seconda catena di preparazione vorrebbe dire due posti
 * dove ricordarsi del GPS, e fra un anno uno dei due se ne sara'
 * dimenticato.
 *
 * ── PERCHE' IL FILE NON PASSA DALLA SERVER ACTION ──────────────────────
 * Il corpo di una server action su Vercel si ferma a 1 MB, e una foto
 * anche ridotta ci arriva vicino. Il browser carica dritto nello storage
 * con un indirizzo firmato che vale per QUEL file e per pochi minuti;
 * alla server action arriva solo il percorso da scrivere.
 *
 * ── PERCHE' IL RIQUADRO SI MONTA SOLO DA APERTO ────────────────────────
 * L'elenco ha 87 righe. Un riquadro per riga, montato sempre, sarebbe 87
 * moduli con i loro stati in una pagina che serve a guardare una tabella.
 * Chiuso, qui resta un pulsante.
 */

type Scheda = {
  id: string;
  nome: string;
  /** null finche' il ridimensionamento non ha finito */
  pronta: Preparata | null;
  errore: string | null;
  alt: string;
  anteprima: string;
};

export function CaricaFotoTour({
  slug,
  nome,
  firme,
  aggiungi,
  compatto = false,
}: {
  slug: string;
  /** il nome leggibile del tour, per l'intestazione del riquadro */
  nome: string;
  firme: typeof TipoFirme;
  aggiungi: typeof TipoAggiungi;
  /** nella tabella il pulsante e' piccolo e senza scritta lunga */
  compatto?: boolean;
}) {
  const [aperto, setAperto] = useState(false);

  return (
    <>
      <Button
        variant={compatto ? 'subtle' : 'filled'}
        size={compatto ? 'compact-xs' : 'sm'}
        leftSection={<IconPhotoPlus size={compatto ? 14 : 18} />}
        onClick={() => setAperto(true)}
      >
        {compatto ? 'Aggiungi' : 'Aggiungi foto'}
      </Button>

      {aperto && (
        <Modal
          opened
          onClose={() => setAperto(false)}
          title={`Aggiungi foto — ${nome}`}
          size="lg"
          /* Da telefono il riquadro prende tutto lo schermo: un modale
             centrato con i margini, su 390px, lascia una colonna in cui
             non ci sta un'anteprima. */
          fullScreen={typeof window !== 'undefined' && window.innerWidth < 720}
        >
          <Dentro slug={slug} firme={firme} aggiungi={aggiungi} chiudi={() => setAperto(false)} />
        </Modal>
      )}
    </>
  );
}

function Dentro({
  slug,
  firme,
  aggiungi,
  chiudi,
}: {
  slug: string;
  firme: typeof TipoFirme;
  aggiungi: typeof TipoAggiungi;
  chiudi: () => void;
}) {
  const router = useRouter();
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, avvia] = useTransition();

  const valide = schede.filter((s) => s.pronta && !s.errore);

  const scegli = async (scelte: File[] | null) => {
    if (!scelte?.length) return;
    setEsito(null);

    /* Una alla volta, non tutte insieme. Dieci canvas da 12 megapixel
       aperti in contemporanea fanno ricaricare la scheda su un telefono,
       e chi carica perde tutto quello che aveva gia' scritto. In fila
       ogni foto compare pronta mentre la successiva sta lavorando. */
    for (const file of scelte.slice(0, 20)) {
      const id = crypto.randomUUID();
      setSchede((p) => [
        ...p,
        { id, nome: file.name, pronta: null, errore: null, alt: '', anteprima: '' },
      ]);
      const r = await preparaFoto(file);
      setSchede((p) =>
        p.map((s) =>
          s.id !== id
            ? s
            : r.ok
              ? { ...s, pronta: r.foto, anteprima: URL.createObjectURL(r.foto.blob) }
              : { ...s, errore: r.errore }
        )
      );
    }
  };

  const togli = (id: string) =>
    setSchede((p) => {
      const s = p.find((x) => x.id === id);
      if (s?.anteprima) URL.revokeObjectURL(s.anteprima);
      return p.filter((x) => x.id !== id);
    });

  const carica = () => {
    setEsito(null);
    avvia(async () => {
      const r1 = await firme(slug, valide.length);
      if (!r1.ok || !r1.firme) {
        setEsito({ ok: false, testo: r1.errore ?? 'Non riesco a ottenere il permesso di caricare.' });
        return;
      }

      const saliti: { storage_path: string; alt?: string }[] = [];
      for (let i = 0; i < valide.length; i++) {
        const s = valide[i];
        const f = r1.firme[i];
        const su = await fetch(f.url, {
          method: 'PUT',
          headers: { 'content-type': 'image/webp' },
          body: s.pronta!.blob,
        }).catch(() => null);

        if (!su || !su.ok) {
          /* Si ferma e lo dice. Registrare le prime e tacere sulle altre
             lascerebbe un tour con meta' delle foto e nessun motivo
             visibile. */
          setEsito({
            ok: false,
            testo: `«${s.nome}» non è salita. Nessuna foto è stata aggiunta alla scheda: riprova.`,
          });
          return;
        }
        saliti.push({ storage_path: f.percorso, alt: s.alt });
      }

      const r2 = await aggiungi(slug, saliti);
      if (!r2.ok) {
        setEsito({ ok: false, testo: r2.errore ?? 'Non sono riuscito a salvare.' });
        return;
      }

      for (const s of schede) if (s.anteprima) URL.revokeObjectURL(s.anteprima);
      setSchede([]);
      /* `refresh` e non `reload`: ricarica i dati del server lasciando
         dov'e' lo scorrimento della tabella, che su 87 righe e' la
         differenza fra ritrovare la riga e ricercarla. */
      router.refresh();
      chiudi();
    });
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Le foto si aggiungono <b>in fondo</b> all’elenco del tour. La copertina resta quella che
        è: per cambiarla si trascina, nella pagina del tour. Vengono ridotte a 2400px e
        convertite in WebP qui nel browser, e perdono i dati EXIF — <b>posizione GPS compresa</b>.
      </Text>

      <Group>
        <FileButton onChange={scegli} accept="image/jpeg,image/png,image/webp,image/avif" multiple>
          {(props) => (
            <Button {...props} variant="default" leftSection={<IconUpload size={16} />}>
              Scegli le foto
            </Button>
          )}
        </FileButton>
        {schede.length > 0 && (
          <Text size="sm" c="dimmed">
            {valide.length} pronte{schede.length !== valide.length && `, ${schede.length - valide.length} da controllare`}
          </Text>
        )}
      </Group>

      {esito && (
        <Alert color={esito.ok ? 'green' : 'red'} icon={<IconAlertTriangle size={18} />}>
          {esito.testo}
        </Alert>
      )}

      {schede.length > 0 && (
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          {schede.map((s) => (
            <Stack key={s.id} gap={6} p="xs" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
              {s.errore ? (
                <Text size="xs" c="red">{s.errore}</Text>
              ) : s.pronta ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.anteprima}
                    alt=""
                    style={{ width: '100%', aspectRatio: `${s.pronta.width} / ${s.pronta.height}`,
                             objectFit: 'cover', borderRadius: 6, background: s.pronta.colore }}
                  />
                  <TextInput
                    size="xs"
                    placeholder="Descrizione in inglese (alt)"
                    value={s.alt}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      setSchede((p) => p.map((x) => (x.id === s.id ? { ...x, alt: v } : x)));
                    }}
                  />
                  {s.pronta.avvisi.map((a, i) => (
                    <Text key={i} size="xs" c="orange">{a}</Text>
                  ))}
                </>
              ) : (
                <Text size="xs" c="dimmed">sto preparando «{s.nome}»…</Text>
              )}
              <Button
                variant="subtle" color="red" size="compact-xs"
                leftSection={<IconTrash size={13} />}
                onClick={() => togli(s.id)}
              >
                Togli
              </Button>
            </Stack>
          ))}
        </SimpleGrid>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={chiudi} disabled={inCorso}>Annulla</Button>
        <Button onClick={carica} loading={inCorso} disabled={!valide.length}>
          {valide.length ? `Carica ${valide.length} foto` : 'Carica'}
        </Button>
      </Group>
    </Stack>
  );
}
