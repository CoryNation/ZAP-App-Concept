-- Migration: Create seed_mill_events_historical table
-- Description: Historical downtime/state event data for seed mill operations
-- Source: Zekelman Seed Mill Data - Historical.csv (1314 rows)

-- Create the table
CREATE TABLE IF NOT EXISTS seed_mill_events_historical (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory text NOT NULL,
  mill text NOT NULL,
  event_time timestamptz NOT NULL,
  shift text,
  fy_week text,
  duration_text text, -- Store raw duration string (e.g., "0:12:06")
  minutes numeric,
  state text NOT NULL,
  reason text,
  category text,
  sub_category text,
  equipment text,
  comment text,
  month text,
  product_spec text, -- Maps to "Size" column in CSV
  size text, -- Keep original size column for compatibility
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add check constraint for state values
ALTER TABLE seed_mill_events_historical
  ADD CONSTRAINT check_state_valid 
  CHECK (state IN ('RUNNING', 'DOWNTIME'));

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_seed_mill_events_mill_event_time 
  ON seed_mill_events_historical(mill, event_time);

CREATE INDEX IF NOT EXISTS idx_seed_mill_events_state 
  ON seed_mill_events_historical(state);

CREATE INDEX IF NOT EXISTS idx_seed_mill_events_reason 
  ON seed_mill_events_historical(reason);

CREATE INDEX IF NOT EXISTS idx_seed_mill_events_category 
  ON seed_mill_events_historical(category);

CREATE INDEX IF NOT EXISTS idx_seed_mill_events_factory 
  ON seed_mill_events_historical(factory);

CREATE INDEX IF NOT EXISTS idx_seed_mill_events_event_time 
  ON seed_mill_events_historical(event_time);

-- Enable Row Level Security
ALTER TABLE seed_mill_events_historical ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all historical data
CREATE POLICY "Allow authenticated users to read historical events"
  ON seed_mill_events_historical
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Block all writes from authenticated users (read-only for users)
-- Only service role or admin can insert/update/delete
CREATE POLICY "Block writes from authenticated users"
  ON seed_mill_events_historical
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Note: Service role (bypasses RLS) can perform all operations
-- Admin role can be granted explicit permissions if needed via:
-- GRANT ALL ON seed_mill_events_historical TO authenticated;
-- Then create more specific policies for admin role

-- Add comment to table
COMMENT ON TABLE seed_mill_events_historical IS 
  'Historical seed mill downtime and state events. Read-only for authenticated users.';

-- Add comments to key columns
COMMENT ON COLUMN seed_mill_events_historical.event_time IS 
  'Timestamp when the event occurred';
COMMENT ON COLUMN seed_mill_events_historical.state IS 
  'Event state: RUNNING or DOWNTIME';
COMMENT ON COLUMN seed_mill_events_historical.duration_text IS 
  'Raw duration string from source (e.g., "0:12:06")';
COMMENT ON COLUMN seed_mill_events_historical.minutes IS 
  'Duration in minutes as numeric value';

