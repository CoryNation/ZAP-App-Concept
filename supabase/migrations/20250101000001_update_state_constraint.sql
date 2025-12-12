-- Migration: Update state constraint to allow additional states from historical data
-- Description: The historical CSV contains states beyond RUNNING and DOWNTIME

-- Drop the existing constraint
ALTER TABLE seed_mill_events_historical
  DROP CONSTRAINT IF EXISTS check_state_valid;

-- Add new constraint that allows all states found in the historical data
ALTER TABLE seed_mill_events_historical
  ADD CONSTRAINT check_state_valid 
  CHECK (state IN ('RUNNING', 'DOWNTIME', 'UNSCHEDULED', 'UNKNOWN', 'CHANGEOVER'));

