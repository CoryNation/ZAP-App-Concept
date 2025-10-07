'use client';

import { Card, CardContent, Stack, Typography, Chip, Box } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';

interface AiInsightCardProps {
  title: string;
  bullets: string[];
  badge?: string;
  subtitle?: string;
}

export default function AiInsightCard({ title, bullets, badge, subtitle }: AiInsightCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <InsightsIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
          {badge && (
            <Chip label={badge} size="small" color="secondary" variant="outlined" />
          )}
        </Stack>
        
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {subtitle}
          </Typography>
        )}
        
        <Box component="ul" sx={{ m: 0, pl: 3 }}>
          {bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

