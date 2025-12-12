'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Drawer,
  Divider,
  Button,
  Collapse,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ViewColumn as ViewColumnIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useGlobalFilters, TimeRange } from '@/src/lib/state/globalFilters';
import {
  SeedMillHistoricalEvent,
  HistoricalEventsResponse,
} from '@/src/lib/services/seedMillHistoricalService';
import { supabase } from '@/lib/supabaseClient';
import { VALID_STATES } from '@/src/lib/constants/stateConstants';

interface RawEventsTableProps {
  initialMill?: string;
}

interface Column {
  id: keyof SeedMillHistoricalEvent | 'actions';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  sortable?: boolean;
}

const COLUMNS: Column[] = [
  { id: 'event_time', label: 'Event Time', minWidth: 150, sortable: true },
  { id: 'state', label: 'State', minWidth: 100, sortable: true },
  { id: 'mill', label: 'Mill', minWidth: 100, sortable: true },
  { id: 'minutes', label: 'Minutes', minWidth: 80, align: 'right', sortable: true },
  { id: 'reason', label: 'Reason', minWidth: 150, sortable: true },
  { id: 'category', label: 'Category', minWidth: 120, sortable: true },
  { id: 'sub_category', label: 'Sub Category', minWidth: 120, sortable: true },
  { id: 'equipment', label: 'Equipment', minWidth: 120, sortable: true },
  { id: 'product_spec', label: 'Product Spec', minWidth: 120, sortable: true },
  { id: 'comment', label: 'Comment', minWidth: 200, sortable: true },
  { id: 'shift', label: 'Shift', minWidth: 80, sortable: true },
  { id: 'fy_week', label: 'FY Week', minWidth: 100, sortable: true },
];

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

