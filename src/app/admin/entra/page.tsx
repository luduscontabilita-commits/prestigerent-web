'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconLock, IconUser } from '@tabler/icons-react';
import { entra } from './azioni';

/* LA SCHERMATA DI ACCESSO.
 *
 * Nome utente e password. Il link via email non c'e' piu': gli utenti li
 * crea l'amministratore e consegna le credenziali, quindi non serve un
 * modo per farsi riconoscere da soli.
 *
 * ── PENSATA PER UN TELEFONO ───────────────────────────────────────────
 * Le guide entrano qui dallo smartphone con cui hanno appena scattato le
 * foto, spesso all'aperto e con una mano sola. Da qui tre scelte che
 * sembrano dettagli e non lo sono:
 *
 *  - il campo del nome utente NON e' `type="email"`. Sembra ovvio e non
 *    lo e': prima lo era, e un nome utente senza chiocciola NON PASSA la
 *    validazione del browser -- il modulo non si invierebbe proprio. In
 *    piu' su iOS quel tipo apre una tastiera con la chiocciola al posto
 *    della barra spaziatrice.
 *  - `autoCapitalize="off"` e `autoCorrect="off"`: il telefono
 *    maiuscolizza la prima lettera e "corregge" i nomi propri. `Mario`
 *    non entrerebbe, e la persona riproverebbe la stessa cosa tre volte
 *    senza capire.
 *  - `autoComplete="username"` e `"current-password"`: cosi' il gestore
 *    di password del telefono si offre di salvarli e poi li riempie da
 *    solo. E' la differenza fra usarlo e non usarlo.
 */
export default function Entra() {
  const [nome, setNome] = useState('');
  const [pw, setPw] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState('');

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvio(true);
    setErrore('');

    const r = await entra(nome, pw);

    if (!r.ok) {
      setInvio(false);
      setErrore(r.errore ?? 'Non è andata. Riprova.');
      return;
    }

    /* I cookie di sessione li ha gia' scritti l'azione sul server. Qui
       serve solo andare al pannello, e si usa un cambio di indirizzo vero
       e non il router del client: cosi' la pagina si ricostruisce da zero
       e nessun pezzo dell'albero React resta con lo stato di prima. */
    window.location.href = '/admin/';
  };

  return (
    <Box mih="100dvh" bg="dark.8" p="md">
      <Center mih="calc(100dvh - 2rem)">
        <Paper shadow="xl" radius="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={420}>
          <Stack gap="xs" mb="lg">
            <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '.1em' }}>
              PRESTIGE RENT
            </Text>
            <Title order={1} size="h3">Pannello</Title>
          </Stack>

          <form onSubmit={invia}>
            <Stack gap="md">
              <TextInput
                label="Nome utente"
                placeholder="il tuo nome utente"
                required
                size="md"
                leftSection={<IconUser size={17} stroke={1.6} />}
                value={nome}
                onChange={(e) => setNome(e.currentTarget.value)}
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-autofocus
              />

              <PasswordInput
                label="Password"
                placeholder="la tua password"
                required
                size="md"
                leftSection={<IconLock size={17} stroke={1.6} />}
                value={pw}
                onChange={(e) => setPw(e.currentTarget.value)}
                autoComplete="current-password"
              />

              <Button type="submit" size="md" fullWidth loading={invio} mt="xs">
                Entra
              </Button>

              {/* `role="alert"`: chi usa un lettore di schermo sente
                  l'errore appena compare, senza doverlo andare a cercare. */}
              {errore && (
                <Alert
                  color="red"
                  variant="light"
                  icon={<IconAlertCircle size={18} />}
                  role="alert"
                >
                  {errore}
                </Alert>
              )}

              <Text size="xs" c="dimmed" lh={1.6}>
                Le credenziali te le dà l’amministratore. Se non riesci a entrare,
                chiedi a lui: può assegnarti una password nuova in un momento.
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
