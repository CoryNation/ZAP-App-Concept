import { Card, CardContent, Skeleton, Box } from '@mui/material';

interface KpiSkeletonProps {
  height?: number;
}

export default function KpiSkeleton({ height = 120 }: KpiSkeletonProps) {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="40%" height={32} sx={{ mb: 1, borderRadius: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Skeleton variant="text" width={60} height={16} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
      </CardContent>
    </Card>
  );
}

