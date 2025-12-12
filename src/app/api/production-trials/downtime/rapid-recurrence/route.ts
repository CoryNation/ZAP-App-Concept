import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { SeedMillHistoricalEvent } from '@/src/lib/services/seedMillHistoricalService';
import { generateHistoricalEvents } from '@/src/lib/demo/generators';

// Mark this route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

export interface RapidRecurrenceEvent {
  restart_time: string;
  restart_reason: string | null;
  subsequent_stop_time: string;
  subsequent_stop_reason: string | null;
  run_duration_minutes: number;
  equipment: string | null;
  product_spec: string | null;
  mill: string;
  factory: string;
  restart_event_id: string;
  stop_event_id: string;
  // Additional stats for drilldown
  preceding_downtime_reason: string | null;
  preceding_downtime_duration_minutes: number | null;
  subsequent_downtime_duration_minutes: number | null;
}

export interface MonthlyTrendData {
  month: string; // Format: "YYYY-MM" or "Month YYYY"
  count: number;
}

export interface PrecedingReasonStat {
  reason: string;
  occurrences: number;
}

export interface ReasonPairStat {
  preceding_reason: string;
  subsequent_reason: string;
  occurrences: number;
}

export interface RapidRecurrenceResponse {
  events: RapidRecurrenceEvent[];
  summary: {
    totalRapidRecurrences: number;
    avgRunDuration: number;
    topRestartCause: string | null;
    topSubsequentStopCause: string | null;
  };
  monthlyTrend: MonthlyTrendData[];
  topPrecedingReasons: PrecedingReasonStat[];
  topReasonPairs: ReasonPairStat[];
}

const isDemoMode = () => {
  // Check if demo mode is explicitly enabled
  if (process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true') {
    return true;
  }
  // Check if Supabase is using placeholder values (not configured)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  if (supabaseUrl.includes('placeholder')) {
    return true;
  }
  return false;
};

/**
 * Detects rapid recurrence events from historical data
 * 
 * A rapid recurrence is defined as a DOWNTIME → RUNNING → DOWNTIME sequence where
 * the RUNNING period is shorter than the specified threshold. This indicates equipment
 * that restarts but fails again quickly, suggesting unresolved root causes.
 * 
 * @param events - Array of historical events to analyze (must be sorted by event_time)
 * @param thresholdMinutes - Maximum run duration in minutes to be considered "rapid"
 * @returns Array of rapid recurrence events with restart and stop information
 * 
 * @remarks
 * - Events are grouped by mill and processed separately
 * - Only sequences of DOWNTIME → RUNNING → DOWNTIME are considered
 * - The run duration is calculated from restart time to subsequent stop time
 * - Results are sorted by restart_time descending (most recent first)
 * 
 * @example
 * ```typescript
 * const rapidRecurrences = detectRapidRecurrences(events, 20);
 * // Returns events where equipment ran for less than 20 minutes before failing again
 * ```
 */
