'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import {
  Stack, Typography, Card, CardContent, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, Chip, Box
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const STATUS_COLOR = {
  open: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'default'
};
const PRIORITY_ORDER = { critical: 3, high: 2, medium: 1, low: 0 };
const PRIORITY_COLOR = { critical: 'error', high: 'warning', medium: 'default', low: 'default' };

export default function WorkRequestsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const [rows, setRows] = useState([]);
  const [machines, setMachines] = useState([]);
  const [quickPicks, setQuickPicks] = useState([]);

  // filters
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // create dialog state
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    quick_pick_code: '',
    category: '',
    priority: 'medium',
    machine_id: '',
    due_at: ''
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);
      await Promise.all([loadData(), loadMachines(), loadQuickPicks()]);
    })();
  }, [router]);

  async function loadData() {
    const { data, error } = await supabase
      .from('work_requests')
      .select('id, title, status, priority, logged_at, due_at, machine_id, quick_pick_code, category')
      .order('logged_at', { ascending: false });
    if (error) return alert('Load error: ' + error.message);

    // join machines for display
    let machineMap = new Map();
    if (data && data.length > 0) {
      const ids = Array.from(new Set(data.map(r => r.machine_id).filter(Boolean)));
      if (ids.length) {
        const { data: ms } = await supabase.from('machines').select('id, asset_number, name').in('id', ids);
        machineMap = new Map((ms || []).map(m => [m.id, m]));
      }
    }
    setRows((data || []).map(r => ({
      ...r,
      machine_display: r.machine_id ? `${machineMap.get(r.machine_id)?.asset_number || ''} — ${machineMap.get(r.machine_id)?.name || ''}` : ''
    })));
  }

  async function loadMachines() {
    const { data, error } = await supabase
      .from('machines')
      .select('id, asset_number, name')
      .order('asset_number', { ascending: true });
    if (error) console.warn(error.message);
    setMachines(data || []);
  }

  async function loadQuickPicks() {
    const { data, error } = await supabase
      .from('work_request_quick_picks')
      .select('id, code, label, category')
      .order('label', { ascending: true });
    if (error) console.warn(error.message);
    setQuickPicks(data || []);
  }

  const filteredSorted = useMemo(() => {
    let list = rows;
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(qq) ||
        (r.machine_display || '').toLowerCase().includes(qq) ||
        (r.category || '').toLowerCase().includes(qq) ||
        (r.quick_pick_code || '').toLowerCase().includes(qq)
      );
    }
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter(r => r.priority === priorityFilter);

    // default sort: priority desc (critical→low), then newest first
    return [...list].sort((a,b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 0;
      const pb = PRIORITY_ORDER[b.priority] ?? 0;
      if (pb !== pa) return pb - pa;
      return new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime();
    });
  }, [rows, q, statusFilter, priorityFilter]);

  function openDialog() { setOpen(true); }
  function closeDialog() { setOpen(false); }

  async function createRequest(e) {
    e.preventDefault();
    if (!form.title) return alert('Title is required');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // look up my company/factory for scoping
      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('company_id,factory_id').eq('user_id', session.user.id).single();
      if (pErr) throw new Error(pErr.message);

      const payload = {
        company_id: profile.company_id,
        factory_id: profile.factory_id,
        machine_id: form.machine_id || null,
        line_id: null, // optional — can infer from machine if you want to enrich later
        requester_user_id: session.user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        quick_pick_code: form.quick_pick_code || null,
        category: form.category || null,
        priority: form.priority,
        status: 'open',
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null
      };

      const { data, error } = await supabase.from('work_requests').insert([payload]).select('id').single();
      if (error) throw new Error(error.message);

      // optional: create an event record
      await supabase.from('work_request_events').insert([{
        work_request_id: data.id,
        actor_user_id: session.user.id,
        event_type: 'comment',
        note: 'Request created'
      }]);

      closeDialog();
      setForm({ title: '', description: '', quick_pick_code: '', category: '', priority: 'medium', machine_id: '', due_at: '' });
      await loadData();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Work Requests</Typography>
        <Button startIcon={<AddCircleIcon />} onClick={openDialog}>Create Work Request</Button>
      </Stack>

      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Search (title, machine, category, code)" value={q} onChange={e=>setQ(e.target.value)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select label="Status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth select label="Priority" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Quick Pick</TableCell>
                <TableCell>Machine</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Logged</TableCell>
                <TableCell>Due</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSorted.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.quick_pick_code || '—'}</TableCell>
                  <TableCell>{r.machine_display || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status.replace('_',' ')} color={STATUS_COLOR[r.status]} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={r.priority.toUpperCase()} color={PRIORITY_COLOR[r.priority]} />
                  </TableCell>
                  <TableCell>{new Date(r.logged_at).toLocaleString()}</TableCell>
                  <TableCell>{r.due_at ? new Date(r.due_at).toLocaleString() : '—'}</TableCell>
                </TableRow>
              ))}
              {filteredSorted.length === 0 && (
                <TableRow><TableCell colSpan={7}>No work requests yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Work Request</DialogTitle>
        <Box component="form" onSubmit={createRequest}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Title"
                  fullWidth
                  required
                  value={form.title}
                  onChange={e=>setForm(f=>({...f, title: e.target.value}))}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select label="Priority" fullWidth
                  value={form.priority}
                  onChange={e=>setForm(f=>({...f, priority: e.target.value}))}
                >
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select label="Quick Pick"
                  fullWidth
                  value={form.quick_pick_code}
                  onChange={e=>setForm(f=>({...f, quick_pick_code: e.target.value}))}
                >
                  <MenuItem value="">—</MenuItem>
                  {quickPicks.map(qp => (
                    <MenuItem key={qp.id} value={qp.code}>{qp.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Category"
                  fullWidth
                  value={form.category}
                  onChange={e=>setForm(f=>({...f, category: e.target.value}))}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Due At (optional)"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.due_at}
                  onChange={e=>setForm(f=>({...f, due_at: e.target.value}))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select label="Machine (optional)"
                  fullWidth
                  value={form.machine_id}
                  onChange={e=>setForm(f=>({...f, machine_id: e.target.value}))}
                >
                  <MenuItem value="">—</MenuItem>
                  {machines.map(m => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.asset_number} — {m.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  minRows={3}
                  value={form.description}
                  onChange={e=>setForm(f=>({...f, description: e.target.value}))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} variant="text">Cancel</Button>
            <Button type="submit" disabled={busy}>Create</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
