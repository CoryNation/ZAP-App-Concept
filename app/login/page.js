'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import {
  Box, Card, CardContent, TextField, Button, Stack, Typography, Alert
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
    <Box sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'grey.900' }}>
      {/* Background image */}
      <Image
        src="/hero-zekelman.jpg"
        alt="Zekelman — steel tubes and manufacturing"
        fill
        priority
        style={{ objectFit: 'cover' }}
      />

      {/* Dark gradient overlay for contrast */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(16,24,40,0.65) 0%, rgba(16,24,40,0.65) 100%)'
        }}
      />

      {/* Content */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems="stretch"
        justifyContent="space-between"
        sx={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}
      >
        {/* Left brand panel */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', p: { xs: 3, md: 8 } }}>
          <Box sx={{ color: 'common.white', maxWidth: 600 }}>
            <Box component={Link} href="/" sx={{ display: 'inline-block', mb: 3 }}>
              <Image src="/zekelman-logo.png" alt="Zekelman" width={160} height={40} priority />
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1, mb: 1.5 }}>
              Believe in what you build.
            </Typography>

            <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
              A family of domestic manufacturers building steel products and modular solutions—
              together with teammates who solve problems and improve every day.
            </Typography>
          </Box>
        </Box>

        {/* Right auth card */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'flex-end', md: 'center' },
          p: { xs: 3, md: 8 }
        }}>
          <Card sx={{ width: '100%', maxWidth: 420, backdropFilter: 'blur(6px)', bgcolor: 'rgba(255,255,255,0.9)' }}>
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
