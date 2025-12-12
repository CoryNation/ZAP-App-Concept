'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAppMode } from './ModeProvider';
import { isProductionTrialsRoute } from '../utils/modeRouter';
import { usePathname } from 'next/navigation';

export type DesignVariant = 'poc' | 'prod_trials';

interface DesignVariantContextType {
  variant: DesignVariant;
}

const DesignVariantContext = createContext<DesignVariantContextType | undefined>(undefined);

interface DesignVariantProviderProps {
  children: ReactNode;
}

/**
 * DesignVariantProvider
 * 
 * Determines the design variant based on:
 * 1. Current route (if in /production-trials/*, use prod_trials)
 * 2. App mode (if mode is prod_trials, use prod_trials)
 * 3. Default to poc
 */
export function DesignVariantProvider({ children }: DesignVariantProviderProps) {
  const pathname = usePathname();
  const { mode } = useAppMode();
  
  // Check if we're in a production trials route
  const isProdTrialsRoute = isProductionTrialsRoute(pathname);
  
  // Determine variant: route takes precedence, then mode, then default to poc
  const variant: DesignVariant = isProdTrialsRoute || mode === 'prod_trials' 
    ? 'prod_trials' 
    : 'poc';

  return (
    <DesignVariantContext.Provider value={{ variant }}>
      {children}
    </DesignVariantContext.Provider>
  );
}

/**
 * Hook to get the current design variant
 */
export function useDesignVariant(): DesignVariant {
  const context = useContext(DesignVariantContext);
  if (context === undefined) {
    // Default to poc if provider is not available (shouldn't happen in normal flow)
    return 'poc';
  }
  return context.variant;
}

