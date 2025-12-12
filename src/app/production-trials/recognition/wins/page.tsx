'use client';

import { Stack, Typography, Card, CardContent, Box } from '@mui/material';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';

export default function ProductionTrialsWinsPage() {
  return (
    <Stack spacing={3}>
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Plant Wins"
        description="Recognition and celebration of plant wins for production trials"
      />
      
      <ProdSection title="Recognition Wins">
        <Card>
          <CardContent>
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Plant Wins
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                This page is coming soon. It will display recognition and celebration of plant wins for production trials.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </ProdSection>
    </Stack>
  );
}

