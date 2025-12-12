'use client';

import { Stack, Typography, Card, CardContent, Box } from '@mui/material';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';

export default function ProductionTrialsInspirationPage() {
  return (
    <Stack spacing={3}>
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Inspiration Gallery"
        description="How Might We inspiration gallery for production trials"
      />
      
      <ProdSection title="HMW Inspiration">
        <Card>
          <CardContent>
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Inspiration Gallery
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This page is coming soon. It will display the HMW inspiration gallery for production trials.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </ProdSection>
    </Stack>
  );
}

