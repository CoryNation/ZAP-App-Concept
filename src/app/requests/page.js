'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box, Stack, Grid, Card, CardContent, Typography, Chip, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, Snackbar, FormControl, InputLabel, Select,
  Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  Legend, CartesianGrid, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';

import { supabase } from '@/lib/supabaseClient';

/* =========================================================================
   Status palette & helpers
   ------------------------------------------------------------------------- */

function makeStatusPalette(theme) {
  // Friendly MD3 palette; red reserved for aging items
  return {
    open:        { name: 'Open',        color: '#1e88e5' }, // blue
    in_progress: { name: 'In‑Progress', color: '#43a047' }, // green
    completed:   { name: 'Completed',   color: '#8e24aa' }, // purple
    on_hold:     { name: 'On‑Hold',     color: '#fb8c00' }, // orange
    aging:       { name: 'Aging',       color: '#e53935' }, // red
    paused:      { name: 'Paused',      color: '#fb8c00' }, // alias to on_hold
    hold:        { name: 'On‑Hold',     color: '#fb8c00' }, // alias
    blocked:     { name: 'Blocked',     color: '#fb8c00' }, // alias
  };
}

// Human formatter
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const daysBetween = (a, b = new Date()) => Math.floor((b - new Date(a)) / 86400000);
const pct = (n) => `${(n * 100).toFixed(1)}%`;

/* =========================================================================
   Demo fallbacks (used only when DB has no rows)
   ------------------------------------------------------------------------- */
const demoRows = (() => {
  const today = new Date();
  const mk = (daysAgo, status, priority) => ({
    id: cryptoId(),
    title: `Sample request (${status.replace('_', ' ')})`,
    status,
    priority,
    created_at: new Date(today - daysAgo * 86400000).toISOString(),
  });
  // 5 old open ones for >45 days, plus a mix in last 30 days
  return [
    mk(50, 'open', 'high'),
    mk(50, 'open', 'medium'),
    mk(49, 'open', 'low'),
    mk(48, 'open', 'medium'),
    mk(47, 'open', 'high'),
    mk(10, 'in_progress', 'medium'),
    mk(6, 'completed', 'low'),
    mk(3, 'on_hold', 'high'),
    mk(2, 'open', 'medium'),
    mk(1, 'open', 'low'),
  ];
})();

/* =========================================================================
   Page
   ------------------------------------------------------------------------- */
