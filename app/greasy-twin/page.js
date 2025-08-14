'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useScope } from '../../lib/scope';
import {
  Stack, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, Button, Chip, TextField, MenuItem, Grid, Box
} from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

const CONDITION_LABEL = {
  satisfactory: 'Satisfactory',
  trending: 'Trending',
  service_time: 'Service – Time Based',
  service_event: 'Service – Event Based'
};
const CONDITION_COLOR = {
  satisfactory: 'success',
  trending: 'warning',
  service_time: 'warning',
  service_event: 'error'
};
const CONDITION_RANK = { service_event: 3, service_time: 2, trending: 1, satisfactory: 0 };

export default function GreasyTwin() {
  const router = useRouter();
  const [scope] = useScope();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  // filters
  const [filterText, setFilterText] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, scope.factoryId, scope.lineId]);

  async function refresh() {
    // bearings (RLS scoped)
    const { data: bearings, error: bErr } = await supabase
      .from('bearings')
      .select('id,label,machine_id')
      .order('label');
    if (bErr) return alert('Load bearings error: ' + bErr.message);
    if (!bearings || bearings.length === 0) return setRows([]);

    const machineIds = Array.from(new Set(bearings.map(b => b.machine_id)));
    const { data: machines, error: mErr } = await supabase
      .from('machines')
      .select('id, asset_number, name, line_id')
      .in('id', machineIds);
    if (mErr) return alert('Load machines error: ' + mErr.message);
    const machineMap = new Map(machines?.map(m => [m.id, m]) || []);

    const lineIds = Array.from(new Set((machines || []).map(m => m.line_id)));
    const { data: lines, error: lErr } = await supabase
      .from('lines').select('id, name, factory_id').in('id', lineIds);
    if (lErr) return alert('Load lines error: ' + lErr.message);
    const lineMap = new Map(lines?.map(l => [l.id, l]) || []);

    const factoryIds = Array.from(new Set((lines || []).map(l => l.factory_id)));
    const { data: factories, error: fErr } = await supabase
      .from('factories').select('id, name').in('id', factoryIds);
    if (fErr) return alert('Load factories error: ' + fErr.message);
    const factoryMap = new Map(factories?.map(f => [f.id, f]) || []);

    const bearingIds = bearings.map(b => b.id);
    const { data: readings, error: rErr } = await supabase
      .from('grease_readings')
      .select('id,bearing_id,frequency_hz,status,condition,last_greased_date,next_grease_due_date,created_at')
      .in('bearing_id', bearingIds)
      .order('created_at', { ascending: false });
    if (rErr) return alert('Load readings error: ' + rErr.message);

    const latest = new Map();
    (readings || []).forEach(r => { if (!latest.has(r.bearing_id)) latest.set(r.bearing_id, r); });

    const assembled = bearings.map(b => {
      const m = machineMap.get(b.machine_id);
      const l = m ? lineMap.get(m.line_id) : null;
      const f = l ? factoryMap.get(l.factory_id) : null;
      const reading = latest.get(b.id) || null;
      return {
        bearing_id: b.id,
        label: b.label,
        machine: m ? `${m.asset_number} — ${m.name || 'Machine'}` : '',
        mill: l?.name || '',
        factory: f?.name || '',
        line_id: l?.id || null,
        factory_id: f?.id || null,
        condition: reading?.condition || null,
        freq: reading?.frequency_hz ?? null,
        reading
      };
    });

    // apply top-bar scope
    const scoped = assembled.filter(r => {
      if (scope.factoryId && r.factory_id !== scope.factoryId) return false;
      if (scope.lineId && r.line_id !== scope.lineId) return false;
      return true;
    });

    setRows(scoped);
  }

  async function simulateGrease(bearing_id) {
    if (busy) return;
    setBusy(true);
    try {
      const current = rows.find(r => r.bearing_id === bearing_id)?.condition || 'service_event';
      const cycle = ['service_event','service_time','trending','satisfactory'];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];

      const body = {
        bearing_id,
        frequency_hz: next === 'satisfactory' ? 180 : next === 'trending' ? 220 : next === 'service_time' ? 280 : 420,
        status: next === 'satisfactory' ? 'greased' : 'needs_grease',
        condition: next,
        last_greased_date: next === 'satisfactory' ? new Date().toISOString().slice(0,10) : null,
        next_grease_due_date: next === 'satisfactory'
          ? new Date(Date.now() + 1000*60*60*24*10).toISOString().slice(0,10)
          : new Date(Date.now() + 1000*60*60*24*3).toISOString().slice(0,10)
      };
      const { error } = await supabase.from('grease_readings').insert([body]);
      if (error) throw new Error(error.message);
      await refresh();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const filteredSorted = useMemo(() => {
    let list = rows;
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(r =>
        r.label.toLowerCase().includes(q) ||
        r.machine.toLowerCase().includes(q) ||
        r.mill.toLowerCase().includes(q) ||
        r.factory.toLowerCase().includes(q)
      );
    }
    if (filterCondition !== 'all') {
      list = list.filter(r => r.condition === filterCondition);
    }
    return [...list].sort((a,b) => {
      const ra = CONDITION_RANK[a.condition || 'satisfactory'];
      const rb = CONDITION_RANK[b.condition || 'satisfactory'];
      if (rb !== ra) return rb - ra;
      return a.label.localeCompare(b.label);
    });
  }, [rows, filterText, filterCondition]);

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Greasy Twin (Demo)</Typography>

      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Default view sorts by severity: <b>Service — Event</b> → <b>Service — Time</b> → <b>Trending</b> → <b>Satisfactory</b>.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Search (bearing, machine, mill, factory)"
                fullWidth
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Condition"
                fullWidth
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="service_event">Service — Event Based</MenuItem>
                <MenuItem value="service_time">Service — Time Based</MenuItem>
                <MenuItem value="trending">Trending</MenuItem>
                <MenuItem value="satisfactory">Satisfactory</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', height: '100%' }}>
                <Button onClick={() => { setFilterText(''); setFilterCondition('all'); }}>
                  Clear Filters
                </Button>
              </Box>
            </Grid>
          </Grid>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bearing</TableCell>
                <TableCell>Machine</TableCell>
                <TableCell>Mill</TableCell>
                <TableCell>Factory</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Freq (Hz)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSorted.map(r => (
                <TableRow key={r.bearing_id}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>{r.machine}</TableCell>
                  <TableCell>{r.mill}</TableCell>
                  <TableCell>{r.factory}</TableCell>
                  <TableCell>
                    {r.condition
                      ? <Chip
                          label={CONDITION_LABEL[r.condition]}
                          color={CONDITION_COLOR[r.condition]}
                          variant="outlined"
                          size="small"
                        />
                      : '—'}
                  </TableCell>
                  <TableCell>{r.freq ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button
                      startIcon={<BuildCircleIcon />}
                      onClick={() => simulateGrease(r.bearing_id)}
                      disabled={busy}
                    >
                      Simulate Reading
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>No bearings found for your current factory/line scope.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
