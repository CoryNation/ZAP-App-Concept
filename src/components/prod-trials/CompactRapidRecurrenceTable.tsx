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
  Card,
  CardContent,
} from '@mui/material';

/**
 * Interface for rapid recurrence reason data
 */
interface RapidRecurrenceReason {
  reason: string;
  count: number;
}

/**
 * Interface for rapid recurrence reason pair data
 */
interface RapidRecurrencePair {
  preceding: string;
  subsequent: string;
  count: number;
  avgRuntimeBetween: number;
}

/**
 * Props for CompactRapidRecurrenceTable component
 */
interface CompactRapidRecurrenceTableProps {
  /** Table title displayed in header */
  title: string;
  /** Array of reasons (used when displaying reason list) */
  reasons?: RapidRecurrenceReason[];
  /** Array of reason pairs (used when displaying pair analysis) */
  pairs?: RapidRecurrencePair[];
  /** Maximum number of rows to display (default: 8) */
  maxRows?: number;
  /** Optional click handler for reason rows */
  onReasonClick?: (reason: string) => void;
  /** Optional click handler for pair rows */
  onPairClick?: (preceding: string, subsequent: string) => void;
  /** Loading state indicator */
  loading?: boolean;
}

/**
 * Flexible compact table component for displaying rapid recurrence data
 * 
 * This component can display either:
 * - A list of reasons with occurrence counts
 * - A list of reason pairs (preceding → subsequent) with counts and average runtime
 * 
 * The component automatically detects which mode to use based on which prop is provided.
 * Designed for dashboard overview sections where space is limited.
 * 
 * @param props - Component props
 * @param props.title - Table title displayed in header
 * @param props.reasons - Array of reasons (mutually exclusive with pairs)
 * @param props.pairs - Array of reason pairs (mutually exclusive with reasons)
 * @param props.maxRows - Maximum number of rows to display (default: 8)
 * @param props.onReasonClick - Optional callback when a reason row is clicked
 * @param props.onPairClick - Optional callback when a pair row is clicked
 * @param props.loading - Loading state indicator
 * 
 * @example
 * ```tsx
 * // Display reasons
 * <CompactRapidRecurrenceTable
 *   title="Top Preceding Reasons"
 *   reasons={[
 *     { reason: 'Equipment Failure', count: 15 },
 *     { reason: 'Material Issue', count: 8 }
 *   ]}
 *   onReasonClick={(reason) => handleClick(reason)}
 * />
 * 
 * // Display pairs
 * <CompactRapidRecurrenceTable
 *   title="Top Reason Pairs"
 *   pairs={[
 *     { preceding: 'Equipment Failure', subsequent: 'Material Issue', count: 5, avgRuntimeBetween: 12.5 }
 *   ]}
 *   onPairClick={(prec, sub) => handlePairClick(prec, sub)}
 * />
 * ```
 */

export default function CompactRapidRecurrenceTable({
  title,
  reasons,
  pairs,
  maxRows = 8,
  onReasonClick,
  onPairClick,
  loading = false,
}: CompactRapidRecurrenceTableProps) {
  const isPairsTable = !!pairs;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {isPairsTable ? (
                  <>
                    <TableCell sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                      Preceding → Subsequent
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                      Count
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                      Avg Runtime
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                      Reason
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>
                      Count
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isPairsTable ? 3 : 2}
                    align="center"
                    sx={{ py: 2 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Loading...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : isPairsTable ? (
                pairs && pairs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        No data available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pairs
                    .slice(0, maxRows)
                    .map((pair, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        onClick={() => onPairClick?.(pair.preceding, pair.subsequent)}
                        sx={{
                          cursor: onPairClick ? 'pointer' : 'default',
                          '&:hover': onPairClick ? { backgroundColor: 'action.hover' } : {},
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
                          title={`${pair.preceding} → ${pair.subsequent}`}
                        >
                          {pair.preceding || '—'} → {pair.subsequent || '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                          {pair.count}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem' }}>
                          {pair.avgRuntimeBetween.toFixed(1)} min
                        </TableCell>
                      </TableRow>
                    ))
                )
              ) : reasons && reasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      No data available
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reasons
                  ?.slice(0, maxRows)
                  .map((reason, idx) => (
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
                        {reason.count}
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

