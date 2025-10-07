'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function WinsPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Plant Wins</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Recognition and achievements coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will celebrate team successes and notable achievements.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

