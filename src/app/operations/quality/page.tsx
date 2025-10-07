'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function QualityPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Quality Metrics</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Quality monitoring and reporting coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will track quality metrics and issues across production lines.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

