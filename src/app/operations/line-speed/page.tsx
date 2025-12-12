'use client';

import { useEffect, useState, useMemo } from 'react';
import { Stack, Typography, Card, CardContent, Box, CircularProgress, Alert, Grid } from '@mui/material';
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
import AiInsightCard from '@/src/components/common/AiInsightCard';

// Color palette for multiple lines
const LINE_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#c2185b', '#0097a7'];

export default function LineSpeedPage() {
  const { factoryId, lineId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
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
          customStartDate,
          customEndDate,
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
  }, [factoryId, lineId, timeRange, customStartDate, customEndDate]);

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

  // Generate AI insights based on the data
  const insights = useMemo(() => {
    if (series.length === 0) return [];
    
    const bullets: string[] = [];
    
    // Calculate average speed and goal achievement
    let totalPoints = 0;
    let aboveGoal = 0;
    let atZero = 0;
    
    series.forEach(s => {
      s.data.forEach(d => {
        totalPoints++;
        if (d.value >= 700) aboveGoal++;
        if (d.value === 0) atZero++;
      });
    });
    
    const goalRate = totalPoints > 0 ? (aboveGoal / totalPoints * 100).toFixed(1) : '0';
    const downtimeRate = totalPoints > 0 ? (atZero / totalPoints * 100).toFixed(1) : '0';
    
    bullets.push(`Goal achievement: ${goalRate}% of measurements at or above 700 ft/min target`);
    
    if (parseFloat(downtimeRate) > 10) {
      bullets.push(`Downtime alert: ${downtimeRate}% of time at zero speed — investigate common causes`);
    } else {
      bullets.push(`Downtime: ${downtimeRate}% — within acceptable range`);
    }
    
    if (parseFloat(goalRate) < 60) {
      bullets.push('Recommendation: Review changeover procedures and material staging to reduce speed variations');
    } else if (parseFloat(goalRate) >= 80) {
      bullets.push('Strong performance: Maintain current operating procedures and share best practices');
    }
    
    bullets.push('Action: Monitor for consistent patterns below goal and schedule preventive maintenance');
    
    return bullets;
  }, [series]);

  const timeRangeLabel = useMemo(() => {
    switch (timeRange) {
      case 'last24h': return 'Last 24 Hours';
      case 'last7d': return 'Last 7 Days';
      case 'last30d': return 'Last 30 Days';
      case 'last60d': return 'Last 60 Days';
      case 'last90d': return 'Last 90 Days';
      case 'custom': return 'Custom Range';
      default: return timeRange;
    }
  }, [timeRange]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Line Speed</Typography>
      
      {/* AI Insights */}
      {!loading && series.length > 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <AiInsightCard
              title="AI Performance Insights"
              badge="Live"
              bullets={insights}
            />
          </Grid>
        </Grid>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Line Speed (ft/min) — {timeRangeLabel}
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
            <Box sx={{ width: '100%', height: 500, display: 'flex' }}>
              <ResponsiveContainer width="100%" height="100%">
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
