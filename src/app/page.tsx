'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import {
  Stack, Typography, Grid, Paper, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WorkIcon from '@mui/icons-material/Work';
import AiInsightCard from '@/src/components/common/AiInsightCard';

export default function Home() {
  const router = useRouter();
  const { factoryId, lineId, timeRange } = useGlobalFilters();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  
  // Factory and line names for display
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  const [lines, setLines] = useState<Array<{ id: string; name: string; factory_id: string }>>([]);
  
  // Role & Responsibilities state
  const [userRole, setUserRole] = useState('Global Operations Manager');
  const [userResponsibilities, setUserResponsibilities] = useState(
    'Leading and managing all aspects of plant operations across the portfolio and identify opportunities and mitigate performance issues.'
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tempResponsibilities, setTempResponsibilities] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return alert('Auth error: ' + error.message);
      if (!data.session) return router.replace('/login');
      setEmail(data.session.user.email ?? null);
      
      // Load factories and lines for scope display
      const { data: fs } = await supabase
        .from('factories')
        .select('id,name')
        .order('name');
      setFactories(fs || []);
      
      const { data: ls } = await supabase
        .from('lines')
        .select('id,name,factory_id')
        .order('name');
      setLines(ls || []);
      
      setReady(true);
    })();
  }, [router]);

  const scopeText = useMemo(() => {
    const parts: string[] = [];
    
    if (factoryId) {
      const factory = factories.find(f => f.id === factoryId);
      parts.push(`Factory: ${factory?.name || 'Unknown'}`);
    } else {
      parts.push('All Factories');
    }
    
    if (lineId) {
      const line = lines.find(l => l.id === lineId);
      parts.push(`Line: ${line?.name || 'Unknown'}`);
    } else if (factoryId) {
      parts.push('All Lines');
    }
    
    return parts.join(' • ');
  }, [factoryId, lineId, factories, lines]);

  const timeRangeText = useMemo(() => {
    switch (timeRange) {
      case 'last24h':
        return 'Last 24 Hours';
      case 'last7d':
        return 'Last 7 Days';
      case 'last30d':
        return 'Last 30 Days';
      default:
        return timeRange;
    }
  }, [timeRange]);

  // Role & Responsibilities handlers
  const handleEditClick = () => {
    setTempResponsibilities(userResponsibilities);
    setEditDialogOpen(true);
  };

  const handleSaveResponsibilities = () => {
    setUserResponsibilities(tempResponsibilities);
    setEditDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
  };

  if (!ready) return <div>Loading…</div>;

  const next7 = [
    { day: 'Thu', units: 1180 },
    { day: 'Fri', units: 1205 },
    { day: 'Sat', units: 990 },
    { day: 'Sun', units: 1010 },
    { day: 'Mon', units: 1230 },
    { day: 'Tue', units: 1265 },
    { day: 'Wed', units: 1275 }
  ];
  const forecast = next7.map(x => x.units).join(' • ');

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Welcome, {email}</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <AiInsightCard
            title="AI Insight — Predictive Production"
            badge="Demo"
            subtitle={`Next 7 days (units): ${forecast}`}
            bullets={[
              'Top driver: Planned maintenance on Line A (Sat/Sun)',
              'Watchlist: Weld spatter recurrence risk on M‑101',
              'Suggestion: Pre‑stage slit coil for Mon–Wed demand'
            ]}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={1}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Current Scope
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                {scopeText}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time Range: {timeRangeText}
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Prototype Notes
              </Typography>
              <Typography variant="body2">
                This dashboard reflects your current Factory/Line/Time selection in the top bar.
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Role & Responsibilities
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  Edit
                </Button>
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                {userRole}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {userResponsibilities}
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Edit Responsibilities Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Responsibilities</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Customize your responsibilities to help AI tailor insights specific to your role and remit.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={tempResponsibilities}
            onChange={(e) => setTempResponsibilities(e.target.value)}
            placeholder="Describe your key responsibilities and areas of focus..."
            variant="outlined"
          />
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            Note: Your role and plant/line assignments are managed by administrators.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button onClick={handleSaveResponsibilities} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

