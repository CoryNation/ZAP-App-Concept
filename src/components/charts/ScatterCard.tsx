import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis, Cell, ReferenceLine } from 'recharts';

interface ScatterCardProps {
  title: string;
  data: any[];
  xKey: string;
  yKey: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
  loading?: boolean;
  colorKey?: string;
  colors?: Record<string, string>;
  referenceLines?: Array<{ axis: 'x' | 'y'; value: number; label?: string }>;
}

export default function ScatterCard({
  title,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  height = 400,
  loading,
  colorKey,
  colors = {},
}: ScatterCardProps) {
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
          <Box sx={{ width: '100%', height, display: 'flex' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey={xKey} name={xLabel || xKey} label={{ value: xLabel, position: 'bottom', offset: 20 }} />
                <YAxis type="number" dataKey={yKey} name={yLabel || yKey} label={{ value: yLabel, angle: -90, position: 'left', offset: 10 }} />
                <ZAxis range={[100, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter name={title} data={data}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colorKey && entry[colorKey] ? colors[entry[colorKey]] || '#1976d2' : '#1976d2'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

