'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';

interface DowntimeReason {
  reason: string;
  minutes: number;
  events: number;
  avgDuration: number;
}

interface CompactDowntimeReasonsTableProps {
  reasons: DowntimeReason[];
  maxRows?: number;
  onReasonClick?: (reason: string) => void;
  loading?: boolean;
}

export default function CompactDowntimeReasonsTable({
  reasons,
  maxRows = 8,
  onReasonClick,
  loading = false,
}: CompactDowntimeReasonsTableProps) {
  const displayReasons = reasons.slice(0, maxRows);

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Top Downtime Reasons
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600, width: '40%' }}>
                  Reason
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                  Minutes
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                  Events
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                  Avg Duration
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Loading...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : displayReasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      No data available
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayReasons.map((reason, idx) => (
                  <TableRow
                    key={idx}
                    hover
                    onClick={() => onReasonClick?.(reason.reason)}
                    sx={{
                      cursor: onReasonClick ? 'pointer' : 'default',
                      '&:hover': onReasonClick ? { backgroundColor: 'action.hover' } : {},
                    }}
                  >
                    <TableCell
                      sx={{
                        py: 0.5,
                        fontSize: '0.75rem',
                        maxWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={reason.reason}
                    >
                      {reason.reason || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                      {reason.minutes.toFixed(1)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                      {reason.events}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                      {reason.avgDuration.toFixed(1)} min
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

