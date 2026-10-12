'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Group, SegmentedControl, Stack, Text, Textarea } from '@mantine/core';
import { IconArrowBackUp, IconCheck, IconPencil } from '@tabler/icons-react';
import { CAMPI_TESTO, FLOTTA, MAX_TESTO, testiMezzo, type CampoTesto, type ModificaTesto } from '@/lib/flotta';
import type { Lingua } from '@/lib/partners-testi';
import { FlottaRighe, type TourDelMezzo } from '@/components/partners/FlottaRighe';
import { ripristinaTestoFlotta, salvaTestoFlotta } from '@/app/admin/partners/flotta/azioni';

/* LA FLOTTA, MODIFICABILE DALL'ADMIN (richiesta della proprieta',
 * 12/10/2026: «click sul testo, si apre la finestra con l'editor, la
 * modifica si salva da sola e se ne vedono subito gli effetti; un
 * selettore ita/eng per tutte e due le lingue»).
 *
 * ── PERCHE' LA FINESTRA SALE DAL BASSO ───────────────────────────────
 * Una finestra al centro coprirebbe proprio il testo che si sta
 * scrivendo. Il pannello sta in basso, senza velo scuro, e la pagina
 * scorre in modo che il testo aperto resti in alto, evidenziato: ogni
 * lettera scritta si vede subito nella riga vera, com'e' per il partner.
 *
 * ── IL SALVATAGGIO ───────────────────────────────────────────────────
 * Dopo 700 ms senza scrivere, e subito alla chiusura o al cambio di
 * lingua se c'e' qualcosa in sospeso. Ogni salvataggio ha un numero:
 * l'esito di uno vecchio arrivato tardi non copre quello di uno nuovo.
 * Un testo obbligatorio (tipo, descrizione) vuoto non si salva: si vede
 * il motivo, e in pagina resta l'ultimo salvato. */

type Aperto = { chiave: string; campo: CampoTesto };
type Stato =
  | { tipo: 'fermo' }
  | { tipo: 'scrive' }
  | { tipo: 'salva' }
  | { tipo: 'salvato'; ora: string }
  | { tipo: 'errore'; testo: string };

const ATTESA = 700;

function testoDi(modifiche: ModificaTesto[], chiave: string, lingua: Lingua, campo: CampoTesto) {
  const m = FLOTTA.find((x) => x.chiave === chiave)!;
  return testiMezzo(m, lingua, modifiche)[campo] ?? '';
}

