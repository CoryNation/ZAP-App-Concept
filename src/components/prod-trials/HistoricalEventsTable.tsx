'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Stack,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useGlobalFilters, TimeRange } from '@/src/lib/state/globalFilters';
import {
  SeedMillHistoricalEvent,
  HistoricalEventsResponse,
} from '@/src/lib/services/seedMillHistoricalService';
import { supabase } from '@/lib/supabaseClient';
import { VALID_STATES } from '@/src/lib/constants/stateConstants';

interface HistoricalEventsTableProps {
  initialMill?: string;
}

// Convert timeRange from global filters to start/end dates
function convertTimeRangeToDates(
  timeRange: TimeRange,
  customStartDate: string | null,
  customEndDate: string | null
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  if (timeRange === 'custom' && customStartDate && customEndDate) {
    return {
      startDate: new Date(customStartDate),
      endDate: new Date(customEndDate),
    };
  }
  
  const rangeDays: Record<TimeRange, number> = {
    last24h: 1,
    last7d: 7,
    last30d: 30,
    last60d: 60,
    last90d: 90,
    custom: 0, // Handled above
  };
  
  const days = rangeDays[timeRange] || rangeDays['last90d'];
  const startDate = new Date(now.getTime() - days * msPerDay);
  
  return {
    startDate,
    endDate: now,
  };
}

