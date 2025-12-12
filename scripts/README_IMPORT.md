# Seed Mill Historical Data Import Script

This script imports historical mill event data from Excel files into Supabase.

## Overview

The import script (`import_seed_mill_historical.ts`) performs the following steps:

1. **Reads Excel file** (.xlsx) from the provided file path
2. **Normalizes columns**:
   - Renames "Unnamed: 13" → `product_spec`
   - Drops completely empty columns
   - Converts column names to snake_case matching the database schema
3. **Transforms data**:
   - Parses "Event Time" to ISO timestamptz (converts from specified timezone to UTC)
   - Normalizes state values to uppercase
   - Converts minutes to numeric
4. **Writes CSV** to `./tmp/seed_mill_events_historical.csv` for backup/review
5. **Bulk upserts** data into Supabase `seed_mill_events_historical` table

## Prerequisites

1. ✅ Supabase table created (run migration first)
2. ✅ Environment variables set (see below)
3. ✅ Excel file available

## Required Environment Variables

Set these in `.env.local` or as environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**⚠️ SECURITY WARNING:**
- **NEVER** expose the service role key client-side
- **NEVER** commit `.env.local` to version control
- The service role key has full database access and bypasses RLS
- Only use this key in server-side scripts and secure environments

**To get your service role key:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** key (not the anon key)
3. Store it securely in `.env.local` (which is gitignored)

## Usage

### Basic Usage

```bash
npm run import:mill-excel "path/to/file.xlsx"
```

### With Custom Timezone

```bash
npm run import:mill-excel "path/to/file.xlsx" "America/Chicago"
```

### Direct ts-node

```bash
ts-node scripts/import_seed_mill_historical.ts "C:\Users\user\Downloads\data.xlsx" "America/Chicago"
```

## Example Command

```powershell
# PowerShell
npm run import:mill-excel "C:\Users\coryn\Downloads\Zekelman Seed Mill Data - Historical.xlsx"
```

```bash
# Bash
npm run import:mill-excel "/path/to/Zekelman Seed Mill Data - Historical.xlsx"
```

## Column Mapping

The script automatically maps Excel columns to database columns:

| Excel Column | Database Column | Notes |
|-------------|----------------|-------|
| `Factory` | `factory` | Required |
| `Mill` | `mill` | Required |
| `Event Time` | `event_time` | Required, converted to UTC ISO timestamptz |
| `Shift` | `shift` | |
| `FY Week` | `fy_week` | |
| `Duration` | `duration_text` | Raw duration string (e.g., "0:12:06") |
| `Minutes` | `minutes` | Numeric value |
| `State` | `state` | Required, normalized to uppercase |
| `Reason` | `reason` | |
| `Category` | `category` | |
| `Sub Category` | `sub_category` | |
| `Equipment` | `equipment` | |
| `Comment` | `comment` | |
| `Month` | `month` | |
| `Size` | `product_spec` | |
| `Unnamed: 13` | `product_spec` | Handles unnamed columns |

### Sample Output Row

After transformation, a row looks like this:

```json
{
  "factory": "Rochelle, IL",
  "mill": "Mill 1",
  "event_time": "2025-10-13T12:00:00.000Z",
  "shift": "1st",
  "fy_week": "Week 3",
  "duration_text": "0:12:06",
  "minutes": 12,
  "state": "DOWNTIME",
  "reason": "Operational - Seam Welding - Adjust For Weld",
  "category": "Production",
  "sub_category": "Operational",
  "equipment": "Welding",
  "comment": "New forming rolls getting dimensions and testing weld",
  "month": "October",
  "product_spec": null,
  "size": null
}
```

## Data Transformations

### Event Time
- **Input**: Excel date/time (e.g., "10/13/2025 7:00:00 AM" or Excel serial number)
- **Timezone**: Assumed to be in the specified timezone (default: "America/Chicago")
- **Output**: ISO 8601 UTC timestamptz (e.g., "2025-10-13T12:00:00.000Z")

### State
- **Input**: Any case (e.g., "downtime", "RUNNING", "Unknown")
- **Output**: Uppercase trimmed (e.g., "DOWNTIME", "RUNNING", "UNKNOWN")
- **Valid states**: RUNNING, DOWNTIME, UNSCHEDULED, UNKNOWN, CHANGEOVER

### Minutes
- **Input**: String or number
- **Output**: Numeric value or null

### Empty Columns
- Columns with no data in any row are automatically dropped
- A warning is printed for each dropped column

## Output Files

### CSV File
- **Location**: `./tmp/seed_mill_events_historical.csv`
- **Purpose**: Backup and review of transformed data
- **Format**: Standard CSV with headers matching database columns

## Error Handling

The script will:
- ✅ Skip rows missing required fields (factory, mill, event_time, state)
- ✅ Warn about unparseable dates (row is skipped)
- ✅ Continue processing even if some batches fail
- ✅ Provide a summary of successful inserts vs errors

## Troubleshooting

### "Excel file not found"
- Check the file path is correct
- Use absolute paths if relative paths don't work
- On Windows, use quotes around paths with spaces

### "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
- Create `.env.local` file in project root
- Add the required environment variables
- Make sure you're using the **service_role** key (not anon key)

### "Could not parse event_time"
- Check the date format in Excel
- Verify the timezone parameter is correct
- Some Excel date formats may need adjustment

### Import fails with constraint errors
- Verify the state constraint allows all states in your data
- Run the migration update: `20250101000001_update_state_constraint.sql`
- Check that required fields are present

### Batch insert errors
- Check Supabase table exists and migration was applied
- Verify RLS policies allow service role access
- Check for data type mismatches

## Related Files

- **Migration**: `supabase/migrations/20250101000000_create_seed_mill_events_historical.sql`
- **State Constraint Update**: `supabase/migrations/20250101000001_update_state_constraint.sql`
- **CSV Seed Script**: `scripts/seed-mill-historical-data.ts` (alternative for CSV files)

