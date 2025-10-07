import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface LineCardProps {
  title: string;
  data: any[];
  dataKeys: Array<{ key: string; color: string; name?: string }>;
  xAxisKey: string;
  height?: number;
  loading?: boolean;
  yAxisLabel?: string;
  goalLine?: { value: number; label: string; color?: string };
}

export default function LineCard({
  title,
  data,
  dataKeys,
  xAxisKey,
  height = 400,
  loading,
  yAxisLabel,
  goalLine,
}: LineCardProps) {
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
              <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
                <YAxis label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
                <Tooltip />
                <Legend />
                {goalLine && (
                  <ReferenceLine
                    y={goalLine.value}
                    stroke={goalLine.color || '#b51e27'}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: goalLine.label, position: 'right', fill: goalLine.color || '#b51e27', fontSize: 12 }}
                  />
                )}
                {dataKeys.map((dk) => (
                  <Line
                    key={dk.key}
                    type="monotone"
                    dataKey={dk.key}
                    stroke={dk.color}
                    strokeWidth={2}
                    dot={false}
                    name={dk.name || dk.key}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

