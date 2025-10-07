'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useScope } from '@/lib/scope';
import {
  Box, Card, CardContent, Typography, Grid, TextField, MenuItem, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Snackbar, Alert, Stack
} from '@mui/material';

export default function Inventory() {
  const router = useRouter();
  const [scope] = useScope();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const [form, setForm] = useState({
    material_id: '',
    material_state: 'raw_coil',
    quantity: '',
    unit_of_measure: 'tons',
    line_id: ''
  });

  useEffect(() => {
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return alert('Auth error: ' + error.message);
      if (!session) return router.replace('/login');
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    Promise.all([refresh(), loadLines()])
      .catch(err => setToast({ open: true, msg: err.message, severity: 'error' }));
  }, [ready, scope.factoryId, scope.lineId]);

  async function refresh() {
    let qb = supabase.from('inventory')
      .select('id, company_id, factory_id, line_id, material_id, material_state, quantity, unit_of_measure, last_updated')
      .order('last_updated', { ascending: false });
    if (scope.factoryId) qb = qb.eq('factory_id', scope.factoryId);
    if (scope.lineId)    qb = qb.eq('line_id', scope.lineId);
    const { data, error } = await qb;
    if (error) return setToast({ open: true, msg: error.message, severity: 'error' });
    setRows(data ?? []);
  }

  async function loadLines() {
    if (!scope.factoryId) { setLines([]); return; }
    const { data, error } = await supabase
      .from('lines')
      .select('id, name')
      .eq('factory_id', scope.factoryId)
      .order('name');
    if (error) console.warn(error.message);
    setLines(data ?? []);
  }

  const grouped = useMemo(() => {
    const g = { raw_coil: [], slit_coil: [], wip: [], finished: [] };
    for (const r of rows) g[r.material_state]?.push(r);
    return g;
  }, [rows]);

  const totals = useMemo(() => {
    const t = { raw_coil: 0, slit_coil: 0, wip: 0, finished: 0 };
    for (const r of rows) t[r.material_state] += Number(r.quantity || 0);
    return t;
  }, [rows]);

  async function createItem(e) {
    e.preventDefault();
    if (!form.material_id) return setToast({ open: true, msg: 'Material ID is required', severity: 'warning' });
    if (!form.quantity || isNaN(Number(form.quantity))) return setToast({ open: true, msg: 'Quantity must be a number', severity: 'warning' });

    setBusy(true);
    try {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error('Auth error: ' + sessErr.message);
      if (!session) return router.replace('/login');

      const { data: profile, error: profErr } = await supabase
        .from('profiles').select('company_id,factory_id')
        .eq('user_id', session.user.id).single();
      if (profErr) throw new Error('Profile error: ' + profErr.message);

      const payload = {
        company_id: profile.company_id,
        factory_id: scope.factoryId || profile.factory_id,
        line_id: scope.lineId || (form.line_id || null),
        material_id: form.material_id.trim(),
        material_state: form.material_state,
        quantity: Number(form.quantity),
        unit_of_measure: form.unit_of_measure.trim()
      };

      const { error: insErr } = await supabase.from('inventory').insert([payload]);
      if (insErr) throw new Error(insErr.message);

      setForm({ material_id: '', material_state: 'raw_coil', quantity: '', unit_of_measure: 'tons', line_id: '' });
      await refresh();
      setToast({ open: true, msg: 'Inventory item added.', severity: 'success' });
    } catch (err) {
      setToast({ open: true, msg: err.message || String(err), severity: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Inventory</Typography>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>Add Item</Typography>
          <Box component="form" onSubmit={createItem}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField label="Material ID" fullWidth value={form.material_id}
                  onChange={(e) => setForm(f => ({ ...f, material_id: e.target.value }))}/>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField select label="State" fullWidth value={form.material_state}
                  onChange={(e) => setForm(f => ({ ...f, material_state: e.target.value }))}>
                  <MenuItem value="raw_coil">Raw Coil</MenuItem>
                  <MenuItem value="slit_coil">Slit Coil</MenuItem>
                  <MenuItem value="wip">WIP</MenuItem>
                  <MenuItem value="finished">Finished</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField label="Quantity" fullWidth value={form.quantity}
                  onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))}/>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField label="UoM" fullWidth value={form.unit_of_measure}
                  onChange={(e) => setForm(f => ({ ...f, unit_of_measure: e.target.value }))}/>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select label="Line (optional)" fullWidth value={form.line_id}
                  onChange={(e) => setForm(f => ({ ...f, line_id: e.target.value }))} disabled={!scope.factoryId}>
                  <MenuItem value="">—</MenuItem>
                  {lines.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" disabled={busy}>Add Inventory Item</Button>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {['raw_coil','slit_coil','wip','finished'].map(state => (
        <Card key={state}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {state.replace('_',' ').toUpperCase()} — Total: {totals[state]}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>UoM</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(grouped[state] || []).map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.material_id}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell>{r.unit_of_measure}</TableCell>
                    <TableCell>{new Date(r.last_updated).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {(!grouped[state] || grouped[state].length === 0) && (
                  <TableRow><TableCell colSpan={4}>No items.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(t => ({...t, open: false}))}>
        <Alert severity={toast.severity} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Stack>
  );
}
