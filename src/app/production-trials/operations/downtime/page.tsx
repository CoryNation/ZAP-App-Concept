'use client';

import { useEffect, useState } from 'react';
import { Stack, Typography, Grid, Button, Box, Card, CardContent, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getDowntimePareto, getDowntimeTimeline } from '@/src/lib/services/downtimeService';
import BarCard from '@/src/components/charts/BarCard';
import { useAppMode } from '@/src/lib/contexts/ModeProvider';
import { modeRoute } from '@/src/lib/utils/modeRouter';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';
import ProdKpiTile from '@/src/components/prod-trials/ProdKpiTile';
import HistoricalEventsTable from '@/src/components/prod-trials/HistoricalEventsTable';

const SEVERITY_COLORS = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#1976d2',
};

export default function ProductionTrialsDowntimePage() {
  const router = useRouter();
  const { mode } = useAppMode();
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
      {/* Production Trials Header */}
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Downtime Dashboard"
        description="Real-time downtime tracking and analysis for production trials"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => router.push(modeRoute('/requests', mode))}
            >
              Create Work Request
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => router.push(modeRoute('/improvement/concepts', mode))}
            >
              Create Concept
            </Button>
          </Stack>
        }
      />

      {/* KPI Tiles Section */}
      <ProdSection title="Performance Metrics">
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile label="Total Downtime" value={totalHours.toFixed(1)} unit="hrs" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile label="Events" value={totalEvents} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile label="Top Cause" value={topCause} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile label="Mean Duration" value={meanDuration} unit="min" />
          </Grid>
        </Grid>
      </ProdSection>

      {/* Pareto Chart Section */}
      <ProdSection title="Analysis">
        <BarCard
          title="Downtime by Cause (Pareto Analysis)"
          data={paretoData}
          dataKeys={[{ key: 'hours', color: '#4caf50', name: 'Hours' }]}
          xAxisKey="cause"
          yAxisLabel="Hours"
          loading={loading}
          height={350}
        />
      </ProdSection>

      {/* Timeline / Gantt View Section */}
      <ProdSection title="Recent Events">
        <Card>
          <CardContent>
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
                          <Chip label={event.line} size="small" color="success" />
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
      </ProdSection>

      {/* Historical Events Table Section */}
      <ProdSection title="Historical Events">
        <HistoricalEventsTable />
      </ProdSection>

      {/* Heatmap Placeholder Section */}
      <ProdSection title="Heatmap Analysis">
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Heatmap visualization coming soon - will show downtime intensity by day of week and shift.
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                [Day 1-7] × [Shift 1-3] matrix with color intensity showing downtime minutes
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </ProdSection>
    </Stack>
  );
}

