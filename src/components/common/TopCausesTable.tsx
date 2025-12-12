import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';

/**
 * Interface for top cause data with statistics
 */
interface TopCause {
  /** Cause name/description */
  cause: string;
  /** Total minutes of downtime for this cause */
  minutes: number;
  /** Percentage of total downtime (0-100) */
  percentage: number;
  /** Cumulative percentage (for Pareto analysis) */
  cumulativePercentage: number;
}

/**
 * Props for TopCausesTable component
 */
interface TopCausesTableProps {
  /** Array of top causes with statistics */
  causes: TopCause[];
  /** Maximum number of rows to display (default: 5) */
  maxRows?: number;
}

/**
 * Table component for displaying top downtime causes with Pareto analysis
 * 
 * Displays a table showing the top downtime causes with:
 * - Total minutes of downtime
 * - Percentage of total downtime
 * - Cumulative percentage (useful for Pareto analysis - 80/20 rule)
 * 
 * The cumulative percentage helps identify which causes account for the majority
 * of downtime, following the Pareto principle.
 * 
 * @param props - Component props
 * @param props.causes - Array of top causes with statistics
 * @param props.maxRows - Maximum number of rows to display (default: 5)
 * 
 * @example
 * ```tsx
 * <TopCausesTable
 *   causes={[
 *     { cause: 'Equipment Failure', minutes: 120, percentage: 40, cumulativePercentage: 40 },
 *     { cause: 'Material Issue', minutes: 60, percentage: 20, cumulativePercentage: 60 }
 *   ]}
 *   maxRows={5}
 * />
 * ```
 */

export default function TopCausesTable({ causes, maxRows = 5 }: TopCausesTableProps) {
  const displayCauses = causes.slice(0, maxRows);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Top {maxRows} Causes
        </Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 1, fontSize: '0.75rem', fontWeight: 600 }}>Cause</TableCell>
            <TableCell align="right" sx={{ py: 1, fontSize: '0.75rem', fontWeight: 600 }}>
              Minutes
            </TableCell>
            <TableCell align="right" sx={{ py: 1, fontSize: '0.75rem', fontWeight: 600 }}>
              % of Downtime
            </TableCell>
            <TableCell align="right" sx={{ py: 1, fontSize: '0.75rem', fontWeight: 600 }}>
              Cumulative %
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayCauses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  No data available
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            displayCauses.map((cause, idx) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ py: 0.75, fontSize: '0.8125rem' }}>{cause.cause}</TableCell>
                <TableCell align="right" sx={{ py: 0.75, fontSize: '0.8125rem' }}>
                  {cause.minutes.toFixed(1)}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75, fontSize: '0.8125rem' }}>
                  {cause.percentage.toFixed(1)}%
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75, fontSize: '0.8125rem' }}>
                  {cause.cumulativePercentage.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

