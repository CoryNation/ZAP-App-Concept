'use client';

import { Stack, Typography, Card, CardContent, Box } from '@mui/material';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';

export default function ProductionTrialsLineSpeedPage() {
  return (
    <Stack spacing={3}>
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Line Speed"
        description="Line speed monitoring and analysis for production trials"
      />
      
      <ProdSection title="Line Speed Metrics">
        <Card>
          <CardContent>
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Line Speed Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This page is coming soon. It will display line speed metrics and trends for production trials.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </ProdSection>
    </Stack>
  );
}

