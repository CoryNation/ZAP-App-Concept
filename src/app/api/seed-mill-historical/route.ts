import { NextRequest, NextResponse } from 'next/server';
import {
  getHistoricalEvents,
  getDefaultDateRange,
  getAvailableMills,
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
 * - state: string (optional, e.g., "DOWNTIME", "RUNNING")
 * - page: number (default: 1)
 * - pageSize: number (default: 50)
 * - getDefaultRange: boolean (if true, returns default date range instead of events)
 * - getMills: boolean (if true, returns available mills instead of events)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Handle special endpoints
    if (searchParams.get('getMills') === 'true') {
      const factory = searchParams.get('factory') || undefined;
      const mills = await getAvailableMills(factory);
      return NextResponse.json({ mills });
    }

    if (searchParams.get('getDefaultRange') === 'true') {
      const mill = searchParams.get('mill') || 'Mill 1';
      const dateRange = await getDefaultDateRange(mill);
      return NextResponse.json(dateRange);
    }

    // Build filters from query params
    const filters: HistoricalEventsFilters = {
      mill: searchParams.get('mill') || undefined, // Empty string means all mills
      factory: searchParams.get('factory') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      state: searchParams.get('state') || undefined,
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

