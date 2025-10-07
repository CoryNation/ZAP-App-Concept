'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Box, Stack, Typography, Card, CardContent, Grid, TextField, MenuItem,
  Button, Table, TableHead, TableRow, TableCell, TableBody, Chip,
  Snackbar, Alert, Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

/* ------------ helpers ------------ */
function makeToken() {
  // robust token for browsers; falls back if crypto not present
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    return Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from({ length: 32 })
    .map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

export default function AdminUsersPage() {
  const router = useRouter();

  // me/admin
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null); // { user_id, company_id, factory_id, role }

  // data
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [requests, setRequests] = useState([]);

  // lookups for invite
  const [factories, setFactories] = useState([]);
  const [lines, setLines] = useState([]);

  // invite form
  const [inv, setInv] = useState({ email: '', role: 'operator', factory_id: '', line_id: '' });
  const [creating, setCreating] = useState(false);

  // shareable join link (optional scoping)
  const [jlFactoryId, setJlFactoryId] = useState('');
  const [jlLineId, setJlLineId] = useState('');
  const [jlLines, setJlLines] = useState([]);

  // ui toast
  const [toast, setToast] = useState({ open: false, severity: 'success', msg: '' });

  /* ---------- boot: auth + admin guard ---------- */
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');

      const { data: myp, error: pErr } = await supabase
        .from('profiles')
        .select('user_id, company_id, factory_id, role')
        .eq('user_id', session.user.id)
        .single();

      if (pErr) { alert('Profile error: ' + pErr.message); return router.replace('/'); }
      if ((myp?.role || '') !== 'admin') { alert('Admins only'); return router.replace('/'); }

      setMe(myp);
      setReady(true);
    })();
  }, [router]);

  /* ---------- load all ---------- */
  useEffect(() => { if (ready) loadAll(); }, [ready]);

  async function loadAll() {
    // users (profiles)
    const { data: pf, error: pfErr } = await supabase
      .from('profiles')
      .select('user_id, company_id, factory_id, line_id, role')
      .order('role', { ascending: false });
    if (pfErr) return setToast({ open: true, severity: 'error', msg: pfErr.message });

    // emails via public.users_public view
    let emails = new Map();
    const ids = (pf || []).map(p => p.user_id);
    if (ids.length) {
      const { data: us } = await supabase.from('users_public').select('id,email').in('id', ids);
      if (us) emails = new Map(us.map(u => [u.id, u.email]));
    }
    setUsers((pf || []).map(p => ({ ...p, email: emails.get(p.user_id) || '(email hidden)' })));

    // factories
    const { data: fs } = await supabase.from('factories').select('id,name').order('name');
    setFactories(fs || []);

    // lines for invite form
    if (inv.factory_id) {
      const { data: ls } = await supabase.from('lines')
        .select('id,name,factory_id').eq('factory_id', inv.factory_id).order('name');
      setLines(ls || []);
    } else setLines([]);

    // invites
    const { data: iv } = await supabase
      .from('org_invites')
      .select('id,email,role,token,status,factory_id,line_id,created_at,accepted_at,invited_by')
      .order('created_at', { ascending: false });
    setInvites(iv || []);

    // join requests
    const { data: rq } = await supabase
      .from('org_join_requests')
      .select('id,email,role,note,status,created_at')
      .order('created_at', { ascending: false });
    setRequests(rq || []);
  }

  /* ---------- shareable join link controls ---------- */
  useEffect(() => {
    (async () => {
      if (!jlFactoryId) { setJlLines([]); setJlLineId(''); return; }
      const { data: ls } = await supabase
        .from('lines').select('id,name,factory_id').eq('factory_id', jlFactoryId).order('name');
      setJlLines(ls || []);
    })();
  }, [jlFactoryId]);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined' || !me?.company_id) return '';
    const origin = window.location.origin;
    const params = new URLSearchParams({ company: me.company_id });
    if (jlFactoryId) params.set('factory', jlFactoryId);
    if (jlLineId) params.set('line', jlLineId);
    return `${origin}/join?${params.toString()}`;
  }, [me?.company_id, jlFactoryId, jlLineId]);

  const joinQrSrc = useMemo(() => {
    // uses a public QR PNG service to avoid adding deps
    if (!joinUrl) return '';
    const sz = 180;
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(joinUrl)}&size=${sz}x${sz}&margin=0`;
  }, [joinUrl]);

  /* ---------- actions ---------- */
  function copy(text) {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(text);
    setToast({ open: true, severity: 'success', msg: 'Copied to clipboard' });
  }

  async function createInvite(e) {
    e.preventDefault();
    if (!inv.email) return setToast({ open: true, severity: 'warning', msg: 'Email is required' });
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const token = makeToken();
      const payload = {
        company_id: me.company_id,
        factory_id: inv.factory_id || null,
        line_id: inv.line_id || null,
        email: inv.email.trim().toLowerCase(),
        role: inv.role,
        token,
        invited_by: session.user.id  // DB default should also populate this
      };

      const { error } = await supabase.from('org_invites').insert([payload]);
      if (error) throw error;

      const url = `${window.location.origin}/invite?token=${token}`;
      await navigator.clipboard.writeText(url);
      setToast({ open: true, severity: 'success', msg: 'Invite created. Link copied.' });

      setInv({ email: '', role: 'operator', factory_id: '', line_id: '' });
      await loadAll();
    } catch (e) {
      setToast({ open: true, severity: 'error', msg: e.message || 'Invite failed' });
    } finally {
      setCreating(false);
    }
  }

  async function cancelInvite(id) {
    const { error } = await supabase.from('org_invites').update({ status: 'cancelled' }).eq('id', id);
    if (error) setToast({ open: true, severity: 'error', msg: error.message });
    else { setToast({ open: true, severity: 'success', msg: 'Invite cancelled' }); await loadAll(); }
  }

  async function approveRequest(id) {
    try {
      const { data, error } = await supabase.rpc('approve_join_request', { p_request_id: id });
      if (error) throw error;
      const token = data;
      const url = `${window.location.origin}/invite?token=${token}`;
      await navigator.clipboard.writeText(url);
      setToast({ open: true, severity: 'success', msg: 'Approved. Invite link copied.' });
      await loadAll();
    } catch (e) {
      setToast({ open: true, severity: 'error', msg: e.message || 'Approve failed' });
    }
  }

  async function rejectRequest(id) {
    const { error } = await supabase.from('org_join_requests').update({ status: 'rejected' }).eq('id', id);
    if (error) setToast({ open: true, severity: 'error', msg: error.message });
    else { setToast({ open: true, severity: 'success', msg: 'Request rejected' }); await loadAll(); }
  }

  async function onFactoryChange(e) {
    const factory_id = e.target.value || '';
    setInv(v => ({ ...v, factory_id, line_id: '' }));
    if (factory_id) {
      const { data: ls } = await supabase.from('lines').select('id,name,factory_id').eq('factory_id', factory_id).order('name');
      setLines(ls || []);
    } else setLines([]);
  }

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Organization Users</Typography>

      {/* Shareable Join Link */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Shareable Join Link (Public Request → Admin Approval)
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label="Factory (optional)"
                select
                fullWidth
                value={jlFactoryId}
                onChange={(e)=>setJlFactoryId(e.target.value)}
              >
                <MenuItem value="">(All)</MenuItem>
                {factories.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Line (optional)"
                select
                fullWidth
                value={jlLineId}
                onChange={(e)=>setJlLineId(e.target.value)}
                disabled={!jlFactoryId}
              >
                <MenuItem value="">(All)</MenuItem>
                {jlLines.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
              </TextField>
            </Grid>

            <Grid item xs={12} md={8}>
              <Box
                sx={{
                  p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider',
                  display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap'
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                  {joinUrl || '—'}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => { if (joinUrl) copy(joinUrl); }}
                >
                  Copy Join Link
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Share this broadly. Anyone can submit a request at that URL; you’ll approve them below.
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'white'
                }}
              >
                {joinQrSrc ? (
                  <Tooltip title="Scan to open join page">
                    {/* External QR image service: no extra npm dependency */}
                    <img src={joinQrSrc} alt="Join link QR" width={180} height={180} />
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.secondary">QR will appear when a link is available.</Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invite a user (email-specific) */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Invite a user</Typography>
          <Box component="form" onSubmit={createInvite}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Email"
                  fullWidth
                  value={inv.email}
                  onChange={(e)=>setInv(v=>({...v, email: e.target.value}))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="Role"
                  select
                  fullWidth
                  value={inv.role}
                  onChange={(e)=>setInv(v=>({...v, role: e.target.value}))}
                >
                  <MenuItem value="operator">Operator</MenuItem>
                  <MenuItem value="supervisor">Supervisor</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Factory (optional)"
                  select
                  fullWidth
                  value={inv.factory_id}
                  onChange={onFactoryChange}
                >
                  <MenuItem value="">—</MenuItem>
                  {factories.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Line (optional)"
                  select
                  fullWidth
                  value={inv.line_id}
                  onChange={(e)=>setInv(v=>({...v, line_id: e.target.value}))}
                  disabled={!inv.factory_id}
                >
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

      {/* Users */}
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
                  <TableCell><Chip size="small" label={u.role} /></TableCell>
                  <TableCell>{u.factory_id || '—'}</TableCell>
                  <TableCell>{u.line_id || '—'}</TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={4}>No users yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
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
                const url = typeof window !== 'undefined'
                  ? `${window.location.origin}/invite?token=${iv.token}`
                  : iv.token;
                return (
                  <TableRow key={iv.id}>
                    <TableCell>{iv.email}</TableCell>
                    <TableCell>{iv.role}</TableCell>
                    <TableCell>{iv.status}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<ContentCopyIcon />}
                        onClick={() => copy(url)}
                      >
                        Copy link
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      {iv.status === 'pending' ? (
                        <Button color="error" size="small" onClick={() => cancelInvite(iv.id)}>Cancel</Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">No actions</Typography>
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

      {/* Pending Join Requests */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Pending Join Requests</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.role}</TableCell>
                  <TableCell>{r.note || '—'}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell align="right">
                    {r.status === 'pending' ? (
                      <>
                        <Button size="small" onClick={() => approveRequest(r.id)}>Approve</Button>
                        <Button size="small" color="error" onClick={() => rejectRequest(r.id)}>Reject</Button>
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No actions</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={5}>No join requests.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast(t => ({ ...t, open: false }))}
      >
        <Alert severity={toast.severity} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
