import { Card, CardContent, Box, Skeleton } from '@mui/material';

interface ChartSkeletonProps {
  height?: number;
  showTitle?: boolean;
}

export default function ChartSkeleton({ height = 400, showTitle = true }: ChartSkeletonProps) {
  return (
    <Card>
      <CardContent>
        {showTitle && (
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
        )}
        <Box sx={{ width: '100%', height, position: 'relative' }}>
          {/* Y-axis skeleton */}
          <Skeleton 
            variant="rectangular" 
            width={30} 
            height={height - 40} 
            sx={{ position: 'absolute', left: 0, top: 0, borderRadius: 1 }}
          />
          
          {/* Chart area skeleton with some bars/lines */}
          <Box sx={{ position: 'absolute', left: 40, right: 40, top: 0, bottom: 40, display: 'flex', alignItems: 'flex-end', gap: 2, px: 2 }}>
            {[...Array(6)].map((_, i) => {
              // Use index-based heights to avoid hydration issues
              const heights = [45, 65, 35, 75, 55, 40];
              return (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  width="100%"
                  height={`${heights[i % heights.length]}%`}
                  sx={{ borderRadius: 1 }}
                />
              );
            })}
          </Box>
          
          {/* X-axis skeleton */}
          <Skeleton 
            variant="rectangular" 
            width="80%" 
            height={30} 
            sx={{ position: 'absolute', left: 40, bottom: 0, borderRadius: 1 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

