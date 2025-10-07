'use client';

import { useEffect, useState } from 'react';
import { Stack, Typography, Card, CardContent, Box, CircularProgress, Alert } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getLineSpeedSeries, LineSpeedSeries } from '@/src/lib/services/lineSpeedService';

// Color palette for multiple lines
const LINE_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#0097a7'];

export default function LineSpeedPage() {
  const { factoryId, lineId, timeRange } = useGlobalFilters();
  const [series, setSeries] = useState<LineSpeedSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const lineIds = lineId ? [lineId] : undefined;
        const data = await getLineSpeedSeries({
          factoryId,
          lineIds,
          range: timeRange,
        });

        if (!active) return;

        if (!data || data.length === 0) {
          setError('No line speed data available for the selected scope.');
          setSeries([]);
        } else {
          setSeries(data);
        }
      } catch (err) {
        if (!active) return;
        console.error('Error loading line speed data:', err);
        setError('Failed to load line speed data. Please try again.');
        setSeries([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [factoryId, lineId, timeRange]);

  // Transform series data into Recharts format
  const chartData = (() => {
    if (series.length === 0) return [];

    // Find all unique timestamps across all series
    const timestampSet = new Set<string>();
    series.forEach(s => s.data.forEach(d => timestampSet.add(d.ts)));
    const timestamps = Array.from(timestampSet).sort();

    // Create a map for each series: timestamp -> value
    const seriesMaps = series.map(s => {
      const map = new Map<string, number>();
      s.data.forEach(d => map.set(d.ts, d.value));
      return { name: s.name, map };
    });

    // Build chart data: one object per timestamp with all series values
    return timestamps.map(ts => {
      const point: any = {
        timestamp: ts,
        displayTime: formatTimestamp(ts, timeRange),
      };
      seriesMaps.forEach(({ name, map }) => {
        point[name] = map.get(ts) ?? null;
      });
      return point;
    });
  })();

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Line Speed</Typography>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Line Speed (ft/min) — {timeRange === 'last24h' ? 'Last 24 Hours' : timeRange === 'last7d' ? 'Last 7 Days' : 'Last 30 Days'}
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && series.length > 0 && (
            <Box sx={{ width: '100%', height: 500 }}>
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="displayTime"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    label={{ value: 'Speed (ft/min)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    labelFormatter={(label) => `Time: ${label}`}
                    formatter={(value: any) => (value !== null ? `${value} ft/min` : 'No data')}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />

                  {/* Red goal line at 700 ft/min */}
                  <ReferenceLine
                    y={700}
                    stroke="#b51e27"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: 'Goal: 700 ft/min',
                      position: 'right',
                      fill: '#b51e27',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />

                  {/* Render a line for each series */}
                  {series.map((s, idx) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      name={s.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}

          {!loading && !error && series.length === 0 && (
            <Alert severity="info">
              No line speed data available. Adjust your filter selection or check data sources.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            About This Chart
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This chart shows line speed in feet per minute (ft/min) over time. The red dashed line represents 
            the target goal of 700 ft/min. Drops to zero indicate downtime or maintenance periods. 
            {series.length === 0 && !loading && ' (Currently showing synthetic demo data as fallback.)'}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

/**
 * Format timestamp for display based on time range
 */
function formatTimestamp(ts: string, range: string): string {
  const date = new Date(ts);

  if (range === 'last24h') {
    // Show hour:minute
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } else if (range === 'last7d') {
    // Show day and hour
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
  } else {
    // Show month and day
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
