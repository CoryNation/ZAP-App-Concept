# ZAP App Implementation Status

## ✅ Completed (Commits 1-3)

1. **Demo Mode Foundation** ✅
   - Types system (`src/lib/types.ts`)
   - Demo data generators (`src/lib/demo/generators.ts`)
   - Seed script placeholder (`scripts/seed-demo-data.ts`)
   - Package.json script: `npm run seed:demo`

2. **Service Layer** ✅
   - `metricsService.ts` - KPIs, OEE, speed series, distributions
   - `downtimeService.ts` - Pareto, timeline, scatter
   - `qualityService.ts` - FPY, defects, control charts
   - `maintenanceService.ts` - MTTR/MTBF metrics
   - `insightsService.ts` - AI-driven insights generation
   - All services have demo mode fallbacks

3. **Reusable Components** ✅
   - `KpiTile.tsx` - Metric display with deltas/targets
   - `LineCard.tsx` - Line charts with goal lines
   - `BarCard.tsx` - Bar charts (stacked option)
   - `ScatterCard.tsx` - Scatter plots with color coding

## 🚧 Remaining Work (Commits 4-9)

### 4. Plant Performance Page (Priority 1)
**File:** `src/app/operations/plant-performance/page.tsx`
**Features:**
- 8 chart cards using services + components above
- Multi-series speed chart with 700 ft/min goal line  
- Downtime Pareto with 80/20 overlay
- OEE stacked columns + line
- Speed vs Downtime scatter
- FPY by line
- MTTR/MTBF KPI tiles
- AI Insights card

**Status:** Template created below, needs integration

### 5. Downtime Page (Priority 2)
**File:** `src/app/operations/downtime/page.tsx`
**Replace:** Current placeholder
**Features:**
- 4 KPI tiles (total hours, events, top cause, mean duration)
- Pareto chart (expanded from performance page)
- Timeline/Gantt view of events
- Heatmap by day × shift
- Quick action buttons

**Status:** Needs implementation

### 6. Quality Page (Priority 2)
**File:** `src/app/operations/quality/page.tsx`
**Replace:** Current placeholder
**Features:**
- 3 KPI tiles (FPY, scrap rate, top defect)
- FPY trend with goal band
- Defects by cause bar chart
- Control chart (p-chart) with UCL/LCL
- Rule violations annotated

**Status:** Needs implementation

### 7. HMW System (Priority 1)
**Files:**
- `src/lib/hmw/hmw.json` - HMW prompts database
- `src/app/inspiration/page.tsx` - Gallery view
- Update routes.ts to add /inspiration

**Features:**
- 6-10 prompts per category (5 categories)
- Mini-viz on some cards
- "Create Concept from this" CTA
- Contextual HMW on ops pages
- Prefill concepts form

**Status:** JSON structure defined, page needs implementation

### 8. Home Page Enrichment (Priority 2)
**File:** `src/app/page.tsx`
**Add:**
- 2×2 KPI tile grid (speed, goal %, downtime, requests)
- Uses `getPlantKpis()` service
- Plant selector scope card (bound to global filters)

**Status:** Existing page, needs KPI additions

### 9. Documentation
**Files:**
- README.md - Add demo mode section
- Screenshots

**Status:** Needs writing

## Quick Reference

### Environment Variables
```
APP_DEMO_MODE=true              # Use synthetic data
NEXT_PUBLIC_SUPABASE_URL=...    # Supabase connection
NEXT_PUBLIC_SUPABASE_ANON_KEY=... 
SUPABASE_SERVICE_ROLE_KEY=...   # For seeding only
```

### Key Patterns Established

**Service Layer Pattern:**
```typescript
const isDemoMode = () => process.env.NEXT_PUBLIC_APP_DEMO_MODE === 'true';

export async function getData(params) {
  if (isDemoMode()) return generateDemoData();
  try {
    // Supabase query
    return realData;
  } catch (err) {
    console.warn('Fallback to demo');
    return generateDemoData();
  }
}
```

**Page Pattern:**
```typescript
'use client';
import { useGlobalFilters } from '@/src/lib/state/globalFilters';
import { getServiceData } from '@/src/lib/services/...';

export default function Page() {
  const { factoryId, lineId, timeRange } = useGlobalFilters();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getServiceData({ factoryId, lineId, range: timeRange });
      setData(result);
      setLoading(false);
    }
    load();
  }, [factoryId, lineId, timeRange]);

  return <Stack spacing={2}>...</Stack>;
}
```

### Colors
- Primary: `#b51e27`
- Goal line: Red `#b51e27`
- Line A: `#1976d2`
- Line B: `#388e3c`
- Line C: `#f57c00`

### Next Steps
1. Copy plant-performance template to file
2. Update routes.ts to add /operations/plant-performance
3. Implement downtime and quality pages
4. Create HMW JSON and inspiration page
5. Enrich home page with KPIs
6. Document in README


