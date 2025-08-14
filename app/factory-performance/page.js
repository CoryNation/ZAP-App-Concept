'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Stack, Grid, Card, CardContent, Typography, Chip, Divider, List, ListItem, ListItemText
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';

/* =========================================================================
   1) Demo fallback data
   ------------------------------------------------------------------------- */
// If you haven’t wired Supabase yet, these keep the page from looking empty.
const demoOEE = [
  { d: 'Week 1', A: 0.89, P: 0.84, Q: 0.95 },
  { d: 'Week 2', A: 0.91, P: 0.82, Q: 0.96 },
  { d: 'Week 3', A: 0.86, P: 0.87, Q: 0.94 },
  { d: 'Week 4', A: 0.92, P: 0.85, Q: 0.97 },
  { d: 'Week 5', A: 0.90, P: 0.88, Q: 0.96 },
].map(r => ({ ...r, OEE: +(r.A * r.P * r.Q).toFixed(3) }));

// Inspired by your Looker images
const demoDowntimeSeries = [
  // date, entity series
  { date: 'Sep 30, 2024', 'Rochelle-IL05_MILL01': 0, 'Chicago-Mill_06': 0, 'Chicago-Mill_08': 0 },
  { date: 'Oct 7, 2024',  'Rochelle-IL05_MILL01': 12, 'Chicago-Mill_06': 8,  'Chicago-Mill_08': 2 },
  { date: 'Oct 14, 2024', 'Rochelle-IL05_MILL01': 15, 'Chicago-Mill_06': 10, 'Chicago-Mill_08': 3 },
  { date: 'Oct 21, 2024', 'Rochelle-IL05_MILL01': 22, 'Chicago-Mill_06': 16, 'Chicago-Mill_08': 5 },
  { date: 'Oct 28, 2024', 'Rochelle-IL05_MILL01': 35, 'Chicago-Mill_06': 20, 'Chicago-Mill_08': 10 },
  { date: 'Nov 4, 2024',  'Rochelle-IL05_MILL01': 42, 'Chicago-Mill_06': 30, 'Chicago-Mill_08': 14 },
  { date: 'Nov 11, 2024', 'Rochelle-IL05_MILL01': 64, 'Chicago-Mill_06': 33, 'Chicago-Mill_08': 18 },
  { date: 'Nov 18, 2024', 'Rochelle-IL05_MILL01': 72, 'Chicago-Mill_06': 37, 'Chicago-Mill_08': 22 },
  { date: 'Nov 25, 2024', 'Rochelle-IL05_MILL01': 85, 'Chicago-Mill_06': 41, 'Chicago-Mill_08': 26 },
  { date: 'Dec 2, 2024',  'Rochelle-IL05_MILL01': 90, 'Chicago-Mill_06': 44, 'Chicago-Mill_08': 29 },
  { date: 'Dec 9, 2024',  'Rochelle-IL05_MILL01': 104,'Chicago-Mill_06': 46, 'Chicago-Mill_08': 33 },
  { date: 'Dec 16, 2024', 'Rochelle-IL05_MILL01': 110,'Chicago-Mill_06': 52, 'Chicago-Mill_08': 37 },
  { date: 'Dec 23, 2024', 'Rochelle-IL05_MILL01': 112,'Chicago-Mill_06': 52, 'Chicago-Mill_08': 39 },
  { date: 'Dec 30, 2024', 'Rochelle-IL05_MILL01': 114,'Chicago-Mill_06': 53, 'Chicago-Mill_08': 40 },
];

const demoDowntimeByCause = [
  // entity, top causes (hours)
  { entity: 'Rochelle-IL05_MILL01', Cutoff: 45, 'Change Cutoff Blades': 30, 'Adjust Cutoff Setup': 25, 'Cutoff Dieset Damage': 22, 'Change Blade(s)': 10 },
  { entity: 'Chicago-Mill_06',     Cutoff: 38, 'Change Cutoff Blades': 6,  'Adjust Cutoff Setup': 5,  'Cutoff Dieset Damage': 1,  'Change Blade(s)': 2  },
  { entity: 'Chicago-Mill_08',     Cutoff: 20, 'Change Cutoff Blades': 0,  'Adjust Cutoff Setup': 0,  'Cutoff Dieset Damage': 0,  'Change Blade(s)': 20 },
];

/* =========================================================================
   2) Page
   ------------------------------------------------------------------------- */
