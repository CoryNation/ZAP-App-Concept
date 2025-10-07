'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Stack, Grid, Card, CardContent, Typography, Chip, Divider, List, ListItem, ListItemText
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Area
} from 'recharts';

/* =========================================================================
   Demo fallback data (swap with Supabase later)
   ------------------------------------------------------------------------- */

/** Production speed (ft/min) time series per entity.
 *  Includes >700 segments, 400 dips, and 0's for shutdowns.
 */
const speedSeries = [
  { date: 'Sep 30, 2024', 'Rochelle-IL05_MILL01': 0,   'Chicago-Mill_06': 0,   'Chicago-Mill_08': 0 },
  { date: 'Oct 07, 2024', 'Rochelle-IL05_MILL01': 420, 'Chicago-Mill_06': 380, 'Chicago-Mill_08': 410 },
  { date: 'Oct 14, 2024', 'Rochelle-IL05_MILL01': 690, 'Chicago-Mill_06': 720, 'Chicago-Mill_08': 0 },
  { date: 'Oct 21, 2024', 'Rochelle-IL05_MILL01': 740, 'Chicago-Mill_06': 760, 'Chicago-Mill_08': 690 },
  { date: 'Oct 28, 2024', 'Rochelle-IL05_MILL01': 780, 'Chicago-Mill_06': 690, 'Chicago-Mill_08': 400 },
  { date: 'Nov 04, 2024', 'Rochelle-IL05_MILL01': 720, 'Chicago-Mill_06': 0,   'Chicago-Mill_08': 700 },
  { date: 'Nov 11, 2024', 'Rochelle-IL05_MILL01': 400, 'Chicago-Mill_06': 710, 'Chicago-Mill_08': 730 },
  { date: 'Nov 18, 2024', 'Rochelle-IL05_MILL01': 0,   'Chicago-Mill_06': 740, 'Chicago-Mill_08': 760 },
  { date: 'Nov 25, 2024', 'Rochelle-IL05_MILL01': 705, 'Chicago-Mill_06': 690, 'Chicago-Mill_08': 0 },
  { date: 'Dec 02, 2024', 'Rochelle-IL05_MILL01': 730, 'Chicago-Mill_06': 400, 'Chicago-Mill_08': 690 },
  { date: 'Dec 09, 2024', 'Rochelle-IL05_MILL01': 760, 'Chicago-Mill_06': 725, 'Chicago-Mill_08': 720 },
  { date: 'Dec 16, 2024', 'Rochelle-IL05_MILL01': 790, 'Chicago-Mill_06': 700, 'Chicago-Mill_08': 740 },
  { date: 'Dec 23, 2024', 'Rochelle-IL05_MILL01': 0,   'Chicago-Mill_06': 675, 'Chicago-Mill_08': 400 },
  { date: 'Dec 30, 2024', 'Rochelle-IL05_MILL01': 720, 'Chicago-Mill_06': 710, 'Chicago-Mill_08': 705 },
];

/** Downtime, inspired by your Looker screenshots (kept from previous version) */
const demoDowntimeSeries = [
  { date: 'Sep 30, 2024', 'Rochelle-IL05_MILL01': 0, 'Chicago-Mill_06': 0,  'Chicago-Mill_08': 0 },
  { date: 'Oct 7, 2024',  'Rochelle-IL05_MILL01': 12,'Chicago-Mill_06': 8,  'Chicago-Mill_08': 2 },
  { date: 'Oct 14, 2024', 'Rochelle-IL05_MILL01': 15,'Chicago-Mill_06': 10, 'Chicago-Mill_08': 3 },
  { date: 'Oct 21, 2024', 'Rochelle-IL05_MILL01': 22,'Chicago-Mill_06': 16, 'Chicago-Mill_08': 5 },
  { date: 'Oct 28, 2024', 'Rochelle-IL05_MILL01': 35,'Chicago-Mill_06': 20, 'Chicago-Mill_08': 10 },
  { date: 'Nov 4, 2024',  'Rochelle-IL05_MILL01': 42,'Chicago-Mill_06': 30, 'Chicago-Mill_08': 14 },
  { date: 'Nov 11, 2024', 'Rochelle-IL05_MILL01': 64,'Chicago-Mill_06': 33, 'Chicago-Mill_08': 18 },
  { date: 'Nov 18, 2024', 'Rochelle-IL05_MILL01': 72,'Chicago-Mill_06': 37, 'Chicago-Mill_08': 22 },
  { date: 'Nov 25, 2024', 'Rochelle-IL05_MILL01': 85,'Chicago-Mill_06': 41, 'Chicago-Mill_08': 26 },
  { date: 'Dec 2, 2024',  'Rochelle-IL05_MILL01': 90,'Chicago-Mill_06': 44, 'Chicago-Mill_08': 29 },
  { date: 'Dec 9, 2024',  'Rochelle-IL05_MILL01': 104,'Chicago-Mill_06': 46,'Chicago-Mill_08': 33 },
  { date: 'Dec 16, 2024', 'Rochelle-IL05_MILL01': 110,'Chicago-Mill_06': 52,'Chicago-Mill_08': 37 },
  { date: 'Dec 23, 2024', 'Rochelle-IL05_MILL01': 112,'Chicago-Mill_06': 52,'Chicago-Mill_08': 39 },
  { date: 'Dec 30, 2024', 'Rochelle-IL05_MILL01': 114,'Chicago-Mill_06': 53,'Chicago-Mill_08': 40 },
];

