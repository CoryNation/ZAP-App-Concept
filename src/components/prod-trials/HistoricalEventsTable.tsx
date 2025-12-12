'use client';

import { useState, useEffect } from 'react';
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
import {
  SeedMillHistoricalEvent,
  HistoricalEventsResponse,
} from '@/src/lib/services/seedMillHistoricalService';

interface HistoricalEventsTableProps {
  initialMill?: string;
}

export default function HistoricalEventsTable({ initialMill = 'Mill 1' }: HistoricalEventsTableProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalEventsResponse | null>(null);
  const [mills, setMills] = useState<string[]>([]);
  
  // Filters
  const [mill, setMill] = useState(initialMill);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Load available mills
  useEffect(() => {
    async function loadMills() {
      try {
        const response = await fetch('/api/seed-mill-historical?getMills=true');
        const result = await response.json();
        if (result.mills) {
          setMills(result.mills);
        }
      } catch (err) {
        console.error('Error loading mills:', err);
      }
    }
    loadMills();
  }, []);

  // Load default date range on mount or when mill changes (if dates not set)
  useEffect(() => {
    async function loadDefaultRange() {
      // Only load if dates are not set
      if (!startDate || !endDate) {
        try {
          const response = await fetch(`/api/seed-mill-historical?getDefaultRange=true&mill=${mill}`);
          const result = await response.json();
          if (result.startDate && result.endDate) {
            setStartDate(result.startDate.split('T')[0]); // Extract date part
            setEndDate(result.endDate.split('T')[0]);
          }
        } catch (err) {
          console.error('Error loading default date range:', err);
        }
      }
    }
    loadDefaultRange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mill]);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          mill,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + 'T23:59:59').toISOString(), // End of day
          page: (page + 1).toString(),
          pageSize: pageSize.toString(),
        });

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
  }, [mill, startDate, endDate, state, page, pageSize]);

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
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              size="small"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
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

