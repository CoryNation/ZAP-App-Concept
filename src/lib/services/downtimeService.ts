import { DowntimeCause, DowntimeEvent, SpeedVsDowntimePoint, TimeRange } from '../types';
import { generateDowntimePareto, generateDowntimeEvents, generateSpeedVsDowntime } from '../demo/generators';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

interface DowntimeParams {
  plantId?: string | null;
  lineIds?: string[] | null;
  range: TimeRange['range'];
  customStartDate?: string | null;
  customEndDate?: string | null;
}

function getTimeRange(params: DowntimeParams) {
  const now = new Date();
  
  // Validate range parameter
  if (!params.range) {
    console.warn('No range provided, defaulting to last90d');
    params.range = 'last90d';
  }
  
  if (params.range === 'custom' && params.customStartDate && params.customEndDate) {
    return {
      start: new Date(params.customStartDate),
      end: new Date(params.customEndDate),
    };
  }
  
  const rangeHours: Record<string, number> = {
    last24h: 24,
    last7d: 168,
    last30d: 720,
    last60d: 1440,
    last90d: 2160,
  };
  const hours = rangeHours[params.range] || 2160; // Default to 90 days if invalid
  return {
    start: new Date(now.getTime() - hours * 60 * 60 * 1000),
    end: now,
  };
}

export async function getDowntimePareto(params: DowntimeParams): Promise<DowntimeCause[]> {
  if (isDemoMode()) return generateDowntimePareto();
  try {
    return generateDowntimePareto();
  } catch (err) {
    console.warn('Error fetching downtime pareto, using demo:', err);
    return generateDowntimePareto();
  }
}

export async function getDowntimeTimeline(params: DowntimeParams): Promise<DowntimeEvent[]> {
  try {
    const { start, end } = getTimeRange(params);
    return generateDowntimeEvents(start, end);
  } catch (err) {
    console.warn('Error calculating time range, using default 90 days:', err);
    // Fallback to last 90 days
    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return generateDowntimeEvents(start, now);
  }
}

export async function getSpeedVsDowntimeScatter(params: DowntimeParams): Promise<SpeedVsDowntimePoint[]> {
  const { start, end } = getTimeRange(params);
  if (isDemoMode()) return generateSpeedVsDowntime(start, end);
  try {
    return generateSpeedVsDowntime(start, end);
  } catch (err) {
    console.warn('Error fetching speed vs downtime, using demo:', err);
    return generateSpeedVsDowntime(start, end);
  }
}

