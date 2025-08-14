'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { useScope } from '../../../lib/scope';
import {
  Box, Stack, Typography, Card, CardContent, Grid, TextField, MenuItem,
  Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Snackbar, Alert, IconButton
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function AdminUsersPage() {
  const router = useRouter();
  const [scope] = useScope();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null);        // my profile
  const [users, setUsers] = useState([]);    // company users
  const [factories, setFactories] = useState([]);
  const [lines, setLines] = useState([]);
  const [invites, setInvites] = useState([]);

  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const [inv, setInv] = useState({
    email: '',
    role: 'operator',
    factory_id: '',
    line_id: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      // Require session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');

      // Load my profile (to confirm admin)
      const { data: myp, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, company_id, factory_id, role')
        .eq('user_id', session.user.id)
        .single();
      if (pErr) return alert('Profile error: ' + pErr.message);
      if (myp.role !== 'admin') {
        alert('Admins only');
        return router.replace('/');
      }

      setMe(myp);
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadAll();
  }, [ready]);

  async function loadAll() {
    // Company users — join profiles with auth.users (email) via PostgREST RPC or two-step
    const { data: pf, error: pfErr } = await supabase
      .from('profiles')
      .select('user_id, company_id, factory_id, line_id, role');
    if (pfErr) return setToast({ open: true, msg: pfErr.message, severity: 'error' });

    // map user emails
    const userIds = pf.map(p => p.user_id);
    let emails = new Map();
    if (userIds.length) {
      const { data: us } = await supabase
        .from('users_public') // create a view if you have one; fallback below if not
        .select('id, email')
        .in('id', userIds);
      if (us) emails = new Map(us.map(u => [u.id, u.email]));
      // If you don't have users_public view, fallback to auth schema is blocked by RLS from client
    }

    setUsers(pf.map(p => ({
      ...p,
      email: emails.get(p.user_id) || '(email hidden)',
    })));

    // Factories/Lines in my company (RLS will already scope to my company)
    const { data: fs } = await supabase.from('factories').select('id,name').order('name');
    setFactories(fs || []);
    if (inv.factory_id) {
      const { data: ls } = await supabase.from('lines').select('id,name,factory_id').eq('factory_id', inv.factory_id).order('name');
      setLines(ls || []);
    } else {
      setLines([]);
    }

    // Invites (admins only; RLS policy)
    const { data: iv } = await supabase
      .from('org_invites')
      .select('id,email,role,token,status,factory_id,line_id,created_at,accepted_at')
      .order('created_at', { ascending: false });
    setInvites(iv || []);
  }

  // Optional: if you do not have a view of auth.users, create this in SQL:
  // create view public.users_public as select id, email from auth.users;
  // grant select on public.users_public to authenticated;
  // (This avoids exposing full auth.users but gives you emails for the Admin UI.)

  async function onFactoryChange(e) {
    const factory_id = e.target.value || '';
    setInv(v => ({ ...v, factory_id, line_id: '' }));
    if (factory_id) {
      const { data: ls } = await supabase.from('lines').select('id,name,factory_id').eq('factory_id', factory_id).order('name');
      setLines(ls || []);
    } else {
      setLines([]);
    }
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
    setToast({ open: true, msg: 'Invite link copied', severity: 'success' });
  }

  async function createInvite(e) {
    e.preventDefault();
    if (!inv.email) return setToast({ open: true, msg: 'Email is required', severity: 'warning' });
    setCreating(true);
    try {
      // Generate a token client-side
      const token = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) =>
        s + b.toString(16).padStart(2, '0'), '');

      const payload = {
        company_id: me.company_id,
        factory_id: inv.factory_id || null,
        line_id: inv.line_id || null,
        email: inv.email.trim().toLowerCase(),
        role: inv.role,
        token
      };

      const { error } = await supabase.from('org_invites').insert([payload]);
      if (error) throw new Error(error.message);

      const inviteUrl = `${window.location.origin}/invite?token=${token}`;
      copy(inviteUrl);

      setInv({ email: '', role: 'operator', factory_id: '', line_id: '' });
      await loadAll();
    } catch (err) {
      setToast({ open: true, msg: err.message || String(err), severity: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function cancelInvite(id) {
    const { error } = await supabase.from('org_invites').update({ status: 'cancelled' }).eq('id', id);
    if (error) return setToast({ open: true, msg: error.message, severity: 'error' });
    await loadAll();
  }

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Organization Users</Typography>

      {/* Invite form */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Invite a user</Typography>
          <Box component="form" onSubmit={createInvite}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField label="Email" fullWidth value={inv.email} onChange={(e)=>setInv(v=>({...v, email: e.target.value}))}/>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField select label="Role" fullWidth value={inv.role} onChange={(e)=>setInv(v=>({...v, role: e.target.value}))}>
                  <MenuItem value="operator">Operator</MenuItem>
                  <MenuItem value="supervisor">Supervisor</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select label="Factory (optional)" fullWidth value={inv.factory_id} onChange={onFactoryChange}>
                  <MenuItem value="">—</MenuItem>
                  {factories.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select label="Line (optional)" fullWidth value={inv.line_id}
                  onChange={(e)=>setInv(v=>({...v, line_id: e.target.value}))} disabled={!inv.factory_id}>
                  <MenuItem value="">—</MenuItem>
                  {lines.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Button type="submit" disabled={creating}>Create Invite & Copy Link</Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Current users */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Users</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Factory</TableCell>
                <TableCell>Line</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Chip label={u.role} size="small" /></TableCell>
                  <TableCell>{u.factory_id ?? '—'}</TableCell>
                  <TableCell>{u.line_id ?? '—'}</TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={4}>No users yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invites */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Pending Invites</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invite Link</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.map(iv => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/invite?token=${iv.token}` : iv.token;
                return (
                  <TableRow key={iv.id}>
                    <TableCell>{iv.email}</TableCell>
                    <TableCell>{iv.role}</TableCell>
                    <TableCell>{iv.status}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" endIcon={<ContentCopyIcon />} onClick={() => copy(url)}>
                        Copy link
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      {iv.status === 'pending' && (
                        <Button color="error" size="small" onClick={() => cancelInvite(iv.id)}>Cancel</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {invites.length === 0 && (
                <TableRow><TableCell colSpan={5}>No invites.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={()=>setToast(t=>({...t, open:false}))}>
        <Alert severity={toast.severity} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Stack>
  );
}
