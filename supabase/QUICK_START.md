# Quick Start: Loading Historical Mill Data

## Prerequisites

1. ✅ Supabase migration has been applied (table created)
2. ✅ `ts-node` is installed (run `npm install` if needed)
3. ✅ CSV file is available

## Step 1: Set Environment Variables

Create a `.env.local` file or set environment variables:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional (if CSV is not in project root)
CSV_PATH=C:\Users\coryn\Downloads\Zekelman Seed Mill Data - Historical.csv
```

**To get your service role key:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the "service_role" key (not the anon key)

## Step 2: Run the Seed Script

**Option A: CSV in project root**
```bash
npm run seed:mill-historical
```

**Option B: CSV in custom location**
```powershell
# PowerShell
$env:CSV_PATH="C:\Users\coryn\Downloads\Zekelman Seed Mill Data - Historical.csv"
$env:SUPABASE_URL="https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-key"
npm run seed:mill-historical
```

**Option C: One-liner (PowerShell)**
```powershell
$env:CSV_PATH="C:\Users\coryn\Downloads\Zekelman Seed Mill Data - Historical.csv"; $env:SUPABASE_URL="https://your-project.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="your-key"; npm run seed:mill-historical
```

## Step 3: Verify Data

Check the Supabase dashboard:
1. Go to **Table Editor** → `seed_mill_events_historical`
2. You should see ~1314 rows of data

## Troubleshooting

### "ts-node is not recognized"
```bash
npm install
```

### "CSV file not found"
- Set `CSV_PATH` environment variable to the full path
- Or copy the CSV file to the project root

### "SUPABASE_SERVICE_ROLE_KEY must be set"
- Make sure you're using the **service_role** key (not anon key)
- Set it as an environment variable before running

### Import fails with date errors
- Check that dates are in format: `MM/DD/YYYY HH:MM:SS AM/PM`
- The script will skip rows with invalid dates

