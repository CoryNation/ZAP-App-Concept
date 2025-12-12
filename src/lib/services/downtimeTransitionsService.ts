/**
 * Service for calculating downtime transitions/sequences
 * Analyzes consecutive downtime events separated by RUNNING periods
 * 
 * @module downtimeTransitionsService
 * @description This service identifies patterns in downtime events by analyzing
 * sequences of DOWNTIME → RUNNING → DOWNTIME transitions. It supports grouping
 * by reason, category, or equipment to identify common transition patterns.
 */

import { supabase } from '@/lib/supabaseClient';
import { SeedMillHistoricalEvent, getHistoricalEvents } from './seedMillHistoricalService';
import { generateHistoricalEvents } from '../demo/generators';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

/**
 * Dimension for grouping downtime transitions
 * - 'reason': Group by downtime reason
 * - 'category': Group by downtime category
 * - 'equipment': Group by equipment involved
 */
export type GroupingDimension = 'reason' | 'category' | 'equipment';

export interface DowntimeTransition {
  from: string; // Preceding downtime reason/category/equipment
  to: string; // Subsequent downtime reason/category/equipment
  count: number; // Number of times this transition occurred
  percentage: number; // Percentage of all transitions
}

export interface TransitionEventPair {
  precedingEvent: SeedMillHistoricalEvent;
  subsequentEvent: SeedMillHistoricalEvent;
  runningPeriodMinutes: number | null; // Duration of RUNNING period between events
}

export interface DowntimeTransitionsResponse {
  transitions: DowntimeTransition[];
  eventPairs: TransitionEventPair[];
  totalTransitions: number;
  matrix: {
    rows: string[]; // Top N row labels
    cols: string[]; // Top N column labels
    data: number[][]; // Matrix[row][col] = count
  };
}

export interface TransitionsFilters {
  mill?: string;
  factory?: string;
  startDate?: string;
  endDate?: string;
  grouping?: GroupingDimension; // Default: 'reason'
  topN?: number; // Default: 12
  fromValue?: string; // Filter by specific "from" value
  toValue?: string; // Filter by specific "to" value
}

/**
 * Extracts the grouping value from an event based on the specified dimension
 * 
 * @param event - The historical event to extract the grouping value from
 * @param dimension - The dimension to group by (reason, category, or equipment)
 * @returns The grouping value, or a default placeholder if the value is missing
 * 
 * @example
 * ```typescript
 * const value = getGroupingValue(event, 'reason'); // Returns event.reason or '(No Reason)'
 * ```
 */
function getGroupingValue(event: SeedMillHistoricalEvent, dimension: GroupingDimension): string {
  switch (dimension) {
    case 'reason':
      return event.reason || '(No Reason)';
    case 'category':
      return event.category || '(No Category)';
    case 'equipment':
      return event.equipment || '(No Equipment)';
    default:
      return event.reason || '(No Reason)';
  }
}

/**
 * Calculates downtime transitions from historical events
 * 
 * A transition is defined as: DOWNTIME event A → RUNNING period → DOWNTIME event B
 * This function identifies these patterns and builds a relationship matrix showing
 * how often different downtime causes follow each other.
 * 
 * @param filters - Filter parameters for the analysis
 * @param filters.mill - Optional mill filter
 * @param filters.factory - Optional factory filter (by name)
 * @param filters.startDate - Start date for the analysis period (ISO string)
 * @param filters.endDate - End date for the analysis period (ISO string)
 * @param filters.grouping - Dimension to group transitions by (default: 'reason')
 * @param filters.topN - Number of top transitions to include in matrix (default: 12)
 * @param filters.fromValue - Optional filter for specific "from" value
 * @param filters.toValue - Optional filter for specific "to" value
 * @returns Promise resolving to transition analysis results including matrix and event pairs
 * 
 * @remarks
 * - For large datasets (>10k events), this function will fetch events in chunks
 * - The function processes events in-memory, so very large datasets may impact performance
 * - Consider using date range filters to limit the dataset size
 * 
 * @example
 * ```typescript
 * const result = await calculateDowntimeTransitions({
 *   factory: 'Factory A',
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   grouping: 'reason',
 *   topN: 10
 * });
 * ```
 */
