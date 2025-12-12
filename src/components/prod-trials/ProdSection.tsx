'use client';

import { ReactNode } from 'react';
import { Box, Typography, Divider } from '@mui/material';

interface ProdSectionProps {
  title?: string;
  children: ReactNode;
  spacing?: number;
}

/**
 * ProdSection
 * 
 * Production Trials-specific section wrapper with enhanced styling.
 * Provides consistent section dividers and spacing.
 */
export default function ProdSection({ title, children, spacing = 3 }: ProdSectionProps) {
  return (
    <Box
      component="section"
      sx={{
        mb: spacing,
        '&:not(:last-child)': {
          pb: spacing,
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      {title && (
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontWeight: 600,
            color: 'text.primary',
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
}

