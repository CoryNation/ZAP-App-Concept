'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function SettingsPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Settings</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            User and application settings coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will allow you to customize your preferences.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

