'use client';

import { useState } from 'react';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { registraRichiesta, type DatiRegistrazione } from '../pubblico';

/* LA RICHIESTA DI ACCESSO AL LISTINO, in inglese.
 *
 * Chi la compila NON entra subito: la richiesta arriva all'admin
 * (/admin/listino/richieste/), che la approva o la rifiuta. All'approvazione
 * parte un'email con la password. La pagina lo dice prima dell'invio e lo
 * ripete dopo, perche' la domanda naturale di chi ha appena premuto
 * «Send» e' «e adesso?».
 *
 * `sitoWeb2` e' il campo esca: fuori dallo schermo e fuori dal tab, una
 * persona non lo vede, un robot lo riempie. */

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

export default function RichiestaAccesso() {
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

  return (
    <Box mih="100dvh" bg="dark.8" p="md">
      <Center mih="calc(100dvh - 2rem)">
        <Paper shadow="xl" radius="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={560}>
          <Stack gap="xs" mb="lg">
            <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '.1em' }}>
              PRESTIGE RENT · PARTNERS
            </Text>
            <Title order={1} size="h3">Request access to our price list</Title>
            <Text size="sm" c="dimmed">
              For travel agencies, tour operators, hotels and concierges. Tell us who you are: we review every request and
              email you your password once it is approved.
            </Text>
          </Stack>

          {fatto ? (
            <Stack gap="md">
              <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />} title="Thank you, we have your request">
                We will email you at {d.email} as soon as your access is approved, usually within one working day.
              </Alert>
              <Anchor href="/admin/listino/login/" size="sm">Go to sign in</Anchor>
            </Stack>
          ) : (
            <form onSubmit={invia}>
              <Stack gap="md">
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
                  <TextInput id="email" label="Email" type="email" required autoComplete="email" description="Your password will be sent here" {...campo('email')} />
                  <TextInput id="telefono" label="Phone" type="tel" autoComplete="tel" {...campo('telefono')} />
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
                <Text size="sm" ta="center">
                  Already approved? <Anchor href="/admin/listino/login/">Sign in</Anchor>
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  We use these details only to review your request and to contact you about it.
                </Text>
              </Stack>
            </form>
          )}
        </Paper>
      </Center>
    </Box>
  );
}
