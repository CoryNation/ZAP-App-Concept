'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { Stack, Grid, Card, CardContent, Typography, Chip, Box, CircularProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import ProdSection from '@/src/components/prod-trials/ProdSection';
import RawEventsTable from '@/src/components/prod-trials/RawEventsTable';
import HistoricalEventsTable from '@/src/components/prod-trials/HistoricalEventsTable';
import RapidRecurrenceTab from '@/src/components/prod-trials/RapidRecurrenceTab';
import ProdKpiTile from '@/src/components/prod-trials/ProdKpiTile';
import BarCard from '@/src/components/charts/BarCard';
import AiInsightCard from '@/src/components/common/AiInsightCard';
import DowntimeFiltersBar from '@/src/components/prod-trials/DowntimeFiltersBar';
import DowntimeTabs from '@/src/components/prod-trials/DowntimeTabs';
import RelationshipMatrix from '@/src/components/prod-trials/RelationshipMatrix';
import TransitionsList from '@/src/components/prod-trials/TransitionsList';
import TransitionDetailsTable from '@/src/components/prod-trials/TransitionDetailsTable';
import CompactKpiStrip from '@/src/components/common/CompactKpiStrip';
import CompactDowntimeReasonsTable from '@/src/components/prod-trials/CompactDowntimeReasonsTable';
import CompactRapidRecurrenceTable from '@/src/components/prod-trials/CompactRapidRecurrenceTable';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getDowntimePareto, getDowntimeTimeline } from '@/src/lib/services/downtimeService';
import {
  DowntimeTransitionsResponse,
  GroupingDimension,
} from '@/src/lib/services/downtimeTransitionsService';
import {
  RapidRecurrenceResponse,
  RapidRecurrenceEvent,
} from '@/src/app/api/production-trials/downtime/rapid-recurrence/route';
import { supabase } from '@/lib/supabaseClient';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';

const SEVERITY_COLORS = {
  high: '#d32f2f',
  medium: '#f57c00',
  low: '#1976d2',
};

function ProductionTrialsDowntimePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { factoryId, lineId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [paretoData, setParetoData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  // Rapid Recurrence state for Overview tab
  const [rapidRecurrenceLoading, setRapidRecurrenceLoading] = useState(false);
  const [rapidRecurrenceData, setRapidRecurrenceData] = useState<RapidRecurrenceResponse | null>(null);

  // Relationship Matrix state
  const [transitionsLoading, setTransitionsLoading] = useState(false);
  const [transitionsData, setTransitionsData] = useState<DowntimeTransitionsResponse | null>(null);
  const [grouping, setGrouping] = useState<GroupingDimension>('reason');
  const [topN, setTopN] = useState(12);
  const [selectedCell, setSelectedCell] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Ensure timeRange has a valid default
        const effectiveTimeRange = timeRange || 'last90d';
        
        const params = {
          plantId: factoryId,
          lineIds: lineId ? [lineId] : undefined,
          range: effectiveTimeRange,
          customStartDate,
          customEndDate,
        };

        const [pareto, timeline] = await Promise.all([
          getDowntimePareto(params),
          getDowntimeTimeline(params),
        ]);

        setParetoData(pareto || []);
        setTimelineData(timeline || []);
      } catch (err) {
        console.error('Error loading downtime data:', err);
        // Set empty arrays on error to prevent infinite spinner
        setParetoData([]);
        setTimelineData([]);
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

  // Generate AI insights
  const insights = useMemo(() => {
    const bullets: string[] = [];
    
    if (totalHours > 20) {
      bullets.push(`${totalHours.toFixed(1)} hours of downtime detected — investigate root causes and implement preventive measures`);
    } else if (totalHours > 0) {
      bullets.push(`${totalHours.toFixed(1)} hours of downtime — within acceptable range for production trials`);
    }
    
    if (topCause !== 'N/A') {
      bullets.push(`Top cause: ${topCause} — focus improvement efforts on this area`);
    }
    
    if (totalEvents > 0) {
      bullets.push(`${totalEvents} total events with average duration of ${meanDuration} minutes`);
    }
    
    if (totalHours > 0 && totalEvents > 0) {
      const eventsPerHour = (totalEvents / totalHours).toFixed(1);
      bullets.push(`Event frequency: ${eventsPerHour} events per hour — monitor for patterns and recurring issues`);
    }
    
    bullets.push('Recommendation: Review timeline view to identify time-based patterns and schedule preventive maintenance');
    
    return bullets;
  }, [totalHours, totalEvents, topCause, meanDuration]);

  // Convert timeRange to dates for API calls
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
      };
    }
    const rangeHours: Record<string, number> = {
      last24h: 24,
      last7d: 168,
      last30d: 720,
      last60d: 1440,
      last90d: 2160,
    };
    const hours = rangeHours[timeRange] || 24;
    return {
      startDate: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString(),
      endDate: now.toISOString(),
    };
  }, [timeRange, customStartDate, customEndDate]);

  // Get factory name from factoryId
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  const factoryName = useMemo(() => {
    if (!factoryId) return undefined;
    const factory = factories.find(f => f.id === factoryId);
    return factory?.name || undefined;
  }, [factoryId, factories]);

  // Load factories
  useEffect(() => {
    async function loadFactories() {
      try {
        const { data: fs } = await supabase
          .from('factories')
          .select('id,name')
          .order('name');
        setFactories(fs || []);
      } catch (err) {
        console.error('Error loading factories:', err);
        setFactories([]);
      }
    }
    loadFactories();
  }, []);

  // Load rapid recurrence data for Overview tab
  useEffect(() => {
    async function loadRapidRecurrenceData() {
      setRapidRecurrenceLoading(true);
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          thresholdMinutes: '20', // Default threshold
        });

        if (factoryName) {
          params.append('factory', factoryName);
        }

        const response = await fetch(`/api/production-trials/downtime/rapid-recurrence?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rapid recurrence data');
        }

        const data: RapidRecurrenceResponse = await response.json();
        setRapidRecurrenceData(data);
      } catch (err) {
        console.error('Error loading rapid recurrence data:', err);
        setRapidRecurrenceData(null);
      } finally {
        setRapidRecurrenceLoading(false);
      }
    }

    loadRapidRecurrenceData();
  }, [startDate, endDate, factoryName]);

  // Load transitions data when relationship matrix tab is active
  useEffect(() => {
    async function loadTransitions() {
      setTransitionsLoading(true);
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          grouping,
          topN: topN.toString(),
        });

        if (factoryName) {
          params.append('factory', factoryName);
        }

        const response = await fetch(`/api/production-trials/downtime/transitions?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch transitions');
        }

        const data: DowntimeTransitionsResponse = await response.json();
        setTransitionsData(data);
      } catch (err) {
        console.error('Error loading transitions data:', err);
        setTransitionsData(null);
      } finally {
        setTransitionsLoading(false);
      }
    }

    loadTransitions();
  }, [startDate, endDate, factoryName, grouping, topN]);

  const handleCellClick = (from: string, to: string) => {
    setSelectedCell({ from, to });
  };

  const handleTransitionClick = (from: string, to: string) => {
    setSelectedCell({ from, to });
  };

  // Process pareto data for downtime reasons table
  const topDowntimeReasons = useMemo(() => {
    return paretoData.slice(0, 8).map(item => ({
      reason: item.cause,
      minutes: item.hours * 60,
      events: item.count,
      avgDuration: item.count > 0 ? (item.hours * 60) / item.count : 0,
    }));
  }, [paretoData]);

  // Process rapid recurrence data for top preceding reasons
  const topPrecedingReasons = useMemo(() => {
    if (!rapidRecurrenceData || !rapidRecurrenceData.events) return [];
    
    const reasonCounts = new Map<string, number>();
    rapidRecurrenceData.events.forEach(event => {
      const reason = event.restart_reason || 'Unknown';
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });

    return Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rapidRecurrenceData]);

  // Process rapid recurrence data for top pairs
  const topPairs = useMemo(() => {
    if (!rapidRecurrenceData || !rapidRecurrenceData.events) return [];
    
    const pairMap = new Map<string, { count: number; totalRuntime: number }>();
    
    rapidRecurrenceData.events.forEach(event => {
      const preceding = event.restart_reason || 'Unknown';
      const subsequent = event.subsequent_stop_reason || 'Unknown';
      const key = `${preceding}|${subsequent}`;
      
      const existing = pairMap.get(key) || { count: 0, totalRuntime: 0 };
      pairMap.set(key, {
        count: existing.count + 1,
        totalRuntime: existing.totalRuntime + event.run_duration_minutes,
      });
    });

    return Array.from(pairMap.entries())
      .map(([key, data]) => {
        const [preceding, subsequent] = key.split('|');
        return {
          preceding,
          subsequent,
          count: data.count,
          avgRuntimeBetween: data.totalRuntime / data.count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rapidRecurrenceData]);

  // Handle deep-linking to Raw Data tab with filters
  const handleReasonClick = (reason: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'raw-data');
    params.set('reason', reason);
    // Clear pair filters when setting reason filter
    params.delete('precedingReason');
    params.delete('subsequentReason');
    router.push(`?${params.toString()}`);
  };

  const handlePairClick = (preceding: string, subsequent: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'raw-data');
    params.set('precedingReason', preceding);
    params.set('subsequentReason', subsequent);
    // Clear single reason filter when setting pair filters
    params.delete('reason');
    router.push(`?${params.toString()}`);
  };

  return (
    <Stack spacing={3}>
      {/* Filter Bar */}
      <DowntimeFiltersBar />

      {/* Tabs */}
      <ErrorBoundary resetKeys={[factoryId || '', lineId || '', timeRange || '']}>
        <DowntimeTabs>
          {{
            overview: (
              <ErrorBoundary>
                <Stack spacing={1.5} sx={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  {/* Row 1: Compact KPI Strip */}
                  <CompactKpiStrip
                    items={[
                      { label: 'Total Downtime', value: totalHours.toFixed(1), unit: 'hrs' },
                      { label: 'Events', value: totalEvents },
                      { label: 'Top Cause', value: topCause },
                      { label: 'Mean Duration', value: meanDuration, unit: 'min' },
                    ]}
                  />

                  {/* Row 2: Two columns - Pareto Chart and Top Downtime Reasons */}
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            Downtime by Cause (Pareto)
                          </Typography>
                          <BarCard
                            title=""
                            data={paretoData}
                            allData={paretoData}
                            dataKeys={[{ key: 'hours', color: '#2e7d32', name: 'Hours' }]}
                            xAxisKey="cause"
                            yAxisLabel="Hours"
                            loading={loading}
                            height={200}
                            compact={true}
                            maxItems={10}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <CompactDowntimeReasonsTable
                        reasons={topDowntimeReasons}
                        maxRows={8}
                        onReasonClick={handleReasonClick}
                        loading={loading}
                      />
                    </Grid>
                  </Grid>

                  {/* Row 3: Two columns - Rapid Recurrence Top Preceding Reasons and Top Pairs */}
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={6}>
                      <CompactRapidRecurrenceTable
                        title="Rapid Recurrence – Top Preceding Reasons"
                        reasons={topPrecedingReasons}
                        maxRows={8}
                        onReasonClick={handleReasonClick}
                        loading={rapidRecurrenceLoading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <CompactRapidRecurrenceTable
                        title="Rapid Recurrence – Top Pairs"
                        pairs={topPairs}
                        maxRows={8}
                        onPairClick={handlePairClick}
                        loading={rapidRecurrenceLoading}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </ErrorBoundary>
            ),
            rapidRecurrence: (
              <ErrorBoundary>
                <RapidRecurrenceTab />
              </ErrorBoundary>
            ),
            relationshipMatrix: (
              <ErrorBoundary>
            <Stack spacing={3}>
              {transitionsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!transitionsLoading && transitionsData && (
                <>
                  <Grid container spacing={3}>
                    {/* Main Matrix */}
                    <Grid item xs={12} md={8}>
                      <RelationshipMatrix
                        data={transitionsData}
                        loading={transitionsLoading}
                        grouping={grouping}
                        onGroupingChange={setGrouping}
                        topN={topN}
                        onTopNChange={setTopN}
                        onCellClick={handleCellClick}
                        selectedCell={selectedCell}
                      />
                    </Grid>

                    {/* Side Panel - Top Transitions */}
                    <Grid item xs={12} md={4}>
                      <TransitionsList
                        transitions={transitionsData.transitions}
                        totalTransitions={transitionsData.totalTransitions}
                        onTransitionClick={handleTransitionClick}
                        selectedTransition={selectedCell}
                      />
                    </Grid>
                  </Grid>

                  {/* Details Table */}
                  <TransitionDetailsTable
                    eventPairs={transitionsData.eventPairs}
                    fromValue={selectedCell?.from || null}
                    toValue={selectedCell?.to || null}
                    grouping={grouping}
                  />
                </>
              )}

              {!transitionsLoading && !transitionsData && (
                <Card>
                  <CardContent>
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No transition data available. Try adjusting your filters or time range.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
              </Stack>
            </ErrorBoundary>
          ),
          rawData: (
            <ErrorBoundary>
              <Stack spacing={3}>
                <ProdSection title="Raw Data">
                  <RawEventsTable />
                </ProdSection>
              </Stack>
            </ErrorBoundary>
          ),
        }}
        </DowntimeTabs>
      </ErrorBoundary>
    </Stack>
  );
}

/**
 * Production Trials Downtime Page
 * Wrapped in Suspense to satisfy Next.js requirement for useSearchParams()
 */
export default function ProductionTrialsDowntimePage() {
  return (
    <Suspense fallback={
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Stack>
    }>
      <ProductionTrialsDowntimePageInner />
    </Suspense>
  );
}

