/**
 * Service for seed mill historical events data
 * Reads from seed_mill_events_historical Supabase table
 */

import { supabase } from '@/lib/supabaseClient';

export interface SeedMillHistoricalEvent {
  id: string;
  factory: string;
  mill: string;
  event_time: string;
  shift: string | null;
  fy_week: string | null;
  duration_text: string | null;
  minutes: number | null;
  state: string;
  reason: string | null;
  category: string | null;
  sub_category: string | null;
  equipment: string | null;
  comment: string | null;
  month: string | null;
  product_spec: string | null;
  size: string | null;
  created_at: string;
}

export interface HistoricalEventsFilters {
  mill?: string; // Default: "Mill 1"
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  state?: string; // Optional filter by state
  page?: number; // For pagination
  pageSize?: number; // Default: 50
}

export interface HistoricalEventsResponse {
  events: SeedMillHistoricalEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get historical events with filters
 */
export async function getHistoricalEvents(
  filters: HistoricalEventsFilters = {}
): Promise<HistoricalEventsResponse> {
  const {
    mill = 'Mill 1',
    startDate,
    endDate,
    state,
    page = 1,
    pageSize = 50,
  } = filters;

  try {
    let query = supabase
      .from('seed_mill_events_historical')
      .select('*', { count: 'exact' });

    // Apply filters
    query = query.eq('mill', mill);

    if (startDate) {
      query = query.gte('event_time', startDate);
    }

    if (endDate) {
      query = query.lte('event_time', endDate);
    }

    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    // Order by event_time descending (most recent first)
    query = query.order('event_time', { ascending: false });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      events: (data as SeedMillHistoricalEvent[]) || [],
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error('Error fetching historical events:', err);
    // Return empty result on error (graceful degradation)
    return {
      events: [],
      total: 0,
      page: 1,
      pageSize: pageSize,
      totalPages: 0,
    };
  }
}

/**
 * Get default date range (last 7 days from data)
 * Returns the most recent 7 days that have data
 */
export async function getDefaultDateRange(mill: string = 'Mill 1'): Promise<{
  startDate: string;
  endDate: string;
}> {
  try {
    // Get the most recent event for this mill
    const { data: latest, error: latestError } = await supabase
      .from('seed_mill_events_historical')
      .select('event_time')
      .eq('mill', mill)
      .order('event_time', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latest) {
      // Fallback to last 7 days from now
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }

    const endDate = new Date(latest.event_time);
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  } catch (err) {
    console.error('Error getting default date range:', err);
    // Fallback to last 7 days from now
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }
}

/**
 * Get available mills from historical data
 */
export async function getAvailableMills(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('seed_mill_events_historical')
      .select('mill')
      .order('mill');

    if (error) {
      throw error;
    }

    // Get unique mills
    const mills = Array.from(new Set((data || []).map((row: any) => row.mill))).filter(
      (mill): mill is string => typeof mill === 'string' && mill.length > 0
    );

    return mills.sort();
  } catch (err) {
    console.error('Error fetching available mills:', err);
    return ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4']; // Fallback
  }
}

