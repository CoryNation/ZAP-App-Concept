# Supabase Migrations

## Applying the seed_mill_events_historical Migration

### Option 1: Supabase Dashboard (Recommended for first-time setup)

1. **Navigate to SQL Editor**
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the left sidebar

2. **Create a new query**
   - Click "New query"
   - Copy and paste the contents of `20250101000000_create_seed_mill_events_historical.sql`
   - Click "Run" to execute the migration

3. **Verify the table was created**
   - Go to "Table Editor" in the left sidebar
   - You should see `seed_mill_events_historical` in the list

### Option 2: Supabase CLI (For development workflow)

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Apply the migration**
   ```bash
   supabase db push
   ```

   Or apply a specific migration:
   ```bash
   supabase migration up
   ```

### Option 3: Direct SQL Connection

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/20250101000000_create_seed_mill_events_historical.sql
```

## Loading the CSV Data

After creating the table, you can load the CSV data using:

### Option 1: Supabase Dashboard

1. Go to "Table Editor"
2. Select `seed_mill_events_historical`
3. Click "Insert" → "Import data from CSV"
4. Upload `Zekelman Seed Mill Data - Historical.csv`
5. Map columns (note: CSV "Size" maps to `product_spec` in the table)

### Option 2: Using a Script

See `scripts/seed-mill-historical-data.ts` for a TypeScript script to load the data programmatically.

## Table Structure

- **Primary Key**: `id` (UUID, auto-generated)
- **Required Fields**: `factory`, `mill`, `event_time`, `state`
- **State Constraint**: Must be either 'RUNNING' or 'DOWNTIME'
- **RLS**: Enabled - authenticated users can read, but cannot write

## Permissions

- **Authenticated users**: Read-only access
- **Service role**: Full access (bypasses RLS)
- **Admin role**: Can be granted explicit write permissions if needed

## Indexes

The following indexes are created for performance:
- `(mill, event_time)` - For mill-specific time range queries
- `state` - For filtering by state
- `reason` - For reason-based queries
- `category` - For category-based queries
- `factory` - For factory-based queries
- `event_time` - For time-based queries

