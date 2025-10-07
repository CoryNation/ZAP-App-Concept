'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function LineSpeedPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Line Speed</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Line Speed monitoring and analytics coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will display real-time line speed data with the 700 ft/min goal line.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

