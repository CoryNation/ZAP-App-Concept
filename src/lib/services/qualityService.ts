import { FpyDataPoint, DefectData, ControlChartPoint, TimeRange } from '../types';
import { generateFpySeries, generateDefectsByCause, generateControlChart } from '../demo/generators';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

interface QualityParams {
  plantId?: string | null;
  lineIds?: string[] | null;
  range: TimeRange['range'];
  customStartDate?: string | null;
  customEndDate?: string | null;
}

function getTimeRange(params: QualityParams) {
  const now = new Date();
  
  if (params.range === 'custom' && params.customStartDate && params.customEndDate) {
    const start = new Date(params.customStartDate);
    const end = new Date(params.customEndDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const intervalMs = daysDiff <= 2 ? 60 * 60 * 1000 : daysDiff <= 14 ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return { start, end, intervalMs };
  }
  
  const rangeMap: Record<string, { hours: number; interval: number }> = {
    last24h: { hours: 24, interval: 60 * 60 * 1000 },
    last7d: { hours: 168, interval: 4 * 60 * 60 * 1000 },
    last30d: { hours: 720, interval: 24 * 60 * 60 * 1000 },
    last60d: { hours: 1440, interval: 24 * 60 * 60 * 1000 },
    last90d: { hours: 2160, interval: 24 * 60 * 60 * 1000 },
  };
  const config = rangeMap[params.range] || rangeMap['last24h'];
  return {
    start: new Date(now.getTime() - config.hours * 60 * 60 * 1000),
    end: now,
    intervalMs: config.interval,
  };
}

export async function getFpySeries(params: QualityParams): Promise<FpyDataPoint[]> {
  const { start, end, intervalMs } = getTimeRange(params);
  if (isDemoMode()) return generateFpySeries(start, end, intervalMs);
  try {
    return generateFpySeries(start, end, intervalMs);
  } catch (err) {
    console.warn('Error fetching FPY series, using demo:', err);
    return generateFpySeries(start, end, intervalMs);
  }
}

export async function getDefectsByCause(params: QualityParams): Promise<DefectData[]> {
  if (isDemoMode()) return generateDefectsByCause();
  try {
    return generateDefectsByCause();
  } catch (err) {
    console.warn('Error fetching defects, using demo:', err);
    return generateDefectsByCause();
  }
}

export async function getDefectControlChart(params: QualityParams): Promise<ControlChartPoint[]> {
  const { start, end, intervalMs } = getTimeRange(params);
  if (isDemoMode()) return generateControlChart(start, end, intervalMs);
  try {
    return generateControlChart(start, end, intervalMs);
  } catch (err) {
    console.warn('Error fetching control chart, using demo:', err);
    return generateControlChart(start, end, intervalMs);
  }
}

