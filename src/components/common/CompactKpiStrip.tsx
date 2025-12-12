import { Box, Stack, Typography, useTheme, useMediaQuery } from '@mui/material';

/**
 * Interface for a single KPI item
 */
interface CompactKpiItem {
  /** Display label for the KPI */
  label: string;
  /** KPI value (can be string or number) */
  value: string | number;
  /** Optional unit to display after the value (e.g., 'hrs', 'min') */
  unit?: string;
}

/**
 * Props for CompactKpiStrip component
 */
interface CompactKpiStripProps {
  /** Array of KPI items to display */
  items: CompactKpiItem[];
}

/**
 * Compact horizontal KPI display component
 * 
 * Displays multiple KPIs in a horizontal strip layout. Automatically adjusts
 * to a vertical stack layout on mobile devices for better responsiveness.
 * Each KPI shows a label, value, and optional unit.
 * 
 * @param props - Component props
 * @param props.items - Array of KPI items to display
 * 
 * @example
 * ```tsx
 * <CompactKpiStrip
 *   items={[
 *     { label: 'Total Downtime', value: 45.5, unit: 'hrs' },
 *     { label: 'Events', value: 23 },
 *     { label: 'Top Cause', value: 'Equipment Failure' },
 *     { label: 'Mean Duration', value: 118.7, unit: 'min' }
 *   ]}
 * />
 * ```
 */

export default function CompactKpiStrip({ items }: CompactKpiStripProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 2,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {items.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            flex: isMobile ? '1 1 100%' : '1 1 auto',
            minWidth: isMobile ? '100%' : '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMobile ? 'flex-start' : 'center',
            ...(idx < items.length - 1 && !isMobile && {
              borderRight: '1px solid',
              borderColor: 'divider',
              pr: 2,
              mr: 0,
            }),
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: '0.75rem',
              mb: 0.25,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {item.label}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'primary.main',
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </Typography>
            {item.unit && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem', ml: 0.25 }}
              >
                {item.unit}
              </Typography>
            )}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

