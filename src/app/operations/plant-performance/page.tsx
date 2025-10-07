'use client';

import { useEffect, useState, useMemo } from 'react';
import { Stack, Typography, Grid, CircularProgress, Box } from '@mui/material';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getPlantKpis, getSpeedSeries, getOeeSeries, getSpeedDistribution } from '@/src/lib/services/metricsService';
import { getDowntimePareto, getDowntimeTimeline, getSpeedVsDowntimeScatter } from '@/src/lib/services/downtimeService';
import { getFpySeries } from '@/src/lib/services/qualityService';
import { getMttrMtbf } from '@/src/lib/services/maintenanceService';
import { getInsights } from '@/src/lib/services/insightsService';
import KpiTile from '@/src/components/common/KpiTile';
import LineCard from '@/src/components/charts/LineCard';
import BarCard from '@/src/components/charts/BarCard';
import ScatterCard from '@/src/components/charts/ScatterCard';
import AiInsightCard from '@/src/components/common/AiInsightCard';
import { PlantKpis, Insight } from '@/src/lib/types';

export default function PlantPerformancePage() {
  const { factoryId, lineId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [kpis, setKpis] = useState<PlantKpis | null>(null);
  const [speedData, setSpeedData] = useState<any[]>([]);
  const [downtimePareto, setDowntimePareto] = useState<any[]>([]);
  const [oeeData, setOeeData] = useState<any[]>([]);
  const [speedVsDowntime, setSpeedVsDowntime] = useState<any[]>([]);
  const [fpyData, setFpyData] = useState<any[]>([]);
  const [mttrMtbf, setMttrMtbf] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);

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

        // Load all data in parallel
        const [
          kpisData,
          speedSeries,
          paretoData,
          oeeSeriesData,
          scatterData,
          fpySeriesData,
          maintenanceData,
        ] = await Promise.all([
          getPlantKpis(params),
          getSpeedSeries(params),
          getDowntimePareto(params),
          getOeeSeries(params),
          getSpeedVsDowntimeScatter(params),
          getFpySeries(params),
          getMttrMtbf(params),
        ]);

        setKpis(kpisData);
        
        // Transform speed series for chart
        const speedChartData = transformSpeedSeries(speedSeries);
        setSpeedData(speedChartData);

        // Transform downtime pareto for chart with cumulative line
        const paretoWithCumulative = transformParetoData(paretoData);
        setDowntimePareto(paretoWithCumulative);

        // Transform OEE data for stacked bars
        const oeeChartData = transformOeeData(oeeSeriesData);
        setOeeData(oeeChartData);

        // Transform scatter data
        setSpeedVsDowntime(scatterData);

        // Transform FPY data
        const fpyChartData = transformFpyData(fpySeriesData);
        setFpyData(fpyChartData);

        // Set maintenance data
        setMttrMtbf(maintenanceData);

        // Generate insights
        const insightsData = await getInsights(kpisData);
        setInsights(insightsData);

      } catch (err) {
        console.error('Error loading plant performance data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [factoryId, lineId, timeRange, customStartDate, customEndDate]);

  // Transform functions
  const transformSpeedSeries = (series: any[]) => {
    if (!series.length) return [];
    const allTimestamps = new Set<string>();
    series.forEach(s => s.data.forEach((d: any) => allTimestamps.add(d.ts)));
    const timestamps = Array.from(allTimestamps).sort();

    return timestamps.map(ts => {
      const point: any = { time: formatTime(ts, timeRange) };
      series.forEach(s => {
        const dataPoint = s.data.find((d: any) => d.ts === ts);
        point[s.name] = dataPoint?.value ?? null;
      });
      return point;
    });
  };

  const transformParetoData = (pareto: any[]) => {
    let cumulative = 0;
    const total = pareto.reduce((sum, item) => sum + item.hours, 0);
    return pareto.map(item => {
      cumulative += item.hours;
      return {
        cause: item.cause,
        hours: item.hours,
        cumulative: Math.round((cumulative / total) * 100),
      };
    });
  };

  const transformOeeData = (oeeData: any[]) => {
    // Group by timestamp and aggregate across lines
    const grouped = new Map();
    oeeData.forEach(point => {
      const key = point.ts;
      if (!grouped.has(key)) {
        grouped.set(key, { ts: key, a: [], p: [], q: [], oee: [] });
      }
      const group = grouped.get(key);
      group.a.push(point.availability);
      group.p.push(point.performance);
      group.q.push(point.quality);
      group.oee.push(point.oee);
    });

    return Array.from(grouped.values()).map(g => ({
      time: formatTime(g.ts, timeRange),
      Availability: (g.a.reduce((s: number, v: number) => s + v, 0) / g.a.length * 100).toFixed(1),
      Performance: (g.p.reduce((s: number, v: number) => s + v, 0) / g.p.length * 100).toFixed(1),
      Quality: (g.q.reduce((s: number, v: number) => s + v, 0) / g.q.length * 100).toFixed(1),
      OEE: (g.oee.reduce((s: number, v: number) => s + v, 0) / g.oee.length * 100).toFixed(1),
    })).sort((a, b) => a.time.localeCompare(b.time));
  };

  const transformFpyData = (fpyData: any[]) => {
    const grouped = new Map();
    fpyData.forEach(point => {
      const key = point.ts;
      if (!grouped.has(key)) {
        grouped.set(key, { ts: key, lines: {} });
      }
      const group = grouped.get(key);
      group.lines[point.line || 'Line'] = (point.fpy * 100).toFixed(2);
    });

    return Array.from(grouped.values()).map(g => ({
      time: formatTime(g.ts, timeRange),
      ...g.lines,
    })).sort((a, b) => a.time.localeCompare(b.time));
  };

  const formatTime = (ts: string, range: string) => {
    const date = new Date(ts);
    if (range === 'last24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (range === 'last7d') return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const insightBullets = insights.map(i => i.description);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Plant Performance Dashboard</Typography>

      {/* KPI Row */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Avg Line Speed" value={kpis?.avgLineSpeed || 0} unit="ft/min" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Goal Attainment" value={kpis?.goalAttainmentPct || 0} unit="%" target={85} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Downtime" value={kpis?.downtimeHours.toFixed(1) || '0'} unit="hrs" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Open Requests" value={kpis?.openRequests || 0} />
        </Grid>
      </Grid>

      {/* AI Insights */}
      {insights.length > 0 && (
        <AiInsightCard
          title="AI Performance Insights"
          badge="Live"
          bullets={insightBullets}
        />
      )}

      {/* Charts Grid */}
      <Grid container spacing={2}>
        {/* Line Speed by Line */}
        <Grid item xs={12} lg={6}>
          <LineCard
            title="Production Flow Speed by Line (ft/min)"
            data={speedData}
            dataKeys={[
              { key: 'Line A', color: '#1976d2', name: 'Line A' },
              { key: 'Line B', color: '#388e3c', name: 'Line B' },
              { key: 'Line C', color: '#f57c00', name: 'Line C' },
            ]}
            xAxisKey="time"
            yAxisLabel="Speed (ft/min)"
            goalLine={{ value: 700, label: 'Goal: 700 ft/min', color: '#b51e27' }}
            height={350}
          />
        </Grid>

        {/* Downtime Pareto */}
        <Grid item xs={12} lg={6}>
          <BarCard
            title="Downtime Pareto (Top Causes)"
            data={downtimePareto}
            dataKeys={[
              { key: 'hours', color: '#1976d2', name: 'Hours' },
              { key: 'cumulative', color: '#f57c00', name: 'Cumulative %' },
            ]}
            xAxisKey="cause"
            yAxisLabel="Hours / Cumulative %"
            height={350}
          />
        </Grid>

        {/* OEE Components */}
        <Grid item xs={12} lg={6}>
          <BarCard
            title="OEE (Availability × Performance × Quality)"
            data={oeeData}
            dataKeys={[
              { key: 'Availability', color: '#1976d2', name: 'Availability %' },
              { key: 'Performance', color: '#388e3c', name: 'Performance %' },
              { key: 'Quality', color: '#f57c00', name: 'Quality %' },
            ]}
            xAxisKey="time"
            yAxisLabel="Percentage"
            stacked={true}
            height={350}
          />
        </Grid>

        {/* Speed vs Downtime Scatter */}
        <Grid item xs={12} lg={6}>
          <ScatterCard
            title="Speed vs. Downtime (Daily per Line)"
            data={speedVsDowntime}
            xKey="speed"
            yKey="downtimeMins"
            xLabel="Avg Speed (ft/min) →"
            yLabel="Downtime (mins) →"
            colorKey="line"
            colors={{
              'Line A': '#1976d2',
              'Line B': '#388e3c',
              'Line C': '#f57c00',
            }}
            height={350}
          />
        </Grid>

        {/* FPY by Line */}
        <Grid item xs={12} lg={6}>
          <LineCard
            title="First Pass Yield (FPY) by Line"
            data={fpyData}
            dataKeys={[
              { key: 'Line A', color: '#1976d2', name: 'Line A' },
              { key: 'Line B', color: '#388e3c', name: 'Line B' },
              { key: 'Line C', color: '#f57c00', name: 'Line C' },
            ]}
            xAxisKey="time"
            yAxisLabel="FPY %"
            goalLine={{ value: 98, label: 'Target: 98%', color: '#388e3c' }}
            height={350}
          />
        </Grid>

        {/* MTTR/MTBF */}
        <Grid item xs={12} lg={6}>
          <Grid container spacing={1}>
            {mttrMtbf.map((m, idx) => (
              <Grid item xs={12} key={idx}>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <KpiTile label={m.line} value={m.line} size="small" />
                  </Grid>
                  <Grid item xs={4}>
                    <KpiTile label="MTTR" value={m.mttrHrs} unit="hrs" size="small" />
                  </Grid>
                  <Grid item xs={4}>
                    <KpiTile label="MTBF" value={m.mtbfHrs} unit="hrs" size="small" />
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Stack>
  );
}

