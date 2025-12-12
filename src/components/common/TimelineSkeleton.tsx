import { Card, CardContent, Skeleton, Stack, Box } from '@mui/material';

interface TimelineSkeletonProps {
  count?: number;
}

export default function TimelineSkeleton({ count = 5 }: TimelineSkeletonProps) {
  return (
    <Stack spacing={1}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} variant="outlined">
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                <Skeleton variant="text" width={150} height={20} />
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="text" width={100} height={16} />
                <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

