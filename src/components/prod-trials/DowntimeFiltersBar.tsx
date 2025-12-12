'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Stack, TextField, MenuItem, Box, Button, Typography } from '@mui/material';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useGlobalFilters, TimeRange } from '@/src/lib/state/globalFilters';
import { supabase } from '@/lib/supabaseClient';
import { VALID_STATES } from '@/src/lib/constants/stateConstants';

interface DowntimeFiltersBarProps {
  onFiltersChange?: (filters: {
    mill: string;
    startDate: string;
    endDate: string;
    state: string;
  }) => void;
}

// Convert timeRange from global filters to start/end dates
function convertTimeRangeToDates(
  timeRange: TimeRange,
  customStartDate: string | null,
  customEndDate: string | null
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  if (timeRange === 'custom' && customStartDate && customEndDate) {
    return {
      startDate: new Date(customStartDate),
      endDate: new Date(customEndDate),
    };
  }
  
  const rangeDays: Record<TimeRange, number> = {
    last24h: 1,
    last7d: 7,
    last30d: 30,
    last60d: 60,
    last90d: 90,
    custom: 0, // Handled above
  };
  
  const days = rangeDays[timeRange] || rangeDays['last90d'];
  const startDate = new Date(now.getTime() - days * msPerDay);
  
  return {
    startDate,
    endDate: now,
  };
}

