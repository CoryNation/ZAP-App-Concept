import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box } from '@mui/material';

interface TopCause {
  cause: string;
  minutes: number;
  percentage: number;
  cumulativePercentage: number;
}

interface TopCausesTableProps {
  causes: TopCause[];
  maxRows?: number;
}

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

