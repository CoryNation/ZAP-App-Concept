'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import {
  Box, Card, CardContent, TextField, Button,
  Stack, Typography, Alert
} from '@mui/material';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/');
    })();
  }, [router]);

  async function handleLogin(e) {
    e.preventDefault();
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) return setErr(error.message);
    router.replace('/');
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        minHeight: '100vh',
        overflow: 'hidden',      // prevent scrollbars from background
        bgcolor: 'grey.900',     // safe fallback behind the image
      }}
    >
      {/* Background image: fills full width, keeps aspect ratio */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* Using plain <img> for strict 100% width / auto height behavior */}
        <img
          src="/hero-zekelman.jpg"
          alt="Zekelman manufacturing"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </Box>

      {/* Dark overlay for contrast */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(180deg, rgba(16,24,40,0.55) 0%, rgba(16,24,40,0.55) 100%)'
        }}
      />

      {/* Foreground content */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems="stretch"
        justifyContent="space-between"
        sx={{ position: 'relative', zIndex: 2, minHeight: '100vh' }}
      >
        {/* Left brand/story panel */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          p: { xs: 3, md: 8 }
        }}>
          <Box sx={{ color: 'common.white', maxWidth: 700 }}>
            <Box component={Link} href="/" sx={{ display: 'inline-block', mb: 3 }}>
              <Image src="/zekelman-logo.png" alt="Zekelman" width={160} height={40} priority />
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1, mb: 1 }}>
              Believe in what you build.
            </Typography>

            <Typography variant="h6" sx={{ opacity: 0.95 }}>
              People, products, and processes built to solve real problems —
              every shift, every line, every day.
            </Typography>
          </Box>
        </Box>

        {/* Right sign-in card */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'flex-end', md: 'center' },
          p: { xs: 3, md: 8 }
        }}>
          <Card
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: 420,
              backdropFilter: 'blur(6px)',
              bgcolor: 'rgba(255,255,255,0.92)'
            }}
          >
            <CardContent>
              <Typography variant="h5" sx={{ mb: 2 }}>Sign in</Typography>
              {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

              <Box component="form" onSubmit={handleLogin}>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    autoFocus
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    fullWidth
                  />
                  <Button type="submit">Sign in</Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
