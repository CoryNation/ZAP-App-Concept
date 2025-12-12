'use client';

import { useEffect, useState } from 'react';
import { Stack, Typography, Grid, Card, CardContent, Box } from '@mui/material';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getFpySeries, getDefectsByCause, getDefectControlChart } from '@/src/lib/services/qualityService';
import KpiTile from '@/src/components/common/KpiTile';
import LineCard from '@/src/components/charts/LineCard';
import BarCard from '@/src/components/charts/BarCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function QualityPage() {
  const { factoryId, lineId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [fpyData, setFpyData] = useState<any[]>([]);
  const [defectsData, setDefectsData] = useState<any[]>([]);
  const [controlChartData, setControlChartData] = useState<any[]>([]);

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

        const [fpySeries, defects, controlChart] = await Promise.all([
          getFpySeries(params),
          getDefectsByCause(params),
          getDefectControlChart(params),
        ]);

        // Transform FPY data
        const fpyGrouped = new Map();
        fpySeries.forEach(point => {
          const key = point.ts;
          if (!fpyGrouped.has(key)) {
            fpyGrouped.set(key, { time: formatTime(point.ts, timeRange), lines: {} });
          }
          const group = fpyGrouped.get(key);
          group.lines[point.line || 'Line'] = (point.fpy * 100).toFixed(2);
        });
        const fpyChart = Array.from(fpyGrouped.values()).sort((a, b) => a.time.localeCompare(b.time));
        setFpyData(fpyChart);

        setDefectsData(defects);

        // Transform control chart data
        const controlChartFormatted = controlChart.map(point => ({
          time: formatTime(point.ts, timeRange),
          value: (point.value * 100).toFixed(2),
          ucl: (point.ucl * 100).toFixed(2),
          lcl: (point.lcl * 100).toFixed(2),
          mean: (point.mean * 100).toFixed(2),
          violation: point.violation,
        }));
        setControlChartData(controlChartFormatted);
      } catch (err) {
        console.error('Error loading quality data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [factoryId, lineId, timeRange, customStartDate, customEndDate]);

  const formatTime = (ts: string, range: string) => {
    const date = new Date(ts);
    if (range === 'last24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (range === 'last7d') return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Calculate KPIs
  const avgFpy = fpyData.length > 0 ? 
    Object.values(fpyData[fpyData.length - 1]).filter((v): v is string => typeof v === 'string' && v !== fpyData[fpyData.length - 1].time)
      .reduce((sum, val) => sum + parseFloat(val), 0) / (Object.keys(fpyData[fpyData.length - 1]).length - 1) : 0;
  const scrapRate = (100 - avgFpy).toFixed(2);
  const topDefect = defectsData[0]?.defect || 'N/A';
  const totalDefects = defectsData.reduce((sum, d) => sum + d.count, 0);

  return (
    <Stack spacing={3}>
      <Typography variant="h5">Quality Metrics</Typography>

      {/* KPI Tiles */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="First Pass Yield" value={avgFpy.toFixed(1)} unit="%" target={98} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Scrap Rate" value={scrapRate} unit="%" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Top Defect" value={topDefect} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="Total Defects" value={totalDefects} />
        </Grid>
      </Grid>

      {/* FPY Trend */}
      <LineCard
        title="First Pass Yield Trend with Goal Band"
        data={fpyData}
        dataKeys={[
          { key: 'Line A', color: '#1976d2', name: 'Line A' },
          { key: 'Line B', color: '#388e3c', name: 'Line B' },
          { key: 'Line C', color: '#f57c00', name: 'Line C' },
        ]}
        xAxisKey="time"
        yAxisLabel="FPY %"
        goalLine={{ value: 98, label: 'Target: 98%', color: '#388e3c' }}
        loading={loading}
        height={350}
      />

      {/* Defects by Cause */}
      <BarCard
        title="Defects by Cause"
        data={defectsData}
        dataKeys={[{ key: 'count', color: '#d32f2f', name: 'Count' }]}
        xAxisKey="defect"
        yAxisLabel="Count"
        loading={loading}
        height={300}
      />

      {/* Control Chart */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Defect Rate Control Chart (p-chart)
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}>
              Loading...
            </Box>
          ) : (
            <Box sx={{ width: '100%', height: 350, display: 'flex' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={controlChartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: 'Defect Rate %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={parseFloat(controlChartData[0]?.ucl || '0')} stroke="#d32f2f" strokeDasharray="3 3" label="UCL" />
                  <ReferenceLine y={parseFloat(controlChartData[0]?.mean || '0')} stroke="#666" strokeDasharray="3 3" label="Mean" />
                  <ReferenceLine y={parseFloat(controlChartData[0]?.lcl || '0')} stroke="#d32f2f" strokeDasharray="3 3" label="LCL" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1976d2" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={payload.violation ? 6 : 3}
                          fill={payload.violation ? '#d32f2f' : '#1976d2'}
                          stroke={payload.violation ? '#fff' : 'none'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    name="Defect Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Red dots indicate Rule 1 violations (point outside control limits)
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