export default function DowntimeFiltersBar({ onFiltersChange }: DowntimeFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { factoryId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
  
  // Get filters from URL params, with fallback to global filters
  const urlMill = searchParams.get('mill') || '';
  const urlStartDate = searchParams.get('startDate') || '';
  const urlEndDate = searchParams.get('endDate') || '';
  const urlState = searchParams.get('state') || '';
  
  const [mills, setMills] = useState<string[]>([]);
  const [factoryName, setFactoryName] = useState<string | null>(null);
  const [factories, setFactories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingMills, setLoadingMills] = useState(false);
  const hasSetDefaultMill = useRef(false);
  
  // Convert global timeRange to dates
  const { startDate: globalStartDate, endDate: globalEndDate } = useMemo(
    () => convertTimeRangeToDates(timeRange, customStartDate, customEndDate),
    [timeRange, customStartDate, customEndDate]
  );
  
  // Use URL dates if set, otherwise use global dates
  const effectiveStartDate = urlStartDate || globalStartDate.toISOString().split('T')[0];
  const effectiveEndDate = urlEndDate || globalEndDate.toISOString().split('T')[0];
  
  // Use URL mill/state if set, otherwise use empty (All)
  const effectiveMill = urlMill;
  const effectiveState = urlState;
  
  // Load factories to map factoryId to factory name
  useEffect(() => {
    async function loadFactories() {
      try {
        const { data: fs } = await supabase
          .from('factories')
          .select('id,name')
          .order('name');
        setFactories(fs || []);
      } catch (err) {
        console.error('Error loading factories:', err);
      }
    }
    loadFactories();
  }, []);
  
  // Get factory name from factoryId
  useEffect(() => {
    if (factoryId) {
      const factory = factories.find(f => f.id === factoryId);
      setFactoryName(factory?.name || null);
    } else {
      setFactoryName(null);
    }
  }, [factoryId, factories]);
  
  // Reset date range to default
  const resetDateRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    const tab = searchParams.get('tab') || 'overview';
    params.delete('startDate');
    params.delete('endDate');
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`);
    hasSetDefaultMill.current = false; // Reset flag to allow default mill to be set again
  };

  // Update URL params when filters change
  const updateFilters = useCallback((updates: {
    mill?: string;
    startDate?: string;
    endDate?: string;
    state?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Preserve tab param
    const tab = searchParams.get('tab') || 'overview';
    
    if (updates.mill !== undefined) {
      if (updates.mill) {
        params.set('mill', updates.mill);
      } else {
        params.delete('mill');
      }
    }
    
    if (updates.startDate !== undefined) {
      if (updates.startDate) {
        params.set('startDate', updates.startDate);
      } else {
        params.delete('startDate');
      }
    }
    
    if (updates.endDate !== undefined) {
      if (updates.endDate) {
        params.set('endDate', updates.endDate);
      } else {
        params.delete('endDate');
      }
    }
    
    if (updates.state !== undefined) {
      if (updates.state) {
        params.set('state', updates.state);
      } else {
        params.delete('state');
      }
    }
    
    // Ensure tab param is preserved
    params.set('tab', tab);
    
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);
  
  // Load available mills filtered by factory and date range
  useEffect(() => {
    async function loadMills() {
      setLoadingMills(true);
      try {
        const params = new URLSearchParams({ getMills: 'true' });
        if (factoryName) {
          params.append('factory', factoryName);
        }
        if (effectiveStartDate) {
          params.append('startDate', new Date(effectiveStartDate).toISOString());
        }
        if (effectiveEndDate) {
          params.append('endDate', new Date(effectiveEndDate + 'T23:59:59').toISOString());
        }
        const response = await fetch(`/api/seed-mill-historical?${params.toString()}`);
        const result = await response.json();
        const loadedMills = result.mills || [];
        setMills(loadedMills);
        
        // Handle mill selection based on available mills
        if (loadedMills.length > 0) {
          // If current mill is not in the new list, reset to first available mill
          if (effectiveMill && !loadedMills.includes(effectiveMill)) {
            const defaultMill = loadedMills[0];
            updateFilters({ mill: defaultMill });
            hasSetDefaultMill.current = true;
          } 
          // Set default mill if no mill is selected and mills are available
          else if (!effectiveMill && !hasSetDefaultMill.current) {
            const defaultMill = loadedMills[0];
            updateFilters({ mill: defaultMill });
            hasSetDefaultMill.current = true;
          }
        } else {
          // Reset default mill flag when no mills available
          hasSetDefaultMill.current = false;
        }
      } catch (err) {
        console.error('Error loading mills:', err);
        setMills([]);
      } finally {
        setLoadingMills(false);
      }
    }
    loadMills();
  }, [factoryName, effectiveStartDate, effectiveEndDate, effectiveMill, updateFilters]);
  
  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({
        mill: effectiveMill,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        state: effectiveState,
      });
    }
  }, [effectiveMill, effectiveStartDate, effectiveEndDate, effectiveState, onFiltersChange]);
  
  // Show empty state if no mills available for the date range
  const showEmptyState = !loadingMills && mills.length === 0;

  return (
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      spacing={2}
      sx={{ mb: 3 }}
    >
      {showEmptyState ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 1,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            minWidth: { xs: '100%', sm: 300 },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No mills available for the selected date range.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={resetDateRange}
          >
            Reset Date Range
          </Button>
        </Box>
      ) : (
        <TextField
          select
          label="Mill"
          value={effectiveMill || ''}
          onChange={(e) => updateFilters({ mill: e.target.value })}
          size="small"
          sx={{ minWidth: 120 }}
          disabled={loadingMills || mills.length === 0}
          SelectProps={{
            displayEmpty: true,
          }}
        >
          {mills.length === 0 ? (
            <MenuItem value="" disabled>
              {loadingMills ? 'Loading...' : 'No mills available'}
            </MenuItem>
          ) : (
            <>
              <MenuItem value="">(All)</MenuItem>
              {mills.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </>
          )}
        </TextField>
      )}

      <TextField
        type="date"
        label="Start Date"
        value={effectiveStartDate}
        onChange={(e) => updateFilters({ startDate: e.target.value })}
        size="small"
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        type="date"
        label="End Date"
        value={effectiveEndDate}
        onChange={(e) => updateFilters({ endDate: e.target.value })}
        size="small"
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        select
        label="State"
        value={effectiveState}
        onChange={(e) => updateFilters({ state: e.target.value })}
        size="small"
        sx={{ minWidth: 140 }}
        SelectProps={{
          displayEmpty: true,
        }}
      >
        <MenuItem value="">(All)</MenuItem>
        {VALID_STATES.map((stateValue) => (
          <MenuItem key={stateValue} value={stateValue}>
            {stateValue.charAt(0) + stateValue.slice(1).toLowerCase()}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

