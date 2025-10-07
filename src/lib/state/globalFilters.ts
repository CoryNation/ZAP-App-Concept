'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimeRange = 'last24h' | 'last7d' | 'last30d' | 'last60d' | 'last90d' | 'custom';

interface GlobalFiltersState {
  factoryId: string | null;
  lineId: string | null;
  timeRange: TimeRange;
  customStartDate: string | null;
  customEndDate: string | null;
  setFactoryId: (factoryId: string | null) => void;
  setLineId: (lineId: string | null) => void;
  setTimeRange: (timeRange: TimeRange) => void;
  setCustomDateRange: (startDate: string | null, endDate: string | null) => void;
  resetFilters: () => void;
}

const initialState = {
  factoryId: null,
  lineId: null,
  timeRange: 'last24h' as TimeRange,
  customStartDate: null,
  customEndDate: null,
};

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      ...initialState,
      setFactoryId: (factoryId) => set({ factoryId, lineId: null }), // Clear line when factory changes
      setLineId: (lineId) => set({ lineId }),
      setTimeRange: (timeRange) => set({ timeRange }),
      setCustomDateRange: (customStartDate, customEndDate) => 
        set({ customStartDate, customEndDate, timeRange: 'custom' }),
      resetFilters: () => set(initialState),
    }),
    {
      name: 'zap-global-filters', // localStorage key
    }
  )
);

