/**
 * Valid state values for seed_mill_events_historical table
 * Must match the CHECK constraint in Supabase:
 * CHECK (state IN ('RUNNING', 'DOWNTIME', 'UNSCHEDULED', 'UNKNOWN', 'CHANGEOVER'))
 * 
 * See: supabase/migrations/20250101000001_update_state_constraint.sql
 */
export const VALID_STATES = ['RUNNING', 'DOWNTIME', 'UNSCHEDULED', 'UNKNOWN', 'CHANGEOVER'] as const;

export type HistoricalEventState = typeof VALID_STATES[number];

