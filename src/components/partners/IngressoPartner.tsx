'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  VisuallyHidden,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertCircle, IconAt, IconCircleCheck, IconLock } from '@tabler/icons-react';
import { accedi, registraRichiesta, type DatiRegistrazione } from '@/app/partners/azioni';
import { testiDi, type Lingua, type Testi } from '@/lib/partners-testi';
import { SelettoreLingua } from './SelettoreLingua';

/* L'INGRESSO DEI PARTNER: prestigerent.com/partners/, in inglese.
 *
 * Una pagina, due schede -- «Sign in» e «Request access» -- per decisione
 * della proprieta' (12/10/2026): un solo indirizzo da dare alle agenzie,
 * per entrare e per chiedere di entrare. Prima erano due pagine sotto
 * /admin/listino/, che ora rimandano qui.
 *
 * La scheda si sceglie anche dall'indirizzo: /partners/#request apre la
 * richiesta, utile da mettere in un'email a un'agenzia nuova.
 *
 * ── LA RICHIESTA NON DA' ACCESSO ─────────────────────────────────────
 * Arriva all'admin, che la approva o la rifiuta; all'approvazione parte
 * un'email con la password. La scheda lo dice prima dell'invio e lo
 * ripete dopo, perche' la domanda di chi ha appena premuto «Send» e'
 * «e adesso?».
 *
 * `sitoWeb2` e' il campo esca: fuori dallo schermo e fuori dal tab, una
 * persona non lo vede, un robot lo riempie. */

const LOGO = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png';

const VUOTI: DatiRegistrazione = {
  nome: '',
  cognome: '',
  azienda: '',
  tipo: '',
  paese: '',
  email: '',
  telefono: '',
  sito: '',
  note: '',
  sitoWeb2: '',
};

export function IngressoPartner({ lingua }: { lingua: Lingua }) {
  const T = testiDi(lingua);
  const [scheda, setScheda] = useState<string | null>(() =>
    typeof window !== 'undefined' && window.location.hash === '#request' ? 'request' : 'signin'
  );

  return (
    <Box mih="100dvh" bg="dark.8" p="md">
      <Center mih="calc(100dvh - 2rem)">
        {/* 760px su desktop: a 560 il modulo di richiesta, con i campi a due
            colonne, era troppo stretto (proprieta', 12/10/2026). */}
        <Paper shadow="xl" radius="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={760}>
          <Stack gap={4} mb="lg" align="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Prestige Rent" width={72} height={72} style={{ display: 'block', marginBottom: 6 }} />
            <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '.1em' }}>
              {T.marchio}
            </Text>
            {/* Titolo, sottotitolo e la barra «Accedi / Richiedi l'accesso»
                tolti su richiesta della proprieta' (12/10/2026). Il titolo
                resta per i lettori di schermo; da una scheda all'altra si
                passa coi link in fondo a ciascun modulo. */}
            <VisuallyHidden>
              <h1>{scheda === 'request' ? T.schedaRichiesta : T.schedaAccesso}</h1>
            </VisuallyHidden>
            <Box mt={6}>
              <SelettoreLingua lingua={lingua} size="sm" />
            </Box>
          </Stack>

          {scheda === 'request' ? (
            <Richiesta T={T} lingua={lingua} vaiAdAccesso={() => setScheda('signin')} />
          ) : (
            <Accesso T={T} lingua={lingua} vaiARichiesta={() => setScheda('request')} />
          )}
        </Paper>
      </Center>
    </Box>
  );
}

