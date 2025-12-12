import { NextRequest, NextResponse } from 'next/server';
import {
  calculateDowntimeTransitions,
  TransitionsFilters,
  GroupingDimension,
} from '@/src/lib/services/downtimeTransitionsService';

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

/**
 * GET /api/production-trials/downtime/transitions
 * 
 * Query parameters:
 * - mill: string (optional)
 * - factory: string (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - grouping: 'reason' | 'category' | 'equipment' (default: 'reason')
 * - topN: number (default: 12)
 * - fromValue: string (optional, filter by specific "from" value)
 * - toValue: string (optional, filter by specific "to" value)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build filters from query params
    const filters: TransitionsFilters = {
      mill: searchParams.get('mill') || undefined,
      factory: searchParams.get('factory') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      grouping: (searchParams.get('grouping') as GroupingDimension) || 'reason',
      topN: searchParams.get('topN') ? parseInt(searchParams.get('topN')!) : 12,
      fromValue: searchParams.get('fromValue') || undefined,
      toValue: searchParams.get('toValue') || undefined,
    };

    const result = await calculateDowntimeTransitions(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate downtime transitions' },
      { status: 500 }
    );
  }
}

