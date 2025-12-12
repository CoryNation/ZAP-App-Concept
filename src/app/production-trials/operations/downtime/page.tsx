'use client';

import { Stack } from '@mui/material';
import ProdPageHeader from '@/src/components/prod-trials/ProdPageHeader';
import ProdSection from '@/src/components/prod-trials/ProdSection';
import HistoricalEventsTable from '@/src/components/prod-trials/HistoricalEventsTable';

export default function ProductionTrialsDowntimePage() {

  return (
    <Stack spacing={3}>
      {/* Production Trials Header */}
      <ProdPageHeader
        subtitle="PRODUCTION TRIALS"
        title="Downtime Dashboard"
        description="Recurring downtime events analysis and data interrogation for production trials"
      />

      {/* Recurring Downtime Dashboard - Main Feature */}
      <ProdSection title="Recurring Downtime Events">
        <HistoricalEventsTable />
      </ProdSection>
    </Stack>
  );
}

