import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Button,
} from '@mui/material';
import ExpandIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartSkeleton from './ChartSkeleton';

interface BarCardProps {
  title: string;
  data: any[];
  dataKeys: Array<{ key: string; color: string; name?: string }>;
  xAxisKey: string;
  height?: number;
  loading?: boolean;
  yAxisLabel?: string;
  stacked?: boolean;
  compact?: boolean;
  maxItems?: number; // Maximum items to show in compact mode (default: 10)
  allData?: any[]; // All data to show in expanded modal (if different from data)
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
  compact = false,
  maxItems = 10,
  allData,
}: BarCardProps) {
  const [expanded, setExpanded] = useState(false);
  const chartHeight = compact ? Math.min(Math.max(height, 180), 220) : height;
  
  // Use allData if provided, otherwise use data
  const fullData = allData || data;
  
  // Limit data for compact view
  const displayData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (compact && data.length > maxItems) {
      return data.slice(0, maxItems);
    }
    return data;
  }, [compact, data, maxItems]);
  
  const hasMoreItems = compact && fullData.length > maxItems;

  // Helper function to abbreviate long labels
  const abbreviateLabel = (label: string, maxLength: number = 15): string => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 3) + '...';
  };

  const renderChart = (chartData: any[], chartHeight: number, isCompact: boolean = false) => (
    <>
      {loading ? (
        <ChartSkeleton height={chartHeight} showTitle={false} />
      ) : chartData.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: chartHeight, py: 4 }}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%', height: chartHeight }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: isCompact ? 50 : 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={xAxisKey}
                tick={{ fontSize: isCompact ? 9 : 12 }}
                angle={isCompact ? -45 : 0}
                textAnchor={isCompact ? 'end' : 'middle'}
                height={isCompact ? 70 : undefined}
                tickFormatter={isCompact ? (value) => abbreviateLabel(String(value), 12) : undefined}
              />
              <YAxis
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: isCompact ? 10 : 12 } } : undefined}
                tick={{ fontSize: isCompact ? 10 : 12 }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [value, name]}
                labelFormatter={(label: string) => {
                  // Show full label in tooltip even if abbreviated in chart
                  const fullItem = chartData.find(item => String(item[xAxisKey]) === label || abbreviateLabel(String(item[xAxisKey]), 12) === label);
                  return fullItem ? String(fullItem[xAxisKey]) : label;
                }}
              />
              {!isCompact && <Legend />}
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
    </>
  );

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: compact ? 1 : 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant={compact ? 'body2' : 'subtitle1'} sx={{ fontWeight: compact ? 600 : 500 }}>
                {title}
              </Typography>
              {hasMoreItems && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  (Top {maxItems} of {fullData.length})
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {hasMoreItems && (
                <Button
                  size="small"
                  onClick={() => setExpanded(true)}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
                >
                  View all
                </Button>
              )}
              <IconButton
                size="small"
                onClick={() => setExpanded(true)}
                sx={{ ml: hasMoreItems ? 0 : 1 }}
                aria-label="Expand chart"
              >
                <ExpandIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          {renderChart(displayData, chartHeight, compact)}
        </CardContent>
      </Card>

      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {title}
              {hasMoreItems && ` (All ${fullData.length} items)`}
            </Typography>
            <IconButton onClick={() => setExpanded(false)} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', height: 'calc(90vh - 120px)', minHeight: 400 }}>
            <ResponsiveContainer>
              <BarChart data={fullData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={xAxisKey}
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis
                  label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [value, name]}
                />
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
        </DialogContent>
      </Dialog>
    </>
  );
}
