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
  state?: string | string[]; // Optional filter by state (single or array for multi-select)
  reason?: string[]; // Optional multi-select filter by reason
  category?: string[]; // Optional multi-select filter by category
  equipment?: string[]; // Optional multi-select filter by equipment
  search?: string; // Global search across reason/category/subcategory/equipment/comment/product_spec
  sortBy?: string; // Column to sort by
  sortOrder?: 'asc' | 'desc'; // Sort direction
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
    reason,
    category,
    equipment,
    search,
    sortBy = 'event_time',
    sortOrder = 'desc',
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
    
    // Apply state filter (support array or single value)
    if (state) {
      const states = Array.isArray(state) ? state : [state];
      allEvents = allEvents.filter(e => 
        states.some(s => e.state.toUpperCase() === s.toUpperCase())
      );
    }
    
    // Apply reason filter
    if (reason && reason.length > 0) {
      allEvents = allEvents.filter(e => 
        e.reason && reason.some(r => e.reason.toLowerCase().includes(r.toLowerCase()))
      );
    }
    
    // Apply category filter
    if (category && category.length > 0) {
      allEvents = allEvents.filter(e => 
        e.category && category.includes(e.category)
      );
    }
    
    // Apply equipment filter
    if (equipment && equipment.length > 0) {
      allEvents = allEvents.filter(e => 
        e.equipment && equipment.includes(e.equipment)
      );
    }
    
    // Apply global search
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      allEvents = allEvents.filter(e => 
        (e.reason && e.reason.toLowerCase().includes(searchLower)) ||
        (e.category && e.category.toLowerCase().includes(searchLower)) ||
        (e.sub_category && e.sub_category.toLowerCase().includes(searchLower)) ||
        (e.equipment && e.equipment.toLowerCase().includes(searchLower)) ||
        (e.comment && e.comment.toLowerCase().includes(searchLower)) ||
        (e.product_spec && e.product_spec.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort
    const sortField = sortBy || 'event_time';
    const ascending = sortOrder === 'asc';
    allEvents.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      // Handle dates
      if (sortField === 'event_time') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return ascending ? aVal - bVal : bVal - aVal;
      }
      
      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (ascending) {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
    
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

    // Apply state filter (support array or single value)
    if (state) {
      const states = Array.isArray(state) ? state : [state];
      const validStates = states.filter(s => VALID_STATES.includes(s.toUpperCase() as any));
      if (validStates.length > 0) {
        if (validStates.length === 1) {
          query = query.eq('state', validStates[0].toUpperCase());
        } else {
          query = query.in('state', validStates.map(s => s.toUpperCase()));
        }
      }
    }

    // Apply reason filter (multi-select) - use OR for partial matches
    if (reason && reason.length > 0) {
      const reasonFilters = reason.map(r => `reason.ilike.%${r}%`).join(',');
      query = query.or(reasonFilters);
    }

    // Apply category filter (multi-select)
    if (category && category.length > 0) {
      query = query.in('category', category);
    }

    // Apply equipment filter (multi-select)
    if (equipment && equipment.length > 0) {
      query = query.in('equipment', equipment);
    }

    // Apply global search (across multiple fields)
    // Use Supabase or() with proper syntax: field.operator.value,field.operator.value
    if (search && search.trim()) {
      const searchTerm = search.trim();
      // Build OR condition for multiple fields
      const searchConditions = [
        `reason.ilike.%${searchTerm}%`,
        `category.ilike.%${searchTerm}%`,
        `sub_category.ilike.%${searchTerm}%`,
        `equipment.ilike.%${searchTerm}%`,
        `comment.ilike.%${searchTerm}%`,
        `product_spec.ilike.%${searchTerm}%`,
      ].join(',');
      query = query.or(searchConditions);
    }

    // Apply sorting
    const sortField = sortBy || 'event_time';
    const ascending = sortOrder === 'asc';
    query = query.order(sortField, { ascending });

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
      const states = Array.isArray(state) ? state : [state];
      allEvents = allEvents.filter(e => 
        states.some(s => e.state.toUpperCase() === s.toUpperCase())
      );
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
 * @param startDate Optional start date to filter mills by date range
 * @param endDate Optional end date to filter mills by date range
 */
export async function getAvailableMills(
  factory?: string,
  startDate?: string,
  endDate?: string
): Promise<string[]> {
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
    
    // Filter by date range if provided
    if (startDate) {
      query = query.gte('event_time', startDate);
    }
    
    if (endDate) {
      query = query.lte('event_time', endDate);
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

    return mills.sort(); // Return sorted mills (empty array if none found)
  } catch (err) {
    console.error('Error fetching available mills:', err);
    return []; // Return empty array on error (let caller handle fallback)
  }
}

/**
 * Get unique values for filter dropdowns
 */
export async function getFilterValues(
  field: 'reason' | 'category' | 'equipment',
  factory?: string,
  startDate?: string,
  endDate?: string
): Promise<string[]> {
  if (isDemoMode()) {
    // Return demo values
    switch (field) {
      case 'reason':
        return ['Changeover', 'Material Shortage', 'Equipment Failure', 'Planned Maintenance', 'Quality Issue'];
      case 'category':
        return ['Maintenance', 'Material', 'Quality', 'Changeover', 'Other'];
      case 'equipment':
        return ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4', 'Conveyor', 'Press'];
      default:
        return [];
    }
  }

  try {
    let query = supabase
      .from('seed_mill_events_historical')
      .select(field);

    if (factory) {
      query = query.eq('factory', factory);
    }

    if (startDate) {
      query = query.gte('event_time', startDate);
    }

    if (endDate) {
      query = query.lte('event_time', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Get unique non-null values
    const values = Array.from(
      new Set((data || []).map((row: any) => row[field]).filter((v): v is string => v != null && v !== ''))
    ).sort();

    return values;
  } catch (err) {
    console.error(`Error fetching ${field} values:`, err);
    return [];
  }
}

/**
 * Get related events (same equipment within ±2 hours)
 */
export async function getRelatedEvents(
  eventId: string,
  equipment: string | null,
  eventTime: string
): Promise<SeedMillHistoricalEvent[]> {
  if (!equipment) {
    return [];
  }

  const eventDate = new Date(eventTime);
  const twoHoursBefore = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
  const twoHoursAfter = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);

  if (isDemoMode()) {
    // In demo mode, return empty array (would need to generate related events)
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('seed_mill_events_historical')
      .select('*')
      .eq('equipment', equipment)
      .gte('event_time', twoHoursBefore.toISOString())
      .lte('event_time', twoHoursAfter.toISOString())
      .neq('id', eventId)
      .order('event_time', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return (data as SeedMillHistoricalEvent[]) || [];
  } catch (err) {
    console.error('Error fetching related events:', err);
    return [];
  }
}

