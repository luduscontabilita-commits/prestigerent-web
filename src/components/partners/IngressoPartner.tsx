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
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconAt, IconCircleCheck, IconLock } from '@tabler/icons-react';
import { accedi, registraRichiesta, type DatiRegistrazione } from '@/app/partners/azioni';

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
  tipo: 'Travel agency',
  paese: '',
  email: '',
  telefono: '',
  sito: '',
  note: '',
  sitoWeb2: '',
};

export function IngressoPartner() {
  const [scheda, setScheda] = useState<string | null>(() =>
    typeof window !== 'undefined' && window.location.hash === '#request' ? 'request' : 'signin'
  );

  return (
    <Box mih="100dvh" bg="dark.8" p="md">
      <Center mih="calc(100dvh - 2rem)">
        <Paper shadow="xl" radius="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={560}>
          <Stack gap={4} mb="lg" align="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Prestige Rent" width={72} height={72} style={{ display: 'block', marginBottom: 6 }} />
            <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '.1em' }}>
              PRESTIGE RENT · PARTNERS
            </Text>
            <Title order={1} size="h3" ta="center">Price list and fleet</Title>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              For travel agencies, tour operators, hotels and concierges.
            </Text>
          </Stack>

          <Tabs value={scheda} onChange={setScheda} variant="pills" radius="xl">
            <Tabs.List grow mb="lg">
              <Tabs.Tab value="signin">Sign in</Tabs.Tab>
              <Tabs.Tab value="request">Request access</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="signin">
              <Accesso vaiARichiesta={() => setScheda('request')} />
            </Tabs.Panel>
            <Tabs.Panel value="request">
              <Richiesta vaiAdAccesso={() => setScheda('signin')} />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Center>
    </Box>
  );
}

function Accesso({ vaiARichiesta }: { vaiARichiesta: () => void }) {
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
    const r = await accedi(email, pw);
    if (!r.ok) {
      setInvio(false);
      setErrore(r.errore ?? 'Something went wrong. Please try again.');
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
          label="Email"
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
          label="Password"
          required
          size="md"
          leftSection={<IconLock size={17} stroke={1.6} />}
          value={pw}
          onChange={(e) => setPw(e.currentTarget.value)}
          autoComplete="current-password"
        />
        <Button type="submit" size="md" fullWidth loading={invio} mt="xs">
          Sign in
        </Button>
        {errore && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {errore}
          </Alert>
        )}
        <Text size="sm" ta="center">
          No access yet?{' '}
          <Text span c="prestige.7" fw={700} style={{ cursor: 'pointer' }} onClick={vaiARichiesta}>
            Request access
          </Text>
        </Text>
        <Text size="xs" c="dimmed" lh={1.6} ta="center">
          Lost your password? Write to usa@prestigerent.com and we will send you a new one.
        </Text>
      </Stack>
    </form>
  );
}

function Richiesta({ vaiAdAccesso }: { vaiAdAccesso: () => void }) {
  const [d, setD] = useState<DatiRegistrazione>(VUOTI);
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
    const r = await registraRichiesta(d);
    setInvio(false);
    if (!r.ok) return setErrore(r.errore ?? 'Something went wrong. Please try again.');
    setFatto(true);
  };

  if (fatto) {
    return (
      <Stack gap="md">
        <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />} title="Thank you, we have your request">
          We will email you at {d.email} as soon as your access is approved, usually within one working day.
        </Alert>
        <Button variant="default" onClick={vaiAdAccesso}>Go to sign in</Button>
      </Stack>
    );
  }

  return (
    <form onSubmit={invia}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Tell us who you are. We review every request and email you your password once it is approved.
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput id="nome" label="First name" required autoComplete="given-name" {...campo('nome')} />
          <TextInput id="cognome" label="Last name" required autoComplete="family-name" {...campo('cognome')} />
        </SimpleGrid>
        <TextInput id="azienda" label="Company" required autoComplete="organization" {...campo('azienda')} />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <Select
            id="tipo"
            label="Business type"
            data={['Travel agency', 'Tour operator', 'Hotel', 'Cruise line', 'Concierge', 'Other']}
            value={d.tipo}
            onChange={(v) => setD((x) => ({ ...x, tipo: v ?? 'Other' }))}
            allowDeselect={false}
          />
          <TextInput id="paese" label="Country" required autoComplete="country-name" {...campo('paese')} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput id="email-richiesta" label="Email" type="email" required autoComplete="email" description="Your password will be sent here" {...campo('email')} />
          <TextInput id="telefono" label="Phone" type="tel" required autoComplete="tel" description="With country code, e.g. +44 20 1234 5678" {...campo('telefono')} />
        </SimpleGrid>
        <TextInput id="sito" label="Website" placeholder="https://" autoComplete="url" {...campo('sito')} />
        <Textarea id="note" label="Anything we should know?" autosize minRows={2} maxRows={6} {...campo('note')} />

        {/* il campo esca */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="sitoWeb2">Leave this empty</label>
          <input id="sitoWeb2" tabIndex={-1} autoComplete="off" value={d.sitoWeb2} onChange={campo('sitoWeb2').onChange} />
        </div>

        <Button type="submit" size="md" loading={invio}>
          Send request
        </Button>
        {errore && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {errore}
          </Alert>
        )}
        <Text size="xs" c="dimmed" ta="center">
          We use these details only to review your request and to contact you about it.
        </Text>
      </Stack>
    </form>
  );
}