function detectRapidRecurrences(
  events: SeedMillHistoricalEvent[],
  thresholdMinutes: number
): RapidRecurrenceEvent[] {
  const rapidRecurrences: RapidRecurrenceEvent[] = [];
  
  // Group events by mill and sort by event_time
  const eventsByMill = new Map<string, SeedMillHistoricalEvent[]>();
  events.forEach(event => {
    if (!eventsByMill.has(event.mill)) {
      eventsByMill.set(event.mill, []);
    }
    eventsByMill.get(event.mill)!.push(event);
  });
  
  // Process each mill separately
  eventsByMill.forEach((millEvents, mill) => {
    // Sort by event_time ascending
    millEvents.sort((a, b) => 
      new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
    );
    
    // Find DOWNTIME → RUNNING transitions (restarts)
    for (let i = 0; i < millEvents.length - 1; i++) {
      const currentEvent = millEvents[i];
      const nextEvent = millEvents[i + 1];
      
      // Check if current is DOWNTIME and next is RUNNING (restart)
      if (currentEvent.state === 'DOWNTIME' && nextEvent.state === 'RUNNING') {
        const restartTime = new Date(nextEvent.event_time);
        
        // Find the next RUNNING → DOWNTIME transition (subsequent stop)
        for (let j = i + 1; j < millEvents.length; j++) {
          const checkEvent = millEvents[j];
          
          // If we find a DOWNTIME event, check if previous was RUNNING
          if (checkEvent.state === 'DOWNTIME' && j > i + 1) {
            const prevEvent = millEvents[j - 1];
            if (prevEvent.state === 'RUNNING') {
              // Found a subsequent stop
              const stopTime = new Date(checkEvent.event_time);
              const runDurationMinutes = (stopTime.getTime() - restartTime.getTime()) / (1000 * 60);
              
              // Only include if run duration is less than threshold
              if (runDurationMinutes < thresholdMinutes) {
                // Calculate preceding downtime duration
                // Look backwards to find when the downtime period started
                let precedingDowntimeStart: Date | null = null;
                let precedingDowntimeReason: string | null = currentEvent.reason;
                
                for (let k = i; k >= 0; k--) {
                  const checkEvent = millEvents[k];
                  if (checkEvent.state === 'DOWNTIME') {
                    precedingDowntimeStart = new Date(checkEvent.event_time);
                    precedingDowntimeReason = checkEvent.reason;
                    // If this is the first event or previous was RUNNING, we found the start
                    if (k === 0 || millEvents[k - 1].state === 'RUNNING') {
                      break;
                    }
                  } else {
                    break;
                  }
                }
                
                const precedingDowntimeEnd = new Date(nextEvent.event_time);
                const precedingDowntimeMinutes = precedingDowntimeStart
                  ? (precedingDowntimeEnd.getTime() - precedingDowntimeStart.getTime()) / (1000 * 60)
                  : null;
                
                // Calculate subsequent downtime duration
                // Look forward to find when the downtime period ends
                let subsequentDowntimeEnd: Date | null = null;
                for (let m = j + 1; m < millEvents.length; m++) {
                  if (millEvents[m].state === 'RUNNING') {
                    subsequentDowntimeEnd = new Date(millEvents[m].event_time);
                    break;
                  }
                }
                
                const subsequentDowntimeStart = new Date(checkEvent.event_time);
                const subsequentDowntimeMinutes = subsequentDowntimeEnd
                  ? (subsequentDowntimeEnd.getTime() - subsequentDowntimeStart.getTime()) / (1000 * 60)
                  : (checkEvent.minutes || null);
                
                rapidRecurrences.push({
                  restart_time: nextEvent.event_time,
                  restart_reason: nextEvent.reason,
                  subsequent_stop_time: checkEvent.event_time,
                  subsequent_stop_reason: checkEvent.reason,
                  run_duration_minutes: Math.round(runDurationMinutes * 10) / 10,
                  equipment: checkEvent.equipment,
                  product_spec: nextEvent.product_spec || checkEvent.product_spec,
                  mill: mill,
                  factory: nextEvent.factory,
                  restart_event_id: nextEvent.id,
                  stop_event_id: checkEvent.id,
                  preceding_downtime_reason: precedingDowntimeReason,
                  preceding_downtime_duration_minutes: precedingDowntimeMinutes !== null
                    ? Math.round(precedingDowntimeMinutes * 10) / 10
                    : null,
                  subsequent_downtime_duration_minutes: subsequentDowntimeMinutes !== null
                    ? Math.round(subsequentDowntimeMinutes * 10) / 10
                    : null,
                });
              }
              
              // Break after finding the first subsequent stop
              break;
            }
          }
        }
      }
    }
  });
  
  // Sort by restart_time descending (most recent first)
  rapidRecurrences.sort((a, b) => 
    new Date(b.restart_time).getTime() - new Date(a.restart_time).getTime()
  );
  
  return rapidRecurrences;
}

/**
 * Calculates summary statistics for rapid recurrence events
 * 
 * Computes aggregate metrics including total count, average run duration,
 * and most common restart and stop causes.
 * 
 * @param events - Array of rapid recurrence events
 * @returns Summary object with total count, average duration, and top causes
 * 
 * @example
 * ```typescript
 * const summary = calculateSummary(rapidRecurrences);
 * // Returns: { totalRapidRecurrences: 15, avgRunDuration: 12.5, ... }
 * ```
 */
