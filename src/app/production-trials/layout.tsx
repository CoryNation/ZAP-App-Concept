'use client';

import { ReactNode } from 'react';
import ProdTrialsLayout from '@/src/components/prod-trials/ProdTrialsLayout';

/**
 * Production Trials Route Layout
 * 
 * Wraps all production-trials routes with the ProdTrialsLayout component
 * to apply Production Trials design variant styling.
 */
export default function ProductionTrialsLayout({ children }: { children: ReactNode }) {
  return <ProdTrialsLayout>{children}</ProdTrialsLayout>;
}

