import { Box, Stack, Typography, useTheme, useMediaQuery } from '@mui/material';

interface CompactKpiItem {
  label: string;
  value: string | number;
  unit?: string;
}

interface CompactKpiStripProps {
  items: CompactKpiItem[];
}

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

