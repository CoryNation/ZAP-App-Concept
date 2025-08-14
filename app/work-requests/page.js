'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Stack, Grid, Card, CardContent, Typography, Chip, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

import { supabase } from '../../lib/supabaseClient';

/* =========================================================================
   Status palette & helpers
   ------------------------------------------------------------------------- */

function makeStatusPalette(theme) {
  // Friendly MD3 palette; avoids red so errors keep red authority.
  return {
    open:        { name: 'Open',        color: '#1e88e5' }, // blue
    in_progress: { name: 'In‑Progress', color: '#43a047' }, // green
    completed:   { name: 'Completed',   color: '#8e24aa' }, // purple
    on_hold:     { name: 'On‑Hold',     color: '#fb8c00' }, // orange
    paused:      { name: 'Paused',      color: '#fb8c00' }, // alias to on_hold
    hold:        { name: 'On‑Hold',     color: '#fb8c00' }, // alias
    blocked:     { name: 'Blocked',     color: '#fb8c00' }, // alias
  };
}

// Human formatter
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const daysBetween = (a, b = new Date()) => Math.floor((b - new Date(a)) / 86400000);
const pct = (n) => `${(n * 100).toFixed(1)}%`;

/* =========================================================================
   Demo fallbacks (used only when DB has no rows)
   ------------------------------------------------------------------------- */
const demoRows = (() => {
  const today = new Date();
  const mk = (daysAgo, status, priority) => ({
    id: cryptoId(),
    title: `Sample request (${status.replace('_', ' ')})`,
    status,
    priority,
    created_at: new Date(today - daysAgo * 86400000).toISOString(),
  });
  // 5 old open ones for >45 days, plus a mix in last 30 days
  return [
    mk(50, 'open', 'high'),
    mk(50, 'open', 'medium'),
    mk(49, 'open', 'low'),
    mk(48, 'open', 'medium'),
    mk(47, 'open', 'high'),
    mk(10, 'in_progress', 'medium'),
    mk(6, 'completed', 'low'),
    mk(3, 'on_hold', 'high'),
    mk(2, 'open', 'medium'),
    mk(1, 'open', 'low'),
  ];
})();

/* =========================================================================
   Page
   ------------------------------------------------------------------------- */
