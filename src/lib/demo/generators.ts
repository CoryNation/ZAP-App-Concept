/**
 * Demo data generators for ZAP App
 * Provides realistic synthetic data when APP_DEMO_MODE=true or database unavailable
 */

import {
  PlantKpis,
  OeeDataPoint,
  SpeedSeries,
  SpeedDataPoint,
  HistogramBin,
  DowntimeCause,
  DowntimeEvent,
  SpeedVsDowntimePoint,
  FpyDataPoint,
  DefectData,
  ControlChartPoint,
  MaintenanceMetrics,
} from '../types';
import { VALID_STATES } from '../constants/stateConstants';

const LINE_NAMES = ['Line A', 'Line B', 'Line C'];
const DOWNTIME_CAUSES = [
  'Changeover',
  'Material Shortage',
  'Equipment Failure',
  'Planned Maintenance',
  'Quality Issue',
  'Operator Training',
  'Power Outage',
  'Calibration',
];

const DEFECT_TYPES = [
  'Weld Spatter',
  'Dimension Out of Spec',
  'Surface Defect',
  'Coating Issue',
  'Alignment Problem',
  'Crack/Fracture',
];

/**
 * Generate realistic line speed data with downtime dips and goal variations
 */
export function generateSpeedSeries(
  startTime: Date,
  endTime: Date,
  intervalMs: number,
  lineNames: string[] = LINE_NAMES
): SpeedSeries[] {
  return lineNames.map((name, lineIndex) => {
    const data: SpeedDataPoint[] = [];
    let currentTime = new Date(startTime);

    while (currentTime <= endTime) {
      const hoursSinceStart = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const seed = lineIndex * 1000 + hoursSinceStart;
      const random = (Math.sin(seed) + 1) / 2;

      let value: number;

      // 5% chance of downtime
      if (random < 0.05) {
        value = 0;
      }
      // 10% chance of reduced speed (changeover/maintenance)
      else if (random < 0.15) {
        value = 300 + Math.random() * 250;
      }
      // Normal operation: 700-800 ft/min with variation
      else {
        const baseline = 750;
        const dailyCycle = Math.sin((hoursSinceStart / 24) * Math.PI * 2) * 30;
        const noise = (Math.random() - 0.5) * 40;
        value = Math.max(650, Math.min(850, baseline + dailyCycle + noise));
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

/**
 * Generate plant-level KPIs
 */
export function generatePlantKpis(speedSeries: SpeedSeries[]): PlantKpis {
  let totalPoints = 0;
  let sumSpeed = 0;
  let aboveGoal = 0;
  let atZero = 0;

  speedSeries.forEach(series => {
    series.data.forEach(point => {
      totalPoints++;
      sumSpeed += point.value;
      if (point.value >= 700) aboveGoal++;
      if (point.value === 0) atZero++;
    });
  });

  const avgLineSpeed = totalPoints > 0 ? Math.round(sumSpeed / totalPoints) : 0;
  const goalAttainmentPct = totalPoints > 0 ? Math.round((aboveGoal / totalPoints) * 100) : 0;
  const downtimeHours = totalPoints > 0 ? ((atZero / totalPoints) * 24 * 7) : 0; // Rough estimate

  return {
    avgLineSpeed,
    goalAttainmentPct,
    downtimeHours: Math.round(downtimeHours * 10) / 10,
    openRequests: Math.floor(Math.random() * 15) + 5,
  };
}

/**
 * Generate OEE time series data
 */
export function generateOeeSeries(
  startTime: Date,
  endTime: Date,
  intervalMs: number,
  lineNames: string[] = LINE_NAMES
): OeeDataPoint[] {
  const data: OeeDataPoint[] = [];
  let currentTime = new Date(startTime);

  while (currentTime <= endTime) {
    lineNames.forEach((line, idx) => {
      const hoursSinceStart = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const seed = idx * 1000 + hoursSinceStart;

      // Generate realistic OEE components
      const availability = 0.85 + (Math.sin(seed) * 0.1);
      const performance = 0.90 + (Math.sin(seed + 1) * 0.08);
      const quality = 0.95 + (Math.sin(seed + 2) * 0.04);
      const oee = availability * performance * quality;

      data.push({
        ts: currentTime.toISOString(),
        availability: Math.max(0.7, Math.min(0.98, availability)),
        performance: Math.max(0.8, Math.min(0.98, performance)),
        quality: Math.max(0.9, Math.min(0.99, quality)),
        oee: Math.max(0.6, Math.min(0.95, oee)),
        line,
      });
    });

    currentTime = new Date(currentTime.getTime() + intervalMs);
  }

  return data;
}

/**
 * Generate speed distribution histogram
 */
export function generateSpeedDistribution(speedSeries: SpeedSeries[]): HistogramBin[] {
  const bins: HistogramBin[] = [
    { min: 0, max: 100, count: 0, label: '0-100' },
    { min: 100, max: 300, count: 0, label: '100-300' },
    { min: 300, max: 500, count: 0, label: '300-500' },
    { min: 500, max: 650, count: 0, label: '500-650' },
    { min: 650, max: 700, count: 0, label: '650-700' },
    { min: 700, max: 750, count: 0, label: '700-750' },
    { min: 750, max: 800, count: 0, label: '750-800' },
    { min: 800, max: 1000, count: 0, label: '800+' },
  ];

  speedSeries.forEach(series => {
    series.data.forEach(point => {
      const bin = bins.find(b => point.value >= b.min && point.value < b.max);
      if (bin) bin.count++;
    });
  });

  return bins;
}

/**
 * Generate downtime Pareto data
 */
export function generateDowntimePareto(): DowntimeCause[] {
  return DOWNTIME_CAUSES.map((cause, idx) => ({
    cause,
    hours: Math.max(1, Math.round((50 / Math.pow(idx + 1, 1.2)) * 10) / 10),
    count: Math.floor((100 / Math.pow(idx + 1, 1.5))),
  })).sort((a, b) => b.hours - a.hours);
}

/**
 * Generate downtime events timeline
 */
export function generateDowntimeEvents(
  startTime: Date,
  endTime: Date,
  lineNames: string[] = LINE_NAMES
): DowntimeEvent[] {
  const events: DowntimeEvent[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const numDays = Math.ceil((endTime.getTime() - startTime.getTime()) / dayMs);

  // Generate 2-5 events per line per week
  const eventsPerLine = Math.floor((numDays / 7) * (2 + Math.random() * 3));

  lineNames.forEach(line => {
    for (let i = 0; i < eventsPerLine; i++) {
      const eventStart = new Date(
        startTime.getTime() + Math.random() * (endTime.getTime() - startTime.getTime())
      );
      const durationMins = Math.random() < 0.3 ? 
        15 + Math.random() * 45 : // Short events
        60 + Math.random() * 180; // Longer events
      const eventEnd = new Date(eventStart.getTime() + durationMins * 60 * 1000);

      events.push({
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        line,
        cause: DOWNTIME_CAUSES[Math.floor(Math.random() * DOWNTIME_CAUSES.length)],
        severity: durationMins > 120 ? 'high' : durationMins > 60 ? 'medium' : 'low',
      });
    }
  });

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

/**
 * Generate speed vs downtime scatter data
 */
export function generateSpeedVsDowntime(
  startTime: Date,
  endTime: Date,
  lineNames: string[] = LINE_NAMES
): SpeedVsDowntimePoint[] {
  const points: SpeedVsDowntimePoint[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  let currentDay = new Date(startTime);
  currentDay.setHours(0, 0, 0, 0);

  while (currentDay <= endTime) {
    lineNames.forEach(line => {
      const baseSpeed = 720 + Math.random() * 60;
      const baseDowntime = 20 + Math.random() * 40;
      
      // Add some correlation: lower speed = more downtime
      const correlation = (750 - baseSpeed) / 100;
      const downtimeMins = Math.max(5, baseDowntime + correlation * 20);

      points.push({
        speed: Math.round(baseSpeed),
        downtimeMins: Math.round(downtimeMins),
        line,
        date: currentDay.toISOString(),
      });
    });

    currentDay = new Date(currentDay.getTime() + dayMs);
  }

  return points;
}

/**
 * Generate historical seed mill events (for demo mode)
 */
export function generateHistoricalEvents(
  startDate: Date,
  endDate: Date,
  mill: string = 'Mill 1'
): any[] {
  const events: any[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const numDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);
  
  // Use valid states from constants to ensure consistency with Supabase constraint
  const states = [...VALID_STATES];
  const reasons = [
    'Changeover',
    'Material Shortage',
    'Equipment Failure',
    'Planned Maintenance',
    'Quality Issue',
    'Calibration',
    'Power Outage',
    'Operator Training',
  ];
  const categories = ['Operational', 'Maintenance', 'Quality', 'Material', 'Equipment'];
  const equipment = ['M-101', 'M-102', 'M-201', 'M-202', 'M-301', 'M-302'];
  const shifts = ['1st', '2nd', '3rd'];
  const productSpecs = ['4.5" x 0.25"', '6" x 0.30"', '8" x 0.35"', '10" x 0.40"'];
  
  // Generate events throughout the date range
  // More events in recent days, fewer in older days
  const eventsPerDay = 8 + Math.floor(Math.random() * 12); // 8-20 events per day
  
  for (let day = 0; day < numDays; day++) {
    const currentDay = new Date(startDate.getTime() + day * dayMs);
    const dayEvents = Math.floor(eventsPerDay * (1 - day / (numDays * 2))); // Fewer events as days go back
    
    for (let i = 0; i < dayEvents; i++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const eventTime = new Date(currentDay);
      eventTime.setHours(hour, minute, 0, 0);
      
      const state = states[Math.floor(Math.random() * states.length)];
      const minutes = state === 'DOWNTIME' 
        ? 5 + Math.random() * 120 // 5-125 minutes for downtime
        : state === 'RUNNING'
        ? 60 + Math.random() * 480 // Running events are longer
        : 15 + Math.random() * 45; // Other states
      
      const reason = state === 'DOWNTIME' 
        ? reasons[Math.floor(Math.random() * reasons.length)]
        : null;
      
      events.push({
        id: `demo-${day}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        factory: 'Rochelle, IL',
        mill: mill,
        event_time: eventTime.toISOString(),
        shift: shifts[Math.floor(Math.random() * shifts.length)],
        fy_week: `Week ${Math.floor(day / 7) + 1}`,
        duration_text: `${Math.floor(minutes / 60)}:${String(Math.floor(minutes % 60)).padStart(2, '0')}:${String(Math.floor((minutes % 1) * 60)).padStart(2, '0')}`,
        minutes: Math.round(minutes * 10) / 10,
        state: state,
        reason: reason,
        category: categories[Math.floor(Math.random() * categories.length)],
        sub_category: reason ? `${reason} - Detail` : null,
        equipment: state === 'DOWNTIME' ? equipment[Math.floor(Math.random() * equipment.length)] : null,
        comment: state === 'DOWNTIME' && Math.random() > 0.5 ? `Issue resolved, production resumed` : null,
        month: currentDay.toLocaleString('en-US', { month: 'short' }),
        product_spec: state === 'RUNNING' ? productSpecs[Math.floor(Math.random() * productSpecs.length)] : null,
        size: state === 'RUNNING' ? productSpecs[Math.floor(Math.random() * productSpecs.length)] : null,
        created_at: new Date().toISOString(),
      });
    }
  }
  
  // Sort by event_time descending (most recent first)
  return events.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
}

/**
 * Generate FPY (First Pass Yield) data
 */
export function generateFpySeries(
  startTime: Date,
  endTime: Date,
  intervalMs: number,
  lineNames: string[] = LINE_NAMES
): FpyDataPoint[] {
  const data: FpyDataPoint[] = [];
  let currentTime = new Date(startTime);

  while (currentTime <= endTime) {
    lineNames.forEach((line, idx) => {
      const hoursSinceStart = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const seed = idx * 500 + hoursSinceStart;

      // FPY typically 95-99%
      const baseFpy = 0.97;
      const variation = Math.sin(seed) * 0.03;
      const fpy = Math.max(0.92, Math.min(0.995, baseFpy + variation));

      data.push({
        ts: currentTime.toISOString(),
        fpy: Math.round(fpy * 10000) / 10000,
        line,
        target: 0.98,
      });
    });

    currentTime = new Date(currentTime.getTime() + intervalMs);
  }

  return data;
}

/**
 * Generate defects by cause
 */
export function generateDefectsByCause(): DefectData[] {
  return DEFECT_TYPES.map((defect, idx) => ({
    defect,
    count: Math.floor((200 / Math.pow(idx + 1, 1.3))),
  })).sort((a, b) => b.count - a.count);
}

/**
 * Generate control chart data (p-chart for defect rate)
 */
export function generateControlChart(
  startTime: Date,
  endTime: Date,
  intervalMs: number
): ControlChartPoint[] {
  const data: ControlChartPoint[] = [];
  let currentTime = new Date(startTime);
  
  const mean = 0.03; // 3% defect rate
  const ucl = mean + 3 * Math.sqrt((mean * (1 - mean)) / 100);
  const lcl = Math.max(0, mean - 3 * Math.sqrt((mean * (1 - mean)) / 100));

  while (currentTime <= endTime) {
    const hoursSinceStart = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const value = mean + (Math.random() - 0.5) * 0.02;
    
    // Occasional violations
    const violation = value > ucl || value < lcl;

    data.push({
      ts: currentTime.toISOString(),
      value: Math.max(0, Math.min(0.1, value)),
      ucl,
      lcl,
      mean,
      violation,
    });

    currentTime = new Date(currentTime.getTime() + intervalMs);
  }

  return data;
}

/**
 * Generate maintenance metrics
 */
export function generateMaintenanceMetrics(lineNames: string[] = LINE_NAMES): MaintenanceMetrics[] {
  return lineNames.map(line => ({
    line,
    mttrHrs: Math.round((2 + Math.random() * 3) * 10) / 10,
    mtbfHrs: Math.round((120 + Math.random() * 80) * 10) / 10,
    completedEvents: Math.floor(15 + Math.random() * 25),
  }));
}

