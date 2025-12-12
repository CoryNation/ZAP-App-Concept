'use client';

import { Stack, Typography, Card, CardContent, Box } from '@mui/material';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';

export default function ProductionTrialsGreasyTwinPage() {
  return (
    <Stack spacing={3}>
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Greasy Twin"
        description="Bearing monitoring and analysis for production trials"
      />
      
      <ProdSection title="Bearing Monitoring">
        <Card>
          <CardContent>
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Greasy Twin Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This page is coming soon. It will display bearing monitoring data for production trials.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </ProdSection>
    </Stack>
  );
}

