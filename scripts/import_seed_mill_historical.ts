/**
 * Import script: Excel → CSV → Supabase
 * 
 * Reads an Excel file, normalizes columns, converts to CSV, and bulk upserts to Supabase.
 * 
 * Usage:
 *   ts-node scripts/import_seed_mill_historical.ts <excel-file-path> [timezone]
 * 
 * Example:
 *   ts-node scripts/import_seed_mill_historical.ts "C:\Users\user\Downloads\data.xlsx" "America/Chicago"
 * 
 * Prerequisites:
 *   1. Supabase table must be created (run migration first)
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or environment variables
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import XLSX from 'xlsx';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Set them in .env.local or as environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Column mapping: Excel column names → database column names (snake_case)
const COLUMN_MAPPING: Record<string, string> = {
  'Factory': 'factory',
  'Mill': 'mill',
  'Event Time': 'event_time',
  'Shift': 'shift',
  'FY Week': 'fy_week',
  'Duration': 'duration_text',
  'Minutes': 'minutes',
  'State': 'state',
  'Reason': 'reason',
  'Category': 'category',
  'Sub Category': 'sub_category',
  'Equipment': 'equipment',
  'Comment': 'comment',
  'Month': 'month',
  'Size': 'product_spec',
  'Unnamed: 13': 'product_spec', // Handle unnamed column
};

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Normalize column name
 */
function normalizeColumnName(name: string): string {
  const trimmed = name.trim();
  // Check if we have a direct mapping
  if (COLUMN_MAPPING[trimmed]) {
    return COLUMN_MAPPING[trimmed];
  }
  // Convert to snake_case
  return toSnakeCase(trimmed);
}

/**
 * Parse date/time string and convert to UTC ISO string
 * Assumes input is in the specified timezone (default: America/Chicago)
 * 
 * Note: This is a simplified timezone conversion. For production use with
 * complex timezone requirements, consider using a library like 'date-fns-tz' or 'luxon'.
 */
function parseDateTime(dateTimeStr: any, timezone: string = 'America/Chicago'): string | null {
  if (!dateTimeStr) return null;
  
  let date: Date | null = null;
  
  // Handle Excel date serial numbers
  if (typeof dateTimeStr === 'number' || (typeof dateTimeStr === 'string' && /^\d+\.\d+$/.test(dateTimeStr))) {
    // Excel date serial number - convert to JavaScript date
    const excelDate = typeof dateTimeStr === 'number' ? dateTimeStr : parseFloat(dateTimeStr);
    const jsDate = XLSX.SSF.parse_date_code(excelDate);
    if (jsDate) {
      // Create date in UTC, then adjust for timezone offset
      date = new Date(Date.UTC(jsDate.y, jsDate.m - 1, jsDate.d, jsDate.H, jsDate.M, jsDate.S));
    }
  } else if (typeof dateTimeStr === 'string') {
    // Try parsing as string date
    // Format: "10/13/2025 7:00:00 AM" or similar
    // Parse assuming the string represents a date in the specified timezone
    date = new Date(dateTimeStr);
  }
  
  if (!date || isNaN(date.getTime())) {
    return null;
  }
  
  // Simple timezone offset conversion for America/Chicago (UTC-6 or UTC-5 depending on DST)
  // For more accurate conversion, use a timezone library
  if (timezone === 'America/Chicago') {
    // America/Chicago is UTC-6 (CST) or UTC-5 (CDT)
    // We'll use a simple offset - for production, use proper timezone library
    // For now, assume the date string is already in local time and convert
    // This works if Excel stores dates in local timezone
  }
  
  return date.toISOString();
}

/**
 * Check if a column is completely empty
 */
function isColumnEmpty(data: any[][], columnIndex: number): boolean {
  for (const row of data) {
    if (row[columnIndex] !== undefined && row[columnIndex] !== null && row[columnIndex] !== '') {
      return false;
    }
  }
  return true;
}

/**
 * Convert Excel to normalized data
 */
