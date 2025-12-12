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
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import {
  SeedMillHistoricalEvent,
  HistoricalEventsResponse,
} from '@/src/lib/services/seedMillHistoricalService';

interface HistoricalEventsTableProps {
  initialMill?: string;
}

// Convert timeRange from global filters to start/end dates
function convertTimeRangeToDates(
  timeRange: string,
  customStartDate: string | null,
  customEndDate: string | null
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  if (timeRange === 'custom' && customStartDate && customEndDate) {
    return {
      startDate: new Date(customStartDate),
      endDate: new Date(customEndDate),
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
    startDate: new Date(now.getTime() - hours * 60 * 60 * 1000),
    endDate: now,
  };
}

export default function HistoricalEventsTable({ initialMill }: HistoricalEventsTableProps) {
  const { factoryId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalEventsResponse | null>(null);
  const [mills, setMills] = useState<string[]>([]);
  
  // Local filters (can be overridden by user)
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
  
  // Use local dates if set, otherwise use global dates
  const effectiveStartDate = localStartDate || globalStartDate.toISOString().split('T')[0];
  const effectiveEndDate = localEndDate || globalEndDate.toISOString().split('T')[0];

  // Load available mills and set default mill
  useEffect(() => {
    async function loadMills() {
      try {
        const response = await fetch('/api/seed-mill-historical?getMills=true');
        const result = await response.json();
        if (result.mills && result.mills.length > 0) {
          setMills(result.mills);
          // Set default mill if not already set
          if (!mill) {
            const defaultMill = initialMill || result.mills[0];
            setMill(defaultMill);
          }
        }
      } catch (err) {
        console.error('Error loading mills:', err);
        // Set a fallback mill
        if (!mill) {
          setMill(initialMill || 'Mill 1');
        }
      }
    }
    loadMills();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load events when filters change
  useEffect(() => {
    async function loadEvents() {
      if (!mill || !effectiveStartDate || !effectiveEndDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          mill,
          startDate: new Date(effectiveStartDate).toISOString(),
          endDate: new Date(effectiveEndDate + 'T23:59:59').toISOString(), // End of day
          page: (page + 1).toString(),
          pageSize: pageSize.toString(),
        });

        // Only add state filter if a specific state is selected (empty = All)
        if (state) {
          params.append('state', state);
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
  }, [mill, effectiveStartDate, effectiveEndDate, state, page, pageSize]);
  
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
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Filters */}
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
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="DOWNTIME">Downtime</MenuItem>
              <MenuItem value="RUNNING">Running</MenuItem>
              <MenuItem value="UNSCHEDULED">Unscheduled</MenuItem>
              <MenuItem value="UNKNOWN">Unknown</MenuItem>
              <MenuItem value="CHANGEOVER">Changeover</MenuItem>
            </TextField>
          </Stack>

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

