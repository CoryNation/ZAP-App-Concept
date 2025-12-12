'use client';

import { useEffect, useState, useMemo } from 'react';
import { Stack, Typography, Grid, Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getDowntimePareto, getDowntimeTimeline } from '@/src/lib/services/downtimeService';
import CompactKpiStrip from '@/src/components/common/CompactKpiStrip';
import BarCard from '@/src/components/charts/BarCard';
import TopCausesTable from '@/src/components/common/TopCausesTable';
import RecentEventsTimeline from '@/src/components/common/RecentEventsTimeline';
import { useModeRoute } from '@/src/lib/hooks/useModeRoute';

export default function DowntimePage() {
  const router = useRouter();
  const getRoute = useModeRoute();
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

  // Calculate Top 5 Causes data with percentages
  const topCausesData = useMemo(() => {
    if (paretoData.length === 0) return [];
    
    const totalMinutes = totalHours * 60;
    let cumulative = 0;
    
    return paretoData.slice(0, 5).map((item) => {
      const minutes = item.hours * 60;
      const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
      cumulative += percentage;
      
      return {
        cause: item.cause,
        minutes,
        percentage,
        cumulativePercentage: cumulative,
      };
    });
  }, [paretoData, totalHours]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Downtime Analysis</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => router.push(getRoute('/requests'))}
          >
            Create Work Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => router.push(getRoute('/improvement/concepts'))}
          >
            Create Concept
          </Button>
        </Stack>
      </Stack>

      {/* Compact KPI Strip */}
      <CompactKpiStrip
        items={[
          { label: 'Total Downtime', value: totalHours.toFixed(1), unit: 'hrs' },
          { label: 'Events', value: totalEvents },
          { label: 'Top Cause', value: topCause },
          { label: 'Mean Duration', value: meanDuration, unit: 'min' },
        ]}
      />

      {/* Pareto Chart and Top Causes - Side by Side */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <BarCard
            title="Downtime by Cause (Pareto Analysis)"
            data={paretoData}
            dataKeys={[{ key: 'hours', color: '#1976d2', name: 'Hours' }]}
            xAxisKey="cause"
            yAxisLabel="Hours"
            loading={loading}
            height={200}
            compact={true}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TopCausesTable causes={topCausesData} maxRows={5} />
        </Grid>
      </Grid>

      {/* Recent Downtime Events Timeline */}
      <RecentEventsTimeline events={timelineData} maxEvents={15} />

      {/* Heatmap Placeholder (Day × Shift) */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Downtime Heatmap (Day × Shift)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Heatmap visualization coming soon - will show downtime intensity by day of week and shift.
        </Typography>
      </Box>
    </Stack>
  );
}