export default function FactoryPerformancePage() {
  const theme = useTheme();

  // Material Design 3–friendly palette
  const COLORS = useMemo(() => ({
    availability: theme.palette.success.main,     // green
    performance:  theme.palette.info.main,        // blue
    quality:      theme.palette.secondary.main,   // accent
    oee:          theme.palette.warning.main,     // amber highlight
    grid: theme.palette.divider,
    series: {
      // downtime entities
      rochelle: '#3f51b5',     // indigo
      chi06:    '#ff9800',     // orange
      chi08:    '#7e57c2',     // deep purple
      // causes
      cutoff:   '#1e88e5',     // blue
      changeBlades: '#fb8c00', // orange
      adjustSetup:  '#8e24aa', // purple
      dieset:      '#8bc34a',  // light green
      changeBlade: '#26c6da',  // cyan
    }
  }), [theme]);

  // --- data sources (swap with Supabase pulls when ready) ---
  const oee = demoOEE; // replace with your selector
  const downtimeSeries = demoDowntimeSeries;
  const downtimeCauses = demoDowntimeByCause;

  // Ensure OEE never renders empty: if no rows -> synthesize a quiet baseline
  const oeeSafe = (oee?.length ? oee : [
    { d: 'Week 1', A: 0.85, P: 0.82, Q: 0.96, OEE: 0.671 },
    { d: 'Week 2', A: 0.86, P: 0.83, Q: 0.96, OEE: 0.686 },
  ]).map(r => ({ ...r, OEE: r.OEE ?? +(r.A * r.P * r.Q).toFixed(3) }));

  // Targets (adjust or load from DB later)
  const target = { oee: 0.90, A: 0.92, P: 0.90, Q: 0.98 };

  // Generate “AI insights” from trends so it feels alive.
  const insights = useMemo(() => generateInsights(oeeSafe, downtimeSeries, downtimeCauses), [oeeSafe, downtimeSeries, downtimeCauses]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Factory Performance</Typography>

      {/* KPI tiles */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <MetricCard label="OEE (last week)" value={pct(oeeSafe.at(-1)?.OEE)} color={COLORS.oee} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Availability" value={pct(oeeSafe.at(-1)?.A)} color={COLORS.availability} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Performance" value={pct(oeeSafe.at(-1)?.P)} color={COLORS.performance} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Quality" value={pct(oeeSafe.at(-1)?.Q)} color={COLORS.quality} />
        </Grid>
      </Grid>

      {/* OEE Trend */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            OEE Trend (stacked A×P×Q with OEE)
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer>
              <ComposedOEE data={oeeSafe} colors={COLORS} target={target} />
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Downtime visuals */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Cumulative Downtime by Entity</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={downtimeSeries} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Downtime (Hours)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Rochelle-IL05_MILL01" stroke={COLORS.series.rochelle} fill={hexToAlpha(COLORS.series.rochelle, 0.08)} />
                    <Line type="monotone" dataKey="Rochelle-IL05_MILL01" name="Rochelle-IL05_MILL01" strokeWidth={3} stroke={COLORS.series.rochelle} dot={false} />
                    <Area type="monotone" dataKey="Chicago-Mill_06" stroke={COLORS.series.chi06} fill={hexToAlpha(COLORS.series.chi06, 0.08)} />
                    <Line type="monotone" dataKey="Chicago-Mill_06" name="Chicago-Mill_06" strokeWidth={3} stroke={COLORS.series.chi06} dot={false} />
                    <Area type="monotone" dataKey="Chicago-Mill_08" stroke={COLORS.series.chi08} fill={hexToAlpha(COLORS.series.chi08, 0.08)} />
                    <Line type="monotone" dataKey="Chicago-Mill_08" name="Chicago-Mill_08" strokeWidth={3} stroke={COLORS.series.chi08} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Downtime by Plant Entity (Top Causes)</Typography>
              <Box sx={{ height: 360 }}>
                <ResponsiveContainer>
                  <BarChart data={downtimeCauses} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="entity" />
                    <YAxis label={{ value: 'Downtime (Hours)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Cutoff"                name="Cutoff"                stackId="causes" fill={COLORS.series.cutoff} />
                    <Bar dataKey="Change Cutoff Blades"  name="Change Cutoff Blades"  stackId="causes" fill={COLORS.series.changeBlades} />
                    <Bar dataKey="Adjust Cutoff Setup"   name="Adjust Cutoff Setup"   stackId="causes" fill={COLORS.series.adjustSetup} />
                    <Bar dataKey="Cutoff Dieset Damage"  name="Cutoff Dieset Damage"  stackId="causes" fill={COLORS.series.dieset} />
                    <Bar dataKey="Change Blade(s)"       name="Change Blade(s)"       stackId="causes" fill={COLORS.series.changeBlade} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Insights & Suggested Actions */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>AI Insights & Actions</Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            {insights.map((it, i) => (
              <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start' }}>
                <ListItemText
                  primary={it.title}
                  secondary={it.action}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Chip label={it.tag} size="small" color={it.color} variant="outlined" />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}

/* =========================================================================
   3) Components & helpers
   ------------------------------------------------------------------------- */

function pct(v) { return v == null || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(1)}%`; }

function MetricCard({ label, value, color }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ color, fontWeight: 700 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function ComposedOEE({ data, colors, target }) {
  // Always ensure percentages are in [0,1]
  const safe = (data || []).map(r => ({
    ...r,
    A: clamp01(r.A), P: clamp01(r.P), Q: clamp01(r.Q),
    OEE: clamp01(r.OEE ?? r.A * r.P * r.Q),
  }));

  return (
    <AreaChart data={safe} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
      <defs>
        <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.availability} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colors.availability} stopOpacity={0.06} />
        </linearGradient>
        <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.performance} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colors.performance} stopOpacity={0.06} />
        </linearGradient>
        <linearGradient id="gradQ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.quality} stopOpacity={0.35} />
          <stop offset="100%" stopColor={colors.quality} stopOpacity={0.06} />
        </linearGradient>
      </defs>

      <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
      <XAxis dataKey="d" />
      <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
      <Tooltip formatter={(v, k) => (typeof v === 'number' ? [`${(v * 100).toFixed(1)}%`, k] : [v, k])} />
      <Legend />

      {/* targets */}
      <ReferenceLine y={target?.A ?? 0.9} stroke={colors.availability} strokeDasharray="4 4" />
      <ReferenceLine y={target?.P ?? 0.9} stroke={colors.performance} strokeDasharray="4 4" />
      <ReferenceLine y={target?.Q ?? 0.98} stroke={colors.quality} strokeDasharray="4 4" />
      <ReferenceLine y={target?.oee ?? 0.9} stroke={colors.oee} strokeDasharray="3 3" />

      {/* stacked components */}
      <Area type="monotone" dataKey="A" name="Availability" stackId="k" fill="url(#gradA)" stroke={colors.availability} />
      <Area type="monotone" dataKey="P" name="Performance"  stackId="k" fill="url(#gradP)" stroke={colors.performance} />
      <Area type="monotone" dataKey="Q" name="Quality"      stackId="k" fill="url(#gradQ)" stroke={colors.quality} />

      {/* OEE overlay */}
      <Line type="monotone" dataKey="OEE" name="OEE" strokeWidth={3} stroke={colors.oee} dot={{ r: 3 }} />
    </AreaChart>
  );
}

function clamp01(n) { const v = Number(n); if (Number.isNaN(v)) return 0; if (v < 0) return 0; if (v > 1) return 1; return v; }

function hexToAlpha(hex, alpha = 0.1) {
  // Accepts #rrggbb; returns rgba(...)
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* =========================================================================
   4) Insight generation (storytelling)
   ------------------------------------------------------------------------- */
function generateInsights(oee, series, causes) {
  const out = [];

  // OEE movement
  if (oee?.length >= 2) {
    const last = oee.at(-1).OEE, prev = oee.at(-2).OEE;
    const delta = ((last - prev) * 100).toFixed(1);
    if (last >= 0.9) {
      out.push({
        title: `OEE holding at ${pct(last)} (Δ ${delta} pts vs last week)`,
        action: 'Sustain current run strategy. Lock settings and capture best-known methods for replication across shifts.',
        tag: 'OEE', color: 'success',
      });
    } else {
      const driver = weakestDriver(oee.at(-1));
      out.push({
        title: `OEE at ${pct(last)} — primary drag: ${driver}`,
        action: `Focus on ${driver}: run loss mapping for the last two weeks, create a 48‑hour countermeasure plan.`,
        tag: 'OEE', color: 'warning',
      });
    }
  }

  // Downtime entity with steepest rise
  if (series?.length > 3) {
    const keys = Object.keys(series[0]).filter(k => k !== 'date');
    const growth = keys.map(k => {
      const first = series[0][k] ?? 0;
      const last  = series.at(-1)[k] ?? 0;
      return { k, delta: last - first, last };
    }).sort((a,b)=>b.delta - a.delta);
    if (growth[0]) {
      out.push({
        title: `Rising downtime on ${growth[0].k} (+${growth[0].delta} hrs)`,
        action: 'Schedule a mini‑Kaizen: review top 3 causes on that entity; bundle quick wins with next planned stop (SMED principle).',
        tag: 'Downtime', color: 'warning',
      });
    }
  }

  // Cause mix cue
  if (causes?.length) {
    const totals = causes.map(r => ({
      entity: r.entity,
      total: Object.entries(r)
        .filter(([k]) => k !== 'entity')
        .reduce((s,[,v]) => s + (Number(v)||0), 0)
    })).sort((a,b)=>b.total - a.total);

    const topEntity = totals[0]?.entity;
    if (topEntity) {
      const row = causes.find(c => c.entity === topEntity);
      const [topCause, topVal] = Object.entries(row)
        .filter(([k]) => k !== 'entity')
        .sort((a,b)=>Number(b[1])-Number(a[1]))[0];
      out.push({
        title: `On ${topEntity}, “${topCause}” leads downtime (${topVal} hrs)`,
        action: `Create a targeted playbook: standardize blade change cadence, pre‑stage inserts, verify cutoff setup. Track leading indicator before/after.`,
        tag: 'Cause', color: 'info',
      });
    }
  }

  // Operator‑level suggestion
  out.push({
    title: 'Shift‑ready actions',
    action: 'Publish a daily “first‑hour” check: verify lubrication points, confirm seam welder parameters, scan OD gauge trends; log exceptions to Work Requests.',
    tag: 'Ops', color: 'secondary',
  });

  return out;
}

function weakestDriver({ A, P, Q }) {
  const pairs = [{k:'Availability',v:A},{k:'Performance',v:P},{k:'Quality',v:Q}];
  pairs.sort((a,b)=>a.v-b.v);
  return pairs[0].k;
}
