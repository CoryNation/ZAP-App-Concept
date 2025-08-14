'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import {
  Stack, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell,
  TableBody, Button, Chip
} from '@mui/material';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

export default function GreasyTwin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);
      await refresh();
    })();
  }, [router]);

  async function refresh() {
    const { data: bearings, error: bErr } = await supabase
      .from('bearings')
      .select('id,label,machine_id')
      .order('label');
    if (bErr) return alert('Load bearings error: ' + bErr.message);
    if (!bearings || bearings.length === 0) return setRows([]);

    const machineIds = Array.from(new Set(bearings.map(b => b.machine_id)));
    const { data: machines, error: mErr } = await supabase
      .from('machines')
      .select('id, asset_number, name')
      .in('id', machineIds);
    if (mErr) return alert('Load machines error: ' + mErr.message);
    const machineMap = new Map(machines?.map(m => [m.id, m]) || []);

    const bearingIds = bearings.map(b => b.id);
    const { data: readings, error: rErr } = await supabase
      .from('grease_readings')
      .select('id,bearing_id,frequency_hz,status,last_greased_date,next_grease_due_date,created_at')
      .in('bearing_id', bearingIds)
      .order('created_at', { ascending: false });
    if (rErr) return alert('Load readings error: ' + rErr.message);

    const latest = new Map();
    (readings || []).forEach(r => { if (!latest.has(r.bearing_id)) latest.set(r.bearing_id, r); });

    setRows(bearings.map(b => {
      const m = machineMap.get(b.machine_id);
      const reading = latest.get(b.id) || null;
      return {
        bearing_id: b.id,
        label: b.label,
        machine: m ? `${m.asset_number} — ${m.name || 'Machine'}` : '',
        reading
      };
    }));
  }

  async function simulateGrease(bearing_id) {
    if (busy) return;
    setBusy(true);
    try {
      const current = rows.find(r => r.bearing_id === bearing_id)?.reading?.status || 'needs_grease';
      const next = current === 'needs_grease' ? 'greased' : 'needs_grease';
      const body = {
        bearing_id,
        frequency_hz: next === 'greased' ? 180 : 420,
        status: next,
        last_greased_date: next === 'greased' ? new Date().toISOString().slice(0,10) : null,
        next_grease_due_date: next === 'greased'
          ? new Date(Date.now() + 1000*60*60*24*10).toISOString().slice(0,10)
          : new Date(Date.now() + 1000*60*60*24*7).toISOString().slice(0,10)
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

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Greasy Twin (Demo)</Typography>

      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Click <em>Simulate Reading</em> to flip a bearing between <strong>Needs Grease</strong> and <strong>Greased</strong>.
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bearing</TableCell>
                <TableCell>Machine</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Freq (Hz)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.bearing_id}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>{r.machine}</TableCell>
                  <TableCell>
                    {r.reading?.status
                      ? <Chip
                          label={r.reading.status.replace('_',' ')}
                          color={r.reading.status === 'needs_grease' ? 'error' : 'success'}
                          variant="outlined"
                          size="small"
                        />
                      : '—'}
                  </TableCell>
                  <TableCell>{r.reading?.frequency_hz ?? '—'}</TableCell>
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
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No bearings found. Seed demo data and refresh.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