export default function HistoricalEventsTable({ initialMill }: HistoricalEventsTableProps) {
  const searchParams = useSearchParams();
  const { factoryId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalEventsResponse | null>(null);
  const [mills, setMills] = useState<string[]>([]);
  const [factoryName, setFactoryName] = useState<string | null>(null);
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  
  // Read filters from URL params if available (for shared filter bar), otherwise use local state
  const urlMill = searchParams.get('mill') || '';
  const urlStartDate = searchParams.get('startDate') || '';
  const urlEndDate = searchParams.get('endDate') || '';
  const urlState = searchParams.get('state') || '';
  
  // Local filters (can be overridden by user) - default to "All" (empty string)
  const [mill, setMill] = useState<string>('');
  const [localStartDate, setLocalStartDate] = useState<string>('');
  const [localEndDate, setLocalEndDate] = useState<string>('');
  const [state, setState] = useState<string>(''); // Default to empty = All states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  
  // Convert global timeRange to dates
  const { startDate: globalStartDate, endDate: globalEndDate } = useMemo(
    () => convertTimeRangeToDates(timeRange, customStartDate, customEndDate),
    [timeRange, customStartDate, customEndDate]
  );
  
  // Use URL params if available, then local state, then global dates
  const effectiveMill = urlMill || mill || (initialMill || '');
  const effectiveStartDate = urlStartDate || localStartDate || globalStartDate.toISOString().split('T')[0];
  const effectiveEndDate = urlEndDate || localEndDate || globalEndDate.toISOString().split('T')[0];
  const effectiveState = urlState || state;

  // Load factories to map factoryId to factory name
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
      }
    }
    loadFactories();
  }, []);

  // Get factory name from factoryId
  useEffect(() => {
    if (factoryId) {
      const factory = factories.find(f => f.id === factoryId);
      setFactoryName(factory?.name || null);
    } else {
      setFactoryName(null);
    }
  }, [factoryId, factories]);

  // Load available mills filtered by factory (and reset mill when factory changes)
  useEffect(() => {
    async function loadMills() {
      try {
        const params = new URLSearchParams({ getMills: 'true' });
        if (factoryName) {
          params.append('factory', factoryName);
        }
        const response = await fetch(`/api/seed-mill-historical?${params.toString()}`);
        const result = await response.json();
        if (result.mills && result.mills.length > 0) {
          setMills(result.mills);
          // Reset mill to empty (All) when factory changes, unless it's still in the new list
          if (mill && !result.mills.includes(mill)) {
            setMill('');
          }
        } else {
          setMills([]);
          setMill('');
        }
      } catch (err) {
        console.error('Error loading mills:', err);
        setMills([]);
      }
    }
    loadMills();
  }, [factoryName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load events when filters change
  useEffect(() => {
    async function loadEvents() {
      if (!effectiveStartDate || !effectiveEndDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          startDate: new Date(effectiveStartDate).toISOString(),
          endDate: new Date(effectiveEndDate + 'T23:59:59').toISOString(), // End of day
          page: (page + 1).toString(),
          pageSize: pageSize.toString(),
        });

        // Add mill filter only if a specific mill is selected (empty = All mills)
        if (effectiveMill) {
          params.append('mill', effectiveMill);
        }

        // Add factory filter if factory is selected
        if (factoryName) {
          params.append('factory', factoryName);
        }

        // Only add state filter if a specific state is selected (empty = All)
        if (effectiveState) {
          params.append('state', effectiveState);
        }

        const response = await fetch(`/api/seed-mill-historical?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const result: HistoricalEventsResponse = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load events');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [effectiveMill, factoryName, effectiveStartDate, effectiveEndDate, effectiveState, page, pageSize]);
  
  // Reset local dates when global filters change (so table syncs with global filters)
  useEffect(() => {
    setLocalStartDate('');
    setLocalEndDate('');
    setPage(0); // Reset to first page
  }, [timeRange, customStartDate, customEndDate, factoryId]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
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

  const getStateColor = (state: string) => {
    switch (state.toUpperCase()) {
      case 'DOWNTIME':
        return 'error';
      case 'RUNNING':
        return 'success';
      case 'UNSCHEDULED':
        return 'warning';
      case 'CHANGEOVER':
        return 'info';
      case 'UNKNOWN':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Filters - Only show if URL params are not being used (i.e., not in tabbed layout) */}
          {!urlMill && !urlStartDate && !urlEndDate && !urlState && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Mill"
                value={mill}
                onChange={(e) => {
                  setMill(e.target.value);
                  setPage(0);
                }}
                size="small"
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">(All)</MenuItem>
                {mills.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                type="date"
                label="Start Date"
                value={effectiveStartDate}
                onChange={(e) => {
                  setLocalStartDate(e.target.value);
                  setPage(0);
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                type="date"
                label="End Date"
                value={effectiveEndDate}
                onChange={(e) => {
                  setLocalEndDate(e.target.value);
                  setPage(0);
                }}
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                label="State"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(0);
                }}
                size="small"
                sx={{ minWidth: 140 }}
                SelectProps={{
                  displayEmpty: true,
                }}
              >
                <MenuItem value="">(All)</MenuItem>
                {VALID_STATES.map((stateValue) => (
                  <MenuItem key={stateValue} value={stateValue}>
                    {stateValue.charAt(0) + stateValue.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}

          {/* Loading State */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {error && !loading && (
            <Alert severity="error">{error}</Alert>
          )}

          {/* Empty State */}
          {!loading && !error && data && data.events.length === 0 && (
            <Alert severity="info">No events found for the selected filters.</Alert>
          )}

          {/* Table */}
          {!loading && !error && data && data.events.length > 0 && (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Event Time</strong></TableCell>
                      <TableCell><strong>State</strong></TableCell>
                      <TableCell align="right"><strong>Minutes</strong></TableCell>
                      <TableCell><strong>Reason</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell><strong>Equipment</strong></TableCell>
                      <TableCell><strong>Product Spec</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.events.map((event: SeedMillHistoricalEvent) => (
                      <TableRow key={event.id} hover>
                        <TableCell>{formatDateTime(event.event_time)}</TableCell>
                        <TableCell>
                          <Chip
                            label={event.state}
                            size="small"
                            color={getStateColor(event.state) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {event.minutes !== null ? event.minutes.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" noWrap title={event.reason || ''}>
                            {event.reason || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{event.category || '—'}</TableCell>
                        <TableCell>{event.equipment || '—'}</TableCell>
                        <TableCell>{event.product_spec || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                component="div"
                count={data.total}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={pageSize}
                onRowsPerPageChange={handlePageSizeChange}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