export default function WorkRequestsPage() {
  const theme = useTheme();
  const STATUS = makeStatusPalette(theme);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // work_requests rows

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Pull last ~60 days to compute 45+ day metric too
      const { data, error } = await supabase
        .from('work_requests')
        .select('id,title,status,priority,created_at,company_id,factory_id,line_id,machine_id')
        .gte('created_at', new Date(Date.now() - 60 * 86400000).toISOString())
        .order('created_at', { ascending: true });

      if (!active) return;
      if (error) {
        // Fallback to demo if query fails (keeps UX smooth for the demo)
        setRows(demoRows);
      } else if (!data || data.length === 0) {
        setRows(demoRows);
      } else {
        setRows(data);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Normalize statuses to something we have colors for
  const normStatus = (s) => {
    if (!s) return 'open';
    const key = String(s).toLowerCase();
    if (STATUS[key]) return key;
    // best-effort mapping
    if (key.includes('progress')) return 'in_progress';
    if (key.includes('complete') || key.includes('close') || key.includes('done')) return 'completed';
    if (key.includes('hold') || key.includes('pause') || key.includes('block')) return 'on_hold';
    return 'open';
  };

  // KPIs for chips
  const metrics = useMemo(() => {
    const totalOpen = rows.filter(r => normStatus(r.status) === 'open').length;
    const highPriority = rows.filter(r => String(r.priority).toLowerCase().startsWith('high')).length;
    const old45 = rows.filter(r => normStatus(r.status) === 'open' && daysBetween(r.created_at) > 45).length;
    return { totalOpen, highPriority, old45 };
  }, [rows]);

  // Chart data: last 30 days, counts per status/day
  const dailySeries = useMemo(() => {
    const end = new Date(); end.setHours(0,0,0,0);
    const start = new Date(end - 29 * 86400000); // 30-day window
    const labels = [];
    for (let d = new Date(start); d <= end; d = new Date(+d + 86400000)) {
      labels.push(new Date(d));
    }
    const byDay = labels.map(d => {
      const key = d.toISOString().slice(0,10);
      const bucket = { day: fmtDate(d), _key: key, open: 0, in_progress: 0, completed: 0, on_hold: 0 };
      return bucket;
    });
    const index = new Map(byDay.map((b, i) => [b._key, i]));
    rows.forEach(r => {
      const key = new Date(r.created_at).toISOString().slice(0,10);
      const i = index.get(key);
      if (i == null) return;
      const s = normStatus(r.status);
      if (byDay[i][s] != null) byDay[i][s] += 1;
      else byDay[i].open += 1;
    });
    return byDay;
  }, [rows]);

  // Insights
  const insights = useMemo(() => buildInsights(rows, dailySeries), [rows, dailySeries]);

  const COLORS = {
    grid: theme.palette.divider,
    statuses: {
      open: STATUS.open.color,
      in_progress: STATUS.in_progress.color,
      completed: STATUS.completed.color,
      on_hold: STATUS.on_hold.color,
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Work Requests</Typography>

      {/* Chart + KPI chips row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Requests by Status (Last 30 Days)</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={dailySeries} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="open"        name="Open"        stackId="s" fill={COLORS.statuses.open} />
                    <Bar dataKey="in_progress" name="In‑Progress" stackId="s" fill={COLORS.statuses.in_progress} />
                    <Bar dataKey="completed"   name="Completed"   stackId="s" fill={COLORS.statuses.completed} />
                    <Bar dataKey="on_hold"     name="On‑Hold"     stackId="s" fill={COLORS.statuses.on_hold} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI chips on the right (keep) */}
        <Grid item xs={12} md={3}>
          <Stack spacing={1} sx={{ height: '100%' }}>
            <ChipBox label="Total Open" value={metrics.totalOpen} color={COLORS.statuses.open} />
            <ChipBox label="High Priority" value={metrics.highPriority} color={COLORS.statuses.in_progress} />
            <ChipBox label="> 45 Days Open" value={metrics.old45} color={COLORS.statuses.on_hold} />
          </Stack>
        </Grid>
      </Grid>

      {/* AI Insights (scrollable) */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>AI‑Driven Insights & Actions</Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{
            maxHeight: 240, // ~5–6 items before scrolling depending on viewport
            overflowY: 'auto',
            pr: 1
          }}>
            <Stack spacing={1.25}>
              {insights.map((it, i) => (
                <InsightRow key={i} title={it.title} action={it.action} tag={it.tag} color={it.color} />
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>All Work Requests</Typography>
          <Divider sx={{ mb: 1 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Days Old</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => {
                const sKey = normStatus(r.status);
                const sCfg = STATUS[sKey] || STATUS.open;
                const days = daysBetween(r.created_at);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>
                      <Chip label={sCfg.name} size="small" sx={{ borderColor: sCfg.color, color: sCfg.color }} variant="outlined" />
                    </TableCell>
                    <TableCell>{String(r.priority ?? '—')}</TableCell>
                    <TableCell>
                      <Tooltip title={`${fmtDate(r.created_at)} → ${days} days`}>
                        <span>{days}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5}>No work requests.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}

/* =========================================================================
   Subcomponents
   ------------------------------------------------------------------------- */

function ChipBox({ label, value, color }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ color, fontWeight: 700 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function InsightRow({ title, action, tag, color }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{action}</Typography>
      </Box>
      <Chip label={tag} size="small" variant="outlined" sx={{ borderColor: color, color }} />
    </Stack>
  );
}

/* =========================================================================
   Insight logic (storytelling)
   ------------------------------------------------------------------------- */
function buildInsights(rows, daily) {
  if (!rows) return [];
  const out = [];

  const opens = rows.filter(r => /open/i.test(r.status));
  const old45 = opens.filter(r => daysBetween(r.created_at) > 45).length;
  const high = rows.filter(r => /^high/i.test(r.priority)).length;
  const total = rows.length || 1;

  // 1) Backlog trend (compare last 7d vs prior 7d)
  const last7 = sliceDays(daily, 7);
  const prev7 = sliceDays(daily, 14, 7);
  const sum = (arr, k) => arr.reduce((s, r) => s + (r[k] || 0), 0);
  const openNow = sum(last7, 'open');
  const openPrev = sum(prev7, 'open');
  if (openNow > openPrev) {
    out.push({
      title: `Open inflow rising week‑over‑week (${openPrev} → ${openNow})`,
      action: 'Add capacity: short daily triage, fast‑track obvious fixes, and bundle tasks during planned stops.',
      tag: 'Backlog', color: '#1e88e5',
    });
  } else {
    out.push({
      title: 'Open inflow steady or improving',
      action: 'Sustain cadence. Keep batching similar tasks and pre‑stage materials.',
      tag: 'Backlog', color: '#43a047',
    });
  }

  // 2) Aging
  if (old45 > 0) {
    out.push({
      title: `${old45} request(s) older than 45 days`,
      action: 'Review blockers; if waiting on parts, create an expedite plan or re‑scope to restore partial function.',
      tag: 'Aging', color: '#fb8c00',
    });
  }

  // 3) High priority load
  const shareHigh = high / total;
  out.push({
    title: `${high} high‑priority items (${pct(shareHigh)})`,
    action: 'Protect a daily slot for high priority. Reserve a second slot for preventive tasks to avoid future spikes.',
    tag: 'Priority', color: '#8e24aa',
  });

  // 4) Completion velocity (completed last 7 days)
  const completedNow = sum(last7, 'completed');
  out.push({
    title: `Completed last 7 days: ${completedNow}`,
    action: 'Publish quick wins and before/after metrics to reinforce behaviors. Keep changeover prep (SMED) visible.',
    tag: 'Throughput', color: '#26c6da',
  });

  // 5) On‑hold/paused
  const holdNow = sum(last7, 'on_hold');
  if (holdNow > 0) {
    out.push({
      title: `${holdNow} items placed on hold in last 7 days`,
      action: 'Audit hold reasons; close the loop with parts ETA, vendor touchpoints, or alternative workarounds.',
      tag: 'Flow', color: '#f9a825',
    });
  }

  // 6) First‑hour action
  out.push({
    title: 'Shift‑ready routine',
    action: 'First‑hour: verify lubrication points, scan seam‑welder parameters, check OD gauge trend; raise requests for anomalies.',
    tag: 'Ops', color: '#607d8b',
  });

  return out;
}

function sliceDays(series, n, offset = 0) {
  if (!series || series.length === 0) return [];
  const end = series.length - 1 - offset;
  const start = Math.max(0, end - (n - 1));
  return series.slice(start, end + 1);
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(16).slice(2);
}