export default function WorkRequestsPage() {
  const theme = useTheme();
  const STATUS = makeStatusPalette(theme);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // work_requests rows

  // Create work request state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Time filter state
  const [timeFilter, setTimeFilter] = useState('45'); // Default to 45 days
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    machine_id: '',
    line_id: '',
    factory_id: '',
    company_id: '',
    quick_pick_reason: '',
    quick_pick_code: '',
    assigned_technician_name: '',
    estimated_completion_time: '',
    impact_performance: false,
    impact_flow: false,
    impact_quality: false,
    impact_shutdown: false
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: '',
      machine_id: '',
      line_id: '',
      factory_id: '',
      company_id: '',
      quick_pick_reason: '',
      quick_pick_code: '',
      assigned_technician_name: '',
      estimated_completion_time: '',
      impact_performance: false,
      impact_flow: false,
      impact_quality: false,
      impact_shutdown: false
    });
  };

  const handleCreateRequest = async () => {
    if (!formData.title.trim()) {
      setNotification({ open: true, message: 'Please enter a title', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = {
        ...formData,
        status: 'open',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('work_requests')
        .insert([newRequest])
        .select();

      if (error) throw error;

      // Update local state with new request
      setRows(prev => [...prev, data[0]]);
      setCreateDialogOpen(false);
      resetForm();
      setNotification({ open: true, message: 'Work request created successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error creating work request:', error);
      setNotification({ open: true, message: 'Failed to create work request', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Pull last ~60 days to compute 45+ day metric too
      const { data, error } = await supabase
        .from('work_requests')
        .select('id,title,status,priority,created_at,company_id,factory_id,line_id,machine_id')
        .gte('created_at', new Date(Date.now() - 60 * 86400000).toISOString())
        .order('created_at', { ascending: true });

      if (!active) return;
      if (error) {
        // Fallback to demo if query fails (keeps UX smooth for the demo)
        setRows(demoRows);
      } else if (!data || data.length === 0) {
        setRows(demoRows);
      } else {
        setRows(data);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Normalize statuses to something we have colors for
  const normStatus = (s) => {
    if (!s) return 'open';
    const key = String(s).toLowerCase();
    if (STATUS[key]) return key;
    // best-effort mapping
    if (key.includes('progress')) return 'in_progress';
    if (key.includes('complete') || key.includes('close') || key.includes('done')) return 'completed';
    if (key.includes('hold') || key.includes('pause') || key.includes('block')) return 'on_hold';
    return 'open';
  };

  // KPIs for chips
  const metrics = useMemo(() => {
    const totalOpen = rows.filter(r => normStatus(r.status) === 'open').length;
    const highPriority = rows.filter(r => String(r.priority).toLowerCase().startsWith('high')).length;
    const old45 = rows.filter(r => normStatus(r.status) === 'open' && daysBetween(r.created_at) > 45).length;
    return { totalOpen, highPriority, old45 };
  }, [rows]);

  // Chart data: work request demand per day (cumulative state)
  const dailySeries = useMemo(() => {
    let end = new Date(); end.setHours(0,0,0,0);
    let start;
    
    if (timeFilter === 'custom') {
      if (!customDateRange.start || !customDateRange.end) return [];
      start = new Date(customDateRange.start);
      end = new Date(customDateRange.end);
    } else {
      const days = parseInt(timeFilter);
      start = new Date(end - (days - 1) * 86400000);
    }
    
    // Generate array of days
    const days = [];
    for (let d = new Date(start); d <= end; d = new Date(+d + 86400000)) {
      days.push(new Date(d));
    }
    
    // For each day, calculate the state of all work requests
    return days.map(currentDay => {
      const dayKey = currentDay.toISOString().slice(0,10);
      const dayLabel = fmtDate(currentDay);
      
      let open = 0, in_progress = 0, on_hold = 0, completed = 0, aging = 0;
      
      rows.forEach(request => {
        const createdDate = new Date(request.created_at);
        const requestAge = daysBetween(request.created_at, currentDay);
        
        // Only count requests that existed on this day
        if (createdDate <= currentDay) {
          const status = normStatus(request.status);
          
          // Check if this request is aging (>45 days old on this day)
          if (requestAge > 45 && (status === 'open' || status === 'in_progress' || status === 'on_hold')) {
            aging += 1;
          } else {
            // Count by status
            switch (status) {
              case 'open':
                open += 1;
                break;
              case 'in_progress':
                in_progress += 1;
                break;
              case 'on_hold':
                on_hold += 1;
                break;
              case 'completed':
                completed += 1;
                break;
              default:
                open += 1;
            }
          }
        }
      });
      
      return {
        day: dayLabel,
        _key: dayKey,
        open,
        in_progress,
        on_hold,
        completed,
        aging
      };
    });
  }, [rows, timeFilter, customDateRange]);

  // Insights
  const insights = useMemo(() => buildInsights(rows, dailySeries), [rows, dailySeries]);

  const COLORS = {
    grid: theme.palette.divider,
    statuses: {
      open: STATUS.open.color,
      in_progress: STATUS.in_progress.color,
      completed: STATUS.completed.color,
      on_hold: STATUS.on_hold.color,
      aging: STATUS.aging.color,
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">Work Requests</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New Request
        </Button>
      </Stack>

      {/* Chart + KPI chips row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">
                  Requests by Status ({timeFilter === 'custom' ? 'Custom Range' : `Last ${timeFilter} Days`})
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Time Filter</InputLabel>
                    <Select
                      value={timeFilter}
                      label="Time Filter"
                      onChange={(e) => setTimeFilter(e.target.value)}
                    >
                      <MenuItem value="30">30 Days</MenuItem>
                      <MenuItem value="45">45 Days</MenuItem>
                      <MenuItem value="90">90 Days</MenuItem>
                      <MenuItem value="custom">Custom Range</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
              {timeFilter === 'custom' && (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    type="date"
                    label="Start Date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="End Date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              )}
              <Box sx={{ height: 320 }}>
                <ResponsiveContainer>
                  <AreaChart data={dailySeries} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="aging" 
                      stackId="1" 
                      stroke={COLORS.statuses.aging} 
                      fill={COLORS.statuses.aging} 
                      name="Aging" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="on_hold" 
                      stackId="1" 
                      stroke={COLORS.statuses.on_hold} 
                      fill={COLORS.statuses.on_hold} 
                      name="On-Hold" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="in_progress" 
                      stackId="1" 
                      stroke={COLORS.statuses.in_progress} 
                      fill={COLORS.statuses.in_progress} 
                      name="In-Progress" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="open" 
                      stackId="1" 
                      stroke={COLORS.statuses.open} 
                      fill={COLORS.statuses.open} 
                      name="Open" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stackId="2" 
                      stroke={COLORS.statuses.completed} 
                      fill={COLORS.statuses.completed} 
                      name="Completed (Cumulative)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI chips on the right (keep) */}
        <Grid item xs={12} md={3}>
          <Stack spacing={1} sx={{ height: '100%' }}>
            <ChipBox label="Total Open" value={metrics.totalOpen} color={COLORS.statuses.open} />
            <ChipBox label="High Priority" value={metrics.highPriority} color={COLORS.statuses.in_progress} />
            <ChipBox label="> 45 Days Open" value={metrics.old45} color={COLORS.statuses.aging} />
          </Stack>
        </Grid>
      </Grid>

      {/* AI Insights (scrollable) */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>AI‑Driven Insights & Actions</Typography>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{
            maxHeight: 240, // ~5–6 items before scrolling depending on viewport
            overflowY: 'auto',
            pr: 1
          }}>
            <Stack spacing={1.25}>
              {insights.map((it, i) => (
                <InsightRow key={i} title={it.title} action={it.action} tag={it.tag} color={it.color} />
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>All Work Requests</Typography>
          <Divider sx={{ mb: 1 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Days Old</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => {
                const sKey = normStatus(r.status);
                const sCfg = STATUS[sKey] || STATUS.open;
                const days = daysBetween(r.created_at);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>
                      <Chip label={sCfg.name} size="small" sx={{ borderColor: sCfg.color, color: sCfg.color }} variant="outlined" />
                    </TableCell>
                    <TableCell>{String(r.priority ?? '—')}</TableCell>
                    <TableCell>
                      <Tooltip title={`${fmtDate(r.created_at)} → ${days} days`}>
                        <span>{days}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5}>No work requests.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Work Request Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Work Request</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the issue or request"
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the work request"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Mechanical, Electrical, Safety"
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Machine ID"
                  value={formData.machine_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                  placeholder="Machine identifier"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Line ID"
                  value={formData.line_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, line_id: e.target.value }))}
                  placeholder="Production line identifier"
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Factory ID"
                  value={formData.factory_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, factory_id: e.target.value }))}
                  placeholder="Factory identifier"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company ID"
                  value={formData.company_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                  placeholder="Company identifier"
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              label="Quick Pick Reason"
              value={formData.quick_pick_reason}
              onChange={(e) => setFormData(prev => ({ ...prev, quick_pick_reason: e.target.value }))}
              placeholder="Reason for quick resolution if applicable"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Quick Pick Code"
                  value={formData.quick_pick_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, quick_pick_code: e.target.value }))}
                  placeholder="Quick resolution code"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Assigned Technician"
                  value={formData.assigned_technician_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_technician_name: e.target.value }))}
                  placeholder="Technician name"
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              type="datetime-local"
              label="Estimated Completion Time"
              value={formData.estimated_completion_time}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_completion_time: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Impact Areas</Typography>
              <FormGroup>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.impact_performance}
                          onChange={(e) => setFormData(prev => ({ ...prev, impact_performance: e.target.checked }))}
                        />
                      }
                      label="Performance Impact"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.impact_flow}
                          onChange={(e) => setFormData(prev => ({ ...prev, impact_flow: e.target.checked }))}
                        />
                      }
                      label="Flow Impact"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.impact_quality}
                          onChange={(e) => setFormData(prev => ({ ...prev, impact_quality: e.target.checked }))}
                        />
                      }
                      label="Quality Impact"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.impact_shutdown}
                          onChange={(e) => setFormData(prev => ({ ...prev, impact_shutdown: e.target.checked }))}
                        />
                      }
                      label="Shutdown Impact"
                    />
                  </Grid>
                </Grid>
              </FormGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRequest} 
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

