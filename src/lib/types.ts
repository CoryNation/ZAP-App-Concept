// Shared types for ZAP App

export interface TimeRange {
  range: 'last24h' | 'last7d' | 'last30d' | 'last60d' | 'last90d' | 'custom';
  customStartDate?: string | null;
  customEndDate?: string | null;
}

export interface PlantKpis {
  avgLineSpeed: number; // ft/min
  goalAttainmentPct: number; // percentage at or above 700
  downtimeHours: number;
  openRequests: number;
}

export interface OeeDataPoint {
  ts: string;
  availability: number; // 0-1
  performance: number; // 0-1
  quality: number; // 0-1
  oee: number; // 0-1
  line?: string;
}

export interface SpeedDataPoint {
  ts: string;
  value: number; // ft/min
}

export interface SpeedSeries {
  name: string;
  data: SpeedDataPoint[];
}

export interface HistogramBin {
  min: number;
  max: number;
  count: number;
  label: string;
}

export interface DowntimeCause {
  cause: string;
  hours: number;
  count: number;
}

export interface DowntimeEvent {
  start: string;
  end: string;
  line: string;
  cause: string;
  severity?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface SpeedVsDowntimePoint {
  speed: number;
  downtimeMins: number;
  line: string;
  date: string;
}

export interface FpyDataPoint {
  ts: string;
  fpy: number; // First Pass Yield 0-1
  line?: string;
  target?: number;
}

export interface DefectData {
  defect: string;
  count: number;
  percentage?: number;
}

export interface ControlChartPoint {
  ts: string;
  value: number;
  ucl: number; // Upper Control Limit
  lcl: number; // Lower Control Limit
  mean: number;
  violation?: boolean;
}

export interface MaintenanceMetrics {
  line: string;
  mttrHrs: number; // Mean Time To Repair
  mtbfHrs: number; // Mean Time Between Failures
  completedEvents: number;
}

export interface Insight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'action';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export interface HmwEntry {
  id: string;
  category: 'Decision Support' | 'Operational/Quality Improvement' | 'Safety & Environmental' | 
           'Data Systems & Measures' | 'Plant Performance & Data Management';
  prompt: string;
  tags: string[];
  miniViz?: 'sparkline' | 'bar' | 'trend' | null;
}

