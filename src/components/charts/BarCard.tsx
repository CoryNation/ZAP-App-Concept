import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarCardProps {
  title: string;
  data: any[];
  dataKeys: Array<{ key: string; color: string; name?: string }>;
  xAxisKey: string;
  height?: number;
  loading?: boolean;
  yAxisLabel?: string;
  stacked?: boolean;
}

export default function BarCard({
  title,
  data,
  dataKeys,
  xAxisKey,
  height = 400,
  loading,
  yAxisLabel,
  stacked = false,
}: BarCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {title}
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
            <CircularProgress />
          </Box>
        ) : data.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
            <Typography color="text.secondary">No data available</Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                <YAxis label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {dataKeys.map((dk) => (
                  <Bar
                    key={dk.key}
                    dataKey={dk.key}
                    fill={dk.color}
                    name={dk.name || dk.key}
                    stackId={stacked ? 'stack' : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

