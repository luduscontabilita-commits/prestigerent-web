'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Center, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { entraConLink } from '@/app/partners/azioni';

/* L'ACCESSO AUTOMATICO DAL LINK DELL'EMAIL.
 *
 * Appena la pagina si apre, chiede al server di aprire la sessione con il
 * gettone del link e, se riesce, va al listino: la persona non preme
 * niente. Se non riesce (link scaduto, accesso chiuso) lo dice in una
 * riga e offre l'accesso con email e password, con l'email gia' scritta.
 *
 * Il caricamento vero (`window.location`) e non il router: come dopo
 * ogni accesso nel progetto, la pagina dopo deve nascere con la sessione
 * nuova. */

const LOGO = 'https://oeipsfnbpaqkmwrxtcrn.supabase.co/storage/v1/object/public/media/lp/img/logo-prestige.png';

export function EntraDalLink({ t }: { t: string }) {
  const [errore, setErrore] = useState<{ testo: string; email?: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    entraConLink(t).then((r) => {
      if (!vivo) return;
      if (r.ok) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/partners/price-list/';
        return;
      }
      setErrore({ testo: r.errore ?? 'This link is not valid.', email: r.email });
    });
    return () => {
      vivo = false;
    };
  }, [t]);

  return (
    <Box mih="100dvh" bg="dark.8" p="md">
      <Center mih="calc(100dvh - 2rem)">
        <Paper shadow="xl" radius="lg" p={{ base: 'lg', sm: 40 }} w="100%" maw={420}>
          <Stack gap="md" align="center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Prestige Rent" width={72} height={72} style={{ display: 'block' }} />
            <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '.1em' }}>
              PRESTIGE RENT · PARTNERS
            </Text>
            {!errore ? (
              <>
                <Title order={1} size="h4" ta="center">Signing you in…</Title>
                <Loader />
              </>
            ) : (
              <>
                <Alert color="orange" variant="light" icon={<IconAlertCircle size={18} />} w="100%" role="alert">
                  {errore.testo}
                </Alert>
                <Button
                  component="a"
                  href={`/partners/${errore.email ? `?email=${encodeURIComponent(errore.email)}` : ''}`}
                  fullWidth
                >
                  Sign in with email and password
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Center>
    </Box>
  );
}
