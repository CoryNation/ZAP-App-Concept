# Production Trials Downtime Page - Architecture & Fix Analysis

## Architecture Map

### Page Component
**File:** `src/app/production-trials/operations/downtime/page.tsx`

**Data Flow:**
```
Page Component
├── useGlobalFilters() hook
│   └── Returns: factoryId, lineId, timeRange, customStartDate, customEndDate
│   └── Source: Zustand store (persisted in localStorage)
│
├── getDowntimePareto(params) service call
│   └── Service: src/lib/services/downtimeService.ts
│   └── Returns: DowntimeCause[] (cause, hours, count)
│   └── Data Source: Demo generators (always, regardless of mode)
│
├── getDowntimeTimeline(params) service call
│   └── Service: src/lib/services/downtimeService.ts
│   └── Returns: DowntimeEvent[] (start, end, line, cause, severity)
│   └── Data Source: Demo generators (always, regardless of mode)
│
└── HistoricalEventsTable component
    └── Fetches from: /api/seed-mill-historical
    └── API Route: src/app/api/seed-mill-historical/route.ts
    └── Service: src/lib/services/seedMillHistoricalService.ts
    └── Data Source: Supabase (seed_mill_events_historical table) OR demo generators
```

### Child Components
1. **ProdPageHeader** - Header with title/description
2. **ProdKpiTile** (×4) - KPI display tiles
3. **BarCard** - Pareto chart visualization
4. **ProdSection** - Section wrapper
5. **HistoricalEventsTable** - Raw data table with filters
6. **AiInsightCard** - AI insights display

### Data Hooks
- `useGlobalFilters()` - Global filter state (factory, line, time range)
- `useState` - Local state for paretoData, timelineData, loading
- `useEffect` - Data fetching on filter changes
- `useMemo` - AI insights calculation

### API Routes
- `/api/seed-mill-historical` - Historical events API (used by table only)

### Query Parameters
- None (page uses global filters from Zustand store)

---

## Root Cause Analysis

### Issue 1: Type Mismatch - `range` Parameter
**Problem:** The `downtimeService.ts` expects `range: TimeRange['range']` where `TimeRange` is imported from `types.ts` (an interface). However, `useGlobalFilters()` returns `timeRange` which is a string union type from `globalFilters.ts` (a type alias).

**Location:** 
- Service interface: `src/lib/services/downtimeService.ts:9`
- Page usage: `src/app/production-trials/operations/downtime/page.tsx:33`

**Impact:** TypeScript may not catch this, but runtime could have issues if the types don't align properly.

### Issue 2: Missing Environment Variable Check
**Problem:** The service checks `NEXT_PUBLIC_APP_DEMO_MODE` but if it's not set (undefined), `isDemoMode()` returns `false`, causing the service to try real API calls that don't exist, then fall back to demo data. However, the fallback happens AFTER `getTimeRange()` is called, which might fail if `range` is undefined.

**Location:** `src/lib/services/downtimeService.ts:4,38-45,48-56`

**Impact:** If `range` is undefined or invalid, `getTimeRange()` will fail, causing timeline data to never load.

### Issue 3: Service Always Returns Demo Data
**Problem:** Even in non-demo mode, the service always calls `generateDowntimePareto()` and `generateDowntimeEvents()`. There's no actual database query implementation. This is actually fine for demo purposes, but the issue is that `getTimeRange()` must succeed for timeline data.

**Location:** `src/lib/services/downtimeService.ts:38-56`

### Issue 4: Potential Undefined `range` Value
**Problem:** If `timeRange` from global filters is `null` or `undefined` (initial state), passing it to the service will cause `getTimeRange()` to fail when accessing `params.range`.

**Location:** 
- Global filters default: `src/lib/state/globalFilters.ts:24` (defaults to 'last90d', so should be safe)
- Page usage: `src/app/production-trials/operations/downtime/page.tsx:33`

---

## Exact Fix List

### Fix 1: Ensure `range` Parameter is Always Valid
**File:** `src/app/production-trials/operations/downtime/page.tsx`

**Change:** Add fallback for timeRange if it's null/undefined
```typescript
// Line 21 - Add fallback
const { factoryId, lineId, timeRange, customStartDate, customEndDate } = useGlobalFilters();
const effectiveTimeRange = timeRange || 'last90d'; // Add this line

// Line 33 - Use effectiveTimeRange
const params = {
  plantId: factoryId,
  lineIds: lineId ? [lineId] : undefined,
  range: effectiveTimeRange, // Change from timeRange
  customStartDate,
  customEndDate,
};
```

### Fix 2: Add Type Safety in Service
**File:** `src/lib/services/downtimeService.ts`

**Change:** Add validation in `getTimeRange()` function
```typescript
// Line 14-36 - Update getTimeRange function
function getTimeRange(params: DowntimeParams) {
  const now = new Date();
  
  // Add validation
  if (!params.range) {
    console.warn('No range provided, defaulting to last90d');
    params.range = 'last90d';
  }
  
  if (params.range === 'custom' && params.customStartDate && params.customEndDate) {
    return {
      start: new Date(params.customStartDate),
      end: new Date(params.customEndDate),
    };
  }
  
  const rangeHours: Record<string, number> = {
    last24h: 24,
    last7d: 168,
    last30d: 720,
    last60d: 1440,
    last90d: 2160,
  };
  const hours = rangeHours[params.range] || 2160; // Default to 90 days if invalid
  return {
    start: new Date(now.getTime() - hours * 60 * 60 * 1000),
    end: now,
  };
}
```

### Fix 3: Ensure Demo Mode Works Correctly
**File:** `src/lib/services/downtimeService.ts`

**Change:** Ensure demo data always loads even if timeRange calculation fails
```typescript
// Line 48-56 - Update getDowntimeTimeline
export async function getDowntimeTimeline(params: DowntimeParams): Promise<DowntimeEvent[]> {
  try {
    const { start, end } = getTimeRange(params);
    return generateDowntimeEvents(start, end);
  } catch (err) {
    console.warn('Error calculating time range, using default 90 days:', err);
    // Fallback to last 90 days
    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return generateDowntimeEvents(start, now);
  }
}
```

### Fix 4: Add Error Handling in Page
**File:** `src/app/production-trials/operations/downtime/page.tsx`

**Change:** Add better error handling and logging
```typescript
// Line 26-53 - Update useEffect
useEffect(() => {
  async function loadData() {
    setLoading(true);
    try {
      const effectiveTimeRange = timeRange || 'last90d';
      const params = {
        plantId: factoryId,
        lineIds: lineId ? [lineId] : undefined,
        range: effectiveTimeRange,
        customStartDate,
        customEndDate,
      };

      const [pareto, timeline] = await Promise.all([
        getDowntimePareto(params),
        getDowntimeTimeline(params),
      ]);

      setParetoData(pareto || []);
      setTimelineData(timeline || []);
    } catch (err) {
      console.error('Error loading downtime data:', err);
      // Set empty arrays on error to prevent spinner
      setParetoData([]);
      setTimelineData([]);
    } finally {
      setLoading(false);
    }
  }

  loadData();
}, [factoryId, lineId, timeRange, customStartDate, customEndDate]);
```

---

## Summary

**Primary Issue:** The `range` parameter might be undefined/null, causing `getTimeRange()` to fail, which prevents timeline data from loading. The pareto data loads fine because it doesn't depend on time range calculation.

**Secondary Issue:** Missing error handling means if data fails to load, the loading state never resolves, causing infinite spinners.

**Solution:** Add validation, fallbacks, and error handling to ensure data always loads (even if it's empty arrays) and the loading state always resolves.

