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

/**
 * Interface for downtime reason data
 */
interface DowntimeReason {
  reason: string;
  minutes: number;
  events: number;
  avgDuration: number;
}

/**
 * Props for CompactDowntimeReasonsTable component
 */
interface CompactDowntimeReasonsTableProps {
  /** Array of downtime reasons with statistics */
  reasons: DowntimeReason[];
  /** Maximum number of rows to display (default: 8) */
  maxRows?: number;
  /** Optional click handler for reason rows */
  onReasonClick?: (reason: string) => void;
  /** Loading state indicator */
  loading?: boolean;
}

/**
 * Compact table component for displaying top downtime reasons
 * 
 * Displays a compact, scrollable table showing the top downtime reasons with
 * statistics including total minutes, event count, and average duration.
 * Designed for use in dashboard overview sections where space is limited.
 * 
 * @param props - Component props
 * @param props.reasons - Array of downtime reasons with statistics
 * @param props.maxRows - Maximum number of rows to display (default: 8)
 * @param props.onReasonClick - Optional callback when a reason row is clicked
 * @param props.loading - Loading state indicator
 * 
 * @example
 * ```tsx
 * <CompactDowntimeReasonsTable
 *   reasons={[
 *     { reason: 'Equipment Failure', minutes: 120, events: 5, avgDuration: 24 },
 *     { reason: 'Material Issue', minutes: 90, events: 3, avgDuration: 30 }
 *   ]}
 *   maxRows={8}
 *   onReasonClick={(reason) => console.log('Clicked:', reason)}
 *   loading={false}
 * />
 * ```
 */

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

