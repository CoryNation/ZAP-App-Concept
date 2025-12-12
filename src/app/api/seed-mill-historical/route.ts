import { NextRequest, NextResponse } from 'next/server';
import {
  getHistoricalEvents,
  getDefaultDateRange,
  getAvailableMills,
  getFilterValues,
  getRelatedEvents,
  HistoricalEventsFilters,
} from '@/src/lib/services/seedMillHistoricalService';

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

/**
 * GET /api/seed-mill-historical
 * 
 * Query parameters:
 * - mill: string (default: "Mill 1")
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - state: string or comma-separated string (optional, e.g., "DOWNTIME", "RUNNING")
 * - reason: comma-separated string (optional, multi-select)
 * - category: comma-separated string (optional, multi-select)
 * - equipment: comma-separated string (optional, multi-select)
 * - search: string (optional, global search)
 * - sortBy: string (optional, column name)
 * - sortOrder: "asc" | "desc" (optional)
 * - page: number (default: 1)
 * - pageSize: number (default: 50)
 * - getDefaultRange: boolean (if true, returns default date range instead of events)
 * - getMills: boolean (if true, returns available mills instead of events)
 * - getFilterValues: "reason" | "category" | "equipment" (if set, returns unique values for that field)
 * - getRelatedEvents: eventId (if set, returns related events for that event)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Handle special endpoints
    if (searchParams.get('getMills') === 'true') {
      const factory = searchParams.get('factory') || undefined;
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;
      const mills = await getAvailableMills(factory, startDate, endDate);
      return NextResponse.json({ mills });
    }

    if (searchParams.get('getDefaultRange') === 'true') {
      const mill = searchParams.get('mill') || 'Mill 1';
      const dateRange = await getDefaultDateRange(mill);
      return NextResponse.json(dateRange);
    }

    // Handle filter values endpoint
    const filterField = searchParams.get('getFilterValues');
    if (filterField === 'reason' || filterField === 'category' || filterField === 'equipment') {
      const factory = searchParams.get('factory') || undefined;
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;
      const values = await getFilterValues(filterField, factory, startDate, endDate);
      return NextResponse.json({ values });
    }

    // Handle related events endpoint
    const relatedEventId = searchParams.get('getRelatedEvents');
    if (relatedEventId) {
      const equipment = searchParams.get('equipment') || null;
      const eventTime = searchParams.get('eventTime');
      if (!eventTime) {
        return NextResponse.json({ error: 'eventTime parameter required' }, { status: 400 });
      }
      const relatedEvents = await getRelatedEvents(relatedEventId, equipment, eventTime);
      return NextResponse.json({ events: relatedEvents });
    }

    // Build filters from query params
    const stateParam = searchParams.get('state');
    const state = stateParam
      ? stateParam.includes(',')
        ? stateParam.split(',').map(s => s.trim()).filter(s => s)
        : stateParam
      : undefined;

    const reasonParam = searchParams.get('reason');
    const reason = reasonParam
      ? reasonParam.split(',').map(r => r.trim()).filter(r => r)
      : undefined;

    const categoryParam = searchParams.get('category');
    const category = categoryParam
      ? categoryParam.split(',').map(c => c.trim()).filter(c => c)
      : undefined;

    const equipmentParam = searchParams.get('equipment');
    const equipment = equipmentParam
      ? equipmentParam.split(',').map(e => e.trim()).filter(e => e)
      : undefined;

    const filters: HistoricalEventsFilters = {
      mill: searchParams.get('mill') || undefined, // Empty string means all mills
      factory: searchParams.get('factory') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      state,
      reason,
      category,
      equipment,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      pageSize: searchParams.get('pageSize')
        ? parseInt(searchParams.get('pageSize')!)
        : 50,
    };

    // If no date range provided, get default (use first available mill or fallback)
    if (!filters.startDate || !filters.endDate) {
      const mills = await getAvailableMills(filters.factory);
      const defaultMill = filters.mill || (mills.length > 0 ? mills[0] : 'Mill 1');
      const defaultRange = await getDefaultDateRange(defaultMill);
      filters.startDate = filters.startDate || defaultRange.startDate;
      filters.endDate = filters.endDate || defaultRange.endDate;
    }

    const result = await getHistoricalEvents(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch historical events' },
      { status: 500 }
    );
  }
}

