'use client';

import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Stack, Grid, Card, CardContent, Typography, Chip, Divider
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';

/* ----------------------------- Demo Data ----------------------------- */
/** Replace these with real Supabase results when ready. */
const demoOEE = [
  // date, availability, performance, quality, oee (computed)
  { d: 'Week 1', A: 0.89, P: 0.84, Q: 0.95 },
  { d: 'Week 2', A: 0.91, P: 0.82, Q: 0.96 },
  { d: 'Week 3', A: 0.86, P: 0.87, Q: 0.94 },
  { d: 'Week 4', A: 0.92, P: 0.85, Q: 0.97 },
  { d: 'Week 5', A: 0.9 , P: 0.88, Q: 0.96 },
].map(r => ({ ...r, OEE: +(r.A * r.P * r.Q).toFixed(3) }));

const demoDefectsByProduct = [
  { product: '1" EMT', seam: 12, ovality: 7, length: 3, coating: 5, cut: 2 },
  { product: '1¼" EMT', seam: 9,  ovality: 5, length: 2, coating: 3, cut: 1 },
  { product: '1½" EMT', seam: 14, ovality: 6, length: 4, coating: 6, cut: 3 },
  { product: '2" EMT',   seam: 10, ovality: 8, length: 3, coating: 4, cut: 1 },
];

const demoDefectsByShift = [
  { shift: 'A', seam: 5, ovality: 2, length: 1, coating: 2, cut: 1 },
  { shift: 'B', seam: 7, ovality: 3, length: 2, coating: 3, cut: 1 },
  { shift: 'C', seam: 4, ovality: 3, length: 1, coating: 2, cut: 0 },
];

/* ----------------------------- Page ----------------------------- */
export default function FactoryPerformancePage() {
  const theme = useTheme();

  // Material Design 3 friendly palette: avoid reds so alerts keep red authority.
  const COLORS = useMemo(() => ({
    // KPIs
    availability: theme.palette.success.main,    // green
    performance:  theme.palette.info.main,       // blue
    quality:      theme.palette.secondary.main,  // teal/purple depending on your theme
    oee:          theme.palette.warning.main,    // amber (line highlight)
    // Defect families
    seam:   '#1e88e5', // blue 600
    ovality:'#43a047', // green 600
    length: '#8e24aa', // purple 600
    coating:'#00acc1', // cyan 600
    cut:    '#fb8c00', // orange 600
    // Grids, references
    grid: theme.palette.divider,
    ref:  theme.palette.text.disabled,
  }), [theme]);

  const targetOEE = 0.90;           // example target
  const targetAvailability = 0.92;  // example target
  const targetPerformance  = 0.90;  // example target
  const targetQuality      = 0.98;  // example target

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Factory Performance</Typography>

      {/* KPI Summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <MetricCard label="OEE (last week)" value={pct(demoOEE.at(-1)?.OEE)} color={COLORS.oee} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Availability" value={pct(demoOEE.at(-1)?.A)} color={COLORS.availability} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Performance" value={pct(demoOEE.at(-1)?.P)} color={COLORS.performance} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Quality" value={pct(demoOEE.at(-1)?.Q)} color={COLORS.quality} />
        </Grid>
      </Grid>

      {/* OEE Trend: stacked components with OEE line + targets */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            OEE Trend (stacked A×P×Q with OEE)
          </Typography>
          <Box sx={{ height: 320 }}>
            <ResponsiveContainer>
              <ComposedOEE
                data={demoOEE}
                colors={COLORS}
                target={{ oee: targetOEE, A: targetAvailability, P: targetPerformance, Q: targetQuality }}
              />
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {/* Defects by Product (stacked) */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Defect Mix by Product
              </Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={demoDefectsByProduct} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="product" />
                    <YAxis />
                    <Tooltip formatter={(v) => [v, 'Count']} />
                    <Legend />
                    <Bar dataKey="seam"    stackId="a" name="Seam"    fill={COLORS.seam} />
                    <Bar dataKey="ovality" stackId="a" name="Ovality" fill={COLORS.ovality} />
                    <Bar dataKey="length"  stackId="a" name="Length"  fill={COLORS.length} />
                    <Bar dataKey="coating" stackId="a" name="Coating" fill={COLORS.coating} />
                    <Bar dataKey="cut"     stackId="a" name="Cut"     fill={COLORS.cut} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Defects by Shift (stacked) */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Defects by Shift (last 30 days)
              </Typography>
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={demoDefectsByShift} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="shift" />
                    <YAxis />
                    <Tooltip formatter={(v) => [v, 'Count']} />
                    <Legend />
                    <Bar dataKey="seam"    stackId="b" name="Seam"    fill={COLORS.seam} />
                    <Bar dataKey="ovality" stackId="b" name="Ovality" fill={COLORS.ovality} />
                    <Bar dataKey="length"  stackId="b" name="Length"  fill={COLORS.length} />
                    <Bar dataKey="coating" stackId="b" name="Coating" fill={COLORS.coating} />
                    <Bar dataKey="cut"     stackId="b" name="Cut"     fill={COLORS.cut} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Narrative / Takeaways */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>At‑a‑glance Insights</Typography>
          <Divider sx={{ mb: 1 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="Callout: Watch Performance dips in Week 3" color="warning" variant="outlined" />
            <Chip label="Quality steady; target 98%" color="success" variant="outlined" />
            <Chip label="Seam defects dominate product mix" color="info" variant="outlined" />
            <Chip label="Shift B shows higher total defects" color="secondary" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

/* ----------------------------- Helpers & Subcomponents ----------------------------- */

function pct(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

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
  // We’ll render the stacked *areas* for Availability/Performance/Quality,
  // plus an OEE line over the top; reference lines show targets.
  return (
    <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
      <defs>
        <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.availability} stopOpacity={0.4} />
          <stop offset="100%" stopColor={colors.availability} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.performance} stopOpacity={0.4} />
          <stop offset="100%" stopColor={colors.performance} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="gradQ" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.quality} stopOpacity={0.4} />
          <stop offset="100%" stopColor={colors.quality} stopOpacity={0.05} />
        </linearGradient>
      </defs>

      <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
      <XAxis dataKey="d" />
      <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
      <Tooltip
        formatter={(v, k) => (typeof v === 'number' ? [`${(v * 100).toFixed(1)}%`, k] : [v, k])}
      />
      <Legend />

      {/* Targets */}
      <ReferenceLine y={target?.A ?? 0.9}  stroke={colors.availability} strokeDasharray="4 4" />
      <ReferenceLine y={target?.P ?? 0.9}  stroke={colors.performance}  strokeDasharray="4 4" />
      <ReferenceLine y={target?.Q ?? 0.98} stroke={colors.quality}      strokeDasharray="4 4" />
      <ReferenceLine y={target?.oee ?? 0.9} stroke={colors.oee}          strokeDasharray="3 3" />

      {/* Stacked components */}
      <Area type="monotone" dataKey="A" name="Availability" stackId="k" fill="url(#gradA)" stroke={colors.availability} />
      <Area type="monotone" dataKey="P" name="Performance"  stackId="k" fill="url(#gradP)" stroke={colors.performance} />
      <Area type="monotone" dataKey="Q" name="Quality"      stackId="k" fill="url(#gradQ)" stroke={colors.quality} />

      {/* OEE overlay line */}
      <Line type="monotone" dataKey="OEE" name="OEE" strokeWidth={3} stroke={colors.oee} dot={{ r: 3 }} />
    </AreaChart>
  );
}