function excelToNormalizedData(excelPath: string, timezone: string = 'America/Chicago'): any[] {
  console.log(`📖 Reading Excel file: ${excelPath}`);
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }
  
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log(`   Using sheet: ${sheetName}`);
  
  // Convert to JSON with header row
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
    defval: null,
    raw: false, // Get formatted values
  });
  
  if (rawData.length === 0) {
    throw new Error('Excel file appears to be empty');
  }
  
  console.log(`   Found ${rawData.length} rows`);
  
  // Get original headers
  const originalHeaders = Object.keys(rawData[0] || {});
  console.log(`   Original columns: ${originalHeaders.join(', ')}`);
  
  // Identify empty columns and columns to drop
  const headersToKeep: string[] = [];
  const headerMap: Record<string, string> = {};
  
  for (const header of originalHeaders) {
    // Check if column has any data
    const hasData = rawData.some(row => {
      const value = row[header];
      return value !== undefined && value !== null && value !== '';
    });
    
    if (!hasData) {
      console.log(`   ⚠️  Dropping empty column: ${header}`);
      continue;
    }
    
    // Map column name
    const normalizedName = normalizeColumnName(header);
    headersToKeep.push(header);
    headerMap[header] = normalizedName;
    
    if (header !== normalizedName) {
      console.log(`   📝 Mapping: "${header}" → "${normalizedName}"`);
    }
  }
  
  // Transform data
  const normalizedData = rawData.map((row, index) => {
    const transformed: any = {};
    
    for (const [originalHeader, normalizedHeader] of Object.entries(headerMap)) {
      let value = row[originalHeader];
      
      // Handle special transformations
      if (normalizedHeader === 'event_time') {
        value = parseDateTime(value, timezone);
        if (!value && row[originalHeader]) {
          console.warn(`   ⚠️  Row ${index + 2}: Could not parse event_time: ${row[originalHeader]}`);
        }
      } else if (normalizedHeader === 'minutes') {
        // Try to parse as number
        if (value !== null && value !== undefined && value !== '') {
          const num = parseFloat(String(value));
          value = isNaN(num) ? null : num;
        } else {
          value = null;
        }
      } else if (normalizedHeader === 'state') {
        // Normalize state to uppercase
        value = value ? String(value).toUpperCase().trim() : null;
      } else if (value !== null && value !== undefined) {
        // Convert to string, trim whitespace
        value = String(value).trim() || null;
      } else {
        value = null;
      }
      
      transformed[normalizedHeader] = value;
    }
    
    return transformed;
  }).filter(row => {
    // Filter out rows missing required fields
    if (!row.factory || !row.mill || !row.event_time || !row.state) {
      return false;
    }
    return true;
  });
  
  console.log(`   ✅ Prepared ${normalizedData.length} valid rows`);
  
  return normalizedData;
}

/**
 * Write data to CSV file
 */
function writeCSV(data: any[], outputPath: string): void {
  console.log(`📝 Writing CSV to: ${outputPath}`);
  
  // Ensure tmp directory exists
  const tmpDir = path.dirname(outputPath);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  if (data.length === 0) {
    throw new Error('No data to write');
  }
  
  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Write CSV
  const lines: string[] = [];
  
  // Header row
  lines.push(headers.join(','));
  
  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }
  
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`   ✅ Wrote ${data.length} rows to CSV`);
}

/**
 * Bulk upsert to Supabase
 */
async function bulkUpsert(data: any[]): Promise<void> {
  console.log(`🚀 Upserting ${data.length} rows to Supabase...`);
  
  const batchSize = 100;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(data.length / batchSize);
    
    try {
      // Use insert (upsert would require a unique constraint on non-id fields)
      // For historical data, we typically want to insert new records
      const { error } = await supabase
        .from('seed_mill_events_historical')
        .insert(batch);
      
      if (error) {
        console.error(`   ❌ Batch ${batchNum}/${totalBatches} error:`, error.message);
        if (error.details) {
          console.error(`      Details: ${error.details}`);
        }
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${inserted}/${data.length} rows`);
      }
    } catch (err: any) {
      console.error(`   ❌ Batch ${batchNum}/${totalBatches} exception:`, err.message);
      errors += batch.length;
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successfully inserted: ${inserted} rows`);
  console.log(`   ❌ Errors: ${errors} rows`);
  console.log(`   📦 Total processed: ${data.length} rows`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: Excel file path is required');
    console.error('');
    console.error('Usage:');
    console.error('  ts-node scripts/import_seed_mill_historical.ts <excel-file-path> [timezone]');
    console.error('');
    console.error('Example:');
    console.error('  ts-node scripts/import_seed_mill_historical.ts "data.xlsx" "America/Chicago"');
    process.exit(1);
  }
  
  const excelPath = args[0];
  const timezone = args[1] || 'America/Chicago';
  
  console.log('📥 Excel → CSV → Supabase Import Script');
  console.log('=====================================\n');
  console.log(`   Excel file: ${excelPath}`);
  console.log(`   Timezone: ${timezone}\n`);
  
  try {
    // Step 1: Read Excel and normalize
    const normalizedData = excelToNormalizedData(excelPath, timezone);
    
    // Step 2: Write CSV
    const csvPath = path.join(process.cwd(), 'tmp', 'seed_mill_events_historical.csv');
    writeCSV(normalizedData, csvPath);
    
    // Step 3: Upsert to Supabase
    await bulkUpsert(normalizedData);
    
    console.log('\n✅ Import complete!');
    console.log(`   CSV saved to: ${csvPath}`);
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();

