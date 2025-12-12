'use client';

import { ReactNode } from 'react';
import { Paper, Stack, Box, Typography } from '@mui/material';

interface ProdPageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
}

/**
 * ProdPageHeader
 * 
 * Production Trials-specific page header with green-themed banner styling.
 * Provides a distinct visual identity for Production Trials pages.
 */
export default function ProdPageHeader({ 
  title, 
  subtitle, 
  description, 
  action 
}: ProdPageHeaderProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: 'success.light',
        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12) 0%, rgba(76, 175, 80, 0.06) 100%)',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'success.main',
        mb: 4,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          {subtitle && (
            <Typography 
              variant="overline" 
              sx={{ 
                color: 'success.dark', 
                fontWeight: 600, 
                letterSpacing: 1.2,
                fontSize: '0.75rem',
                display: 'block',
                mb: 0.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
          <Typography 
            variant="h4" 
            sx={{ 
              mt: subtitle ? 0.5 : 0, 
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          {description && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mt: 1.5,
                maxWidth: '70ch',
                lineHeight: 1.6,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
        {action && (
          <Box sx={{ ml: 2 }}>
            {action}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

