'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useScope } from '../../lib/scope';
import {
  Box, Stack, Typography, Card, CardContent, Grid, TextField, MenuItem,
  Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid
} from 'recharts';

const SHIFTS = ['All', 'A', 'B', 'C'];

/** ------- Demo data helpers (story-first, no backend dependency) ------- **/
function seededRand(seed) {
  // simple deterministic generator so charts don't jump wildly each render
  let s = seed % 2147483647;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function pct(n) { return Math.round(n * 1000) / 10; } // to 0.1%

function makeDemoForLine(line, shift, idx = 1) {
  // different seed per (line+shift)
  const seed = (line.id || idx).toString().split('').reduce((a,c)=>a+c.charCodeAt(0),0) + (shift.charCodeAt(0) || 0);
  const rnd = seededRand(seed);

  // Availability/Performance/Quality components
  const availability = clamp(0.75 + (rnd()-0.5)*0.2, 0.55, 0.95);
  const performance  = clamp(0.80 + (rnd()-0.5)*0.2, 0.60, 0.98);
  const quality      = clamp(0.92 + (rnd()-0.5)*0.1, 0.80, 0.99);
  const oee          = availability * performance * quality;

  // Defects by product type
  const products = ['Std Pipe', 'HVAC', 'Conduit', 'Structural'];
  const defects = products.map((p, i) => ({
    product: p,
    defects: Math.round( (1 - quality) * 100 * (1 + i * 0.2) * (0.8 + rnd()*0.4) )
  }));

  // 30-day trend for availability/performance/quality (for drilldown chart)
  const trend = Array.from({length: 30}, (_, i) => {
    const dayOffset = 30 - i;
    const j = rnd(); // jitter per point
    const av = clamp(availability + (j - 0.5)*0.06, 0.4, 0.98);
    const pe = clamp(performance  + (j - 0.5)*0.06, 0.4, 0.99);
    const qu = clamp(quality      + (j - 0.5)*0.04, 0.5, 1.00);
    return {
      day: `D-${dayOffset}`,
      availability: pct(av),
      performance:  pct(pe),
      quality:      pct(qu),
      oee:          pct(av*pe*qu)
    };
  });

  // Maintenance “signals” list (storytelling)
  const signals = [
    { type: 'Predictive',  note: 'Forming Roller M-104 trending hot; grease within 48h', severity: 'High' },
    { type: 'Stop Reason', note: 'Unplanned stop: Weld Spatter cleanup (12m)', severity: 'Medium' },
    { type: 'Quality',     note: 'Conduit OD variance slightly rising on Shift B', severity: 'Low' },
  ];

  return {
    lineId: line.id,
    lineName: line.name,
    availability: pct(availability),
    performance:  pct(performance),
    quality:      pct(quality),
    oee:          pct(oee),
    defects,
    trend,
    signals
  };
}

/** ---------------------------- Page ---------------------------- **/
export default function FactoryPerformancePage() {
  const router = useRouter();
  const [scope] = useScope();
  const [ready, setReady] = useState(false);

  const [shift, setShift] = useState('All');
  const [lines, setLines] = useState([]);
  const [machines, setMachines] = useState([]);

  // drilldown
  const [openDrill, setOpenDrill] = useState(false);
  const [drill, setDrill] = useState(null); // { lineId, lineName, trend, signals }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      setReady(true);
    })();
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      // lines in scope
      let qb = supabase.from('lines').select('id,name,factory_id').order('name');
      if (scope.factoryId) qb = qb.eq('factory_id', scope.factoryId);
      const { data: ls } = await qb;
      setLines(ls || []);

      // machines in scope (for later drilldown storytelling)
      let qm = supabase.from('machines').select('id,name,asset_number,line_id');
      if (scope.lineId) {
        qm = qm.eq('line_id', scope.lineId);
      } else if (scope.factoryId) {
        const lineIds = (ls || []).map(l => l.id);
        if (lineIds.length) qm = qm.in('line_id', lineIds);
      }
      const { data: ms } = await qm;
      setMachines(ms || []);
    })();
  }, [ready, scope.factoryId, scope.lineId]);

  // Build demo metrics per line (filtered to selected line if set)
  const scopedLines = useMemo(() => {
    if (!lines) return [];
    if (scope.lineId) return lines.filter(l => l.id === scope.lineId);
    return lines;
  }, [lines, scope.lineId]);

  const lineCards = useMemo(() => {
    return scopedLines.map((l, idx) => makeDemoForLine(l, shift, idx+1));
  }, [scopedLines, shift]);

  // OEE chart data
  const oeeChart = useMemo(() => {
    return lineCards.map(l => ({
      line: l.lineName,
      OEE: l.oee,
      Availability: l.availability,
      Performance: l.performance,
      Quality: l.quality,
    }));
  }, [lineCards]);

  // Defects stacked by product type
  const defectsChart = useMemo(() => {
    // merge per product across lines
    const byProduct = new Map();
    for (const lc of lineCards) {
      for (const d of lc.defects) {
        if (!byProduct.has(d.product)) byProduct.set(d.product, { product: d.product });
        byProduct.get(d.product)[lc.lineName] = (byProduct.get(d.product)[lc.lineName] || 0) + d.defects;
      }
    }
    return Array.from(byProduct.values());
  }, [lineCards]);

  function openDrilldown(card) {
    setDrill(card);
    setOpenDrill(true);
  }

  if (!ready) return <div>Loading…</div>;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between" gap={2}>
        <Typography variant="h5">Factory Performance</Typography>
        <TextField
          size="small"
          select
          label="Shift"
          value={shift}
          onChange={(e) => setShift(e.target.value)}
          sx={{ width: 160 }}
        >
          {SHIFTS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {/* KPI tiles */}
      <Grid container spacing={2}>
        {lineCards.map(card => (
          <Grid item xs={12} md={3} key={card.lineId}>
            <Paper variant="outlined" sx={{ p: 2, borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
              <Typography variant="overline" color="text.secondary">{card.lineName}</Typography>
              <Typography variant="h4" sx={{ lineHeight: 1.1 }}>{card.oee}%</Typography>
              <Typography variant="caption" color="text.secondary">OEE</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                <Chip size="small" label={`A ${card.availability}%`} />
                <Chip size="small" label={`P ${card.performance}%`} />
                <Chip size="small" label={`Q ${card.quality}%`} />
              </Stack>
              <Box sx={{ mt: 1.5 }}>
                <Button size="small" onClick={() => openDrilldown(card)}>Drill down</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
        {lineCards.length === 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p:2 }}>No lines in your current scope.</Paper>
          </Grid>
        )}
      </Grid>

      {/* OEE by line */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>OEE by Line (Availability · Performance · Quality)</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={oeeChart}>
              <XAxis dataKey="line" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Availability" />
              <Bar dataKey="Performance" />
              <Bar dataKey="Quality" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Defects by product type (stacked by line) */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Defect Counts by Product Type (30 days)</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={defectsChart} stackOffset="none">
              <XAxis dataKey="product" />
              <YAxis />
              <Tooltip />
              <Legend />
              {lineCards.map(lc => (
                <Bar key={lc.lineId} dataKey={lc.lineName} stackId="prod" />
              ))}
            </BarChart>
          </ResponsiveContainer>
          <Typography variant="caption" color="text.secondary">
            Tip: Filter by Shift using the selector above to see how quality varies by shift.
          </Typography>
        </CardContent>
      </Card>

      {/* “Operator-first” quick insights */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Maintenance Signals (Predictive)</Typography>
              <Stack spacing={1}>
                {lineCards.flatMap(lc => lc.signals.map((s, i) => (
                  <Paper key={`${lc.lineId}-${i}`} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2"><b>{lc.lineName}</b> — {s.type}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.note}</Typography>
                    </Box>
                    <Chip size="small" color={s.severity === 'High' ? 'error' : s.severity === 'Medium' ? 'warning' : 'default'} label={s.severity} />
                  </Paper>
                )))}
                {lineCards.length === 0 && <Typography variant="body2">No data in scope.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>AI Insight (Demo)</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Forming & welding appear to be the top contributors to OEE loss this week on Lines running <i>Conduit</i>.
                Consider checking seam welding parameters and grease schedule on high‑load bearings during changeover (SMED).
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Roadmap hooks: stop reason auto‑capture, parameter fingerprints, in‑line end detection, raw‑material demand + cost forecasting.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Drilldown dialog */}
      <Dialog open={openDrill} onClose={()=>setOpenDrill(false)} maxWidth="md" fullWidth>
        <DialogTitle>Line Drill‑down — {drill?.lineName}</DialogTitle>
        {drill && (
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Last 30 days — OEE & components. Use this to guide operators: target maintenance windows, tune machine settings,
              and sequence work to prevent defects before they occur.
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={drill.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="oee" />
                  <Line type="monotone" dataKey="availability" />
                  <Line type="monotone" dataKey="performance" />
                  <Line type="monotone" dataKey="quality" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {drill.signals.map((s,i)=>(
                <Paper key={i} variant="outlined" sx={{ p:1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <Box>
                    <Typography variant="body2"><b>{s.type}</b> — {s.note}</Typography>
                    <Typography variant="caption" color="text.secondary">Action: stage grease kit; review weld spatter mitigation; confirm OD gauge calibration.</Typography>
                  </Box>
                  <Chip size="small" color={s.severity === 'High' ? 'error' : s.severity === 'Medium' ? 'warning' : 'default'} label={s.severity} />
                </Paper>
              ))}
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={()=>setOpenDrill(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
