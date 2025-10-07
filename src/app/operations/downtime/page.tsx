'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function DowntimePage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Downtime Analysis</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Downtime tracking and analysis coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will help track and analyze production downtime events.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

