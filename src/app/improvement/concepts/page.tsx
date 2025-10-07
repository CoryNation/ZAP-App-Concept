'use client';

import { Stack, Typography, Card, CardContent } from '@mui/material';

export default function ConceptsPage() {
  return (
    <Stack spacing={2}>
      <Typography variant="h5">Concepts & Proposals</Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Innovation and improvement concepts coming soon...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This page will allow teams to submit and track improvement proposals.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