const demoDowntimeByCause = [
  { entity: 'Rochelle-IL05_MILL01', Cutoff: 45, 'Change Cutoff Blades': 30, 'Adjust Cutoff Setup': 25, 'Cutoff Dieset Damage': 22, 'Change Blade(s)': 10 },
  { entity: 'Chicago-Mill_06',     Cutoff: 38, 'Change Cutoff Blades': 6,  'Adjust Cutoff Setup': 5,  'Cutoff Dieset Damage': 1,  'Change Blade(s)': 2  },
  { entity: 'Chicago-Mill_08',     Cutoff: 20, 'Change Cutoff Blades': 0,  'Adjust Cutoff Setup': 0,  'Cutoff Dieset Damage': 0,  'Change Blade(s)': 20 },
];

/* =========================================================================
   Page
   ------------------------------------------------------------------------- */
export default function FactoryPerformancePage() {
  const theme = useTheme();

  // Palette: distinct lines, non-red (reserve red for the goal)
  const COLORS = useMemo(() => ({
    grid: theme.palette.divider,
    lines: {
      rochelle: '#3f51b5',  // indigo
      chi06:    '#ff9800',  // orange
      chi08:    '#7e57c2',  // deep purple
    },
    causes: {
      cutoff:   '#1e88e5',
      changeBlades: '#fb8c00',
      adjustSetup:  '#8e24aa',
      dieset:      '#8bc34a',
      changeBlade: '#26c6da',
    },
    goal: '#e53935', // red for the goal line only
  }), [theme]);

  const speedGoal = 700; // ft/min

  // For insights we’ll analyze time under goal and zero-time (shutdowns).
  const insights = useMemo(
    () => generateInsightsFromSpeed(speedSeries, speedGoal, demoDowntimeSeries, demoDowntimeByCause),
    []
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Factory Performance</Typography>

      {/* NEW: Production Flow Speed over time */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Production Flow Speed by Line (ft/min)</Typography>
          <Box sx={{ height: 340 }}>
            <ResponsiveContainer>
              <LineChart data={speedSeries} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 850]} tickFormatter={(v) => `${v}`} label={{ value: 'ft/min', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={speedGoal} stroke={COLORS.goal} strokeWidth={2} strokeDasharray="6 3" label={{ value: 'Goal (700 ft/min)', position: 'insideTopRight', fill: COLORS.goal }} />
                <Area type="monotone" dataKey="Rochelle-IL05_MILL01" stroke={COLORS.lines.rochelle} fill={hexToAlpha(COLORS.lines.rochelle, 0.08)} />
                <Line type="monotone" dataKey="Rochelle-IL05_MILL01" name="Rochelle-IL05_MILL01" strokeWidth={3} stroke={COLORS.lines.rochelle} dot={false} />
                <Area type="monotone" dataKey="Chicago-Mill_06" stroke={COLORS.lines.chi06} fill={hexToAlpha(COLORS.lines.chi06, 0.08)} />
                <Line type="monotone" dataKey="Chicago-Mill_06" name="Chicago-Mill_06" strokeWidth={3} stroke={COLORS.lines.chi06} dot={false} />
                <Area type="monotone" dataKey="Chicago-Mill_08" stroke={COLORS.lines.chi08} fill={hexToAlpha(COLORS.lines.chi08, 0.08)} />
                <Line type="monotone" dataKey="Chicago-Mill_08" name="Chicago-Mill_08" strokeWidth={3} stroke={COLORS.lines.chi08} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Downtime visuals (kept) */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Cumulative Downtime by Entity</Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={demoDowntimeSeries} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Downtime (Hours)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Rochelle-IL05_MILL01" stroke={COLORS.lines.rochelle} fill={hexToAlpha(COLORS.lines.rochelle, 0.08)} />
                    <Line type="monotone" dataKey="Rochelle-IL05_MILL01" name="Rochelle-IL05_MILL01" strokeWidth={3} stroke={COLORS.lines.rochelle} dot={false} />
                    <Area type="monotone" dataKey="Chicago-Mill_06" stroke={COLORS.lines.chi06} fill={hexToAlpha(COLORS.lines.chi06, 0.08)} />
                    <Line type="monotone" dataKey="Chicago-Mill_06" name="Chicago-Mill_06" strokeWidth={3} stroke={COLORS.lines.chi06} dot={false} />
                    <Area type="monotone" dataKey="Chicago-Mill_08" stroke={COLORS.lines.chi08} fill={hexToAlpha(COLORS.lines.chi08, 0.08)} />
                    <Line type="monotone" dataKey="Chicago-Mill_08" name="Chicago-Mill_08" strokeWidth={3} stroke={COLORS.lines.chi08} dot={false} />
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
                  <BarChart data={demoDowntimeByCause} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="entity" />
                    <YAxis label={{ value: 'Downtime (Hours)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Cutoff"                name="Cutoff"                stackId="causes" fill={COLORS.causes.cutoff} />
                    <Bar dataKey="Change Cutoff Blades"  name="Change Cutoff Blades"  stackId="causes" fill={COLORS.causes.changeBlades} />
                    <Bar dataKey="Adjust Cutoff Setup"   name="Adjust Cutoff Setup"   stackId="causes" fill={COLORS.causes.adjustSetup} />
                    <Bar dataKey="Cutoff Dieset Damage"  name="Cutoff Dieset Damage"  stackId="causes" fill={COLORS.causes.dieset} />
                    <Bar dataKey="Change Blade(s)"       name="Change Blade(s)"       stackId="causes" fill={COLORS.causes.changeBlade} />
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
                <ListItemText primaryTypographyProps={{ fontWeight: 600 }} primary={it.title} secondary={it.action} />
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
   Helpers & Insight generation
   ------------------------------------------------------------------------- */

function hexToAlpha(hex, alpha = 0.1) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function generateInsightsFromSpeed(speedRows, goal, downtimeSeries, downtimeCauses) {
  const out = [];
  if (!speedRows?.length) return out;

  const keys = Object.keys(speedRows[0]).filter(k => k !== 'date');
  keys.forEach((k) => {
    const arr = speedRows.map(r => Number(r[k]) || 0);
    const below = arr.filter(v => v > 0 && v < goal).length;
    const atZero = arr.filter(v => v === 0).length;
    const above = arr.filter(v => v >= goal).length;

    if (atZero > 0) {
      out.push({
        title: `${k}: ${atZero} time bucket(s) at 0 ft/min (shutdown)`,
        action: 'Correlate with downtime causes. Pre‑stage parts and align changeovers (SMED) to reduce cold starts.',
        tag: 'Shutdown', color: 'warning',
      });
    }
    if (below > 0) {
      out.push({
        title: `${k}: Frequent sub‑goal speed (${below} bucket(s) below ${goal})`,
        action: 'Check seam parameters, lube schedule, and OD gauge trends. Bundle corrective work with next planned stop.',
        tag: 'Throughput', color: 'info',
      });
    }
    if (above >= Math.max(1, arr.length * 0.3)) {
      out.push({
        title: `${k}: Sustained goal attainment in several periods`,
        action: 'Capture best‑known settings and replicate across shifts; lock recipes and parameters.',
        tag: 'Win', color: 'success',
      });
    }
  });

  // Keep one downtime-related story so the page ties together
  if (downtimeSeries?.length > 1) {
    const entities = Object.keys(downtimeSeries[0]).filter(k => k !== 'date');
    const growth = entities.map(k => {
      const first = downtimeSeries[0][k] ?? 0;
      const last  = downtimeSeries.at(-1)[k] ?? 0;
      return { k, delta: last - first };
    }).sort((a,b)=>b.delta - a.delta);
    if (growth[0]?.delta > 0) {
      out.push({
        title: `Downtime rising on ${growth[0].k} (+${growth[0].delta} hrs)`,
        action: 'Target top 2–3 causes first (cutoff, setup, blades). Pair countermeasures with speed recovery actions.',
        tag: 'Downtime', color: 'secondary',
      });
    }
  }

  if (downtimeCauses?.length) {
    const row = downtimeCauses[0];
    const [cause, val] = Object.entries(row).filter(([k]) => k !== 'entity').sort((a,b)=>b[1]-a[1])[0];
    if (cause) {
      out.push({
        title: `Top cause on ${row.entity}: ${cause} (${val} hrs)`,
        action: 'Standardize blade change cadence, verify cutoff setup, and track leading indicator (speed recovery) before/after.',
        tag: 'Cause', color: 'info',
      });
    }
  }

  return out;
}
