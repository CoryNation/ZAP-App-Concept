'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimeRange = 'last24h' | 'last7d' | 'last30d';

interface GlobalFiltersState {
  factoryId: string | null;
  lineId: string | null;
  timeRange: TimeRange;
  setFactoryId: (factoryId: string | null) => void;
  setLineId: (lineId: string | null) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  resetFilters: () => void;
}

const initialState = {
  factoryId: null,
  lineId: null,
  timeRange: 'last24h' as TimeRange,
};

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      ...initialState,
      setFactoryId: (factoryId) => set({ factoryId, lineId: null }), // Clear line when factory changes
      setLineId: (lineId) => set({ lineId }),
      setTimeRange: (timeRange) => set({ timeRange }),
      resetFilters: () => set(initialState),
    }),
    {
      name: 'zap-global-filters', // localStorage key
    }
  )
);

