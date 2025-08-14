'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useScope } from '../lib/scope';
import {
  Stack, Typography, Card, CardContent, Chip, Box, Grid, Paper
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';

export default function Home() {
  const router = useRouter();
  const [scope] = useScope();
  const [email, setEmail] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return alert('Auth error: ' + error.message);
      if (!data.session) return router.replace('/login');
      setEmail(data.session.user.email ?? null);
      setReady(true);
    })();
  }, [router]);

  const scopeText = useMemo(() => {
    if (!scope.factoryId && !scope.lineId) return 'All factories/lines';
    if (scope.factoryId && !scope.lineId) return 'Filtered by Factory';
    return 'Filtered by Factory & Line';
  }, [scope]);

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
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <InsightsIcon color="primary" />
                <Typography variant="h6">AI Insight — Predictive Production (Demo)</Typography>
                <Chip label="Demo" size="small" color="secondary" variant="outlined" />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Next 7 days (units): {forecast}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                <li>Top driver: Planned maintenance on Line A (Sat/Sun)</li>
                <li>Watchlist: Weld spatter recurrence risk on M‑101</li>
                <li>Suggestion: Pre‑stage slit coil for Mon–Wed demand</li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={1}>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Scope</Typography>
              <Typography variant="body1">{scopeText}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">Prototype Notes</Typography>
              <Typography variant="body2">
                This dashboard reflects your current Factory/Line selection in the top bar.
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
