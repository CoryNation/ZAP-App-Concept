'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Stack,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Slider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ProdKpiTile from '@/src/components/prod-trials/ProdKpiTile';
import ProdSection from '@/src/components/prod-trials/ProdSection';
import LineCard from '@/src/components/charts/LineCard';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { RapidRecurrenceEvent, RapidRecurrenceResponse } from '@/src/app/api/production-trials/downtime/rapid-recurrence/route';

interface EventTimelineItem {
  event_time: string;
  state: string;
  reason: string | null;
  category: string | null;
  equipment: string | null;
  product_spec: string | null;
}

export default function RapidRecurrenceTab() {
  const { factoryId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RapidRecurrenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thresholdMinutes, setThresholdMinutes] = useState(20);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedEvent, setSelectedEvent] = useState<RapidRecurrenceEvent | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<EventTimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Convert timeRange to dates
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }
    
    const rangeDays: Record<string, number> = {
      last24h: 1,
      last7d: 7,
      last30d: 30,
      last60d: 60,
      last90d: 90,
    };
    
    const days = rangeDays[timeRange] || 90;
    const start = new Date(now.getTime() - days * msPerDay);
    
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [timeRange, customStartDate, customEndDate]);

  // Load rapid recurrence data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          thresholdMinutes: thresholdMinutes.toString(),
        });
        
        // Add factory filter if available (need to map factoryId to factory name)
        // For now, we'll skip factory filter as it requires factory lookup
        // You can add this later if needed
        
        const response = await fetch(`/api/production-trials/downtime/rapid-recurrence?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch rapid recurrence data');
        }
        
        const result: RapidRecurrenceResponse = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load rapid recurrence data');
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [startDate, endDate, thresholdMinutes]);

  // Load timeline events when a row is clicked
  const handleRowClick = async (event: RapidRecurrenceEvent) => {
    setSelectedEvent(event);
    setTimelineLoading(true);
    
    try {
      // Fetch events ±30 minutes around the restart time
      const restartTime = new Date(event.restart_time);
      const windowStart = new Date(restartTime.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(restartTime.getTime() + 30 * 60 * 1000);
      
      const params = new URLSearchParams({
        mill: event.mill,
        startDate: windowStart.toISOString(),
        endDate: windowEnd.toISOString(),
      });
      
      const response = await fetch(`/api/seed-mill-historical?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setTimelineEvents(result.events || []);
      }
    } catch (err) {
      console.error('Error loading timeline events:', err);
      setTimelineEvents([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedEvents = useMemo(() => {
    if (!data) return [];
    const start = page * pageSize;
    const end = start + pageSize;
    return data.events.slice(start, end);
  }, [data, page, pageSize]);

  return (
    <Stack spacing={3}>
      {/* Definition and Threshold Control */}
      <ProdSection title="Rapid Recurrence Definition">
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                  Definition
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  "After an initial downtime event, the mill ran for less than {thresholdMinutes} minutes before needing to be shut down again."
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Threshold: Run duration less than {thresholdMinutes} minutes
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Slider
                    value={thresholdMinutes}
                    onChange={(_, value) => setThresholdMinutes(value as number)}
                    min={5}
                    max={60}
                    step={5}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    type="number"
                    value={thresholdMinutes}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 5 && val <= 60) {
                        setThresholdMinutes(val);
                      }
                    }}
                    inputProps={{ min: 5, max: 60, step: 1 }}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </ProdSection>

      {/* Summary KPIs */}
      {!loading && data && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile
              label="Rapid Recurrences"
              value={data.summary.totalRapidRecurrences.toString()}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile
              label="Avg Run Duration"
              value={data.summary.avgRunDuration.toFixed(1)}
              unit="min"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile
              label="Top Restart Cause"
              value={data.summary.topRestartCause || 'N/A'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <ProdKpiTile
              label="Top Stop Cause"
              value={data.summary.topSubsequentStopCause || 'N/A'}
            />
          </Grid>
        </Grid>
      )}

      {/* Monthly Trend Chart */}
      {!loading && data && data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <ProdSection title="Monthly Trend">
          <LineCard
            title="Rapid Recurrence Counts by Month"
            data={data.monthlyTrend}
            dataKeys={[{ key: 'count', color: '#1976d2', name: 'Rapid Recurrences' }]}
            xAxisKey="month"
            height={300}
            loading={loading}
            yAxisLabel="Count"
          />
        </ProdSection>
      )}

      {/* Top Preceding Reasons Table */}
      {!loading && data && data.topPrecedingReasons && data.topPrecedingReasons.length > 0 && (
        <ProdSection title="Top Preceding Downtime Reasons">
          <Card>
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Rank</strong></TableCell>
                      <TableCell><strong>Preceding Downtime Reason</strong></TableCell>
                      <TableCell align="right"><strong>Occurrences</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topPrecedingReasons.map((stat, idx) => (
                      <TableRow key={stat.reason} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{stat.reason}</TableCell>
                        <TableCell align="right">
                          <Chip label={stat.occurrences} size="small" color="primary" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </ProdSection>
      )}

      {/* Top Reason Pairs Table */}
      {!loading && data && data.topReasonPairs && data.topReasonPairs.length > 0 && (
        <ProdSection title="Top Preceding + Subsequent Reason Pairs">
          <Card>
            <CardContent>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Rank</strong></TableCell>
                      <TableCell><strong>Preceding Reason</strong></TableCell>
                      <TableCell><strong>Subsequent Reason</strong></TableCell>
                      <TableCell align="right"><strong>Occurrences</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topReasonPairs.map((pair, idx) => (
                      <TableRow key={`${pair.preceding_reason}-${pair.subsequent_reason}`} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{pair.preceding_reason}</TableCell>
                        <TableCell>{pair.subsequent_reason}</TableCell>
                        <TableCell align="right">
                          <Chip label={pair.occurrences} size="small" color="primary" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </ProdSection>
      )}

      {/* Main Table */}
      <ProdSection title="Rapid Recurrence Events">
        <Card>
          <CardContent>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {error && !loading && (
              <Alert severity="error">{error}</Alert>
            )}

            {!loading && !error && data && data.events.length === 0 && (
              <Alert severity="info">
                No rapid recurrence events found for the selected threshold and time range.
              </Alert>
            )}

            {!loading && !error && data && data.events.length > 0 && (
              <>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Restart Time</strong></TableCell>
                        <TableCell><strong>Restart Reason</strong></TableCell>
                        <TableCell><strong>Subsequent Stop Time</strong></TableCell>
                        <TableCell><strong>Stop Reason</strong></TableCell>
                        <TableCell align="right"><strong>Run Duration</strong></TableCell>
                        <TableCell><strong>Equipment</strong></TableCell>
                        <TableCell><strong>Product Spec</strong></TableCell>
                        <TableCell><strong>Mill</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedEvents.map((event, idx) => (
                        <TableRow
                          key={`${event.restart_event_id}-${event.stop_event_id}`}
                          hover
                          onClick={() => handleRowClick(event)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{formatDateTime(event.restart_time)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap title={event.restart_reason || ''}>
                              {event.restart_reason || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDateTime(event.subsequent_stop_time)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap title={event.subsequent_stop_reason || ''}>
                              {event.subsequent_stop_reason || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${event.run_duration_minutes} min`}
                              size="small"
                              color={event.run_duration_minutes < 10 ? 'error' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{event.equipment || '—'}</TableCell>
                          <TableCell>{event.product_spec || '—'}</TableCell>
                          <TableCell>
                            <Chip label={event.mill} size="small" color="primary" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={data.events.length}
                  page={page}
                  onPageChange={handlePageChange}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={handlePageSizeChange}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </ProdSection>

      {/* Drilldown Dialog with Additional Stats */}
      <Dialog
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Rapid Recurrence Details
          {selectedEvent && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatDateTime(selectedEvent.restart_time)} - {formatDateTime(selectedEvent.subsequent_stop_time)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              {/* Additional Stats Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Additional Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Preceding Downtime Duration
                        </Typography>
                        <Typography variant="h6">
                          {selectedEvent.preceding_downtime_duration_minutes !== null
                            ? `${selectedEvent.preceding_downtime_duration_minutes.toFixed(1)} min`
                            : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Reason: {selectedEvent.preceding_downtime_reason || 'Unknown'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Runtime In Between
                        </Typography>
                        <Typography variant="h6">
                          {selectedEvent.run_duration_minutes.toFixed(1)} min
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          From restart to subsequent stop
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">
                          Subsequent Downtime Duration
                        </Typography>
                        <Typography variant="h6">
                          {selectedEvent.subsequent_downtime_duration_minutes !== null
                            ? `${selectedEvent.subsequent_downtime_duration_minutes.toFixed(1)} min`
                            : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Reason: {selectedEvent.subsequent_stop_reason || 'Unknown'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Event Timeline */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Event Sequence Timeline
                </Typography>
                {timelineLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : timelineEvents.length === 0 ? (
                  <Alert severity="info">No events found in this time window.</Alert>
                ) : (
                  <Stack spacing={1}>
                    {timelineEvents.map((event, idx) => {
                      const isRestart = event.event_time === selectedEvent.restart_time;
                      const isStop = event.event_time === selectedEvent.subsequent_stop_time;
                      
                      return (
                        <Card
                          key={idx}
                          variant="outlined"
                          sx={{
                            borderLeft: `4px solid ${
                              isRestart ? '#4caf50' : isStop ? '#f44336' : event.state === 'DOWNTIME' ? '#f44336' : '#4caf50'
                            }`,
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Chip
                                  label={event.state}
                                  size="small"
                                  color={event.state === 'DOWNTIME' ? 'error' : 'success'}
                                  variant="outlined"
                                />
                                {isRestart && (
                                  <Chip label="RESTART" size="small" color="success" />
                                )}
                                {isStop && (
                                  <Chip label="STOP" size="small" color="error" />
                                )}
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {event.reason || '—'}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="caption" color="text.secondary">
                                  {formatTime(event.event_time)}
                                </Typography>
                                {event.equipment && (
                                  <Chip label={event.equipment} size="small" variant="outlined" />
                                )}
                              </Stack>
                            </Stack>
                            {(event.category || event.product_spec) && (
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                {event.category && (
                                  <Chip label={event.category} size="small" variant="outlined" />
                                )}
                                {event.product_spec && (
                                  <Chip label={event.product_spec} size="small" variant="outlined" />
                                )}
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

