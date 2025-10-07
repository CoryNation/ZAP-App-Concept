import { supabase } from '@/lib/supabaseClient';

export interface LineSpeedDataPoint {
  ts: string;
  value: number;
}

export interface LineSpeedSeries {
  name: string;
  data: LineSpeedDataPoint[];
}

interface GetLineSpeedSeriesParams {
  factoryId?: string | null;
  lineIds?: string[] | null;
  range: 'last24h' | 'last7d' | 'last30d' | 'last60d' | 'last90d' | 'custom';
  customStartDate?: string | null;
  customEndDate?: string | null;
}

/**
 * Fetches line speed data from Supabase or generates synthetic data as fallback.
 * Returns multiple series (one per line) with timestamps and speed values.
 */
export async function getLineSpeedSeries(
  params: GetLineSpeedSeriesParams
): Promise<LineSpeedSeries[]> {
  const { factoryId, lineIds, range, customStartDate, customEndDate } = params;

  // Calculate time range
  const now = new Date();
  const msPerHour = 1000 * 60 * 60;
  let startTime: Date;
  let intervalMs: number;

  if (range === 'custom' && customStartDate && customEndDate) {
    startTime = new Date(customStartDate);
    const endTime = new Date(customEndDate);
    const daysDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (24 * msPerHour));
    
    // Choose interval based on date range
    if (daysDiff <= 2) {
      intervalMs = msPerHour; // 1 hour intervals
    } else if (daysDiff <= 14) {
      intervalMs = 4 * msPerHour; // 4 hour intervals
    } else {
      intervalMs = 24 * msPerHour; // 1 day intervals
    }
  } else {
    switch (range) {
      case 'last24h':
        startTime = new Date(now.getTime() - 24 * msPerHour);
        intervalMs = msPerHour; // 1 hour intervals
        break;
      case 'last7d':
        startTime = new Date(now.getTime() - 7 * 24 * msPerHour);
        intervalMs = 4 * msPerHour; // 4 hour intervals
        break;
      case 'last30d':
        startTime = new Date(now.getTime() - 30 * 24 * msPerHour);
        intervalMs = 24 * msPerHour; // 1 day intervals
        break;
      case 'last60d':
        startTime = new Date(now.getTime() - 60 * 24 * msPerHour);
        intervalMs = 24 * msPerHour; // 1 day intervals
        break;
      case 'last90d':
        startTime = new Date(now.getTime() - 90 * 24 * msPerHour);
        intervalMs = 24 * msPerHour; // 1 day intervals
        break;
      default:
        startTime = new Date(now.getTime() - 24 * msPerHour);
        intervalMs = msPerHour;
    }
  }

  try {
    // Try to fetch real data from Supabase
    let query = supabase
      .from('line_speed_events')
      .select('line_id, timestamp, speed_ftmin, lines(name)')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true });

    if (factoryId) {
      query = query.eq('lines.factory_id', factoryId);
    }

    if (lineIds && lineIds.length > 0) {
      query = query.in('line_id', lineIds);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      // Group by line_id
      const seriesMap = new Map<string, LineSpeedDataPoint[]>();
      const lineNames = new Map<string, string>();

      data.forEach((row: any) => {
        const lineId = row.line_id;
        const lineName = row.lines?.name || `Line ${lineId.slice(0, 8)}`;
        
        if (!seriesMap.has(lineId)) {
          seriesMap.set(lineId, []);
          lineNames.set(lineId, lineName);
        }

        seriesMap.get(lineId)!.push({
          ts: row.timestamp,
          value: row.speed_ftmin || 0,
        });
      });

      // Convert to array of series
      return Array.from(seriesMap.entries()).map(([lineId, data]) => ({
        name: lineNames.get(lineId) || lineId,
        data,
      }));
    }
  } catch (err) {
    console.warn('Failed to fetch line speed data, using synthetic fallback:', err);
  }

  // Fallback: Generate synthetic data
  return generateSyntheticLineSpeedData(startTime, now, intervalMs, lineIds);
}

/**
 * Generates synthetic line speed data for demo purposes.
 * Includes realistic patterns: normal operation (700-800), downtime (0), and variability.
 */
function generateSyntheticLineSpeedData(
  startTime: Date,
  endTime: Date,
  intervalMs: number,
  lineIds?: string[] | null
): LineSpeedSeries[] {
  const numLines = lineIds?.length || 3;
  const lineNames = lineIds?.map((id, i) => `Line ${String.fromCharCode(65 + i)}`) || [
    'Line A',
    'Line B',
    'Line C',
  ];

  return lineNames.map((name, lineIndex) => {
    const data: LineSpeedDataPoint[] = [];
    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
      const hoursSinceStart = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // Create realistic patterns with some randomness per line
      const seed = lineIndex * 1000 + hoursSinceStart;
      const random = (Math.sin(seed) + 1) / 2; // Pseudo-random [0, 1]
      
      let value: number;

      // Simulate downtime periods (speed = 0)
      if (random < 0.05) {
        value = 0; // 5% chance of downtime
      }
      // Simulate maintenance/reduced speed
      else if (random < 0.15) {
        value = 300 + Math.random() * 200; // 10% chance of reduced speed
      }
      // Normal operation around 700-800 ft/min
      else {
        const baseline = 750;
        const variation = Math.sin(hoursSinceStart * 0.5 + lineIndex) * 50; // Wave pattern
        const noise = (Math.random() - 0.5) * 40; // Random noise
        value = Math.max(0, baseline + variation + noise);
      }

      data.push({
        ts: currentTime.toISOString(),
        value: Math.round(value),
      });

      currentTime = new Date(currentTime.getTime() + intervalMs);
    }

    return { name, data };
  });
}