export async function calculateDowntimeTransitions(
  filters: TransitionsFilters = {}
): Promise<DowntimeTransitionsResponse> {
  const {
    mill,
    factory,
    startDate,
    endDate,
    grouping = 'reason',
    topN = 12,
    fromValue,
    toValue,
  } = filters;

  // Get all events in the time range, ordered by time
  // For large datasets, we fetch in chunks to avoid memory issues
  // Maximum of 50k events to prevent performance degradation
  const MAX_EVENTS = 50000;
  const CHUNK_SIZE = 10000;
  
  let allEvents: SeedMillHistoricalEvent[] = [];
  let page = 1;
  let hasMore = true;

  // Fetch events in chunks until we have all events or hit the limit
  while (hasMore && allEvents.length < MAX_EVENTS) {
    const response = await getHistoricalEvents({
      mill,
      factory,
      startDate,
      endDate,
      page,
      pageSize: CHUNK_SIZE,
    });

    if (response.events.length === 0) {
      hasMore = false;
    } else {
      allEvents = allEvents.concat(response.events);
      
      // If we got fewer events than requested, we've reached the end
      if (response.events.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  // Warn if we hit the limit
  if (allEvents.length >= MAX_EVENTS) {
    console.warn(
      `calculateDowntimeTransitions: Hit maximum event limit (${MAX_EVENTS}). ` +
      `Consider narrowing the date range or adding filters.`
    );
  }

  // Filter to only DOWNTIME and RUNNING events, sorted by time
  // This is critical for sequence analysis - we need chronological order
  const filteredEvents = allEvents
    .filter(e => e.state === 'DOWNTIME' || e.state === 'RUNNING')
    .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());

  // Find transitions: DOWNTIME → RUNNING → DOWNTIME
  const transitions: Map<string, number> = new Map(); // Key: "from|to", Value: count
  const eventPairs: TransitionEventPair[] = [];

  for (let i = 0; i < filteredEvents.length - 2; i++) {
    const event1 = filteredEvents[i];
    const event2 = filteredEvents[i + 1];
    const event3 = filteredEvents[i + 2];

    // Check if we have a DOWNTIME → RUNNING → DOWNTIME sequence
    if (
      event1.state === 'DOWNTIME' &&
      event2.state === 'RUNNING' &&
      event3.state === 'DOWNTIME'
    ) {
      const fromGroupValue = getGroupingValue(event1, grouping);
      const toGroupValue = getGroupingValue(event3, grouping);

      // Apply filters if specified
      if (fromValue && fromGroupValue !== fromValue) continue;
      if (toValue && toGroupValue !== toValue) continue;

      const key = `${fromGroupValue}|${toGroupValue}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);

      // Calculate running period duration
      const runningStart = new Date(event2.event_time);
      const runningEnd = new Date(event3.event_time);
      const runningMinutes = event2.minutes || 
        (runningEnd.getTime() - runningStart.getTime()) / (1000 * 60);

      eventPairs.push({
        precedingEvent: event1,
        subsequentEvent: event3,
        runningPeriodMinutes: runningMinutes,
      });
    }
  }

  // Convert to array and calculate percentages
  const totalTransitions = Array.from(transitions.values()).reduce((sum, count) => sum + count, 0);
  const transitionsArray: DowntimeTransition[] = Array.from(transitions.entries()).map(
    ([key, count]) => {
      const [from, to] = key.split('|');
      return {
        from,
        to,
        count,
        percentage: totalTransitions > 0 ? (count / totalTransitions) * 100 : 0,
      };
    }
  );

  // Filter event pairs to match the filtered transitions
  const filteredEventPairs = eventPairs.filter(pair => {
    const pairFrom = getGroupingValue(pair.precedingEvent, grouping);
    const pairTo = getGroupingValue(pair.subsequentEvent, grouping);
    if (fromValue && pairFrom !== fromValue) return false;
    if (toValue && pairTo !== toValue) return false;
    return true;
  });

  // Sort by count descending
  transitionsArray.sort((a, b) => b.count - a.count);

  // Build matrix for top N rows and columns
  // Get unique values and their total counts
  const fromCounts = new Map<string, number>();
  const toCounts = new Map<string, number>();

  transitionsArray.forEach(t => {
    fromCounts.set(t.from, (fromCounts.get(t.from) || 0) + t.count);
    toCounts.set(t.to, (toCounts.get(t.to) || 0) + t.count);
  });

  // Get top N "from" values (rows)
  const topFromValues = Array.from(fromCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([value]) => value);

  // Get top N "to" values (columns)
  const topToValues = Array.from(toCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([value]) => value);

  // Build matrix
  const matrixData: number[][] = topFromValues.map(() => 
    new Array(topToValues.length).fill(0)
  );

  transitionsArray.forEach(t => {
    const rowIndex = topFromValues.indexOf(t.from);
    const colIndex = topToValues.indexOf(t.to);
    if (rowIndex >= 0 && colIndex >= 0) {
      matrixData[rowIndex][colIndex] = t.count;
    }
  });

  return {
    transitions: transitionsArray,
    eventPairs: filteredEventPairs,
    totalTransitions,
    matrix: {
      rows: topFromValues,
      cols: topToValues,
      data: matrixData,
    },
  };
}

