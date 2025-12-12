/**
 * Service for seed mill historical events data
 * Reads from seed_mill_events_historical Supabase table
 */

import { supabase } from '@/lib/supabaseClient';
import { generateHistoricalEvents } from '../demo/generators';
import { VALID_STATES } from '../constants/stateConstants';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

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
  mill?: string; // Optional: if empty, returns all mills
  factory?: string; // Optional: filter by factory name
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
    mill,
    factory,
    startDate,
    endDate,
    state,
    page = 1,
    pageSize = 50,
  } = filters;

  // Use demo mode if enabled
  if (isDemoMode()) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Generate events for multiple mills if mill is not specified
    const millsToGenerate = mill ? [mill] : ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4'];
    let allEvents: any[] = [];
    for (const m of millsToGenerate) {
      const events = generateHistoricalEvents(start, end, m);
      allEvents = allEvents.concat(events);
    }
    
    // Apply factory filter if specified
    if (factory) {
      allEvents = allEvents.filter(e => e.factory === factory);
    }
    
    // Apply state filter if specified
    if (state) {
      allEvents = allEvents.filter(e => e.state.toUpperCase() === state.toUpperCase());
    }
    
    // Sort by event_time descending
    allEvents.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
    
    const total = allEvents.length;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    
    return {
      events: allEvents.slice(from, to) as SeedMillHistoricalEvent[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  try {
    let query = supabase
      .from('seed_mill_events_historical')
      .select('*', { count: 'exact' });

    // Apply filters
    if (mill) {
      query = query.eq('mill', mill);
    }
    
    if (factory) {
      query = query.eq('factory', factory);
    }

    if (startDate) {
      query = query.gte('event_time', startDate);
    }

    if (endDate) {
      query = query.lte('event_time', endDate);
    }

    if (state) {
      // Validate state value matches Supabase constraint
      const normalizedState = state.toUpperCase();
      if (VALID_STATES.includes(normalizedState as any)) {
        query = query.eq('state', normalizedState);
      } else {
        console.warn(`Invalid state value: ${state}. Valid states are: ${VALID_STATES.join(', ')}`);
      }
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
    console.error('Error fetching historical events, using demo data:', err);
    // Fallback to demo data on error
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const millsToGenerate = mill ? [mill] : ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4'];
    let allEvents: any[] = [];
    for (const m of millsToGenerate) {
      const events = generateHistoricalEvents(start, end, m);
      allEvents = allEvents.concat(events);
    }
    
    if (factory) {
      allEvents = allEvents.filter(e => e.factory === factory);
    }
    
    if (state) {
      allEvents = allEvents.filter(e => e.state.toUpperCase() === state.toUpperCase());
    }
    
    allEvents.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
    
    const total = allEvents.length;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    
    return {
      events: allEvents.slice(from, to) as SeedMillHistoricalEvent[],
      total,
      page,
      pageSize,
      totalPages,
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
  // In demo mode, return last 90 days (matching global filter default)
  if (isDemoMode()) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

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
      // Fallback to last 90 days from now (matching global filter default)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }

    const endDate = new Date(latest.event_time);
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000); // Changed to 90 days to match global filter

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  } catch (err) {
    console.error('Error getting default date range, using fallback:', err);
    // Fallback to last 90 days from now
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }
}

/**
 * Get available mills from historical data
 * @param factory Optional factory name to filter mills by
 */
export async function getAvailableMills(factory?: string): Promise<string[]> {
  // In demo mode, return standard mills
  if (isDemoMode()) {
    return ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4'];
  }

  try {
    let query = supabase
      .from('seed_mill_events_historical')
      .select('mill');
    
    // Filter by factory if provided
    if (factory) {
      query = query.eq('factory', factory);
    }
    
    query = query.order('mill');

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Get unique mills
    const mills = Array.from(new Set((data || []).map((row: any) => row.mill))).filter(
      (mill): mill is string => typeof mill === 'string' && mill.length > 0
    );

    return mills.length > 0 ? mills.sort() : ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4']; // Fallback if empty
  } catch (err) {
    console.error('Error fetching available mills, using fallback:', err);
    return ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4']; // Fallback
  }
}