export function FlottaModifica({
  usati,
  modifiche: iniziali,
}: {
  usati: Record<string, TourDelMezzo[]>;
  modifiche: ModificaTesto[];
}) {
  const [lingua, setLingua] = useState<Lingua>('it');
  const [modifiche, setModifiche] = useState(iniziali);
  const [aperto, setAperto] = useState<Aperto | null>(null);
  const [bozza, setBozza] = useState('');
  const [stato, setStato] = useState<Stato>({ tipo: 'fermo' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** cio' che aspetta di essere salvato, per salvarlo subito se si chiude */
  const sospeso = useRef<{ chiave: string; lingua: Lingua; campo: CampoTesto; testo: string } | null>(null);
  const numero = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const def = aperto ? CAMPI_TESTO.find((c) => c.campo === aperto.campo)! : null;
  const mezzo = aperto ? FLOTTA.find((m) => m.chiave === aperto.chiave)! : null;
  const modificato = aperto
    ? modifiche.some((x) => x.chiave === aperto.chiave && x.lingua === lingua && x.campo === aperto.campo)
    : false;
  const originale = aperto && mezzo ? testiMezzo(mezzo, lingua)[aperto.campo] ?? '' : '';
  const altraLingua: Lingua = lingua === 'it' ? 'en' : 'it';
  const nellAltra = aperto ? testoDi(modifiche, aperto.chiave, altraLingua, aperto.campo) : '';

  async function salva(cosa: { chiave: string; lingua: Lingua; campo: CampoTesto; testo: string }) {
    sospeso.current = null;
    const obbligatorio = CAMPI_TESTO.find((c) => c.campo === cosa.campo)!.obbligatorio;
    if (obbligatorio && !cosa.testo.trim()) {
      setStato({ tipo: 'errore', testo: 'Questo testo non può restare vuoto: non è stato salvato.' });
      return;
    }
    const n = ++numero.current;
    setStato({ tipo: 'salva' });
    const r = await salvaTestoFlotta(cosa.chiave, cosa.lingua, cosa.campo, cosa.testo);
    if (n !== numero.current) return;
    setStato(
      r.ok
        ? { tipo: 'salvato', ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
        : { tipo: 'errore', testo: r.errore ?? 'Non salvato.' }
    );
  }

  /** Salva subito quello che aspettava il timer (chiusura, cambio di
   *  lingua, altro testo aperto). */
  function salvaSospeso() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (sospeso.current) void salva(sospeso.current);
  }

  function apri(chiave: string, campo: CampoTesto, el: HTMLElement) {
    salvaSospeso();
    setAperto({ chiave, campo });
    setBozza(testoDi(modifiche, chiave, lingua, campo));
    setStato({ tipo: 'fermo' });
    /* il testo aperto sale in cima, sopra la finestra */
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  function scrivi(valore: string) {
    if (!aperto) return;
    setBozza(valore);
    const cosa = { chiave: aperto.chiave, lingua, campo: aperto.campo, testo: valore };
    /* subito in pagina: la riga dietro la finestra cambia mentre si scrive */
    setModifiche((prima) => [
      ...prima.filter((x) => !(x.chiave === cosa.chiave && x.lingua === cosa.lingua && x.campo === cosa.campo)),
      cosa,
    ]);
    sospeso.current = cosa;
    setStato({ tipo: 'scrive' });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (sospeso.current) void salva(sospeso.current);
    }, ATTESA);
  }

  function cambiaLingua(l: Lingua) {
    salvaSospeso();
    setLingua(l);
    if (aperto) {
      setBozza(testoDi(modifiche, aperto.chiave, l, aperto.campo));
      setStato({ tipo: 'fermo' });
    }
  }

  async function ripristina() {
    if (!aperto) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    sospeso.current = null;
    const n = ++numero.current;
    setStato({ tipo: 'salva' });
    const r = await ripristinaTestoFlotta(aperto.chiave, lingua, aperto.campo);
    if (n !== numero.current) return;
    if (!r.ok) {
      setStato({ tipo: 'errore', testo: r.errore ?? 'Non ripristinato.' });
      return;
    }
    setModifiche((prima) =>
      prima.filter((x) => !(x.chiave === aperto.chiave && x.lingua === lingua && x.campo === aperto.campo))
    );
    setBozza(originale);
    setStato({ tipo: 'salvato', ora: 'testo originale ripristinato' });
  }

  function chiudi() {
    salvaSospeso();
    setAperto(null);
  }

  const selettore = (
    <SegmentedControl
      value={lingua}
      onChange={(v) => cambiaLingua(v as Lingua)}
      data={[
        { value: 'it', label: 'Italiano' },
        { value: 'en', label: 'English' },
      ]}
    />
  );

  return (
    <>
      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="md">
        <Text size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPencil size={16} />
          Clicca su un testo per modificarlo: si salva da solo, e il partner lo vede alla prossima pagina che apre.
        </Text>
        {selettore}
      </Group>

      {/* Spazio in fondo mentre la finestra e' aperta: senza, i testi
          dell'ultimo mezzo non potrebbero salire sopra la finestra. */}
      <div style={{ paddingBottom: aperto ? 380 : 0 }}>
        <FlottaRighe lingua={lingua} modifiche={modifiche} usati={usati} modifica={apri} aperto={aperto} />
      </div>

      <Drawer
        opened={!!aperto}
        onClose={chiudi}
        position="bottom"
        withOverlay={false}
        lockScroll={false}
        trapFocus
        title={mezzo && def ? `${mezzo.nome} · ${def.nome}` : ''}
        /* Alta quanto il contenuto, non una misura fissa: `size="auto"` di
           Mantine diventa `var(--drawer-size-auto)`, che non esiste, e la
           finestra copriva tutto lo schermo (visto in Chrome, 12/10/2026). */
        styles={{
          content: {
            height: 'auto',
            maxHeight: '60dvh',
            boxShadow: '0 -6px 24px rgba(0,0,0,.12)',
            borderTop: '1px solid var(--mantine-color-gray-3)',
          },
          body: { paddingBottom: 'calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))' },
        }}
      >
        {aperto && def && (
          <Stack gap="sm" maw={900} mx="auto">
            <Group justify="space-between" wrap="wrap" gap="xs">
              {selettore}
              <Text size="sm" c={stato.tipo === 'errore' ? 'red' : 'dimmed'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {stato.tipo === 'scrive' && 'Modifiche in corso…'}
                {stato.tipo === 'salva' && 'Salvataggio…'}
                {stato.tipo === 'salvato' && (
                  <>
                    <IconCheck size={15} color="var(--mantine-color-green-7)" /> Salvato ({stato.ora})
                  </>
                )}
              </Text>
            </Group>

            <Textarea
              data-autofocus
              value={bozza}
              onChange={(e) => scrivi(e.currentTarget.value)}
              autosize
              minRows={def.campo === 'descrizione' ? 3 : 1}
              maxRows={8}
              maxLength={MAX_TESTO}
              placeholder={def.obbligatorio ? '' : 'Vuoto: in pagina la riga non compare'}
              description={`${lingua === 'it' ? 'Italiano' : 'English'} · ${bozza.length}/${MAX_TESTO}`}
            />

            {stato.tipo === 'errore' && (
              <Alert color="red" variant="light" py="xs">
                {stato.testo}
              </Alert>
            )}

            {nellAltra && (
              <Text size="xs" c="dimmed">
                <Text span fw={700} size="xs">{altraLingua === 'it' ? 'In italiano' : 'In inglese'}: </Text>
                {nellAltra}
              </Text>
            )}

            <Group justify="space-between" wrap="wrap" gap="xs">
              {modificato ? (
                <Button variant="subtle" color="gray" size="xs" leftSection={<IconArrowBackUp size={15} />} onClick={ripristina}>
                  Ripristina il testo originale
                </Button>
              ) : (
                <Text size="xs" c="dimmed">Testo originale, mai modificato.</Text>
              )}
              <Button size="sm" onClick={chiudi}>Fatto</Button>
            </Group>
          </Stack>
        )}
      </Drawer>
    </>
  );
}
