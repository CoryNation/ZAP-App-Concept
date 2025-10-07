'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import {
  Stack, Card, CardContent, Typography, TextField, MenuItem, Button, Alert
} from '@mui/material';

// Avoid static prerender & satisfy useSearchParams rule
export const dynamic = 'force-dynamic';

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  const [note, setNote] = useState('');
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  // read from URL: ?company=<uuid>&factory=<uuid>&line=<uuid>
  const company_id = params.get('company') || '';
  const factory_id = params.get('factory') || '';
  const line_id    = params.get('line') || '';

  async function submit(e) {
    e.preventDefault();
    setOk(''); setErr('');
    try {
      if (!company_id) throw new Error('Missing company id in link.');
      const { error } = await supabase.from('org_join_requests').insert([{
        company_id,
        factory_id: factory_id || null,
        line_id: line_id || null,
        email: email.trim().toLowerCase(),
        role,
        note
      }]);
      if (error) throw error;
      setOk('Request submitted. An admin will review and send you an invite.');
      setEmail(''); setNote('');
    } catch (e) {
      setErr(e.message || 'Failed to submit request');
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Request Access</Typography>
      <Card>
        <CardContent>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
              />
              <TextField
                select
                label="Requested Role"
                value={role}
                onChange={e=>setRole(e.target.value)}
              >
                <MenuItem value="operator">Operator</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
              <TextField
                label="Notes (optional)"
                multiline
                minRows={3}
                value={note}
                onChange={e=>setNote(e.target.value)}
              />

              {/* Helpful debug (optional): show which company this will target */}
              {!company_id && (
                <Alert severity="warning">
                  This link is missing a company id. Ask your admin for the correct join link.
                </Alert>
              )}

              <Button type="submit">Submit Request</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Stack>
  );
}
