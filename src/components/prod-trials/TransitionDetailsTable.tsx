'use client';

import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import { TransitionEventPair } from '@/src/lib/services/downtimeTransitionsService';

interface TransitionDetailsTableProps {
  eventPairs: TransitionEventPair[];
  fromValue: string | null;
  toValue: string | null;
  grouping: 'reason' | 'category' | 'equipment';
}

export default function TransitionDetailsTable({
  eventPairs,
  fromValue,
  toValue,
  grouping,
}: TransitionDetailsTableProps) {
  // Filter event pairs if specific from/to values are selected
  const filteredPairs = eventPairs.filter((pair) => {
    if (fromValue || toValue) {
      const pairFrom =
        grouping === 'reason'
          ? pair.precedingEvent.reason
          : grouping === 'category'
          ? pair.precedingEvent.category
          : pair.precedingEvent.equipment;
      const pairTo =
        grouping === 'reason'
          ? pair.subsequentEvent.reason
          : grouping === 'category'
          ? pair.subsequentEvent.category
          : pair.subsequentEvent.equipment;

      if (fromValue && pairFrom !== fromValue) return false;
      if (toValue && pairTo !== toValue) return false;
    }
    return true;
  });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return '—';
    if (minutes < 60) return `${minutes.toFixed(1)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (filteredPairs.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Event Pairs
            {fromValue && toValue && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({fromValue} → {toValue})
              </Typography>
            )}
          </Typography>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No event pairs found for the selected transition.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Event Pairs
            </Typography>
            {fromValue && toValue && (
              <Typography variant="body2" color="text.secondary">
                Showing transitions: <strong>{fromValue}</strong> → <strong>{toValue}</strong> (
                {filteredPairs.length} pair{filteredPairs.length !== 1 ? 's' : ''})
              </Typography>
            )}
            {(!fromValue || !toValue) && (
              <Typography variant="body2" color="text.secondary">
                {filteredPairs.length} event pair{filteredPairs.length !== 1 ? 's' : ''} found.
                Click a cell in the matrix to filter.
              </Typography>
            )}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Preceding Event</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Time</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Duration</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Equipment</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Running Period</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Subsequent Event</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Time</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Duration</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Equipment</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPairs.map((pair, idx) => (
                  <TableRow key={idx} hover>
                    {/* Preceding Event */}
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pair.precedingEvent.reason || '(No Reason)'}
                        </Typography>
                        {pair.precedingEvent.category && (
                          <Typography variant="caption" color="text.secondary">
                            {pair.precedingEvent.category}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(pair.precedingEvent.event_time)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatDuration(pair.precedingEvent.minutes)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pair.precedingEvent.equipment || '—'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    {/* Running Period */}
                    <TableCell>
                      <Chip
                        label={formatDuration(pair.runningPeriodMinutes)}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    {/* Subsequent Event */}
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {pair.subsequentEvent.reason || '(No Reason)'}
                        </Typography>
                        {pair.subsequentEvent.category && (
                          <Typography variant="caption" color="text.secondary">
                            {pair.subsequentEvent.category}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(pair.subsequentEvent.event_time)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatDuration(pair.subsequentEvent.minutes)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pair.subsequentEvent.equipment || '—'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}

