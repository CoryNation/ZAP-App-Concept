'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useScope } from '../../lib/scope';
import {
  Stack, Typography, Card, CardContent, Button,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Grid, Chip, Box, Paper
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const STATUS_COLOR = {
  open: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'default'
};
const PRIORITY_ORDER = { critical: 3, high: 2, medium: 1, low: 0 };
const PRIORITY_COLOR = { critical: 'error', high: 'warning', medium: 'default', low: 'default' };

function daysOld(ts) {
  const d = ts ? new Date(ts).getTime() : Date.now();
  const delta = Date.now() - d;
  return Math.floor(delta / (1000*60*60*24));
}

export default function WorkRequestsPage() {
  const router = useRouter();
  const [scope] = useScope();
  const [ready, setReady] = useState(false);

  const [rows, setRows] = useState([]);
  const [machines, setMachines] = useState([]);
  const [quickPicks, setQuickPicks] = useState([]);

  // filters
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // create dialog
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', quick_pick_code: '', category: '',
    priority: 'medium', machine_id: '', due_at: ''
  });

  // edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scope.factoryId, scope.lineId]);

  async function loadAll() {
    await Promise.all([loadData(), loadMachines(), loadQuickPicks()]);
  }

  function qbScope(qb) {
    if (scope.factoryId) qb = qb.eq('factory_id', scope.factoryId);
    if (scope.lineId) qb = qb.eq('line_id', scope.lineId);
    return qb;
  }

  async function loadData() {
    let qb = supabase
      .from('work_requests')
      .select('id, title, status, priority, logged_at, due_at, machine_id, quick_pick_code, category, line_id, factory_id, description, assigned_technician_id')
      .order('logged_at', { ascending: false });
    qb = qbScope(qb);
    const { data, error } = await qb;
    if (error) return alert('Load error: ' + error.message);

    let machineMap = new Map();
    const ids = Array.from(new Set((data || []).map(r => r.machine_id).filter(Boolean)));
    if (ids.length) {
      const { data: ms } = await supabase.from('machines').select('id, asset_number, name').in('id', ids);
      machineMap = new Map((ms || []).map(m => [m.id, m]));
    }
    setRows((data || []).map(r => ({
      ...r,
      machine_display: r.machine_id ? `${machineMap.get(r.machine_id)?.asset_number || ''} — ${machineMap.get(r.machine_id)?.name || ''}` : '',
      days_old: daysOld(r.logged_at)
    })));
  }

  async function loadMachines() {
    let qb = supabase.from('machines').select('id, asset_number, name, line_id');
    if (scope.lineId)        qb = qb.eq('line_id', scope.lineId);
    else if (scope.factoryId) qb = qb.in('line_id',
      (await supabase.from('lines').select('id').eq('factory_id', scope.factoryId)).data?.map(l=>l.id) || []
    );
    const { data } = await qb.order('asset_number', { ascending: true });
    setMachines(data || []);
  }

  async function loadQuickPicks() {
    let qb = supabase.from('work_request_quick_picks').select('id, code, label, category');
    if (scope.factoryId) qb = qb.eq('factory_id', scope.factoryId);
    const { data } = await qb.order('label', { ascending: true });
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

    return [...list].sort((a,b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 0;
      const pb = PRIORITY_ORDER[b.priority] ?? 0;
      if (pb !== pa) return pb - pa;
      return new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime();
    });
  }, [rows, q, statusFilter, priorityFilter]);

  // 30‑day stacked chart
  const chartData = useMemo(() => {
    const since = Date.now() - 1000*60*60*24*30;
    const bucket = new Map();
    for (const r of rows) {
      const t = new Date(r.logged_at).getTime();
      if (t < since) continue;
      const key = new Date(new Date(r.logged_at).toDateString()).toISOString().slice(0,10);
      if (!bucket.has(key)) bucket.set(key, { day: key, open: 0, in_progress: 0, completed: 0, cancelled: 0 });
      bucket.get(key)[r.status] += 1;
    }
    return Array.from(bucket.values()).sort((a,b) => a.day.localeCompare(b.day));
  }, [rows]);

  // metrics
  const metrics = useMemo(() => {
    const open = rows.filter(r => r.status === 'open' || r.status === 'in_progress');
    return {
      totalOpen: open.length,
      highPriority: open.filter(r => r.priority === 'critical' || r.priority === 'high').length,
      over45: open.filter(r => r.days_old > 45).length
    };
  }, [rows]);

  function openDialog() { setOpen(true); }
  function closeDialog() { setOpen(false); }

  async function createRequest(e) {
    e.preventDefault();
    if (!form.title) return alert('Title is required');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data: profile, error: pErr } = await supabase
        .from('profiles').select('company_id,factory_id').eq('user_id', session.user.id).single();
      if (pErr) throw new Error(pErr.message);

      const payload = {
        company_id: profile.company_id,
        factory_id: scope.factoryId || profile.factory_id,
        line_id: scope.lineId || null,
        machine_id: form.machine_id || null,
        requester_user_id: session.user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        quick_pick_code: form.quick_pick_code || null,
        category: form.category || null,
        priority: form.priority,
        status: 'open',
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null
      };

      const { error } = await supabase.from('work_requests').insert([payload]);
      if (error) throw new Error(error.message);

      closeDialog();
      setForm({ title: '', description: '', quick_pick_code: '', category: '', priority: 'medium', machine_id: '', due_at: '' });
      await loadAll();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  // Edit
  function beginEdit(row) {
    setEdit({
      id: row.id,
      title: row.title,
      description: row.description || '',
      quick_pick_code: row.quick_pick_code || '',
      category: row.category || '',
      priority: row.priority,
      status: row.status,
      machine_id: row.machine_id || '',
      due_at: row.due_at ? new Date(row.due_at).toISOString().slice(0,16) : '',
      assigned_technician_id: row.assigned_technician_id || ''
    });
    setEditOpen(true);
  }
  function closeEdit() { setEditOpen(false); setEdit(null); }

  async function saveEdit(e) {
    e.preventDefault();
    if (!edit?.id) return closeEdit();
    setBusy(true);
    try {
      const before = rows.find(r => r.id === edit.id);
      const statusChanged = before?.status !== edit.status;
      const assignChanged = before?.assigned_technician_id !== edit.assigned_technician_id;

      const patch = {
        title: edit.title.trim(),
        description: edit.description.trim(),
        quick_pick_code: edit.quick_pick_code || null,
        category: edit.category || null,
        priority: edit.priority,
        status: edit.status,
        machine_id: edit.machine_id || null,
        due_at: edit.due_at ? new Date(edit.due_at).toISOString() : null,
        assigned_technician_id: edit.assigned_technician_id || null
      };
      const { error } = await supabase.from('work_requests').update(patch).eq('id', edit.id);
      if (error) throw new Error(error.message);

      if (statusChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('work_request_events').insert([{
          work_request_id: edit.id,
          actor_user_id: session.user.id,
          event_type: 'status_change',
          from_status: before.status,
          to_status: edit.status,
          note: null
        }]);
      }
      if (assignChanged) {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from('work_request_events').insert([{
          work_request_id: edit.id,
          actor_user_id: session.user.id,
          event_type: 'assign',
          note: `Assigned to: ${edit.assigned_technician_id || 'unassigned'}`
        }]);
      }

      closeEdit();
      await loadAll();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h5">Work Requests</Typography>
        <Button startIcon={<AddCircleIcon />} onClick={openDialog}>Create Work Request</Button>
      </Stack>

      {/* Chart + metrics */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 260 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Last 30 Days</Typography>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} stackOffset="expand">
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(v, k) => [v, k.replace('_',' ')]} />
                  <Legend formatter={(value) => value.replace('_',' ')} />
                  <Bar dataKey="open" stackId="a" />
                  <Bar dataKey="in_progress" stackId="a" />
                  <Bar dataKey="completed" stackId="a" />
                  <Bar dataKey="cancelled" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack spacing={1} sx={{ height: 260 }}>
            <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
              <Typography variant="caption" color="text.secondary">Total Open</Typography>
              <Typography variant="h6">{metrics.totalOpen}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
              <Typography variant="caption" color="text.secondary">High Priority</Typography>
              <Typography variant="h6">{metrics.highPriority}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
              <Typography variant="caption" color="text.secondary">{'> 45 Days Old'}</Typography>
              <Typography variant="h6">{metrics.over45}</Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

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
                <TableCell>Days Old</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSorted.map(r => (
                <TableRow
                  key={r.id}
                  sx={(theme) => {
                    const overdue = r.due_at && new Date(r.due_at).getTime() < Date.now() && (r.status === 'open' || r.status === 'in_progress');
                    const veryOld = r.days_old > 45 && (r.status === 'open' || r.status === 'in_progress');
                    return {
                      ...(overdue && { backgroundColor: theme.palette.error.action.hover }),
                      ...(veryOld && !overdue && { backgroundColor: theme.palette.warning.action.hover })
                    };
                  }}
                >
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
                  <TableCell>{r.days_old}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditIcon />} onClick={() => beginEdit(r)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSorted.length === 0 && (
                <TableRow><TableCell colSpan={9}>No work requests yet.</TableCell></TableRow>
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
                <TextField label="Title" fullWidth required
                  value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))}/>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField select label="Priority" fullWidth value={form.priority}
                  onChange={e=>setForm(f=>({...f, priority: e.target.value}))}>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select label="Quick Pick" fullWidth value={form.quick_pick_code}
                  onChange={e=>setForm(f=>({...f, quick_pick_code: e.target.value}))}>
                  <MenuItem value="">—</MenuItem>
                  {quickPicks.map(qp => <MenuItem key={qp.id} value={qp.code}>{qp.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Category" fullWidth value={form.category}
                  onChange={e=>setForm(f=>({...f, category: e.target.value}))}/>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Due At (optional)" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }}
                  value={form.due_at} onChange={e=>setForm(f=>({...f, due_at: e.target.value}))}/>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select label="Machine (optional)" fullWidth value={form.machine_id}
                  onChange={e=>setForm(f=>({...f, machine_id: e.target.value}))}>
                  <MenuItem value="">—</MenuItem>
                  {machines.map(m => <MenuItem key={m.id} value={m.id}>{m.asset_number} — {m.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" fullWidth multiline minRows={3}
                  value={form.description} onChange={e=>setForm(f=>({...f, description: e.target.value}))}/>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} variant="text">Cancel</Button>
            <Button type="submit" disabled={busy}>Create</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Work Request</DialogTitle>
        {edit && (
          <Box component="form" onSubmit={saveEdit}>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField label="Title" fullWidth required
                    value={edit.title} onChange={e=>setEdit(s=>({...s, title: e.target.value}))}/>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Priority" fullWidth value={edit.priority}
                    onChange={e=>setEdit(s=>({...s, priority: e.target.value}))}>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Status" fullWidth value={edit.status}
                    onChange={e=>setEdit(s=>({...s, status: e.target.value}))}>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select label="Quick Pick" fullWidth value={edit.quick_pick_code}
                    onChange={e=>setEdit(s=>({...s, quick_pick_code: e.target.value}))}>
                    <MenuItem value="">—</MenuItem>
                    {quickPicks.map(qp => <MenuItem key={qp.id} value={qp.code}>{qp.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Category" fullWidth value={edit.category}
                    onChange={e=>setEdit(s=>({...s, category: e.target.value}))}/>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField select label="Machine (optional)" fullWidth value={edit.machine_id}
                    onChange={e=>setEdit(s=>({...s, machine_id: e.target.value}))}>
                    <MenuItem value="">—</MenuItem>
                    {machines.map(m => <MenuItem key={m.id} value={m.id}>{m.asset_number} — {m.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Due At" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }}
                    value={edit.due_at} onChange={e=>setEdit(s=>({...s, due_at: e.target.value}))}/>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Description" fullWidth multiline minRows={3}
                    value={edit.description} onChange={e=>setEdit(s=>({...s, description: e.target.value}))}/>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeEdit} variant="text">Cancel</Button>
              <Button type="submit" disabled={busy}>Save</Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
    </Stack>
  );
}
