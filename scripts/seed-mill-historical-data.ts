/**
 * Script to seed historical mill event data from CSV
 * 
 * Usage:
 *   npm run seed:mill-historical
 *   or
 *   ts-node scripts/seed-mill-historical-data.ts
 * 
 * Prerequisites:
 *   1. Supabase table must be created (run migration first)
 *   2. Set SUPABASE_SERVICE_ROLE_KEY in .env.local file or environment variables
 */

// Load environment variables from .env.local or .env
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load .env.local first, then .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface CSVRow {
  Factory: string;
  Mill: string;
  'Event Time': string;
  Shift: string;
  'FY Week': string;
  Duration: string;
  Minutes: string;
  State: string;
  Reason: string;
  Category: string;
  'Sub Category': string;
  Equipment: string;
  Comment: string;
  Month: string;
  Size: string;
}

function parseDuration(durationStr: string): number | null {
  if (!durationStr || durationStr.trim() === '') return null;
  
  // Parse format like "0:12:06" (hours:minutes:seconds)
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
  return null;
}

function parseDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr || dateTimeStr.trim() === '') return null;
  
  // Parse format like "10/13/2025 7:00:00 AM"
  const date = new Date(dateTimeStr);
  return isNaN(date.getTime()) ? null : date;
}

async function seedHistoricalData() {
  // Update this path to point to your CSV file location
  const csvPath = process.env.CSV_PATH || path.join(process.cwd(), 'Zekelman Seed Mill Data - Historical.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    console.error('Please set CSV_PATH environment variable or place the file in the project root');
    console.error('Example: CSV_PATH=/path/to/file.csv npm run seed:mill-historical');
    process.exit(1);
  }

  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  console.log('Parsing CSV...');
  // Simple CSV parser (handles quoted fields)
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const records: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Last value
    
    if (values.length >= headers.length) {
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx]?.replace(/^"|"$/g, '') || '';
      });
      records.push(record as CSVRow);
    }
  }

  console.log(`Found ${records.length} rows to import`);

  // Transform CSV rows to database format
  const events = records.map((row, index) => {
    const eventTime = parseDateTime(row['Event Time']);
    if (!eventTime) {
      console.warn(`Warning: Row ${index + 2} has invalid event time: ${row['Event Time']}`);
    }

    const minutes = row.Minutes ? parseFloat(row.Minutes) : parseDuration(row.Duration);

    return {
      factory: row.Factory?.replace(/^"|"$/g, '') || null, // Remove quotes
      mill: row.Mill || null,
      event_time: eventTime?.toISOString() || null,
      shift: row.Shift || null,
      fy_week: row['FY Week'] || null,
      duration_text: row.Duration || null,
      minutes: minutes,
      state: row.State?.toUpperCase().trim() || null,
      reason: row.Reason || null,
      category: row.Category || null,
      sub_category: row['Sub Category'] || null,
      equipment: row.Equipment || null,
      comment: row.Comment || null,
      month: row.Month || null,
      product_spec: row.Size || null, // Map Size to product_spec
      size: row.Size || null, // Keep original for compatibility
    };
  }).filter(event => {
    // Filter out rows with missing required fields
    if (!event.factory || !event.mill || !event.event_time || !event.state) {
      return false;
    }
    return true;
  });

  console.log(`Prepared ${events.length} valid events for insertion`);

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('seed_mill_events_historical')
        .insert(batch);

      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${events.length} events`);
      }
    } catch (err) {
      console.error(`Exception inserting batch ${Math.floor(i / batchSize) + 1}:`, err);
      errors += batch.length;
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Successfully inserted: ${inserted} events`);
  console.log(`Errors: ${errors} events`);
  console.log(`Total processed: ${events.length} events`);
}

// Run the seed function
seedHistoricalData()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

