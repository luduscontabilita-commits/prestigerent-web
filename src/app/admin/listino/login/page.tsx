'use client';

import { useState } from 'react';
import { Alert, Anchor, Box, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconAt, IconLock } from '@tabler/icons-react';
import { accedi } from '../pubblico';

/* L'ACCESSO DEI PARTNER AL LISTINO, in inglese.
 *
 * E' la gemella di /admin/entra/ (stesso aspetto, stesso logo), con due
 * differenze: chiede l'EMAIL -- i partner non hanno un nome utente -- e
 * porta alla richiesta di accesso per chi non ce l'ha ancora.
 *
 * Dopo l'accesso si va a /admin/listino/ con un cambio di indirizzo vero,
 * non col router: come in /admin/entra/, la pagina si ricostruisce da
 * zero con la sessione nuova. Se chi entra qui e' un admin, il listino lo
 * vede comunque; se e' una guida, `soloListino()` la rimanda al pannello. */
export default function AccessoListino() {
  const [email, setEmail] = useState('');
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
    window.location.href = '/admin/listino/';
  };

  return (
    <Box mih="100dvh" bg="dark.8" p="md">
      <Center mih="calc(100dvh - 2rem)">
        <Paper shadow="xl" radius="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={420}>
          <Stack gap="sm" mb="lg" align="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png"
              alt="Prestige Rent"
              width={72}
              height={72}
              style={{ display: 'block' }}
            />
            <Stack gap={2} align="center">
              <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '.1em' }}>
                PRESTIGE RENT · PARTNERS
              </Text>
              <Title order={1} size="h3">Price list</Title>
            </Stack>
          </Stack>

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
                No access yet? <Anchor href="/admin/listino/register/">Request access</Anchor>
              </Text>
              <Text size="xs" c="dimmed" lh={1.6} ta="center">
                Lost your password? Write to usa@prestigerent.com and we will send you a new one.
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