function calculateSummary(events: RapidRecurrenceEvent[]): RapidRecurrenceResponse['summary'] {
  if (events.length === 0) {
    return {
      totalRapidRecurrences: 0,
      avgRunDuration: 0,
      topRestartCause: null,
      topSubsequentStopCause: null,
    };
  }
  
  const avgRunDuration = events.reduce((sum, e) => sum + e.run_duration_minutes, 0) / events.length;
  
  // Count restart causes
  const restartCauseCounts = new Map<string, number>();
  events.forEach(e => {
    const cause = e.restart_reason || 'Unknown';
    restartCauseCounts.set(cause, (restartCauseCounts.get(cause) || 0) + 1);
  });
  const topRestartCause = Array.from(restartCauseCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  // Count subsequent stop causes
  const stopCauseCounts = new Map<string, number>();
  events.forEach(e => {
    const cause = e.subsequent_stop_reason || 'Unknown';
    stopCauseCounts.set(cause, (stopCauseCounts.get(cause) || 0) + 1);
  });
  const topSubsequentStopCause = Array.from(stopCauseCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  return {
    totalRapidRecurrences: events.length,
    avgRunDuration: Math.round(avgRunDuration * 10) / 10,
    topRestartCause,
    topSubsequentStopCause,
  };
}

/**
 * Calculate monthly trend data
 */
function calculateMonthlyTrend(events: RapidRecurrenceEvent[]): MonthlyTrendData[] {
  const monthCounts = new Map<string, number>();
  
  events.forEach(event => {
    const date = new Date(event.restart_time);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
  });
  
  // Convert to array and format month labels
  const trendData: MonthlyTrendData[] = Array.from(monthCounts.entries())
    .map(([monthKey, count]) => {
      const [year, month] = monthKey.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[parseInt(month) - 1];
      return {
        month: `${monthName} ${year}`,
        count,
      };
    })
    .sort((a, b) => {
      // Sort by date (extract year and month from label)
      const aMatch = a.month.match(/(\w+) (\d+)/);
      const bMatch = b.month.match(/(\w+) (\d+)/);
      if (!aMatch || !bMatch) return 0;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const aMonth = monthNames.indexOf(aMatch[1]);
      const aYear = parseInt(aMatch[2]);
      const bMonth = monthNames.indexOf(bMatch[1]);
      const bYear = parseInt(bMatch[2]);
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });
  
  return trendData;
}

/**
 * Calculate top 15 preceding downtime reasons
 */
function calculateTopPrecedingReasons(events: RapidRecurrenceEvent[]): PrecedingReasonStat[] {
  const reasonCounts = new Map<string, number>();
  
  events.forEach(event => {
    const reason = event.preceding_downtime_reason || 'Unknown';
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  });
  
  return Array.from(reasonCounts.entries())
    .map(([reason, occurrences]) => ({ reason, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 15);
}

/**
 * Calculate top 15 preceding + subsequent reason pairs
 */
function calculateTopReasonPairs(events: RapidRecurrenceEvent[]): ReasonPairStat[] {
  const pairCounts = new Map<string, number>();
  
  events.forEach(event => {
    const preceding = event.preceding_downtime_reason || 'Unknown';
    const subsequent = event.subsequent_stop_reason || 'Unknown';
    const pairKey = `${preceding} → ${subsequent}`;
    pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
  });
  
  return Array.from(pairCounts.entries())
    .map(([pairKey, occurrences]) => {
      const [preceding, subsequent] = pairKey.split(' → ');
      return {
        preceding_reason: preceding,
        subsequent_reason: subsequent,
        occurrences,
      };
    })
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 15);
}

/**
 * GET /api/production-trials/downtime/rapid-recurrence
 * 
 * Query parameters:
 * - mill: string (optional, default: all mills)
 * - factory: string (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - thresholdMinutes: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const mill = searchParams.get('mill') || undefined;
    const factory = searchParams.get('factory') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const thresholdMinutes = searchParams.get('thresholdMinutes') 
      ? parseFloat(searchParams.get('thresholdMinutes')!)
      : 20;
    
    let events: SeedMillHistoricalEvent[];
    
    // Use demo mode if enabled
    if (isDemoMode()) {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      const millsToGenerate = mill ? [mill] : ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4'];
      let allEvents: any[] = [];
      for (const m of millsToGenerate) {
        const generatedEvents = generateHistoricalEvents(start, end, m);
        allEvents = allEvents.concat(generatedEvents);
      }
      
      if (factory) {
        allEvents = allEvents.filter(e => e.factory === factory);
      }
      
      events = allEvents as SeedMillHistoricalEvent[];
    } else {
      // Query from Supabase
      try {
        let query = supabase
          .from('seed_mill_events_historical')
          .select('*');
        
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
        
        // Order by mill and event_time for processing
        query = query.order('mill', { ascending: true })
          .order('event_time', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        events = (data as SeedMillHistoricalEvent[]) || [];
      } catch (dbError: any) {
        // If Supabase query fails, fall back to demo mode
        console.warn('Supabase query failed, falling back to demo data:', dbError?.message || dbError);
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        const millsToGenerate = mill ? [mill] : ['Mill 1', 'Mill 2', 'Mill 3', 'Mill 4'];
        let allEvents: any[] = [];
        for (const m of millsToGenerate) {
          const generatedEvents = generateHistoricalEvents(start, end, m);
          allEvents = allEvents.concat(generatedEvents);
        }
        
        if (factory) {
          allEvents = allEvents.filter(e => e.factory === factory);
        }
        
        events = allEvents as SeedMillHistoricalEvent[];
      }
    }
    
    // Detect rapid recurrences
    const rapidRecurrences = detectRapidRecurrences(events, thresholdMinutes);
    
    // Calculate summary
    const summary = calculateSummary(rapidRecurrences);
    
    // Calculate monthly trend
    const monthlyTrend = calculateMonthlyTrend(rapidRecurrences);
    
    // Calculate top preceding reasons
    const topPrecedingReasons = calculateTopPrecedingReasons(rapidRecurrences);
    
    // Calculate top reason pairs
    const topReasonPairs = calculateTopReasonPairs(rapidRecurrences);
    
    return NextResponse.json({
      events: rapidRecurrences,
      summary,
      monthlyTrend,
      topPrecedingReasons,
      topReasonPairs,
    } as RapidRecurrenceResponse);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rapid recurrence data' },
      { status: 500 }
    );
  }
}

