'use client';

import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useDesignVariant } from '@/src/lib/contexts/DesignVariantProvider';

interface ProdTrialsLayoutProps {
  children: ReactNode;
}

/**
 * ProdTrialsLayout
 * 
 * Wrapper component that applies Production Trials design variant styling.
 * Provides enhanced spacing, typography scale, and visual hierarchy.
 */
export default function ProdTrialsLayout({ children }: ProdTrialsLayoutProps) {
  const variant = useDesignVariant();
  const isProdTrials = variant === 'prod_trials';

  if (!isProdTrials) {
    // For POC mode, return children as-is
    return <>{children}</>;
  }

  return (
    <Box
      sx={{
        // Enhanced spacing for Production Trials
        '& > *': {
          mb: 4,
        },
        // Slightly increased card spacing
        '& .MuiCard-root': {
          mb: 3,
        },
        // Enhanced section spacing
        '& > section': {
          mb: 5,
        },
        // Enhanced typography scale for Production Trials
        '& h4': {
          fontSize: '2rem',
          fontWeight: 600,
          lineHeight: 1.3,
        },
        '& h5': {
          fontSize: '1.5rem',
          fontWeight: 600,
          lineHeight: 1.4,
        },
        '& h6': {
          fontSize: '1.25rem',
          fontWeight: 600,
          lineHeight: 1.4,
        },
        minHeight: '100%',
        position: 'relative',
      }}
    >
      {children}
    </Box>
  );
}