function Accesso({ T, lingua, vaiARichiesta }: { T: Testi; lingua: Lingua; vaiARichiesta: () => void }) {
  /* /partners/?email=... arriva da un link dell'email scaduto
     (EntraDalLink): l'indirizzo si scrive da solo, resta la password. */
  const [email, setEmail] = useState(() =>
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('email') ?? ''
  );
  const [pw, setPw] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState('');

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvio(true);
    setErrore('');
    const r = await accedi(email, pw, lingua);
    if (!r.ok) {
      setInvio(false);
      setErrore(r.errore ?? T.erroreGenerico);
      return;
    }
    /* Voluto, come in /admin/entra/: un caricamento vero ricostruisce la
       pagina con la sessione nuova; il router lascerebbe pezzi dello
       stato di prima. */
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/partners/price-list/';
  };

  return (
    <form onSubmit={invia}>
      <Stack gap="md">
        <TextInput
          id="email"
          label={T.email}
          placeholder="you@company.com"
          required
          size="md"
          type="email"
          leftSection={<IconAt size={17} stroke={1.6} />}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <PasswordInput
          id="password"
          label={T.password}
          required
          size="md"
          leftSection={<IconLock size={17} stroke={1.6} />}
          value={pw}
          onChange={(e) => setPw(e.currentTarget.value)}
          autoComplete="current-password"
        />
        <Button type="submit" size="md" fullWidth loading={invio} mt="xs">
          {T.entra}
        </Button>
        {errore && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {errore}
          </Alert>
        )}
        <Text size="sm" ta="center">
          {T.nonHaiAccesso}{' '}
          <Text span c="prestige.7" fw={700} style={{ cursor: 'pointer' }} onClick={vaiARichiesta}>
            {T.chiediAccesso}
          </Text>
        </Text>
        <Text size="xs" c="dimmed" lh={1.6} ta="center">
          {T.passwordPersa}
        </Text>
      </Stack>
    </form>
  );
}

function Richiesta({ T, lingua, vaiAdAccesso }: { T: Testi; lingua: Lingua; vaiAdAccesso: () => void }) {
  const [d, setD] = useState<DatiRegistrazione>({ ...VUOTI, tipo: T.tipi[0] });
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [fatto, setFatto] = useState(false);

  const campo = (k: keyof DatiRegistrazione) => ({
    value: d[k] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.currentTarget.value;
      setD((x) => ({ ...x, [k]: v }));
    },
  });

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvio(true);
    setErrore('');
    const r = await registraRichiesta(d, lingua);
    setInvio(false);
    if (!r.ok) return setErrore(r.errore ?? T.erroreGenerico);
    setFatto(true);
  };

  if (fatto) {
    return (
      <Stack gap="md">
        <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />} title={T.grazieTitolo}>
          {T.grazieTesto(d.email)}
        </Alert>
        <Button variant="default" onClick={vaiAdAccesso}>{T.vaiAccesso}</Button>
      </Stack>
    );
  }

  return (
    <form onSubmit={invia}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {T.spiegaRichiesta}
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput id="nome" label={T.nome} required autoComplete="given-name" {...campo('nome')} />
          <TextInput id="cognome" label={T.cognome} required autoComplete="family-name" {...campo('cognome')} />
        </SimpleGrid>
        <TextInput id="azienda" label={T.azienda} required autoComplete="organization" {...campo('azienda')} />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Select
            id="tipo"
            label={T.tipo}
            data={T.tipi}
            value={d.tipo}
            onChange={(v) => setD((x) => ({ ...x, tipo: v ?? T.tipi[T.tipi.length - 1] }))}
            allowDeselect={false}
          />
          <TextInput id="paese" label={T.paese} required autoComplete="country-name" {...campo('paese')} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput id="email-richiesta" label={T.email} type="email" required autoComplete="email" description={T.emailNota} {...campo('email')} />
          <TextInput id="telefono" label={T.telefono} type="tel" required autoComplete="tel" description={T.telefonoNota} {...campo('telefono')} />
        </SimpleGrid>
        <TextInput id="sito" label={T.sito} placeholder="https://" autoComplete="url" {...campo('sito')} />
        <Textarea id="note" label={T.note} autosize minRows={2} maxRows={6} {...campo('note')} />

        {/* il campo esca */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="sitoWeb2">Leave this empty</label>
          <input id="sitoWeb2" tabIndex={-1} autoComplete="off" value={d.sitoWeb2} onChange={campo('sitoWeb2').onChange} />
        </div>

        <Button type="submit" size="md" loading={invio}>
          {T.invia}
        </Button>
        {errore && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {errore}
          </Alert>
        )}
        <Text size="sm" ta="center">
          {T.haiGiaAccesso}{' '}
          <Text span c="prestige.7" fw={700} style={{ cursor: 'pointer' }} onClick={vaiAdAccesso}>
            {T.schedaAccesso}
          </Text>
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          {T.privacy}
        </Text>
      </Stack>
    </form>
  );
}
