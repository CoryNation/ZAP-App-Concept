'use client';

import { Stack, Typography, Card, CardContent, Box } from '@mui/material';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';

export default function ProductionTrialsPlantPerformancePage() {
  return (
    <Stack spacing={3}>
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Plant Performance"
        description="Comprehensive plant performance dashboard for production trials"
      />
      
      <ProdSection title="Performance Metrics">
        <Card>
          <CardContent>
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Plant Performance Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This page is coming soon. It will display comprehensive plant performance metrics for production trials.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </ProdSection>
    </Stack>
  );
}

