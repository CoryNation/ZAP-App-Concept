# Seed Mill Historical Data Migration Guide

## Quick Start

### 1. Apply the Migration

**Via Supabase Dashboard:**
1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New query**
3. Copy and paste the contents of `supabase/migrations/20250101000000_create_seed_mill_events_historical.sql`
4. Click **Run**

**Via Supabase CLI:**
```bash
supabase db push
```

### 2. Load the CSV Data

**Option A: Using the TypeScript Script (Recommended)**
```bash
# Set your CSV file path
export CSV_PATH="/path/to/Zekelman Seed Mill Data - Historical.csv"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the seed script
npm run seed:mill-historical
```

**Option B: Via Supabase Dashboard**
1. Go to **Table Editor** → `seed_mill_events_historical`
2. Click **Insert** → **Import data from CSV**
3. Upload your CSV file
4. Map columns:
   - `Factory` → `factory`
   - `Mill` → `mill`
   - `Event Time` → `event_time`
   - `Shift` → `shift`
   - `FY Week` → `fy_week`
   - `Duration` → `duration_text`
   - `Minutes` → `minutes`
   - `State` → `state`
   - `Reason` → `reason`
   - `Category` → `category`
   - `Sub Category` → `sub_category`
   - `Equipment` → `equipment`
   - `Comment` → `comment`
   - `Month` → `month`
   - `Size` → `product_spec` (or `size`)

## Table Schema

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | NOT NULL | Primary key (auto-generated) |
| `factory` | text | NOT NULL | Factory name (e.g., "Rochelle, IL") |
| `mill` | text | NOT NULL | Mill identifier (e.g., "Mill 1") |
| `event_time` | timestamptz | NOT NULL | When the event occurred |
| `shift` | text | NULL | Shift (e.g., "1st", "2nd") |
| `fy_week` | text | NULL | Fiscal year week (e.g., "Week 3") |
| `duration_text` | text | NULL | Raw duration string (e.g., "0:12:06") |
| `minutes` | numeric | NULL | Duration in minutes |
| `state` | text | NOT NULL | Event state: "RUNNING" or "DOWNTIME" |
| `reason` | text | NULL | Reason for the event |
| `category` | text | NULL | Category (e.g., "Production", "Maintenance") |
| `sub_category` | text | NULL | Sub-category |
| `equipment` | text | NULL | Equipment involved |
| `comment` | text | NULL | Additional comments |
| `month` | text | NULL | Month name (e.g., "October") |
| `product_spec` | text | NULL | Product specification (from "Size" column) |
| `size` | text | NULL | Original size value |
| `created_at` | timestamptz | NOT NULL | Record creation timestamp |

## Constraints

- **State Check**: `state` must be either `'RUNNING'` or `'DOWNTIME'`
- **Required Fields**: `factory`, `mill`, `event_time`, `state`

## Indexes

The following indexes are created for query performance:

- `(mill, event_time)` - For mill-specific time range queries
- `state` - For filtering by state
- `reason` - For reason-based queries
- `category` - For category-based queries
- `factory` - For factory-based queries
- `event_time` - For time-based queries

## Row Level Security (RLS)

- **Enabled**: Yes
- **Authenticated Users**: Read-only access (SELECT only)
- **Service Role**: Full access (bypasses RLS)
- **Writes**: Blocked for authenticated users (use service role for inserts/updates)

## Example Queries

```sql
-- Get all downtime events for a specific mill
SELECT * FROM seed_mill_events_historical
WHERE mill = 'Mill 1' AND state = 'DOWNTIME'
ORDER BY event_time DESC;

-- Get total downtime minutes by category
SELECT category, SUM(minutes) as total_minutes
FROM seed_mill_events_historical
WHERE state = 'DOWNTIME'
GROUP BY category
ORDER BY total_minutes DESC;

-- Get events for a specific date range
SELECT * FROM seed_mill_events_historical
WHERE event_time >= '2025-10-01' 
  AND event_time < '2025-11-01'
ORDER BY event_time;
```

## Troubleshooting

### Migration Fails
- Check that you're using the service role key (not anon key)
- Verify your Supabase project is active
- Check the SQL Editor for error messages

### CSV Import Fails
- Verify date format matches: `MM/DD/YYYY HH:MM:SS AM/PM`
- Check that required fields (factory, mill, event_time, state) are present
- Ensure state values are exactly "RUNNING" or "DOWNTIME" (case-sensitive)

### RLS Blocking Queries
- Use service role key for writes
- Authenticated users can only read data
- Check your Supabase client configuration