/* =========================================================================
   Subcomponents
   ------------------------------------------------------------------------- */

function ChipBox({ label, value, color }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ color, fontWeight: 700 }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function InsightRow({ title, action, tag, color }) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{action}</Typography>
      </Box>
      <Chip label={tag} size="small" variant="outlined" sx={{ borderColor: color, color }} />
    </Stack>
  );
}

/* =========================================================================
   Insight logic (storytelling)
   ------------------------------------------------------------------------- */
function buildInsights(rows, daily) {
  if (!rows) return [];
  const out = [];

  const opens = rows.filter(r => /open/i.test(r.status));
  const old45 = opens.filter(r => daysBetween(r.created_at) > 45).length;
  const high = rows.filter(r => /^high/i.test(r.priority)).length;
  const total = rows.length || 1;

  // 1) Backlog trend (compare last 7d vs prior 7d)
  const last7 = sliceDays(daily, 7);
  const prev7 = sliceDays(daily, 14, 7);
  const sum = (arr, k) => arr.reduce((s, r) => s + (r[k] || 0), 0);
  const openNow = sum(last7, 'open');
  const openPrev = sum(prev7, 'open');
  if (openNow > openPrev) {
    out.push({
      title: `Open inflow rising week‑over‑week (${openPrev} → ${openNow})`,
      action: 'Add capacity: short daily triage, fast‑track obvious fixes, and bundle tasks during planned stops.',
      tag: 'Backlog', color: '#1e88e5',
    });
  } else {
    out.push({
      title: 'Open inflow steady or improving',
      action: 'Sustain cadence. Keep batching similar tasks and pre‑stage materials.',
      tag: 'Backlog', color: '#43a047',
    });
  }

  // 2) Aging
  if (old45 > 0) {
    out.push({
      title: `${old45} request(s) older than 45 days`,
      action: 'Review blockers; if waiting on parts, create an expedite plan or re‑scope to restore partial function.',
      tag: 'Aging', color: '#fb8c00',
    });
  }

  // 3) High priority load
  const shareHigh = high / total;
  out.push({
    title: `${high} high‑priority items (${pct(shareHigh)})`,
    action: 'Protect a daily slot for high priority. Reserve a second slot for preventive tasks to avoid future spikes.',
    tag: 'Priority', color: '#8e24aa',
  });

  // 4) Completion velocity (completed last 7 days)
  const completedNow = sum(last7, 'completed');
  out.push({
    title: `Completed last 7 days: ${completedNow}`,
    action: 'Publish quick wins and before/after metrics to reinforce behaviors. Keep changeover prep (SMED) visible.',
    tag: 'Throughput', color: '#26c6da',
  });

  // 5) On‑hold/paused
  const holdNow = sum(last7, 'on_hold');
  if (holdNow > 0) {
    out.push({
      title: `${holdNow} items placed on hold in last 7 days`,
      action: 'Audit hold reasons; close the loop with parts ETA, vendor touchpoints, or alternative workarounds.',
      tag: 'Flow', color: '#f9a825',
    });
  }

  // 6) First‑hour action
  out.push({
    title: 'Shift‑ready routine',
    action: 'First‑hour: verify lubrication points, scan seam‑welder parameters, check OD gauge trend; raise requests for anomalies.',
    tag: 'Ops', color: '#607d8b',
  });

  return out;
}

function sliceDays(series, n, offset = 0) {
  if (!series || series.length === 0) return [];
  const end = series.length - 1 - offset;
  const start = Math.max(0, end - (n - 1));
  return series.slice(start, end + 1);
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(16).slice(2);
}

