'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type AppMode = 'poc' | 'prod_trials';

const MODE_STORAGE_KEY = 'zap_app_mode';
const MODE_QUERY_PARAM = 'mode';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

// Provide a default context value for SSR/SSG
const defaultModeContext: ModeContextType = {
  mode: 'poc',
  setMode: () => {
    // No-op during SSR/SSG
  },
};

const ModeContext = createContext<ModeContextType>(defaultModeContext);

function getValidMode(value: string | null): AppMode {
  if (value === 'poc' || value === 'prod_trials') {
    return value;
  }
  return 'poc'; // default
}

function getModeFromURL(): AppMode | null {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get(MODE_QUERY_PARAM);
    if (urlMode) {
      return getValidMode(urlMode);
    }
  }
  return null;
}

function getModeFromStorage(): AppMode | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored) {
      return getValidMode(stored);
    }
  }
  return null;
}

function getInitialMode(): AppMode {
  // Check URL first (URL wins)
  const urlMode = getModeFromURL();
  if (urlMode) return urlMode;
  
  // Fall back to localStorage
  const storedMode = getModeFromStorage();
  if (storedMode) return storedMode;
  
  return 'poc'; // default
}

interface ModeProviderInnerProps {
  children: ReactNode;
}

function ModeProviderInner({ children }: ModeProviderInnerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setModeState] = useState<AppMode>(() => {
    // On initial render, check URL param first
    const urlMode = searchParams.get(MODE_QUERY_PARAM);
    if (urlMode) {
      return getValidMode(urlMode);
    }
    
    // Then check localStorage
    const storedMode = getModeFromStorage();
    if (storedMode) return storedMode;
    
    return 'poc';
  });

  // Sync with URL param changes (e.g., browser back/forward)
  useEffect(() => {
    const urlMode = searchParams.get(MODE_QUERY_PARAM);
    if (urlMode) {
      const validMode = getValidMode(urlMode);
      if (validMode !== mode) {
        setModeState(validMode);
        // Update localStorage to match URL
        if (typeof window !== 'undefined') {
          localStorage.setItem(MODE_STORAGE_KEY, validMode);
        }
      }
    }
  }, [searchParams, mode]);

  const setMode = useCallback((newMode: AppMode) => {
    const validMode = getValidMode(newMode);
    setModeState(validMode);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(MODE_STORAGE_KEY, validMode);
    }
    
    // Update URL query param
    const params = new URLSearchParams(searchParams.toString());
    params.set(MODE_QUERY_PARAM, validMode);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

interface ModeProviderProps {
  children: ReactNode;
}

export function ModeProvider({ children }: ModeProviderProps) {
  return (
    <Suspense fallback={<>{children}</>}>
      <ModeProviderInner>{children}</ModeProviderInner>
    </Suspense>
  );
}

export function useAppMode(): ModeContextType {
  const context = useContext(ModeContext);
  // Context will always have a value (either from provider or default)
  return context;
}

