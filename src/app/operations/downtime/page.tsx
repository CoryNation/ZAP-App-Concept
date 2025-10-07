'use client';

import { useEffect, useState } from 'react';
import { Stack, Typography, Grid, Button, Box, Card, CardContent, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getDowntimePareto, getDowntimeTimeline } from '@/src/lib/services/downtimeService';
import KpiTile from '@/src/components/common/KpiTile';
import BarCard from '@/src/components/charts/BarCard';

const SEVERITY_COLORS = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#1976d2',
};

export default function DowntimePage() {
  const router = useRouter();
  const { factoryId, lineId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [paretoData, setParetoData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const params = {
          plantId: factoryId,
          lineIds: lineId ? [lineId] : undefined,
          range: timeRange,
          customStartDate,
          customEndDate,
        };

        const [pareto, timeline] = await Promise.all([
          getDowntimePareto(params),
          getDowntimeTimeline(params),
        ]);

        setParetoData(pareto);
        setTimelineData(timeline);
      } catch (err) {
        console.error('Error loading downtime data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [factoryId, lineId, timeRange, customStartDate, customEndDate]);

  // Calculate KPIs
  const totalHours = paretoData.reduce((sum, item) => sum + item.hours, 0);
  const totalEvents = paretoData.reduce((sum, item) => sum + item.count, 0);
  const topCause = paretoData[0]?.cause || 'N/A';
  const meanDuration = totalEvents > 0 ? (totalHours / totalEvents * 60).toFixed(1) : 0;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Downtime Analysis</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => router.push('/requests')}
          >
            Create Work Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => router.push('/improvement/concepts')}
          >
            Create Concept
          </Button>
        </Stack>
      </Stack>

      {/* KPI Tiles */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Total Downtime" value={totalHours.toFixed(1)} unit="hrs" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Events" value={totalEvents} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Top Cause" value={topCause} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Mean Duration" value={meanDuration} unit="min" />
        </Grid>
      </Grid>

      {/* Pareto Chart */}
      <BarCard
        title="Downtime by Cause (Pareto Analysis)"
        data={paretoData}
        dataKeys={[{ key: 'hours', color: '#1976d2', name: 'Hours' }]}
        xAxisKey="cause"
        yAxisLabel="Hours"
        loading={loading}
        height={350}
      />

      {/* Timeline / Gantt View */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Recent Downtime Events (Timeline)
          </Typography>
          <Stack spacing={1}>
            {timelineData.slice(0, 15).map((event, idx) => {
              const start = new Date(event.start);
              const end = new Date(event.end);
              const durationMins = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
              
              return (
                <Card key={idx} variant="outlined" sx={{ borderLeft: `4px solid ${SEVERITY_COLORS[(event.severity as 'high' | 'medium' | 'low') || 'low']}` }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={event.line} size="small" color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {event.cause}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {start.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        <Chip 
                          label={`${durationMins} min`} 
                          size="small" 
                          variant="outlined"
                          color={(event.severity as any) === 'high' ? 'error' : (event.severity as any) === 'medium' ? 'warning' : 'default'}
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Heatmap Placeholder (Day × Shift) */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Downtime Heatmap (Day × Shift)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Heatmap visualization coming soon - will show downtime intensity by day of week and shift.
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              [Day 1-7] × [Shift 1-3] matrix with color intensity showing downtime minutes
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
