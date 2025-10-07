import { supabase } from '@/lib/supabaseClient';
import {
  PlantKpis,
  OeeDataPoint,
  SpeedSeries,
  HistogramBin,
  TimeRange,
} from '../types';
import {
  generateSpeedSeries,
  generatePlantKpis,
  generateOeeSeries,
  generateSpeedDistribution,
} from '../demo/generators';

const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

interface MetricsParams {
  plantId?: string | null;
  lineIds?: string[] | null;
  range: TimeRange['range'];
  customStartDate?: string | null;
  customEndDate?: string | null;
}

function calculateTimeRange(params: MetricsParams) {
  const now = new Date();
  const msPerHour = 1000 * 60 * 60;
  let startTime: Date;
  let intervalMs: number;

  if (params.range === 'custom' && params.customStartDate && params.customEndDate) {
    startTime = new Date(params.customStartDate);
    const endTime = new Date(params.customEndDate);
    const daysDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (24 * msPerHour));
    intervalMs = daysDiff <= 2 ? msPerHour : daysDiff <= 14 ? 4 * msPerHour : 24 * msPerHour;
    return { startTime, endTime, intervalMs };
  }

  const rangeMap = {
    last24h: { hours: 24, interval: msPerHour },
    last7d: { hours: 7 * 24, interval: 4 * msPerHour },
    last30d: { hours: 30 * 24, interval: 24 * msPerHour },
    last60d: { hours: 60 * 24, interval: 24 * msPerHour },
    last90d: { hours: 90 * 24, interval: 24 * msPerHour },
  };

  const config = rangeMap[params.range] || rangeMap.last24h;
  startTime = new Date(now.getTime() - config.hours * msPerHour);
  intervalMs = config.interval;

  return { startTime, endTime: now, intervalMs };
}

export async function getPlantKpis(params: MetricsParams): Promise<PlantKpis> {
  if (isDemoMode()) {
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    const speedSeries = generateSpeedSeries(startTime, endTime, intervalMs);
    return generatePlantKpis(speedSeries);
  }

  try {
    // TODO: Implement Supabase query when tables exist
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    const speedSeries = generateSpeedSeries(startTime, endTime, intervalMs);
    return generatePlantKpis(speedSeries);
  } catch (err) {
    console.warn('Error fetching plant KPIs, using demo data:', err);
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    const speedSeries = generateSpeedSeries(startTime, endTime, intervalMs);
    return generatePlantKpis(speedSeries);
  }
}

export async function getOeeSeries(params: MetricsParams): Promise<OeeDataPoint[]> {
  if (isDemoMode()) {
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    return generateOeeSeries(startTime, endTime, intervalMs);
  }

  try {
    // TODO: Implement Supabase query
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    return generateOeeSeries(startTime, endTime, intervalMs);
  } catch (err) {
    console.warn('Error fetching OEE series, using demo data:', err);
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    return generateOeeSeries(startTime, endTime, intervalMs);
  }
}

export async function getSpeedSeries(params: MetricsParams): Promise<SpeedSeries[]> {
  if (isDemoMode()) {
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    return generateSpeedSeries(startTime, endTime, intervalMs);
  }

  try {
    // TODO: Implement Supabase query
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    return generateSpeedSeries(startTime, endTime, intervalMs);
  } catch (err) {
    console.warn('Error fetching speed series, using demo data:', err);
    const { startTime, endTime, intervalMs } = calculateTimeRange(params);
    return generateSpeedSeries(startTime, endTime, intervalMs);
  }
}

export async function getSpeedDistribution(params: MetricsParams): Promise<HistogramBin[]> {
  const speedSeries = await getSpeedSeries(params);
  return generateSpeedDistribution(speedSeries);
}

