import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface KpiTileProps {
  label: string;
  value: string | number;
  delta?: number;
  target?: number;
  unit?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function KpiTile({ label, value, delta, target, unit, size = 'medium' }: KpiTileProps) {
  const hasPositiveDelta = delta !== undefined && delta > 0;
  const hasNegativeDelta = delta !== undefined && delta < 0;

  const valueFontSize = size === 'large' ? 'h3.fontSize' : size === 'small' ? 'h6.fontSize' : 'h4.fontSize';

  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography variant="h4" sx={{ fontSize: valueFontSize, fontWeight: 700, color: 'primary.main' }}>
            {value}
          </Typography>
          {unit && (
            <Typography variant="body2" color="text.secondary">
              {unit}
            </Typography>
          )}
        </Stack>
        
        {(delta !== undefined || target !== undefined) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            {delta !== undefined && (
              <Stack direction="row" alignItems="center" spacing={0.25}>
                {hasPositiveDelta && <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                {hasNegativeDelta && <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                <Typography
                  variant="caption"
                  sx={{
                    color: hasPositiveDelta ? 'success.main' : hasNegativeDelta ? 'error.main' : 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta}%
                </Typography>
              </Stack>
            )}
            {target !== undefined && (
              <Typography variant="caption" color="text.secondary">
                Target: {target}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

