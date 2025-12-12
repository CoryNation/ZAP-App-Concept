'use client';

import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tooltip,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { DowntimeTransitionsResponse, GroupingDimension } from '@/src/lib/services/downtimeTransitionsService';

interface RelationshipMatrixProps {
  data: DowntimeTransitionsResponse | null;
  loading: boolean;
  grouping: GroupingDimension;
  onGroupingChange: (grouping: GroupingDimension) => void;
  topN: number;
  onTopNChange: (topN: number) => void;
  onCellClick: (from: string, to: string) => void;
  selectedCell: { from: string; to: string } | null;
}

export default function RelationshipMatrix({
  data,
  loading,
  grouping,
  onGroupingChange,
  topN,
  onTopNChange,
  onCellClick,
  selectedCell,
}: RelationshipMatrixProps) {
  // Calculate max value for color scaling
  const maxValue = useMemo(() => {
    if (!data || !data.matrix.data.length) return 1;
    return Math.max(...data.matrix.data.flat());
  }, [data]);

  // Get color intensity for a cell value
  const getCellColor = (value: number) => {
    if (value === 0) return '#f5f5f5';
    const intensity = Math.min(value / maxValue, 1);
    // Use a color scale from light blue to dark red
    const hue = 240 - intensity * 180; // Blue (240) to Red (0)
    const saturation = 50 + intensity * 50; // 50% to 100%
    const lightness = 90 - intensity * 40; // 90% to 50%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading relationship matrix...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.matrix.rows.length === 0 || data.matrix.cols.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No transition data available for the selected filters.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { rows, cols, data: matrixData } = data.matrix;

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Controls */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Grouping Dimension</InputLabel>
              <Select
                value={grouping}
                label="Grouping Dimension"
                onChange={(e) => onGroupingChange(e.target.value as GroupingDimension)}
              >
                <MenuItem value="reason">Reason</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Top N"
              value={topN}
              onChange={(e) => onTopNChange(parseInt(e.target.value) || 12)}
              size="small"
              inputProps={{ min: 5, max: 30 }}
              sx={{ width: 100 }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Click a cell to view event pairs
            </Typography>
          </Stack>

          {/* Matrix */}
          <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '600px' }}>
            <Paper variant="outlined" sx={{ display: 'inline-block', minWidth: '100%' }}>
              <Box sx={{ display: 'table' }}>
                {/* Header row */}
                <Box sx={{ display: 'table-row', bgcolor: 'grey.100' }}>
                  <Box
                    sx={{
                      display: 'table-cell',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      fontWeight: 600,
                      minWidth: 150,
                      position: 'sticky',
                      left: 0,
                      bgcolor: 'grey.100',
                      zIndex: 2,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      From ↓ / To →
                    </Typography>
                  </Box>
                  {cols.map((col, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'table-cell',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        fontWeight: 600,
                        minWidth: 120,
                        textAlign: 'center',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 120,
                        }}
                        title={col}
                      >
                        {col}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Data rows */}
                {rows.map((row, rowIdx) => (
                  <Box key={rowIdx} sx={{ display: 'table-row' }}>
                    {/* Row label */}
                    <Box
                      sx={{
                        display: 'table-cell',
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        fontWeight: 600,
                        minWidth: 150,
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'background.paper',
                        zIndex: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 150,
                        }}
                        title={row}
                      >
                        {row}
                      </Typography>
                    </Box>

                    {/* Cells */}
                    {cols.map((col, colIdx) => {
                      const value = matrixData[rowIdx][colIdx];
                      const isSelected =
                        selectedCell?.from === row && selectedCell?.to === col;
                      return (
                        <Tooltip
                          key={colIdx}
                          title={`${row} → ${col}: ${value} transition${value !== 1 ? 's' : ''}`}
                          arrow
                        >
                          <Box
                            onClick={() => onCellClick(row, col)}
                            sx={{
                              display: 'table-cell',
                              p: 0.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: getCellColor(value),
                              cursor: value > 0 ? 'pointer' : 'default',
                              minWidth: 60,
                              textAlign: 'center',
                              position: 'relative',
                              '&:hover': {
                                opacity: value > 0 ? 0.8 : 1,
                                border: value > 0 ? '2px solid' : undefined,
                                borderColor: value > 0 ? 'primary.main' : undefined,
                              },
                              ...(isSelected && {
                                border: '2px solid',
                                borderColor: 'primary.main',
                                boxShadow: 2,
                              }),
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: value > 0 ? 600 : 400,
                                color: value > 0 ? 'text.primary' : 'text.secondary',
                              }}
                            >
                              {value > 0 ? value : '—'}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Intensity:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                <Box key={intensity} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 20,
                      bgcolor: getCellColor(intensity * maxValue),
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', mt: 0.5 }}>
                    {intensity === 0 ? '0' : intensity === 1 ? 'Max' : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

