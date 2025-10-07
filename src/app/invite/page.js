'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Box, Card, CardContent, Stack, Typography, Button, Alert, TextField
} from '@mui/material';

// Tell Next this route is dynamic (no static prerender), which avoids CSR bailout issues.
export const dynamic = 'force-dynamic';

export default function InvitePage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <InviteAcceptInner />
    </Suspense>
  );
}

function InviteAcceptInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');

  const [sessionChecked, setSessionChecked] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) { setErr('Missing invite token'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Already signed in → try accept
        doAccept(token, router, setErr, setOk);
      } else {
        setSessionChecked(true);
      }
    })();
  }, [token, router]);

  async function signUp(e) {
    e.preventDefault();
    setErr('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { emailRedirectTo: `${window.location.origin}/invite?token=${token}` }
      });
      if (error) throw error;
      // If email confirmation is OFF, we’ll have a session and can accept immediately.
      // If ON, user confirms and returns to this page; effect above will run again.
      if (data.user) {
        await doAccept(token, router, setErr, setOk);
      } else {
        setOk('Check your email to confirm, then reopen this invite link to complete joining.');
      }
    } catch (e) {
      setErr(e.message || 'Sign up failed');
    }
  }

  async function signIn() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return doAccept(token, router, setErr, setOk);
      setErr('Please sign in from the login page, then reopen your invite link.');
    } catch (e) {
      setErr(e.message || 'Sign in required');
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Accept Invite</Typography>
      <Card>
        <CardContent>
          {!token && <Alert severity="error">Missing invite token.</Alert>}

          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

          {!ok && token && (
            <>
              {!sessionChecked ? (
                <Typography>Checking your session…</Typography>
              ) : (
                <Stack spacing={2}>
                  <Typography>
                    To join your organization, create an account with the <b>same email</b> the invite was sent to,
                    or sign in and we’ll attach your access automatically.
                  </Typography>

                  <Box component="form" onSubmit={signUp}>
                    <Stack spacing={2}>
                      <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
                      <TextField label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
                      <Button type="submit">Create account & join</Button>
                    </Stack>
                  </Box>

                  <Typography align="center">— or —</Typography>

                  <Button variant="outlined" onClick={signIn}>I already have an account</Button>
                </Stack>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

async function doAccept(token, router, setErr, setOk) {
  try {
    setErr('');
    const { error } = await supabase.rpc('accept_invite', { p_token: token });
    if (error) throw error;
    setOk('Invite accepted. Redirecting…');
    setTimeout(() => router.replace('/'), 800);
  } catch (e) {
    setErr(e.message || 'Failed to accept invite');
  }
}
