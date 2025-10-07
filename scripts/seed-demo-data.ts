/**
 * Seed script for demo data
 * Run with: ts-node scripts/seed-demo-data.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */

console.log('🌱 ZAP App Demo Data Seeder');
console.log('This script seeds Supabase with 90 days of realistic manufacturing data.');
console.log('');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found.');
  console.log('Seeding requires service role key. Skipping...');
  console.log('');
  console.log('To seed data:');
  console.log('1. Get your service role key from Supabase dashboard');
  console.log('2. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key');
  console.log('3. Run: npm run seed:demo');
  process.exit(0);
}

console.log('✅ Service role key found');
console.log('');
console.log('📝 Seeding plan:');
console.log('  - 3 plants × 3 lines = 9 production lines');
console.log('  - 90 days of data');
console.log('  - line_speed_events (5-min aggregates)');
console.log('  - downtime_events (start/end/cause)');
console.log('  - quality_events (defects, FPY)');
console.log('  - maintenance_events (MTTR/MTBF)');
console.log('');
console.log('🚧 Implementation pending - tables must be created first.');
console.log('See README for table schema or use Supabase migrations.');
console.log('');

// TODO: Implement actual seeding logic when tables are defined
// This would use @supabase/supabase-js with service role key
// and generate data using src/lib/demo/generators.ts

export {};