export default function RawEventsTable({ initialMill }: RawEventsTableProps) {
  const { factoryId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalEventsResponse | null>(null);
  const [mills, setMills] = useState<string[]>([]);
  const [factoryName, setFactoryName] = useState<string | null>(null);
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  
  // Filters
  const [mill, setMill] = useState<string>('');
  const [localStartDate, setLocalStartDate] = useState<string>('');
  const [localEndDate, setLocalEndDate] = useState<string>('');
  const [state, setState] = useState<string[]>([]);
  const [reason, setReason] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [search, setSearch] = useState<string>('');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  
  // Filter options
  const [reasonOptions, setReasonOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<string[]>([]);
  
  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<string>('event_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['event_time', 'state', 'mill', 'minutes', 'reason', 'category', 'equipment'])
  );
  const [columnChooserOpen, setColumnChooserOpen] = useState(false);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SeedMillHistoricalEvent | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<SeedMillHistoricalEvent[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Export state
  const [exporting, setExporting] = useState(false);
  
  // Convert global timeRange to dates
  const { startDate: globalStartDate, endDate: globalEndDate } = useMemo(
    () => convertTimeRangeToDates(timeRange, customStartDate, customEndDate),
    [timeRange, customStartDate, customEndDate]
  );
  
  // Use local dates if set, otherwise use global dates
  const effectiveStartDate = localStartDate || globalStartDate.toISOString().split('T')[0];
  const effectiveEndDate = localEndDate || globalEndDate.toISOString().split('T')[0];

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

  // Load available mills
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
        } else {
          setMills([]);
        }
      } catch (err) {
        console.error('Error loading mills:', err);
        setMills([]);
      }
    }
    loadMills();
  }, [factoryName]);

  // Load filter options
  useEffect(() => {
    async function loadFilterOptions() {
      if (!effectiveStartDate || !effectiveEndDate) return;
      
      try {
        const params = new URLSearchParams({
          startDate: new Date(effectiveStartDate).toISOString(),
          endDate: new Date(effectiveEndDate + 'T23:59:59').toISOString(),
        });
        if (factoryName) {
          params.append('factory', factoryName);
        }

        const [reasonRes, categoryRes, equipmentRes] = await Promise.all([
          fetch(`/api/seed-mill-historical?getFilterValues=reason&${params.toString()}`),
          fetch(`/api/seed-mill-historical?getFilterValues=category&${params.toString()}`),
          fetch(`/api/seed-mill-historical?getFilterValues=equipment&${params.toString()}`),
        ]);

        const [reasonData, categoryData, equipmentData] = await Promise.all([
          reasonRes.json(),
          categoryRes.json(),
          equipmentRes.json(),
        ]);

        setReasonOptions(reasonData.values || []);
        setCategoryOptions(categoryData.values || []);
        setEquipmentOptions(equipmentData.values || []);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    }
    loadFilterOptions();
  }, [effectiveStartDate, effectiveEndDate, factoryName]);

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
          endDate: new Date(effectiveEndDate + 'T23:59:59').toISOString(),
          page: (page + 1).toString(),
          pageSize: pageSize.toString(),
          sortBy,
          sortOrder,
        });

        if (mill) {
          params.append('mill', mill);
        }

        if (factoryName) {
          params.append('factory', factoryName);
        }

        if (state.length > 0) {
          params.append('state', state.join(','));
        }

        if (reason.length > 0) {
          params.append('reason', reason.join(','));
        }

        if (category.length > 0) {
          params.append('category', category.join(','));
        }

        if (equipment.length > 0) {
          params.append('equipment', equipment.join(','));
        }

        if (search.trim()) {
          params.append('search', search.trim());
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
  }, [
    mill,
    factoryName,
    effectiveStartDate,
    effectiveEndDate,
    state,
    reason,
    category,
    equipment,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);
  
  // Reset local dates when global filters change
  useEffect(() => {
    setLocalStartDate('');
    setLocalEndDate('');
    setPage(0);
  }, [timeRange, customStartDate, customEndDate, factoryId]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const handleRowClick = async (event: SeedMillHistoricalEvent) => {
    setSelectedEvent(event);
    setDrawerOpen(true);
    setLoadingRelated(true);
    
    try {
      const params = new URLSearchParams({
        getRelatedEvents: event.id,
        equipment: event.equipment || '',
        eventTime: event.event_time,
      });
      
      const response = await fetch(`/api/seed-mill-historical?${params.toString()}`);
      const result = await response.json();
      setRelatedEvents(result.events || []);
    } catch (err) {
      console.error('Error loading related events:', err);
      setRelatedEvents([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleExportCSV = useCallback(async () => {
    if (!data || data.total === 0) return;

    // Show export loading state
    setExporting(true);
    
    try {
      // Fetch ALL filtered data (not just current page) for export
      const params = new URLSearchParams({
        startDate: new Date(effectiveStartDate).toISOString(),
        endDate: new Date(effectiveEndDate + 'T23:59:59').toISOString(),
        page: '1',
        pageSize: data.total.toString(), // Fetch all records
        sortBy,
        sortOrder,
      });

      if (mill) {
        params.append('mill', mill);
      }

      if (factoryName) {
        params.append('factory', factoryName);
      }

      if (state.length > 0) {
        params.append('state', state.join(','));
      }

      if (reason.length > 0) {
        params.append('reason', reason.join(','));
      }

      if (category.length > 0) {
        params.append('category', category.join(','));
      }

      if (equipment.length > 0) {
        params.append('equipment', equipment.join(','));
      }

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`/api/seed-mill-historical?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data for export');
      }

      const exportData: HistoricalEventsResponse = await response.json();

      // Get visible column headers
      const headers = COLUMNS
        .filter(col => visibleColumns.has(col.id))
        .map(col => col.label);

      // Build CSV rows
      const rows = exportData.events.map(event => {
        return COLUMNS
          .filter(col => visibleColumns.has(col.id))
          .map(col => {
            const value = event[col.id as keyof SeedMillHistoricalEvent];
            if (value == null) return '';
            if (typeof value === 'string') {
              // Escape quotes and wrap in quotes if contains comma
              return value.includes(',') || value.includes('"') || value.includes('\n')
                ? `"${value.replace(/"/g, '""')}"`
                : value;
            }
            return String(value);
          });
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `raw-events-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV');
      console.error('CSV export error:', err);
    } finally {
      setExporting(false);
    }
  }, [
    data,
    visibleColumns,
    effectiveStartDate,
    effectiveEndDate,
    mill,
    factoryName,
    state,
    reason,
    category,
    equipment,
    search,
    sortBy,
    sortOrder,
  ]);

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

  const visibleColumnsList = COLUMNS.filter(col => visibleColumns.has(col.id));

  return (
    <>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            {/* Filters - Compact Single Row */}
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Search reason, category, equipment, comment..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250, flexGrow: 1 }}
                helperText={search ? `Searching across reason, category, equipment, and comment fields` : undefined}
                FormHelperTextProps={{
                  sx: { 
                    margin: 0,
                    fontSize: '0.7rem',
                    mt: 0.5,
                  },
                }}
              />

              <TextField
                select
                label="State"
                value={state}
                onChange={(e) => {
                  const value = e.target.value;
                  setState(typeof value === 'string' ? value.split(',') : value);
                  setPage(0);
                }}
                size="small"
                SelectProps={{
                  multiple: true,
                  renderValue: (selected) => {
                    const sel = selected as string[];
                    return sel.length === 0 ? 'All' : `${sel.length} selected`;
                  },
                }}
                sx={{ minWidth: 120 }}
              >
                {VALID_STATES.map((stateValue) => (
                  <MenuItem key={stateValue} value={stateValue}>
                    <Checkbox checked={state.includes(stateValue)} />
                    {stateValue.charAt(0) + stateValue.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </TextField>

              <Autocomplete
                multiple
                size="small"
                options={reasonOptions}
                value={reason}
                onChange={(_, newValue) => {
                  setReason(newValue);
                  setPage(0);
                }}
                renderInput={(params) => <TextField {...params} label="Reason" />}
                renderTags={(value, getTagProps) =>
                  value.length > 0 ? (
                    <Chip label={`${value.length} selected`} size="small" {...getTagProps({ index: 0 })} />
                  ) : null
                }
                sx={{ minWidth: 150 }}
              />

              <Autocomplete
                multiple
                size="small"
                options={categoryOptions}
                value={category}
                onChange={(_, newValue) => {
                  setCategory(newValue);
                  setPage(0);
                }}
                renderInput={(params) => <TextField {...params} label="Category" />}
                renderTags={(value, getTagProps) =>
                  value.length > 0 ? (
                    <Chip label={`${value.length} selected`} size="small" {...getTagProps({ index: 0 })} />
                  ) : null
                }
                sx={{ minWidth: 150 }}
              />

              <Autocomplete
                multiple
                size="small"
                options={equipmentOptions}
                value={equipment}
                onChange={(_, newValue) => {
                  setEquipment(newValue);
                  setPage(0);
                }}
                renderInput={(params) => <TextField {...params} label="Equipment" />}
                renderTags={(value, getTagProps) =>
                  value.length > 0 ? (
                    <Chip label={`${value.length} selected`} size="small" {...getTagProps({ index: 0 })} />
                  ) : null
                }
                sx={{ minWidth: 150 }}
              />

              <Button
                size="small"
                startIcon={advancedFiltersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
              >
                Advanced
              </Button>

              <Tooltip title="Column Chooser">
                <IconButton size="small" onClick={() => setColumnChooserOpen(true)}>
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={`Export ${data?.total || 0} filtered records to CSV`}>
                <IconButton 
                  size="small" 
                  onClick={handleExportCSV} 
                  disabled={!data || data.total === 0 || exporting}
                >
                  {exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Advanced Filters (Collapsible) */}
            <Collapse in={advancedFiltersOpen}>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
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
              </Stack>
            </Collapse>

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
                <TableContainer 
                  component={Paper} 
                  variant="outlined"
                  sx={{ 
                    maxHeight: 'calc(100vh - 400px)',
                    position: 'relative',
                    overflow: 'auto',
                  }}
                >
                  <Table 
                    size="small" 
                    stickyHeader
                    sx={{
                      '& .MuiTableCell-root': {
                        py: 0.5, // Dense row spacing
                        px: 1,
                        fontSize: '0.75rem', // Smaller font for dense table
                      },
                      '& .MuiTableHead-root .MuiTableCell-root': {
                        py: 1,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: 'background.paper',
                        zIndex: 10,
                        position: 'sticky',
                        top: 0,
                        borderBottom: 2,
                        borderColor: 'divider',
                      },
                      '& .MuiTableRow-root': {
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {visibleColumnsList.map((column) => (
                          <TableCell
                            key={column.id}
                            align={column.align || 'left'}
                            sx={{
                              backgroundColor: 'background.paper',
                              fontWeight: 600,
                              cursor: column.sortable ? 'pointer' : 'default',
                              userSelect: 'none',
                              '&:hover': column.sortable ? { backgroundColor: 'action.hover' } : {},
                            }}
                            onClick={() => column.sortable && handleSort(column.id)}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              {column.label}
                              {column.sortable && sortBy === column.id && (
                                sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" sx={{ fontSize: '0.875rem' }} /> : <ArrowDownwardIcon fontSize="small" sx={{ fontSize: '0.875rem' }} />
                              )}
                            </Stack>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.events.map((event: SeedMillHistoricalEvent) => (
                        <TableRow
                          key={event.id}
                          hover
                          onClick={() => handleRowClick(event)}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          {visibleColumnsList.map((column) => {
                            const value = event[column.id as keyof SeedMillHistoricalEvent];
                            return (
                              <TableCell 
                                key={column.id} 
                                align={column.align || 'left'}
                                sx={{
                                  py: 0.5,
                                  fontSize: '0.75rem',
                                }}
                              >
                                {column.id === 'event_time' && value ? (
                                  formatDateTime(value as string)
                                ) : column.id === 'state' && value ? (
                                  <Chip
                                    label={value}
                                    size="small"
                                    color={getStateColor(value as string) as any}
                                    variant="outlined"
                                    sx={{ 
                                      height: 20,
                                      fontSize: '0.7rem',
                                      '& .MuiChip-label': {
                                        px: 0.75,
                                      },
                                    }}
                                  />
                                ) : column.id === 'minutes' && value != null ? (
                                  (value as number).toFixed(1)
                                ) : value ? (
                                  String(value)
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            );
                          })}
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
                  rowsPerPageOptions={[25, 50, 100, 200, 500]}
                  labelRowsPerPage="Rows per page:"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`}
                  sx={{
                    '& .MuiTablePagination-toolbar': {
                      minHeight: 52,
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Column Chooser Dialog */}
      <Drawer
        anchor="right"
        open={columnChooserOpen}
        onClose={() => setColumnChooserOpen(false)}
        PaperProps={{ sx: { width: 320, p: 2 } }}
      >
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Column Chooser</Typography>
            <IconButton size="small" onClick={() => setColumnChooserOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider />
          <Stack spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setVisibleColumns(new Set(COLUMNS.map(col => col.id)));
              }}
              sx={{ mb: 1 }}
            >
              Select All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setVisibleColumns(new Set(['event_time', 'state', 'mill', 'minutes', 'reason', 'category', 'equipment']));
              }}
            >
              Reset to Default
            </Button>
          </Stack>
          <Divider />
          <Stack spacing={0.5} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            {COLUMNS.map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    size="small"
                    checked={visibleColumns.has(column.id)}
                    onChange={(e) => {
                      const newVisible = new Set(visibleColumns);
                      if (e.target.checked) {
                        newVisible.add(column.id);
                      } else {
                        newVisible.delete(column.id);
                      }
                      setVisibleColumns(newVisible);
                    }}
                  />
                }
                label={
                  <Typography variant="body2">
                    {column.label}
                    {column.sortable && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        (sortable)
                      </Typography>
                    )}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            ))}
          </Stack>
        </Stack>
      </Drawer>

      {/* Row Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 600 }, p: 3 } }}
      >
        {selectedEvent && (
          <Stack spacing={3} sx={{ height: '100%', overflow: 'auto' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Event Details</Typography>
              <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Divider />

            <Stack spacing={2.5}>
              {COLUMNS.filter(col => col.id !== 'actions').map((column) => {
                const value = selectedEvent[column.id as keyof SeedMillHistoricalEvent];
                return (
                  <Box key={column.id}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
                      {column.label}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {column.id === 'event_time' && value ? (
                        formatDateTime(value as string)
                      ) : column.id === 'state' && value ? (
                        <Chip
                          label={value}
                          size="small"
                          color={getStateColor(value as string) as any}
                          variant="outlined"
                        />
                      ) : column.id === 'minutes' && value != null ? (
                        `${(value as number).toFixed(1)} minutes`
                      ) : value ? (
                        String(value)
                      ) : (
                        <Typography component="span" color="text.secondary" fontStyle="italic">
                          No data
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Related Events (Same Equipment, ±2 hours)
              </Typography>
              {loadingRelated ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : relatedEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No related events found.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {relatedEvents.map((event) => (
                    <Paper 
                      key={event.id} 
                      variant="outlined" 
                      sx={{ 
                        p: 1.5,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => {
                        setSelectedEvent(event);
                        // Reload related events for the new event
                        handleRowClick(event);
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight="medium">
                            {formatDateTime(event.event_time)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.reason || '—'} • {event.category || '—'}
                            {event.equipment && ` • ${event.equipment}`}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {event.minutes != null && (
                            <Chip
                              label={`${event.minutes.toFixed(1)}m`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={event.state}
                            size="small"
                            color={getStateColor(event.state) as any}
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Drawer>
    </>
  );
}

