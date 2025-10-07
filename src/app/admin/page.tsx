'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function AdminPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Admin</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Administrative functions coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will provide administrative controls and data management.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

